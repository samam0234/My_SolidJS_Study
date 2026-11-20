import { useNavigate, useSearchParams } from '@solidjs/router';
import { createSignal, onMount, Show } from 'solid-js';
import { api } from '../api';
import { config } from '../config';
import { acceptSession } from '../session';
import type { User } from '../types';
export default function Login() {
  const [signup, setSignup] = createSignal(false); const [busy, setBusy] = createSignal(false); const [error, setError] = createSignal('');
  const navigate = useNavigate(); const [query, setQuery] = useSearchParams();
  type Session = { data: { user: User; accessToken: string } };
  onMount(async () => {
    const code = query.code; if (!code || typeof code !== 'string') return;
    setQuery({ code: undefined }); setBusy(true);
    try { const result = await api<Session>('/api/oauth/exchange', { method: 'POST', body: JSON.stringify({ code }) }); acceptSession(result.data); navigate('/'); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  });
  async function submit(event: SubmitEvent) {
    event.preventDefault(); if (busy()) return; const values = Object.fromEntries(new FormData(event.currentTarget as HTMLFormElement)); setBusy(true); setError('');
    try {
      if (signup()) await api('/api/auth/signup', { method: 'POST', body: JSON.stringify(values) });
      const result = await api<Session>('/api/auth/login', { method: 'POST', body: JSON.stringify(values) }); acceptSession(result.data); navigate('/');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <section class="narrow"><p class="eyebrow">YOUR LEARNING SPACE</p><h1>{signup() ? '회원가입' : '로그인'}</h1><form onSubmit={submit}>
    <label>이메일<input name="email" type="email" required autocomplete="username" /></label>
    <label>비밀번호<input name="password" type="password" required minLength={10} maxLength={128} autocomplete={signup() ? 'new-password' : 'current-password'} /></label>
    <Show when={signup()}><label>닉네임<input name="nickname" required maxLength={40} /></label></Show>
    <Show when={error()}><p role="alert">{error()}</p></Show><button disabled={busy()}>{busy() ? '처리 중…' : signup() ? '가입 후 로그인' : '로그인'}</button>
  </form><button class="subtle" onClick={() => setSignup(v => !v)}>{signup() ? '로그인으로' : '회원가입으로'}</button><Show when={import.meta.env.VITE_STAGE !== 'basic'}><p><a href={`${config.apiBase}/api/oauth/start`}>소셜 로그인 (기본 mock)</a></p></Show><p class="muted">학습용 토큰은 메모리에만 저장되어 새로고침 시 다시 로그인합니다.</p></section>;
}
