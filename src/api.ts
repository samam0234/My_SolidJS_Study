import { config } from './config';
import { token, clearSession } from './session';
export class ApiError extends Error {
  constructor(public status: number, message: string, public fields: Record<string, string[]> = {}, public requestId = '') { super(message); }
}
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  if (token()) headers.set('Authorization', `Bearer ${token()}`);
  const response = await fetch(`${config.apiBase}${path}`, { ...init, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) clearSession();
    throw new ApiError(response.status, payload.error?.message || '요청에 실패했습니다.', payload.error?.fields, payload.error?.requestId);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}
export async function streamQuestion(documentId: number, question: string, onEvent: (event: { text?: string; sources?: unknown; stopReason?: string }) => void, signal: AbortSignal) {
  const response = await fetch(`${config.apiBase}/api/ai/chat/stream`, {
    method: 'POST', signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify({ documentId, question })
  });
  if (!response.ok) throw new ApiError(response.status, (await response.json()).error.message);
  if (!response.body) throw new Error('스트리밍 본문이 없습니다.');
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader(); let buffer = '';
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      buffer += value; const frames = buffer.split('\n\n'); buffer = frames.pop() || '';
      for (const frame of frames) {
        const data = frame.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
        if (!data) continue; if (data === '[DONE]') return;
        const event = JSON.parse(data); if (event.error) throw new Error(event.error.message); onEvent(event);
      }
    }
    throw new Error('완료 이벤트 없이 스트림이 종료되었습니다.');
  } finally { await reader.cancel(); reader.releaseLock(); }
}
