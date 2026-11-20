# study5 · SolidJS 폼·입력·검증

> 기준: [SolidJS 노션 원문](https://app.notion.com/p/40bd7dec5e2e813080f8d54cf5968ad5) · [게시판 API v1](https://app.notion.com/p/3d6d7dec5e2e8139adbfd36dd506c65e) · 문서 기준일 2026-11-20 (Asia/Seoul).

## ① 목표 한 줄

입력 검증과 서버 필드 오류를 표시하고 중복 저장을 막는다.

## ② 📖 이론

클라이언트 검증은 빠른 안내, 서버 검증은 데이터 보호다. required와 maxLength가 있어도 직접 HTTP를 보내면 우회할 수 있어 서버에서 다시 검사한다. 폼 제출은 preventDefault로 브라우저의 전체 페이지 전송을 멈추고 API 요청으로 처리한다.

busy는 제출 중 표시이자 중복 이벤트 가드다. disabled만으로는 함수 직접 호출을 막지 못하므로 핸들러 입구에서도 busy()를 확인한다. finally에서 풀어 주어 오류 이후 다시 제출할 수 있게 한다.

공통 스펙 v1 검증 오류는 400 + error.fields다. 외부 API가 422를 반환할 경우 같은 fields를 UI에서 처리할 수 있도록 호환 경로를 둔다. 등록 201과 수정 200은 성공으로 처리하며 삭제 204는 JSON을 읽지 않는다.

## ③ 🛠️ 실기 · 전체 코드와 줄별 설명

이 저장소는 완성 코드와 학습 노트를 함께 제공한다. 아래 파일을 지정 경로에서 읽고 실행한다. 이 단계에서 새로 다루는 파일은 생략 없이 수록하며, import되는 공통 파일은 README와 앞선 단계의 전체 코드를 따른다. 학습 진행 상황은 체크박스에 직접 기록한다.

1. 제목·본문·쉼표 태그를 입력하고 신호 상태가 onInput으로 갱신되는지 확인한다.
2. 제목을 비우면 브라우저 검증, 200자를 넘긴 API 요청에는 서버 검증이 작동한다.
3. save 콜백이 resolve되면 부모가 상세로 이동하고 reject되면 폼은 입력을 유지한다.
4. Network를 느리게 설정해 저장 버튼이 잠기는지 확인한다. 오류 필드는 name과 메시지를 함께 보여 준다.

실행 명령은 저장소 루트의 PowerShell 기준이다. 서버를 유지하는 명령 다음의 작업은 별도 터미널에서 실행한다.

```powershell
npm run test:ui
npm test
```

### src/components/PostForm.tsx 전체 코드

[src/components/PostForm.tsx](src/components/PostForm.tsx)

```tsx
import { createSignal, For, Show } from 'solid-js';
import { ApiError } from '../api';
import type { PostInput } from '../types';
export default function PostForm(props: { initial?: PostInput; save: (input: PostInput) => Promise<void> }) {
  const [title, setTitle] = createSignal(props.initial?.title || '');
  const [body, setBody] = createSignal(props.initial?.body || '');
  const [tags, setTags] = createSignal(props.initial?.tags.join(',') || '');
  const [busy, setBusy] = createSignal(false); const [error, setError] = createSignal('');
  const [fields, setFields] = createSignal<Record<string, string[]>>({});
  async function submit(event: SubmitEvent) {
    event.preventDefault(); if (busy()) return; setFields({}); setError('');
    if (!title().trim() || title().length > 200 || !body().trim() || body().length > 20000) { setError('제목 1~200자, 본문 1~20,000자를 확인하세요.'); return; }
    setBusy(true);
    try { await props.save({ title: title().trim(), body: body().trim(), tags: tags().split(',').map(t => t.trim()).filter(Boolean) }); }
    catch (e) {
      if (e instanceof ApiError && [400, 422].includes(e.status)) setFields(e.fields);
      setError(e instanceof Error ? e.message : '저장 실패');
    } finally { setBusy(false); }
  }
  return <form onSubmit={submit} aria-busy={busy()}>
    <label>제목<input name="title" required maxLength={200} value={title()} onInput={e => setTitle(e.currentTarget.value)} /></label>
    <label>본문<textarea name="body" required maxLength={20000} rows={8} value={body()} onInput={e => setBody(e.currentTarget.value)} /></label>
    <label>태그 (쉼표로 구분)<input value={tags()} onInput={e => setTags(e.currentTarget.value)} /></label>
    <Show when={error()}><p role="alert">{error()}</p></Show>
    <For each={Object.entries(fields())}>{([name, messages]) => <p role="alert">{name}: {messages.join(', ')}</p>}</For>
    <button disabled={busy()} type="submit">{busy() ? '저장 중…' : '저장'}</button>
  </form>;
}
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>import { createSignal, For, Show } from &#x27;solid-js&#x27;;</code> | solid-js에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 2 | <code>import { ApiError } from &#x27;../api&#x27;;</code> | ../api에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 3 | <code>import type { PostInput } from &#x27;../types&#x27;;</code> | ../types에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 4 | <code>export default function PostForm(props: { initial?: PostInput; save: (input: PostInput) =&gt; Promise&lt;void&gt; }) {</code> | 검증과 중복 제출 제어의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 5 | <code>  const [title, setTitle] = createSignal(props.initial?.title &#124;&#124; &#x27;&#x27;);</code> | 검증과 중복 제출 제어: 변경될 값을 accessor·setter 쌍으로 만들고 이후 JSX·함수에서 읽게 한다. |
| 6 | <code>  const [body, setBody] = createSignal(props.initial?.body &#124;&#124; &#x27;&#x27;);</code> | 검증과 중복 제출 제어: 변경될 값을 accessor·setter 쌍으로 만들고 이후 JSX·함수에서 읽게 한다. |
| 7 | <code>  const [tags, setTags] = createSignal(props.initial?.tags.join(&#x27;,&#x27;) &#124;&#124; &#x27;&#x27;);</code> | 검증과 중복 제출 제어: 변경될 값을 accessor·setter 쌍으로 만들고 이후 JSX·함수에서 읽게 한다. |
| 8 | <code>  const [busy, setBusy] = createSignal(false); const [error, setError] = createSignal(&#x27;&#x27;);</code> | 검증과 중복 제출 제어: 변경될 값을 accessor·setter 쌍으로 만들고 이후 JSX·함수에서 읽게 한다. |
| 9 | <code>  const [fields, setFields] = createSignal&lt;Record&lt;string, string[]&gt;&gt;({});</code> | 검증과 중복 제출 제어: 변경될 값을 accessor·setter 쌍으로 만들고 이후 JSX·함수에서 읽게 한다. |
| 10 | <code>  async function submit(event: SubmitEvent) {</code> | 검증과 중복 제출 제어의 이름 있는 동작과 인자 범위를 정의한다. |
| 11 | <code>    event.preventDefault(); if (busy()) return; setFields({}); setError(&#x27;&#x27;);</code> | 검증과 중복 제출 제어의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 12 | <code>    if (!title().trim() &#124;&#124; title().length &gt; 200 &#124;&#124; !body().trim() &#124;&#124; body().length &gt; 20000) { setError(&#x27;제목 1~200자, 본문 1~20,000자를 확인하세요.&#x27;); return; }</code> | 검증과 중복 제출 제어에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 13 | <code>    setBusy(true);</code> | 검증과 중복 제출 제어의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 14 | <code>    try { await props.save({ title: title().trim(), body: body().trim(), tags: tags().split(&#x27;,&#x27;).map(t =&gt; t.trim()).filter(Boolean) }); }</code> | 검증과 중복 제출 제어의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 15 | <code>    catch (e) {</code> | 검증과 중복 제출 제어의 실패를 잡아 오류 안내·복구·상태 갱신으로 전환한다. |
| 16 | <code>      if (e instanceof ApiError &amp;&amp; [400, 422].includes(e.status)) setFields(e.fields);</code> | 검증과 중복 제출 제어에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 17 | <code>      setError(e instanceof Error ? e.message : &#x27;저장 실패&#x27;);</code> | 검증과 중복 제출 제어의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 18 | <code>    } finally { setBusy(false); }</code> | 검증과 중복 제출 제어의 성공·실패와 관계없이 잠금과 자원을 정리한다. |
| 19 | <code>  }</code> | 검증과 중복 제출 제어의 현재 블록 또는 선언을 닫는다. |
| 20 | <code>  return &lt;form onSubmit={submit} aria-busy={busy()}&gt;</code> | 검증과 중복 제출 제어: 브라우저 제출 이벤트를 도메인 저장 함수와 연결한다. |
| 21 | <code>    &lt;label&gt;제목&lt;input name=&quot;title&quot; required maxLength={200} value={title()} onInput={e =&gt; setTitle(e.currentTarget.value)} /&gt;&lt;/label&gt;</code> | 검증과 중복 제출 제어: 입력 요소의 현재 값을 상태 setter에 전달한다. |
| 22 | <code>    &lt;label&gt;본문&lt;textarea name=&quot;body&quot; required maxLength={20000} rows={8} value={body()} onInput={e =&gt; setBody(e.currentTarget.value)} /&gt;&lt;/label&gt;</code> | 검증과 중복 제출 제어: 입력 요소의 현재 값을 상태 setter에 전달한다. |
| 23 | <code>    &lt;label&gt;태그 (쉼표로 구분)&lt;input value={tags()} onInput={e =&gt; setTags(e.currentTarget.value)} /&gt;&lt;/label&gt;</code> | 검증과 중복 제출 제어: 입력 요소의 현재 값을 상태 setter에 전달한다. |
| 24 | <code>    &lt;Show when={error()}&gt;&lt;p role=&quot;alert&quot;&gt;{error()}&lt;/p&gt;&lt;/Show&gt;</code> | 검증과 중복 제출 제어: 조건 accessor에 따라 본문 또는 fallback 화면을 선택한다. |
| 25 | <code>    &lt;For each={Object.entries(fields())}&gt;{([name, messages]) =&gt; &lt;p role=&quot;alert&quot;&gt;{name}: {messages.join(&#x27;, &#x27;)}&lt;/p&gt;}&lt;/For&gt;</code> | 검증과 중복 제출 제어: 배열 항목별 화면을 생성하고 항목 정체성에 따라 갱신한다. |
| 26 | <code>    &lt;button disabled={busy()} type=&quot;submit&quot;&gt;{busy() ? &#x27;저장 중…&#x27; : &#x27;저장&#x27;}&lt;/button&gt;</code> | 검증과 중복 제출 제어: 사용자 동작을 함수와 연결하고 필요하면 disabled로 잠근다. |
| 27 | <code>  &lt;/form&gt;;</code> | 검증과 중복 제출 제어의 현재 블록 또는 선언을 닫는다. |
| 28 | <code>}</code> | 검증과 중복 제출 제어의 현재 블록 또는 선언을 닫는다. |

### server/posts.mjs 전체 코드

[server/posts.mjs](server/posts.mjs)

```javascript
import { fail, text } from './errors.mjs';
export function validatePost(input, partial = false) {
  const row = {};
  for (const [name, max] of [['title', 200], ['body', 20000]]) {
    if (!partial || name in input) row[name] = text(input[name], name, max);
  }
  if (!partial || 'tags' in input) {
    if (input.tags !== undefined && (!Array.isArray(input.tags) || input.tags.length > 10 || input.tags.some(t => typeof t !== 'string' || t.length > 30)))
      fail(400, 'VALIDATION_ERROR', '태그는 30자 이하로 최대 10개입니다.', { tags: ['태그 형식을 확인하세요.'] });
    row.tags = input.tags || [];
  }
  return row;
}
export async function postDto(repo, post) {
  const author = await repo.get('users', post.authorId);
  const { authorId, ...data } = post;
  return { ...data, author: { id: authorId, nickname: author?.nickname || '탈퇴 회원' }, commentCount: (await repo.all('comments')).filter(c => c.postId === post.id).length };
}
export async function listPosts(repo, query) {
  const page = Math.max(1, Math.trunc(Number(query.get('page')) || 1));
  const limit = Math.min(50, Math.max(1, Math.trunc(Number(query.get('limit')) || 10)));
  const q = (query.get('q') || '').slice(0, 200); const sort = query.get('sort') || '-createdAt';
  if (!['createdAt', '-createdAt', '-commentCount'].includes(sort)) fail(400, 'BAD_REQUEST', '지원하지 않는 정렬입니다.');
  const filtered = (await repo.all('posts')).filter(p => `${p.title} ${p.body}`.toLowerCase().includes(q.toLowerCase()));
  const rows = await Promise.all(filtered.map(p => postDto(repo, p)));
  rows.sort((a, b) => sort === '-commentCount' ? b.commentCount - a.commentCount || b.id - a.id : (sort === 'createdAt' ? 1 : -1) * (a.createdAt.localeCompare(b.createdAt) || a.id - b.id));
  return { data: rows.slice((page - 1) * limit, page * limit), meta: { page, limit, total: rows.length, totalPages: Math.ceil(rows.length / limit), q } };
}
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>import { fail, text } from &#x27;./errors.mjs&#x27;;</code> | ./errors.mjs에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 2 | <code>export function validatePost(input, partial = false) {</code> | 게시글 검증·DTO·목록 계약: title·body·tags가 공통 게시글 입력 규칙을 만족하는지 검사한다. |
| 3 | <code>  const row = {};</code> | 게시글 검증·DTO·목록 계약에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 4 | <code>  for (const [name, max] of [[&#x27;title&#x27;, 200], [&#x27;body&#x27;, 20000]]) {</code> | 게시글 검증·DTO·목록 계약의 각 항목·프레임·작업을 순서대로 처리한다. |
| 5 | <code>    if (!partial &#124;&#124; name in input) row[name] = text(input[name], name, max);</code> | 게시글 검증·DTO·목록 계약에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 6 | <code>  }</code> | 게시글 검증·DTO·목록 계약의 현재 블록 또는 선언을 닫는다. |
| 7 | <code>  if (!partial &#124;&#124; &#x27;tags&#x27; in input) {</code> | 게시글 검증·DTO·목록 계약에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 8 | <code>    if (input.tags !== undefined &amp;&amp; (!Array.isArray(input.tags) &#124;&#124; input.tags.length &gt; 10 &#124;&#124; input.tags.some(t =&gt; typeof t !== &#x27;string&#x27; &#124;&#124; t.length &gt; 30)))</code> | 게시글 검증·DTO·목록 계약에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 9 | <code>      fail(400, &#x27;VALIDATION_ERROR&#x27;, &#x27;태그는 30자 이하로 최대 10개입니다.&#x27;, { tags: [&#x27;태그 형식을 확인하세요.&#x27;] });</code> | 게시글 검증·DTO·목록 계약: 규칙 위반을 HTTP 상태·code·필드 오류로 중단한다. |
| 10 | <code>    row.tags = input.tags &#124;&#124; [];</code> | 게시글 검증·DTO·목록 계약의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 11 | <code>  }</code> | 게시글 검증·DTO·목록 계약의 현재 블록 또는 선언을 닫는다. |
| 12 | <code>  return row;</code> | 게시글 검증·DTO·목록 계약의 현재 처리 결과를 호출자에게 돌려준다. |
| 13 | <code>}</code> | 게시글 검증·DTO·목록 계약의 현재 블록 또는 선언을 닫는다. |
| 14 | <code>export async function postDto(repo, post) {</code> | 게시글 검증·DTO·목록 계약의 이름 있는 동작과 인자 범위를 정의한다. |
| 15 | <code>  const author = await repo.get(&#x27;users&#x27;, post.authorId);</code> | 게시글 검증·DTO·목록 계약: id에 해당하는 저장 레코드를 조회한다. |
| 16 | <code>  const { authorId, ...data } = post;</code> | 게시글 검증·DTO·목록 계약에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 17 | <code>  return { ...data, author: { id: authorId, nickname: author?.nickname &#124;&#124; &#x27;탈퇴 회원&#x27; }, commentCount: (await repo.all(&#x27;comments&#x27;)).filter(c =&gt; c.postId === post.id).length };</code> | 게시글 검증·DTO·목록 계약: bucket의 레코드를 읽어 검증·필터·조회에 사용한다. |
| 18 | <code>}</code> | 게시글 검증·DTO·목록 계약의 현재 블록 또는 선언을 닫는다. |
| 19 | <code>export async function listPosts(repo, query) {</code> | 게시글 검증·DTO·목록 계약의 이름 있는 동작과 인자 범위를 정의한다. |
| 20 | <code>  const page = Math.max(1, Math.trunc(Number(query.get(&#x27;page&#x27;)) &#124;&#124; 1));</code> | 게시글 검증·DTO·목록 계약에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 21 | <code>  const limit = Math.min(50, Math.max(1, Math.trunc(Number(query.get(&#x27;limit&#x27;)) &#124;&#124; 10)));</code> | 게시글 검증·DTO·목록 계약에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 22 | <code>  const q = (query.get(&#x27;q&#x27;) &#124;&#124; &#x27;&#x27;).slice(0, 200); const sort = query.get(&#x27;sort&#x27;) &#124;&#124; &#x27;-createdAt&#x27;;</code> | 게시글 검증·DTO·목록 계약에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 23 | <code>  if (![&#x27;createdAt&#x27;, &#x27;-createdAt&#x27;, &#x27;-commentCount&#x27;].includes(sort)) fail(400, &#x27;BAD_REQUEST&#x27;, &#x27;지원하지 않는 정렬입니다.&#x27;);</code> | 게시글 검증·DTO·목록 계약: 규칙 위반을 HTTP 상태·code·필드 오류로 중단한다. |
| 24 | <code>  const filtered = (await repo.all(&#x27;posts&#x27;)).filter(p =&gt; `${p.title} ${p.body}`.toLowerCase().includes(q.toLowerCase()));</code> | 게시글 검증·DTO·목록 계약: bucket의 레코드를 읽어 검증·필터·조회에 사용한다. |
| 25 | <code>  const rows = await Promise.all(filtered.map(p =&gt; postDto(repo, p)));</code> | 게시글 검증·DTO·목록 계약에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 26 | <code>  rows.sort((a, b) =&gt; sort === &#x27;-commentCount&#x27; ? b.commentCount - a.commentCount &#124;&#124; b.id - a.id : (sort === &#x27;createdAt&#x27; ? 1 : -1) * (a.createdAt.localeCompare(b.createdAt) &#124;&#124; a.id - b.id));</code> | 게시글 검증·DTO·목록 계약의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 27 | <code>  return { data: rows.slice((page - 1) * limit, page * limit), meta: { page, limit, total: rows.length, totalPages: Math.ceil(rows.length / limit), q } };</code> | 게시글 검증·DTO·목록 계약의 현재 처리 결과를 호출자에게 돌려준다. |
| 28 | <code>}</code> | 게시글 검증·DTO·목록 계약의 현재 블록 또는 선언을 닫는다. |

## ④ 🔗 연동 포인트

PostInput {title,body,tags}를 POST 또는 PATCH로 보내고 {data:Post}의 id로 이동한다. 다음 단계는 이 계약을 DB CRUD로 완성한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| 두 번 등록 | 재클릭·중복 이벤트 | 입구 busy 가드와 disabled 병행 |
| 저장 후 버튼 잠김 | catch에서만 상태 복구 | finally에서 busy 해제 |
| 오류가 사라짐 | 실패 시 입력 초기화 | 성공 후에만 이동·초기화 |

## ⑥ 직접 해보기

1. 태그 10개 제한을 화면에도 표시한다.
2. 가짜 save가 422 ApiError를 던지도록 만들어 fields 렌더링을 확인한다.
3. 수정 200과 등록 201의 동작을 비교 없이 각각 기록한다.

## ⑦ ☐ 체크리스트

- [ ] 입력값을 서버에서도 검증한다.
- [ ] 200/201 성공·400/422 필드 오류·204 본문 없음을 처리한다.
- [ ] 진행 중 중복 제출이 차단된다.

## ⑧ 다음 단계 연결 문장

입력 검증과 서버 필드 오류를 표시하고 중복 저장을 막는다를 마쳤다면 [study6.md](study6.md)에서 이어 간다.

공식 자료: [SolidJS 1.x 소스](https://github.com/solidjs/solid/tree/v1.9.20), [Solid Router](https://docs.solidjs.com/solid-router/getting-started/installation-and-setup), [Node SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html). 최신 문서와 설치 버전이 다를 수 있어 package-lock.json을 실행 기준으로 삼는다.
