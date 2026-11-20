import { createSignal } from 'solid-js';
import type { User } from './types';
const [token, setToken] = createSignal('');
const [user, setUser] = createSignal<User>();
export { token, user };
export function acceptSession(session: { user: User; accessToken: string }) {
  setToken(session.accessToken); setUser(session.user);
}
export function clearSession() { setToken(''); setUser(undefined); }
// 토큰은 메모리에만 둔다. 새로고침 뒤에는 다시 로그인한다.
