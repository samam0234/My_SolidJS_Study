import { render } from 'solid-js/web';
// 심화 서비스 진입점: 기초 실행은 basic.tsx를 사용한다.
import { lazy } from 'solid-js';
import { Router, Route } from '@solidjs/router';
import App from './App';
import Posts from './pages/Posts';
import './styles.css';
const Detail = lazy(() => import('./pages/Detail'));
const Editor = lazy(() => import('./pages/Editor'));
const Login = lazy(() => import('./pages/Login'));
const Documents = lazy(() => import('./pages/Documents'));
const Services = lazy(() => import('./pages/Services'));
const Labs = lazy(() => import('./pages/Labs'));
render(() => <Router root={App}>
  <Route path="/" component={Posts} />
  <Route path="/posts/new" component={Editor} />
  <Route path="/posts/:id/edit" component={Editor} />
  <Route path="/posts/:id" component={Detail} />
  <Route path="/login" component={Login} />
  <Route path="/documents" component={Documents} />
  <Route path="/services" component={Services} />
  <Route path="/labs" component={Labs} />
  <Route path="*404" component={() => <section><h1>404 · 페이지가 없습니다.</h1><a href="/">홈으로</a></section>} />
</Router>, document.getElementById('root')!);
