import { randomBytes, scrypt as derive, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { fail, text } from './errors.mjs';
const scrypt = promisify(derive);
export const digest = token => createHash('sha256').update(token).digest('hex');
export const publicUser = user => ({ id: user.id, email: user.email, nickname: user.nickname });
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64);
  return `${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password, encoded) {
  const [salt, hash] = encoded.split(':');
  const candidate = await scrypt(password, salt, 64); const expected = Buffer.from(hash, 'hex');
  return expected.length === candidate.length && timingSafeEqual(expected, candidate);
}
export async function signUp(repo, input) {
  const email = text(input.email, 'email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'VALIDATION_ERROR', '이메일을 확인하세요.', { email: ['이메일 형식이 아닙니다.'] });
  const password = text(input.password, 'password', 128, 10);
  const nickname = text(input.nickname, 'nickname', 40);
  if ((await repo.all('users')).some(u => u.email === email)) fail(409, 'EMAIL_TAKEN', '이미 등록된 이메일입니다.');
  return repo.insert('users', { email, nickname, passwordHash: await hashPassword(password) });
}
export async function issueSession(repo, user, ttl = 3600) {
  const accessToken = randomBytes(32).toString('base64url');
  await repo.insert('sessions', { tokenHash: digest(accessToken), userId: user.id, expiresAt: Date.now() + ttl * 1000 });
  return { user: publicUser(user), accessToken };
}
export async function authenticate(repo, header) {
  const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) fail(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
  const session = (await repo.all('sessions')).find(s => s.tokenHash === digest(token) && s.expiresAt > Date.now());
  const user = session && await repo.get('users', session.userId);
  if (!user) fail(401, 'UNAUTHORIZED', '로그인이 만료되었습니다.');
  return { user, session };
}
export function owner(row, user) {
  if (row.authorId !== user.id) fail(403, 'FORBIDDEN', '작성자만 변경할 수 있습니다.');
}
