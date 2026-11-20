import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './helpers.mjs';
test('실제 Ollama 모델로 문서 질문 SSE와 사용량·이력을 확인한다', { timeout: 120000 }, async t => {
  const config = { ai: { provider: 'ollama', model: process.env.AI_MODEL || 'gemma4:12b', ollamaUrl: process.env.OLLAMA_URL || 'http://127.0.0.1:11434' }, aiLimit: 12000 };
  const { request, account, base } = await fixture(t, config);
  const { accessToken: token } = await account('ollama');
  const doc = await request('/api/documents', { method: 'POST', token, body: { filename: 'signals.md', content: 'SolidJS의 시그널은 변경 가능한 상태다. 값을 읽는 위치를 추적하여 필요한 화면을 갱신한다.' } });
  const response = await fetch(`${base}/api/ai/chat/stream`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId: doc.value.data.id, question: '시그널은 무엇인가?' }) });
  assert.equal(response.status, 200);
  const raw = await response.text(); assert.match(raw, /data: \[DONE\]/); assert.doesNotMatch(raw, /AI_UNAVAILABLE/);
  const history = await request(`/api/documents/${doc.value.data.id}/questions`, { token });
  assert.equal(history.value.data.length, 1); assert.ok(history.value.data[0].answer.length > 0); assert.ok(history.value.data[0].usage.inputTokens > 0);
  console.log(JSON.stringify({ provider: 'ollama', model: config.ai.model, answer: history.value.data[0].answer, usage: history.value.data[0].usage }));
});
