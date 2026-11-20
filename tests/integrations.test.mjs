import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './helpers.mjs';
import { checkout, mail, oauthIdentity } from '../server/integrations.mjs';
import { modelStream, retrieve, sseFrames } from '../server/ai.mjs';
import { WebSocket } from 'ws';
test('외부 서비스 HTTP 어댑터를 가짜 fetch로 검증', async () => {
  const calls = []; const fetcher = async (url, init) => { calls.push({ url, init }); return Response.json(url.includes('stripe') ? { id: 'cs_test', url: 'https://checkout.stripe.com/test' } : url.endsWith('/user') ? { id: 1, login: 'test' } : url.includes('access_token') ? { access_token: 'provider-secret' } : { id: 'mail-test' }); };
  const config = { mode: 'live', origin: 'https://study.example', stripeKey: 'test-key', priceId: 'price_test', mailKey: 'mail-key', mailFrom: 'sender@example.com', githubId: 'id', githubSecret: 'secret' };
  assert.equal((await checkout(config, { id: 1 }, 'fixed', fetcher)).paid, false); assert.equal(calls[0].init.headers['Idempotency-Key'], '1-fixed');
  assert.equal((await mail(config, { email: 'me@example.com' }, fetcher)).accepted, true); assert.deepEqual(JSON.parse(calls[1].init.body).to, ['me@example.com']);
  assert.equal((await oauthIdentity(config, 'code', fetcher)).login, 'test');
});
test('OAuth mock state·일회용 교환·재사용 거절', async t => {
  const { base, request } = await fixture(t);
  const start = await fetch(`${base}/api/oauth/start`, { redirect: 'manual' }); const cookie = start.headers.get('set-cookie').split(';')[0];
  const target = new URL(start.headers.get('location')); const callback = await fetch(base + target.pathname + target.search, { redirect: 'manual', headers: { Cookie: cookie } });
  assert.equal(callback.status, 302); const code = new URL(callback.headers.get('location')).searchParams.get('code');
  const exchange = await request('/api/oauth/exchange', { method: 'POST', body: { code } }); assert.equal(exchange.status, 200); assert.ok(exchange.value.data.accessToken);
  assert.equal((await request('/api/oauth/exchange', { method: 'POST', body: { code } })).status, 401);
  assert.equal((await fetch(base + target.pathname + target.search, { headers: { Cookie: cookie } })).status, 400);
});
test('mock 결제·메일 응답과 사용자 한도', async t => {
  const { request, account } = await fixture(t); const { accessToken: token } = await account();
  const checkout = await request('/api/services/checkout', { method: 'POST', token, headers: { 'Idempotency-Key': 'once' } }); assert.equal(checkout.value.data.provider, 'mock'); assert.equal(checkout.value.data.paid, false);
  for (let i = 0; i < 3; i++) assert.equal((await request('/api/services/mail', { method: 'POST', token })).status, 200);
  assert.equal((await request('/api/services/mail', { method: 'POST', token })).status, 429);
});
test('SSE를 패킷 중간에서 나눠도 복원하고 Anthropic 사용량을 읽는다', async () => {
  const raw = 'event: message_start\ndata: {"type":"message_start","message":{"usage":{"input_tokens":12}}}\n\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"한글"}}\n\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":3}}\n\n';
  const bytes = new TextEncoder().encode(raw); const body = new ReadableStream({ start(c) { for (let i = 0; i < bytes.length; i += 7) c.enqueue(bytes.slice(i, i + 7)); c.close(); } });
  const result = [];
  for await (const event of modelStream({ provider: 'anthropic', model: 'configured-model', key: 'server-only', prompt: 'hello', fetcher: async () => new Response(body) })) result.push(event);
  assert.equal(result[0].text, '한글'); assert.deepEqual(result[1].usage, { inputTokens: 12, outputTokens: 3 });
});
test('RAG는 질문과 겹치는 발췌만 반환한다', () => {
  assert.equal(retrieve('시그널은 상태입니다.', '시그널').length, 1); assert.deepEqual(retrieve('시그널', 'unrelated'), []);
});
test('WebSocket 공개 변경 알림', async t => {
  const { base, request, account, config } = await fixture(t); const { accessToken: token } = await account();
  const ws = new WebSocket(base.replace('http', 'ws') + '/ws', { origin: config.origin }); t.after(() => ws.terminate());
  await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
  const event = new Promise((resolve, reject) => { const timeout = setTimeout(() => reject(new Error('알림 시간 초과')), 2000); ws.once('message', message => { clearTimeout(timeout); resolve(JSON.parse(message.toString())); }); });
  await request('/api/posts', { method: 'POST', token, body: { title: '실시간', body: '변경 알림' } });
  assert.equal((await event).type, 'posts.changed');
});
