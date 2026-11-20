# study2 · SolidJS 핵심 구조와 데이터 전달

> 기준: [SolidJS 노션 원문](https://app.notion.com/p/40bd7dec5e2e813080f8d54cf5968ad5) · [게시판 API v1](https://app.notion.com/p/3d6d7dec5e2e8139adbfd36dd506c65e) · 문서 기준일 2026-11-20 (Asia/Seoul).

## ① 목표 한 줄

부모·자식 컴포넌트를 분리하고 props와 콜백으로 연결한다.

## ② 📖 이론

컴포넌트는 DOM 조각과 그 조각의 초기 설정을 묶는 단위다. 부모는 props로 자료를 내려 주고 자식은 콜백으로 사용자 의도를 알린다. 식당에서 주문서를 내려 주고 확인 버튼을 통해 주문을 올리는 흐름과 같다.

Solid 컴포넌트 함수는 각 마운트에서 초기 설정을 한 번 수행한다. 상태 변경 때 추적된 표현식이 갱신된다. 재마운트·라우트 이동·HMR은 새 실행을 만든다. 따라서 “앱 전체에서 단 한 번”이라는 의미가 아니다.

반응적인 props를 const { post } = props처럼 일찍 구조분해하면 현재 값만 읽어 추적이 끊길 수 있다. 렌더 안에서 props.post.title을 읽거나 필요한 경우 splitProps를 사용한다. 정적인 설정 객체의 구조분해와 구분한다.

## ③ 🛠️ 실기 · 전체 코드와 줄별 설명

이 저장소는 완성 코드와 학습 노트를 함께 제공한다. 아래 파일을 지정 경로에서 읽고 실행한다. 이 단계에서 새로 다루는 파일은 생략 없이 수록하며, import되는 공통 파일은 README와 앞선 단계의 전체 코드를 따른다. 학습 진행 상황은 체크박스에 직접 기록한다.

1. PostCard는 post 한 개만 받아 목록 항목을 표시한다. 네트워크 요청은 부모 Posts가 담당한다.
2. PostForm은 입력 상태를 갖지만 저장 위치를 모른다. 부모 Editor가 save 함수를 전달하여 등록·수정 요청을 결정한다.
3. Signals 실험실에서 증가 버튼을 누른다. 생성 번호는 그대로인데 원본·파생 값은 변하는 것을 관찰한다.
4. props.post를 구조분해하지 않은 이유를 설명하고, 변경되는 부모 데이터를 getter 경로로 읽는지 확인한다.

실행 명령은 저장소 루트의 PowerShell 기준이다. 서버를 유지하는 명령 다음의 작업은 별도 터미널에서 실행한다.

```powershell
npm run dev
# /labs에서 생성 번호와 증가 버튼 확인
```

### src/components/PostCard.tsx 전체 코드

[src/components/PostCard.tsx](src/components/PostCard.tsx)

```tsx
import { A } from '@solidjs/router';
import { For } from 'solid-js';
import type { Post } from '../types';
export default function PostCard(props: { post: Post }) {
  return <article class="card">
    <p class="eyebrow">#{props.post.id} · {props.post.author.nickname}</p>
    <h2><A href={`/posts/${props.post.id}`}>{props.post.title}</A></h2>
    <p>{props.post.body.slice(0, 140)}</p>
    <footer><span>댓글 {props.post.commentCount}</span><For each={props.post.tags}>{tag => <span class="tag">{tag}</span>}</For></footer>
  </article>;
}
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>import { A } from &#x27;@solidjs/router&#x27;;</code> | @solidjs/router에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 2 | <code>import { For } from &#x27;solid-js&#x27;;</code> | solid-js에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 3 | <code>import type { Post } from &#x27;../types&#x27;;</code> | ../types에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 4 | <code>export default function PostCard(props: { post: Post }) {</code> | 부모가 전달한 게시글 표시의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 5 | <code>  return &lt;article class=&quot;card&quot;&gt;</code> | 부모가 전달한 게시글 표시: 현재 상태·props를 읽는 JSX 화면 트리를 반환한다. |
| 6 | <code>    &lt;p class=&quot;eyebrow&quot;&gt;#{props.post.id} · {props.post.author.nickname}&lt;/p&gt;</code> | 부모가 전달한 게시글 표시의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 7 | <code>    &lt;h2&gt;&lt;A href={`/posts/${props.post.id}`}&gt;{props.post.title}&lt;/A&gt;&lt;/h2&gt;</code> | 부모가 전달한 게시글 표시: SPA 라우터 링크로 화면 전환을 연결한다. |
| 8 | <code>    &lt;p&gt;{props.post.body.slice(0, 140)}&lt;/p&gt;</code> | 부모가 전달한 게시글 표시의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 9 | <code>    &lt;footer&gt;&lt;span&gt;댓글 {props.post.commentCount}&lt;/span&gt;&lt;For each={props.post.tags}&gt;{tag =&gt; &lt;span class=&quot;tag&quot;&gt;{tag}&lt;/span&gt;}&lt;/For&gt;&lt;/footer&gt;</code> | 부모가 전달한 게시글 표시: 배열 항목별 화면을 생성하고 항목 정체성에 따라 갱신한다. |
| 10 | <code>  &lt;/article&gt;;</code> | 부모가 전달한 게시글 표시의 현재 구문·화면·설정 블록을 닫거나 다음 분기로 연결한다. |
| 11 | <code>}</code> | 부모가 전달한 게시글 표시의 현재 블록 또는 선언을 닫는다. |

### src/pages/Editor.tsx 전체 코드

[src/pages/Editor.tsx](src/pages/Editor.tsx)

```tsx
import { useNavigate, useParams, A } from '@solidjs/router';
import { createResource, Show } from 'solid-js';
import { api } from '../api';
import { user } from '../session';
import type { Post, PostInput } from '../types';
import PostForm from '../components/PostForm';
export default function Editor() {
  const params = useParams(); const navigate = useNavigate();
  const [post] = createResource(() => params.id, id => api<{ data: Post }>(`/api/posts/${id}`));
  async function save(input: PostInput) {
    const result = await api<{ data: Post }>(params.id ? `/api/posts/${params.id}` : '/api/posts', { method: params.id ? 'PATCH' : 'POST', body: JSON.stringify(input) });
    navigate(`/posts/${result.data.id}`);
  }
  return <section><h1>{params.id ? '글 수정' : '새 글 작성'}</h1><Show when={user()} fallback={<p><A href="/login">로그인</A> 후 작성할 수 있습니다.</p>}>
    <Show when={!params.id} fallback={<Show when={post()?.data} keyed>{data => <PostForm initial={data} save={save} />}</Show>}><PostForm save={save} /></Show>
  </Show></section>;
}
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>import { useNavigate, useParams, A } from &#x27;@solidjs/router&#x27;;</code> | @solidjs/router에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 2 | <code>import { createResource, Show } from &#x27;solid-js&#x27;;</code> | solid-js에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 3 | <code>import { api } from &#x27;../api&#x27;;</code> | ../api에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 4 | <code>import { user } from &#x27;../session&#x27;;</code> | ../session에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 5 | <code>import type { Post, PostInput } from &#x27;../types&#x27;;</code> | ../types에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 6 | <code>import PostForm from &#x27;../components/PostForm&#x27;;</code> | ../components/PostForm에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 7 | <code>export default function Editor() {</code> | 등록·수정 저장 콜백의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 8 | <code>  const params = useParams(); const navigate = useNavigate();</code> | 등록·수정 저장 콜백: 현재 동적 라우트의 id를 읽는다. |
| 9 | <code>  const [post] = createResource(() =&gt; params.id, id =&gt; api&lt;{ data: Post }&gt;(`/api/posts/${id}`));</code> | 등록·수정 저장 콜백: source를 추적하여 비동기 조회와 pending·error·value를 관리한다. |
| 10 | <code>  async function save(input: PostInput) {</code> | 등록·수정 저장 콜백의 이름 있는 동작과 인자 범위를 정의한다. |
| 11 | <code>    const result = await api&lt;{ data: Post }&gt;(params.id ? `/api/posts/${params.id}` : &#x27;/api/posts&#x27;, { method: params.id ? &#x27;PATCH&#x27; : &#x27;POST&#x27;, body: JSON.stringify(input) });</code> | 등록·수정 저장 콜백: 객체를 네트워크·저장용 JSON 문자열로 직렬화한다. |
| 12 | <code>    navigate(`/posts/${result.data.id}`);</code> | 등록·수정 저장 콜백: 저장·로그인 결과에 따라 다음 화면 주소로 이동한다. |
| 13 | <code>  }</code> | 등록·수정 저장 콜백의 현재 블록 또는 선언을 닫는다. |
| 14 | <code>  return &lt;section&gt;&lt;h1&gt;{params.id ? &#x27;글 수정&#x27; : &#x27;새 글 작성&#x27;}&lt;/h1&gt;&lt;Show when={user()} fallback={&lt;p&gt;&lt;A href=&quot;/login&quot;&gt;로그인&lt;/A&gt; 후 작성할 수 있습니다.&lt;/p&gt;}&gt;</code> | 등록·수정 저장 콜백: 조건 accessor에 따라 본문 또는 fallback 화면을 선택한다. |
| 15 | <code>    &lt;Show when={!params.id} fallback={&lt;Show when={post()?.data} keyed&gt;{data =&gt; &lt;PostForm initial={data} save={save} /&gt;}&lt;/Show&gt;}&gt;&lt;PostForm save={save} /&gt;&lt;/Show&gt;</code> | 등록·수정 저장 콜백: 조건 accessor에 따라 본문 또는 fallback 화면을 선택한다. |
| 16 | <code>  &lt;/Show&gt;&lt;/section&gt;;</code> | 등록·수정 저장 콜백의 현재 구문·화면·설정 블록을 닫거나 다음 분기로 연결한다. |
| 17 | <code>}</code> | 등록·수정 저장 콜백의 현재 블록 또는 선언을 닫는다. |

## ④ 🔗 연동 포인트

Posts → PostCard는 자료 전달, Editor → PostForm.save는 함수 전달이다. 이 경계를 유지하면 study6의 API 구현을 바꿔도 표시 컴포넌트를 유지할 수 있다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| props 갱신 누락 | 컴포넌트 처음에 구조분해 | props 경로를 추적되는 표현식에서 읽는다 |
| 함수가 여러 번 실행된 듯 보임 | HMR 또는 재마운트 | 버튼 갱신과 라우트 이동을 분리 관찰 |
| 자식이 서버 주소를 알아야 함 | 책임이 섞임 | 저장 콜백을 부모에서 주입 |

## ⑥ 직접 해보기

1. PostCard에 onSelect 콜백을 추가하고 부모에서 선택된 id를 출력한다.
2. 본문 미리보기 길이를 props로 받도록 확장한다.

## ⑦ ☐ 체크리스트

노션 [FW] 학습 목표 원문 항목은 다음과 같이 보존한다. 괄호가 포함된 원문을 인용하되 다른 프레임워크 비교 실습은 수행하지 않는다.

- [ ] 컴포넌트 함수가 한 번만 실행된다는 점 확인 (React와 가장 큰 차이)

- [ ] 변경되는 props를 일찍 구조분해하지 않는다.
- [ ] 컴포넌트 사이 데이터와 이벤트 방향을 설명했다.

## ⑧ 다음 단계 연결 문장

부모·자식 컴포넌트를 분리하고 props와 콜백으로 연결한다를 마쳤다면 [study3.md](study3.md)에서 이어 간다.

공식 자료: [SolidJS 1.x 소스](https://github.com/solidjs/solid/tree/v1.9.20), [Solid Router](https://docs.solidjs.com/solid-router/getting-started/installation-and-setup), [Node SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html). 최신 문서와 설치 버전이 다를 수 있어 package-lock.json을 실행 기준으로 삼는다.
