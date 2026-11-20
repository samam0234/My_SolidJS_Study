import { A, useNavigate, type RouteSectionProps } from '@solidjs/router';
import { ErrorBoundary, Show } from 'solid-js';
import { user, clearSession } from './session';
import { api } from './api';
import LiveNotice from './components/LiveNotice';
export default function App(props: RouteSectionProps) {
  const navigate = useNavigate();
  async function logout() { try { await api('/api/auth/logout', { method: 'POST' }); } finally { clearSession(); navigate('/login'); } }
  return <><header class="site-header"><A class="brand" href="/">SOLID<span> / STUDY</span></A><nav aria-label="주 메뉴"><A href="/">게시판</A><A href="/documents">문서 AI</A><A href="/labs">실험실</A><A href="/services">연동</A><Show when={user()} fallback={<A href="/login">로그인</A>}><span>{user()?.nickname}</span><button class="subtle" onClick={logout}>로그아웃</button></Show></nav></header>
    <main><ErrorBoundary fallback={(e, reset) => <section><h1>화면을 열지 못했습니다.</h1><p role="alert">{String(e.message)}</p><button onClick={reset}>다시 시도</button><A href="/">목록으로</A></section>}>{props.children}</ErrorBoundary></main><footer class="site-footer"><span>SolidJS 1.9 · 신호에서 서비스까지</span><LiveNotice /></footer></>;
}
