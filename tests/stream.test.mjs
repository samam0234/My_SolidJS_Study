import test from 'node:test';
import assert from 'node:assert/strict';
import { modelStream, sseFrames } from '../server/ai.mjs';
test('SSE CRLF가 패킷 경계에 걸려도 UTF-8·프레임을 복원', async () => {
  const raw = 'data: {"text":"한글"}\r\n\r\ndata: {"text":"둘"}\r\n\r\n';
  const bytes = new TextEncoder().encode(raw);
  const body = new ReadableStream({ start(c) { for (const byte of bytes) c.enqueue(Uint8Array.of(byte)); c.close(); } });
  const values = []; for await (const value of sseFrames(body)) values.push(value.text);
  assert.deepEqual(values, ['한글', '둘']);
});
test('Ollama NDJSON 마지막 개행이 없어도 완료 usage를 보존', async () => {
  const raw = '{"message":{"content":"응답"}}\n{"done":true,"prompt_eval_count":4,"eval_count":2}';
  const values = []; for await (const value of modelStream({ provider: 'ollama', model: 'configured', ollamaUrl: 'http://localhost:11434', prompt: '질문', fetcher: async () => new Response(raw) })) values.push(value);
  assert.equal(values[0].text, '응답'); assert.deepEqual(values[1].usage, { inputTokens: 4, outputTokens: 2 });
});
test('완료되지 않은 공급자 스트림을 성공으로 표시하지 않음', async () => {
  await assert.rejects(async () => { for await (const event of modelStream({ provider: 'anthropic', key: 'test', model: 'configured', prompt: '질문', fetcher: async () => new Response('data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"중단"}}\n\n') })) {} }, /완성되지/);
});
