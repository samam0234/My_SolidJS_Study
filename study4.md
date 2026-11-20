# study4 · SolidJS 라우팅과 요청 처리

> 기준: [SolidJS 노션 원문](https://app.notion.com/p/40bd7dec5e2e813080f8d54cf5968ad5) · [게시판 API v1](https://app.notion.com/p/3d6d7dec5e2e8139adbfd36dd506c65e) · 문서 기준일 2026-11-20 (Asia/Seoul).

## ① 목표 한 줄

목록·상세·작성·수정 URL과 서버 경로를 구분하여 연결한다.

## ② 📖 이론

라우터는 주소와 화면의 대응표다. /posts/new는 작성 화면, /posts/:id는 상세, /posts/:id/edit는 수정 화면이다. 동적 id는 useParams로 읽고 검색·페이지 번호는 useSearchParams로 관리한다. 검색 조건을 URL에 두면 새로고침·공유·뒤로가기를 이해하기 쉽다.

브라우저의 /posts/1과 서버 JSON 주소 /api/posts/1은 역할이 다르다. SPA의 직접 접근에는 index.html fallback이 필요하지만 /api의 없는 자원은 JSON 404를 반환해야 한다. 없는 화면은 *404 라우트로, 없는 게시글은 ApiError와 ErrorBoundary로 표시한다.

## ③ 🛠️ 실기 · 전체 코드와 줄별 설명

이 저장소는 완성 코드와 학습 노트를 함께 제공한다. 아래 파일을 지정 경로에서 읽고 실행한다. 이 단계에서 새로 다루는 파일은 생략 없이 수록하며, import되는 공통 파일은 README와 앞선 단계의 전체 코드를 따른다. 학습 진행 상황은 체크박스에 직접 기록한다.

1. main.tsx에서 Route들의 고정 경로와 동적 경로를 읽는다. /posts/new가 숫자 id로 API에 전달되지 않는지 확인한다.
2. 로그인 후 글을 만들고 상세 URL의 id를 바꾼다. /api/posts/nope는 400, 존재하지 않는 숫자는 404다.
3. 목록에서 q/page/sort를 변경하고 주소창과 Network를 같이 본다.
4. 빌드 후 서버로 /posts/1을 직접 열어 SPA fallback을 확인한다. /missing은 화면 404다.

실행 명령은 저장소 루트의 PowerShell 기준이다. 서버를 유지하는 명령 다음의 작업은 별도 터미널에서 실행한다.

```powershell
npm run build
npm start
# http://localhost:3000/posts/1 (운영용 Origin은 .env에서 3000으로 변경)
```

### src/main.tsx 전체 코드

[src/main.tsx](src/main.tsx)

```tsx
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
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>import { render } from &#x27;solid-js/web&#x27;;</code> | solid-js/web에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 2 | <code>// 심화 서비스 진입점: 기초 실행은 basic.tsx를 사용한다.</code> | 심화 서비스 진입점: 기초 실행은 basic.tsx를 사용한다. |
| 3 | <code>import { lazy } from &#x27;solid-js&#x27;;</code> | solid-js에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 4 | <code>import { Router, Route } from &#x27;@solidjs/router&#x27;;</code> | @solidjs/router에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 5 | <code>import App from &#x27;./App&#x27;;</code> | ./App에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 6 | <code>import Posts from &#x27;./pages/Posts&#x27;;</code> | ./pages/Posts에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 7 | <code>import &#x27;./styles.css&#x27;;</code> | 모듈에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 8 | <code>const Detail = lazy(() =&gt; import(&#x27;./pages/Detail&#x27;));</code> | main.tsx에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 9 | <code>const Editor = lazy(() =&gt; import(&#x27;./pages/Editor&#x27;));</code> | main.tsx에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 10 | <code>const Login = lazy(() =&gt; import(&#x27;./pages/Login&#x27;));</code> | main.tsx에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 11 | <code>const Documents = lazy(() =&gt; import(&#x27;./pages/Documents&#x27;));</code> | main.tsx에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 12 | <code>const Services = lazy(() =&gt; import(&#x27;./pages/Services&#x27;));</code> | main.tsx에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 13 | <code>const Labs = lazy(() =&gt; import(&#x27;./pages/Labs&#x27;));</code> | main.tsx에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 14 | <code>render(() =&gt; &lt;Router root={App}&gt;</code> | main.tsx: 주소 패턴과 렌더링 컴포넌트를 연결한다. |
| 15 | <code>  &lt;Route path=&quot;/&quot; component={Posts} /&gt;</code> | main.tsx: 주소 패턴과 렌더링 컴포넌트를 연결한다. |
| 16 | <code>  &lt;Route path=&quot;/posts/new&quot; component={Editor} /&gt;</code> | main.tsx: 주소 패턴과 렌더링 컴포넌트를 연결한다. |
| 17 | <code>  &lt;Route path=&quot;/posts/:id/edit&quot; component={Editor} /&gt;</code> | main.tsx: 주소 패턴과 렌더링 컴포넌트를 연결한다. |
| 18 | <code>  &lt;Route path=&quot;/posts/:id&quot; component={Detail} /&gt;</code> | main.tsx: 주소 패턴과 렌더링 컴포넌트를 연결한다. |
| 19 | <code>  &lt;Route path=&quot;/login&quot; component={Login} /&gt;</code> | main.tsx: 주소 패턴과 렌더링 컴포넌트를 연결한다. |
| 20 | <code>  &lt;Route path=&quot;/documents&quot; component={Documents} /&gt;</code> | main.tsx: 주소 패턴과 렌더링 컴포넌트를 연결한다. |
| 21 | <code>  &lt;Route path=&quot;/services&quot; component={Services} /&gt;</code> | main.tsx: 주소 패턴과 렌더링 컴포넌트를 연결한다. |
| 22 | <code>  &lt;Route path=&quot;/labs&quot; component={Labs} /&gt;</code> | main.tsx: 주소 패턴과 렌더링 컴포넌트를 연결한다. |
| 23 | <code>  &lt;Route path=&quot;*404&quot; component={() =&gt; &lt;section&gt;&lt;h1&gt;404 · 페이지가 없습니다.&lt;/h1&gt;&lt;a href=&quot;/&quot;&gt;홈으로&lt;/a&gt;&lt;/section&gt;} /&gt;</code> | main.tsx: 주소 패턴과 렌더링 컴포넌트를 연결한다. |
| 24 | <code>&lt;/Router&gt;, document.getElementById(&#x27;root&#x27;)!);</code> | main.tsx의 현재 구문·화면·설정 블록을 닫거나 다음 분기로 연결한다. |

### src/pages/Posts.tsx 전체 코드

[src/pages/Posts.tsx](src/pages/Posts.tsx)

```tsx
import { A, useSearchParams } from '@solidjs/router';
import { createResource, For, Show, ErrorBoundary } from 'solid-js';
import { api } from '../api';
import type { Post, Meta } from '../types';
import PostCard from '../components/PostCard';
export default function Posts() {
  const [query, setQuery] = useSearchParams();
  const [posts] = createResource(() => new URLSearchParams({ q: String(query.q || ''), page: String(query.page || 1), sort: String(query.sort || '-createdAt') }).toString(),
    search => api<{ data: Post[]; meta: Meta }>(`/api/posts?${search}`));
  return <section>
    <div class="section-title"><div><p class="eyebrow">BUILD WITH SIGNALS</p><h1>학습 게시판</h1></div><A class="button" href="/posts/new">새 글 작성</A></div>
    <form class="search" onSubmit={e => { e.preventDefault(); const form = new FormData(e.currentTarget); setQuery({ q: String(form.get('q') || ''), page: 1 }); }}>
      <label>검색<input name="q" value={String(query.q || '')} placeholder="제목 또는 본문" /></label><button>검색</button>
      <label>정렬<select value={String(query.sort || '-createdAt')} onChange={e => setQuery({ sort: e.currentTarget.value, page: 1 })}><option value="-createdAt">최신순</option><option value="createdAt">오래된순</option><option value="-commentCount">댓글순</option></select></label>
    </form>
    <ErrorBoundary fallback={(e, reset) => <p role="alert">{String(e.message)} <button onClick={reset}>다시 시도</button></p>}>
      <Show when={!posts.loading} fallback={<p role="status">불러오는 중…</p>}>
        <Show when={posts()?.data.length} fallback={<p>첫 번째 학습 기록을 남겨 보세요.</p>}><div class="grid"><For each={posts()?.data}>{post => <PostCard post={post} />}</For></div></Show>
        <nav class="pagination" aria-label="페이지"><button disabled={Number(query.page || 1) <= 1} onClick={() => setQuery({ page: Number(query.page || 1) - 1 })}>이전</button><span>{posts()?.meta.page} / {posts()?.meta.totalPages || 1}</span><button disabled={(posts()?.meta.page || 1) >= (posts()?.meta.totalPages || 1)} onClick={() => setQuery({ page: Number(query.page || 1) + 1 })}>다음</button></nav>
      </Show>
    </ErrorBoundary>
  </section>;
}
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>import { A, useSearchParams } from &#x27;@solidjs/router&#x27;;</code> | @solidjs/router에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 2 | <code>import { createResource, For, Show, ErrorBoundary } from &#x27;solid-js&#x27;;</code> | solid-js에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 3 | <code>import { api } from &#x27;../api&#x27;;</code> | ../api에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 4 | <code>import type { Post, Meta } from &#x27;../types&#x27;;</code> | ../types에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 5 | <code>import PostCard from &#x27;../components/PostCard&#x27;;</code> | ../components/PostCard에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 6 | <code>export default function Posts() {</code> | URL 검색 조건과 비동기 목록의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 7 | <code>  const [query, setQuery] = useSearchParams();</code> | URL 검색 조건과 비동기 목록: 검색·페이지 상태를 주소 쿼리와 연결한다. |
| 8 | <code>  const [posts] = createResource(() =&gt; new URLSearchParams({ q: String(query.q &#124;&#124; &#x27;&#x27;), page: String(query.page &#124;&#124; 1), sort: String(query.sort &#124;&#124; &#x27;-createdAt&#x27;) }).toString(),</code> | URL 검색 조건과 비동기 목록: source를 추적하여 비동기 조회와 pending·error·value를 관리한다. |
| 9 | <code>    search =&gt; api&lt;{ data: Post[]; meta: Meta }&gt;(`/api/posts?${search}`));</code> | URL 검색 조건과 비동기 목록의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 10 | <code>  return &lt;section&gt;</code> | URL 검색 조건과 비동기 목록: 현재 상태·props를 읽는 JSX 화면 트리를 반환한다. |
| 11 | <code>    &lt;div class=&quot;section-title&quot;&gt;&lt;div&gt;&lt;p class=&quot;eyebrow&quot;&gt;BUILD WITH SIGNALS&lt;/p&gt;&lt;h1&gt;학습 게시판&lt;/h1&gt;&lt;/div&gt;&lt;A class=&quot;button&quot; href=&quot;/posts/new&quot;&gt;새 글 작성&lt;/A&gt;&lt;/div&gt;</code> | URL 검색 조건과 비동기 목록: SPA 라우터 링크로 화면 전환을 연결한다. |
| 12 | <code>    &lt;form class=&quot;search&quot; onSubmit={e =&gt; { e.preventDefault(); const form = new FormData(e.currentTarget); setQuery({ q: String(form.get(&#x27;q&#x27;) &#124;&#124; &#x27;&#x27;), page: 1 }); }}&gt;</code> | URL 검색 조건과 비동기 목록: 브라우저 제출 이벤트를 도메인 저장 함수와 연결한다. |
| 13 | <code>      &lt;label&gt;검색&lt;input name=&quot;q&quot; value={String(query.q &#124;&#124; &#x27;&#x27;)} placeholder=&quot;제목 또는 본문&quot; /&gt;&lt;/label&gt;&lt;button&gt;검색&lt;/button&gt;</code> | URL 검색 조건과 비동기 목록: 입력 필드의 화면 문구와 접근성 이름을 제공한다. |
| 14 | <code>      &lt;label&gt;정렬&lt;select value={String(query.sort &#124;&#124; &#x27;-createdAt&#x27;)} onChange={e =&gt; setQuery({ sort: e.currentTarget.value, page: 1 })}&gt;&lt;option value=&quot;-createdAt&quot;&gt;최신순&lt;/option&gt;&lt;option value=&quot;createdAt&quot;&gt;오래된순&lt;/option&gt;&lt;option value=&quot;-commentCount&quot;&gt;댓글순&lt;/option&gt;&lt;/select&gt;&lt;/label&gt;</code> | URL 검색 조건과 비동기 목록: 입력 필드의 화면 문구와 접근성 이름을 제공한다. |
| 15 | <code>    &lt;/form&gt;</code> | URL 검색 조건과 비동기 목록의 현재 구문·화면·설정 블록을 닫거나 다음 분기로 연결한다. |
| 16 | <code>    &lt;ErrorBoundary fallback={(e, reset) =&gt; &lt;p role=&quot;alert&quot;&gt;{String(e.message)} &lt;button onClick={reset}&gt;다시 시도&lt;/button&gt;&lt;/p&gt;}&gt;</code> | URL 검색 조건과 비동기 목록: 하위 화면의 오류를 사용자가 확인할 수 있는 안내로 바꾼다. |
| 17 | <code>      &lt;Show when={!posts.loading} fallback={&lt;p role=&quot;status&quot;&gt;불러오는 중…&lt;/p&gt;}&gt;</code> | URL 검색 조건과 비동기 목록: 조건 accessor에 따라 본문 또는 fallback 화면을 선택한다. |
| 18 | <code>        &lt;Show when={posts()?.data.length} fallback={&lt;p&gt;첫 번째 학습 기록을 남겨 보세요.&lt;/p&gt;}&gt;&lt;div class=&quot;grid&quot;&gt;&lt;For each={posts()?.data}&gt;{post =&gt; &lt;PostCard post={post} /&gt;}&lt;/For&gt;&lt;/div&gt;&lt;/Show&gt;</code> | URL 검색 조건과 비동기 목록: 조건 accessor에 따라 본문 또는 fallback 화면을 선택한다. |
| 19 | <code>        &lt;nav class=&quot;pagination&quot; aria-label=&quot;페이지&quot;&gt;&lt;button disabled={Number(query.page &#124;&#124; 1) &lt;= 1} onClick={() =&gt; setQuery({ page: Number(query.page &#124;&#124; 1) - 1 })}&gt;이전&lt;/button&gt;&lt;span&gt;{posts()?.meta.page} / {posts()?.meta.totalPages &#124;&#124; 1}&lt;/span&gt;&lt;button disabled={(posts()?.meta.page &#124;&#124; 1) &gt;= (posts()?.meta.totalPages &#124;&#124; 1)} onClick={() =&gt; setQuery({ page: Number(query.page &#124;&#124; 1) + 1 })}&gt;다음&lt;/button&gt;&lt;/nav&gt;</code> | URL 검색 조건과 비동기 목록: 사용자 동작을 함수와 연결하고 필요하면 disabled로 잠근다. |
| 20 | <code>      &lt;/Show&gt;</code> | URL 검색 조건과 비동기 목록의 현재 구문·화면·설정 블록을 닫거나 다음 분기로 연결한다. |
| 21 | <code>    &lt;/ErrorBoundary&gt;</code> | URL 검색 조건과 비동기 목록: 하위 화면의 오류를 사용자가 확인할 수 있는 안내로 바꾼다. |
| 22 | <code>  &lt;/section&gt;;</code> | URL 검색 조건과 비동기 목록의 현재 블록 또는 선언을 닫는다. |
| 23 | <code>}</code> | URL 검색 조건과 비동기 목록의 현재 블록 또는 선언을 닫는다. |

## ④ 🔗 연동 포인트

주소의 q/page/sort → URLSearchParams → /api/posts → data/meta → For 렌더링이다. study5의 작성 성공 후 navigate는 생성된 id를 상세 화면으로 전달한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| 새로고침 404 | 호스트에 SPA fallback 없음 | API 경로를 제외하고 index.html 제공 |
| page가 NaN | 문자열 쿼리를 그대로 계산 | 숫자 변환과 기본값 적용 |
| API 대신 HTML 수신 | /api에도 fallback 적용 | 서버 API와 화면 경로 분리 |

## ⑥ 직접 해보기

1. 검색 조건이 있는 주소를 새 탭에서 연다.
2. 동적 id가 잘못된 경우와 자원이 없는 경우를 각각 확인한다.

## ⑦ ☐ 체크리스트

노션 [FW] 학습 목표 원문 항목은 다음과 같이 보존한다. 괄호가 포함된 원문을 인용하되 다른 프레임워크 비교 실습은 수행하지 않는다.

- [ ] `@solidjs/router` 로 목록·상세·작성 페이지

- [ ] q/page/sort가 URL과 API에 전달된다.
- [ ] 화면 404와 API 404를 구별했다.

## ⑧ 다음 단계 연결 문장

목록·상세·작성·수정 URL과 서버 경로를 구분하여 연결한다를 마쳤다면 [study5.md](study5.md)에서 이어 간다.

공식 자료: [SolidJS 1.x 소스](https://github.com/solidjs/solid/tree/v1.9.20), [Solid Router](https://docs.solidjs.com/solid-router/getting-started/installation-and-setup), [Node SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html). 최신 문서와 설치 버전이 다를 수 있어 package-lock.json을 실행 기준으로 삼는다.
