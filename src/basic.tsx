import { render } from 'solid-js/web';
import { Router, Route, A, useNavigate, type RouteSectionProps } from '@solidjs/router';
import { Show, ErrorBoundary } from 'solid-js';
import { user, clearSession } from './session';
import { api } from './api';
import Posts from './pages/Posts';
import Detail from './pages/Detail';
import Editor from './pages/Editor';
import Login from './pages/Login';
import './styles.css';
function BasicShell(props: RouteSectionProps) {
  const navigate = useNavigate();
  async function logout() { try { await api('/api/auth/logout', { method: 'POST' }); } finally { clearSession(); navigate('/login'); } }
  return <><header class="site-header"><A href="/" class="brand">SOLID / MIDPOINT</A><nav><A href="/">게시판</A><Show when={user()} fallback={<A href="/login">로그인</A>}><span>{user()?.nickname}</span><button onClick={logout}>로그아웃</button></Show></nav></header><main><ErrorBoundary fallback={error => <p role="alert">{String(error.message)}</p>}>{props.children}</ErrorBoundary></main></>;
}
render(() => <Router root={BasicShell}><Route path="/" component={Posts} /><Route path="/login" component={Login} /><Route path="/posts/new" component={Editor} /><Route path="/posts/:id/edit" component={Editor} /><Route path="/posts/:id" component={Detail} /><Route path="*404" component={() => <h1>404 · 페이지가 없습니다.</h1>} /></Router>, document.getElementById('root')!);
