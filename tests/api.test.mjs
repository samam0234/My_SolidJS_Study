import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './helpers.mjs';
test('health·OpenAPI·404 공통 오류와 requestId', async t => {
  const { request } = await fixture(t);
  assert.deepEqual((await request('/health')).value, { status: 'ok' });
  const spec = await request('/api-docs'); assert.equal(spec.value.openapi, '3.0.3'); assert.ok(spec.value.paths['/api/posts/{id}'].patch);
  const result = await request('/api/missing', { headers: { 'X-Request-Id': 'test-request' } });
  assert.equal(result.status, 404); assert.equal(result.value.error.requestId, 'test-request'); assert.equal(result.headers.get('x-request-id'), 'test-request');
});
test('회원가입·중복 이메일·로그인·해시 비노출·로그아웃·만료', async t => {
  const { request, account, repo } = await fixture(t);
  const session = await account(); assert.equal(session.user.nickname, 'mina'); assert.ok(session.accessToken);
  const saved = (await repo.all('users'))[0]; assert.notEqual(saved.passwordHash, 'password123'); assert.ok(!JSON.stringify(session).includes('passwordHash'));
  assert.equal((await request('/api/auth/signup', { method: 'POST', body: { email: 'mina@example.com', nickname: 'm', password: 'password123' } })).status, 409);
  assert.equal((await request('/api/auth/login', { method: 'POST', body: { email: 'mina@example.com', password: 'wrong' } })).status, 401);
  assert.equal((await request('/api/auth/me', { token: session.accessToken })).status, 200);
  const row = (await repo.all('sessions'))[0]; await repo.put('sessions', { ...row, expiresAt: 0 });
  assert.equal((await request('/api/auth/me', { token: session.accessToken })).status, 401);
  const next = (await request('/api/auth/login', { method: 'POST', body: { email: 'mina@example.com', password: 'password123' } })).value.data;
  assert.equal((await request('/api/auth/logout', { method: 'POST', token: next.accessToken })).status, 204);
  assert.equal((await request('/api/auth/me', { token: next.accessToken })).status, 401);
});
test('CRUD·검색·정렬·페이지·권한·댓글·캐시 무효화 계약', async t => {
  const { request, account } = await fixture(t); const a = await account('author'); const b = await account('other');
  assert.equal((await request('/api/posts', { method: 'POST', body: {} })).status, 401);
  const created = await request('/api/posts', { method: 'POST', token: a.accessToken, body: { title: 'Solid 글', body: '시그널 학습', tags: ['solid'] } });
  assert.equal(created.status, 201); const id = created.value.data.id; assert.equal(created.headers.get('location'), `/api/posts/${id}`);
  assert.deepEqual(created.value.data.author, { id: a.user.id, nickname: 'author' }); assert.equal(created.value.data.commentCount, 0);
  assert.ok(created.value.data.createdAt.endsWith('Z'));
  let list = await request('/api/posts?q=SOLID&limit=99'); assert.equal(list.value.meta.limit, 50); assert.equal(list.value.meta.total, 1); assert.equal(list.value.meta.totalPages, 1);
  assert.equal((await request('/api/posts?q=SOLID&limit=99')).headers.get('x-cache'), 'HIT');
  assert.equal((await request(`/api/posts/${id}`, { method: 'PATCH', token: b.accessToken, body: { title: '해킹' } })).status, 403);
  const updated = await request(`/api/posts/${id}`, { method: 'PATCH', token: a.accessToken, body: { title: '수정' } }); assert.equal(updated.value.data.title, '수정'); assert.equal(updated.value.data.body, '시그널 학습');
  assert.equal((await request('/api/posts?q=SOLID&limit=99')).headers.get('x-cache'), 'MISS');
  const comment = await request(`/api/posts/${id}/comments`, { method: 'POST', token: b.accessToken, body: { body: '댓글입니다' } }); assert.equal(comment.status, 201);
  assert.equal((await request(`/api/posts/${id}`)).value.data.commentCount, 1);
  assert.equal((await request('/api/posts?sort=-commentCount')).value.data[0].id, id);
  assert.equal((await request(`/api/comments/${comment.value.data.id}`, { method: 'DELETE', token: a.accessToken })).status, 403);
  assert.equal((await request(`/api/comments/${comment.value.data.id}`, { method: 'DELETE', token: b.accessToken })).status, 204);
  assert.equal((await request(`/api/posts/${id}`, { method: 'DELETE', token: a.accessToken })).status, 204);
  assert.equal((await request(`/api/posts/${id}`)).status, 404);
});
test('검증 오류·잘못된 JSON·숫자 id·태그·CORS', async t => {
  const { request, account } = await fixture(t); const { accessToken: token } = await account();
  for (const body of ['{', 'null', '[]']) assert.equal((await request('/api/posts', { method: 'POST', token, body })).status, 400);
  const invalid = await request('/api/posts', { method: 'POST', token, body: { title: '', body: 'x' } }); assert.equal(invalid.value.error.code, 'VALIDATION_ERROR'); assert.ok(invalid.value.error.fields.title);
  assert.equal((await request('/api/posts', { method: 'POST', token, body: { title: 'x', body: 'x', tags: [42] } })).status, 400);
  assert.equal((await request('/api/posts/nope')).status, 400);
  assert.equal((await request('/api/posts?sort=unsafe')).status, 400);
  assert.equal((await request('/api/posts', { headers: { Origin: 'https://evil.example' } })).status, 403);
  assert.equal((await request('/api/posts', { headers: { Origin: 'http://localhost:5173' } })).headers.get('access-control-allow-origin'), 'http://localhost:5173');
});
test('동시 회원가입 중복 방지', async t => {
  const { request } = await fixture(t); const body = { email: 'same@example.com', password: 'password123', nickname: 'same' };
  const results = await Promise.all([1, 2].map(() => request('/api/auth/signup', { method: 'POST', body })));
  assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
});
test('문서 권한·mock SSE·질문 기록·사용량·작업 큐', async t => {
  const { request, account, base, repo } = await fixture(t); const a = await account('one'); const b = await account('two');
  const doc = await request('/api/documents', { method: 'POST', token: a.accessToken, body: { filename: 'signals.md', content: '시그널은 읽는 위치를 추적합니다. Solid 학습 문서입니다.' } });
  assert.equal(doc.status, 201); const id = doc.value.data.id;
  assert.equal((await request(`/api/documents/${id}`, { token: b.accessToken })).status, 403);
  const response = await fetch(`${base}/api/ai/chat/stream`, { method: 'POST', headers: { Authorization: `Bearer ${a.accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId: id, question: '시그널은 무엇인가요?' }) });
  assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /text\/event-stream/);
  const stream = await response.text(); assert.ok(stream.includes('data: [DONE]')); assert.ok(stream.includes('sources'));
  const history = await request(`/api/documents/${id}/questions`, { token: a.accessToken }); assert.equal(history.value.data.length, 1); assert.match(history.value.data[0].answer, /발췌 1/);
  assert.equal((await repo.all('usage'))[0].state, 'complete');
  const queued = await request(`/api/documents/${id}/analyze`, { method: 'POST', token: a.accessToken }); assert.equal(queued.status, 202);
  let job; for (let i = 0; i < 30; i++) { job = await request(`/api/jobs/${queued.value.data.id}`, { token: a.accessToken }); if (job.value.data.state === 'complete') break; await new Promise(r => setTimeout(r, 50)); }
  assert.equal(job.value.data.state, 'complete'); assert.equal(job.value.data.result.characters, doc.value.data.content.length);
});
test('AI 한도·업로드 형식·크기 검증', async t => {
  const { request, account } = await fixture(t, { aiLimit: 1 }); const { accessToken: token } = await account();
  assert.equal((await request('/api/documents', { method: 'POST', token, body: { filename: 'script.html', content: '<script>x</script>' } })).status, 400);
  const doc = await request('/api/documents', { method: 'POST', token, body: { filename: 'x.txt', content: 'hello' } });
  assert.equal((await request('/api/ai/chat/stream', { method: 'POST', token, body: { documentId: doc.value.data.id, question: 'hello?' } })).status, 429);
  assert.equal((await request('/api/documents', { method: 'POST', token, body: { filename: 'x.txt', content: '한'.repeat(190000) } })).status, 413);
});
