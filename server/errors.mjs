import { randomUUID } from 'node:crypto';
export class HttpError extends Error {
  constructor(status, code, message, fields = {}) {
    super(message); Object.assign(this, { status, code, fields });
  }
}
export const fail = (status, code, message, fields) => { throw new HttpError(status, code, message, fields); };
export function requestId(req) {
  const value = req.headers['x-request-id'];
  return typeof value === 'string' && /^[\w-]{1,100}$/.test(value) ? value : randomUUID();
}
export function send(res, status, data) {
  res.statusCode = status;
  if (status === 204) return res.end();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}
export function errorResponse(res, error, id) {
  if (res.headersSent) return res.end();
  send(res, error.status || 500, { error: {
    code: error.code || 'INTERNAL', message: error.status ? error.message : '서버 오류입니다.',
    fields: error.fields || {}, requestId: id
  } });
}
export async function readJson(req, max = 2 * 1024 * 1024) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > max) fail(413, 'PAYLOAD_TOO_LARGE', '요청 크기를 줄여 주세요.');
    chunks.push(chunk);
  }
  let value;
  try { value = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
  catch { fail(400, 'BAD_REQUEST', '올바른 JSON을 보내 주세요.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(400, 'BAD_REQUEST', 'JSON 객체를 보내 주세요.');
  return value;
}
export function text(value, name, max, min = 1) {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max)
    fail(400, 'VALIDATION_ERROR', '입력값을 확인하세요.', { [name]: [`${min}~${max}자로 입력하세요.`] });
  return value.trim();
}
export function numericId(value) {
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) fail(400, 'BAD_REQUEST', 'id는 양의 정수입니다.');
  return Number(value);
}
