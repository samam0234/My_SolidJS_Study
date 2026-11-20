# study9 · SolidJS 테스트·디버깅·오류 TOP 10

> 기준: [SolidJS 노션 원문](https://app.notion.com/p/40bd7dec5e2e813080f8d54cf5968ad5) · [게시판 API v1](https://app.notion.com/p/3d6d7dec5e2e8139adbfd36dd506c65e) · 문서 기준일 2026-11-20 (Asia/Seoul).

## ① 목표 한 줄

동작과 계약을 테스트하고 요청 ID로 오류를 추적한다.

## ② 📖 이론

단위 테스트는 작은 규칙, 요청 테스트는 실제 HTTP·DB 계약, 브라우저 테스트는 사용자 행동을 검증한다. 테스트를 많이 만드는 것보다 깨졌을 때 중요한 오류를 잡는 것이 목적이다. node:test의 메모리 SQLite는 실제 SQL 저장소를 외부 설치 없이 실행한다.

가짜 fetch는 네트워크 경계를 대체한다. Stripe·메일·모델 API의 호출 URL·헤더·본문·스트림을 검사하면서 실제 과금·발송을 하지 않는다. UI 테스트는 시그널 갱신과 중복 제출을, Playwright는 실제 브라우저의 가입부터 CRUD·AI 응답까지 검증한다.

개발자도구 Network에서 상태·본문·X-Request-Id를 확인하고 서버 JSON 로그의 requestId와 연결한다. VS Code의 Node 디버거에서 server/index.mjs를 실행하면 검증과 owner 지점에 breakpoint를 둘 수 있다. 토큰·비밀번호·문서 본문을 로그로 출력하지 않는다.

## ③ 🛠️ 실기 · 전체 코드와 줄별 설명

이 저장소는 완성 코드와 학습 노트를 함께 제공한다. 아래 파일을 지정 경로에서 읽고 실행한다. 이 단계에서 새로 다루는 파일은 생략 없이 수록하며, import되는 공통 파일은 README와 앞선 단계의 전체 코드를 따른다. 학습 진행 상황은 체크박스에 직접 기록한다.

1. npm test에서 계약·권한·잘못된 JSON·동시 가입·AI 한도·실제 MCP stdio를 확인한다.
2. npm run test:ui에서 signal/memo/Show와 폼 잠금을 확인한다.
3. npm run build 후 Playwright Chromium을 설치하고 npm run test:e2e를 실행한다. 빌드와 E2E는 순서대로 실행하여 dist 교체 중 테스트하지 않는다.
4. 실패한 테스트의 첫 경계부터 수정한다. 브라우저→서버→DB→응답 중 어느 지점인지 분리하고 회귀 테스트를 남긴다.

**자주 나는 오류 TOP 10**

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| getter 문자열 | count() 누락 | accessor 호출 |
| props 고정 | 초기 구조분해 | props 경로에서 읽기 |
| 리스트 안 보임 | data envelope 누락 | result.data 확인 |
| 수정 무응답 | PATCH/경로 불일치 | Network의 URL·method 확인 |
| 204 파싱 오류 | json() 강제 호출 | 본문 없이 반환 |
| 새로고침 404 | SPA fallback 누락 | API 제외 fallback |
| 403 | Origin 불일치 또는 권한 없음 | 응답 code와 계정 확인 |
| 401 | 토큰 만료·누락 | Authorization·만료 확인 |
| 중복 글 | 제출 잠금 누락 | busy guard + disabled |
| 스트림 JSON 오류 | 패킷을 완성 프레임으로 간주 | UTF-8 decoder와 buffer 사용 |

실행 명령은 저장소 루트의 PowerShell 기준이다. 서버를 유지하는 명령 다음의 작업은 별도 터미널에서 실행한다.

```powershell
npm test
npm run test:ui
npm run build
npx playwright install chromium
npm run test:e2e
```

### src/labs/Signals.test.tsx 전체 코드

[src/labs/Signals.test.tsx](src/labs/Signals.test.tsx)

```tsx
import { render, screen, fireEvent } from '@solidjs/testing-library';
import { expect, test, vi } from 'vitest';
import Signals from './Signals';
import PostForm from '../components/PostForm';
test('시그널 변경 시 생성 번호를 유지하고 memo·Show가 갱신된다', () => {
  render(() => <Signals />); const instance = screen.getByText(/컴포넌트 생성 번호/).textContent;
  for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: '증가' }));
  expect(screen.getByText(/원본 3 \/ 파생 6/)).toBeInTheDocument(); expect(screen.getByText(/컴포넌트 생성 번호/).textContent).toBe(instance); expect(screen.getByText('조건이 충족되었습니다.')).toBeInTheDocument();
});
test('localStorage 초안을 입력과 묶는다', () => {
  render(() => <Signals />); fireEvent.input(screen.getByLabelText('새로고침 후 남는 메모'), { target: { value: '초안' } }); expect(localStorage.getItem('solid-study-note')).toBe('초안');
});
test('저장 처리 중 중복 제출을 막는다', async () => {
  let finish!: () => void; const save = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
  render(() => <PostForm save={save} />); fireEvent.input(screen.getByLabelText('제목'), { target: { value: '제목' } }); fireEvent.input(screen.getByLabelText('본문'), { target: { value: '본문' } });
  const button = screen.getByRole('button', { name: '저장' }); fireEvent.click(button); fireEvent.click(button); expect(save).toHaveBeenCalledTimes(1); expect(button).toBeDisabled(); finish();
});
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>import { render, screen, fireEvent } from &#x27;@solidjs/testing-library&#x27;;</code> | @solidjs/testing-library에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 2 | <code>import { expect, test, vi } from &#x27;vitest&#x27;;</code> | vitest에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 3 | <code>import Signals from &#x27;./Signals&#x27;;</code> | ./Signals에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 4 | <code>import PostForm from &#x27;../components/PostForm&#x27;;</code> | ../components/PostForm에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 5 | <code>test(&#x27;시그널 변경 시 생성 번호를 유지하고 memo·Show가 갱신된다&#x27;, () =&gt; {</code> | Signals.test.tsx: 독립적인 검증 시나리오와 비동기 정리 범위를 정의한다. |
| 6 | <code>  render(() =&gt; &lt;Signals /&gt;); const instance = screen.getByText(/컴포넌트 생성 번호/).textContent;</code> | Signals.test.tsx의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 7 | <code>  for (let i = 0; i &lt; 3; i++) fireEvent.click(screen.getByRole(&#x27;button&#x27;, { name: &#x27;증가&#x27; }));</code> | Signals.test.tsx의 각 항목·프레임·작업을 순서대로 처리한다. |
| 8 | <code>  expect(screen.getByText(/원본 3 \/ 파생 6/)).toBeInTheDocument(); expect(screen.getByText(/컴포넌트 생성 번호/).textContent).toBe(instance); expect(screen.getByText(&#x27;조건이 충족되었습니다.&#x27;)).toBeInTheDocument();</code> | Signals.test.tsx: 화면 또는 반환 값이 사용자 시나리오의 기대 결과인지 확인한다. |
| 9 | <code>});</code> | Signals.test.tsx의 현재 블록 또는 선언을 닫는다. |
| 10 | <code>test(&#x27;localStorage 초안을 입력과 묶는다&#x27;, () =&gt; {</code> | Signals.test.tsx: 독립적인 검증 시나리오와 비동기 정리 범위를 정의한다. |
| 11 | <code>  render(() =&gt; &lt;Signals /&gt;); fireEvent.input(screen.getByLabelText(&#x27;새로고침 후 남는 메모&#x27;), { target: { value: &#x27;초안&#x27; } }); expect(localStorage.getItem(&#x27;solid-study-note&#x27;)).toBe(&#x27;초안&#x27;);</code> | Signals.test.tsx: 화면 또는 반환 값이 사용자 시나리오의 기대 결과인지 확인한다. |
| 12 | <code>});</code> | Signals.test.tsx의 현재 블록 또는 선언을 닫는다. |
| 13 | <code>test(&#x27;저장 처리 중 중복 제출을 막는다&#x27;, async () =&gt; {</code> | Signals.test.tsx: 독립적인 검증 시나리오와 비동기 정리 범위를 정의한다. |
| 14 | <code>  let finish!: () =&gt; void; const save = vi.fn(() =&gt; new Promise&lt;void&gt;(resolve =&gt; { finish = resolve; }));</code> | Signals.test.tsx에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 15 | <code>  render(() =&gt; &lt;PostForm save={save} /&gt;); fireEvent.input(screen.getByLabelText(&#x27;제목&#x27;), { target: { value: &#x27;제목&#x27; } }); fireEvent.input(screen.getByLabelText(&#x27;본문&#x27;), { target: { value: &#x27;본문&#x27; } });</code> | Signals.test.tsx의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 16 | <code>  const button = screen.getByRole(&#x27;button&#x27;, { name: &#x27;저장&#x27; }); fireEvent.click(button); fireEvent.click(button); expect(save).toHaveBeenCalledTimes(1); expect(button).toBeDisabled(); finish();</code> | Signals.test.tsx: 화면 또는 반환 값이 사용자 시나리오의 기대 결과인지 확인한다. |
| 17 | <code>});</code> | Signals.test.tsx의 현재 블록 또는 선언을 닫는다. |

### tests/helpers.mjs 전체 코드

[tests/helpers.mjs](tests/helpers.mjs)

```javascript
import { createApp, environment } from '../server/app.mjs';
import { openStore } from '../server/store.mjs';
export async function fixture(t, override = {}) {
  const config = { ...environment({ AI_PROVIDER: 'mock', INTEGRATIONS_MODE: 'mock' }), ...override };
  const app = await createApp({ store: await openStore({ path: ':memory:' }), config, quiet: true });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  t.after(() => app.close());
  async function request(path, { token, method = 'GET', body, headers = {} } = {}) {
    const response = await fetch(base + path, { method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, ...(body !== undefined ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}) });
    const value = response.status === 204 ? undefined : await response.json();
    return { status: response.status, headers: response.headers, value };
  }
  async function account(label = 'mina') {
    const input = { email: `${label}@example.com`, nickname: label, password: 'password123' };
    await request('/api/auth/signup', { method: 'POST', body: input });
    return (await request('/api/auth/login', { method: 'POST', body: input })).value.data;
  }
  return { ...app, base, config, request, account };
}
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>import { createApp, environment } from &#x27;../server/app.mjs&#x27;;</code> | ../server/app.mjs에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 2 | <code>import { openStore } from &#x27;../server/store.mjs&#x27;;</code> | ../server/store.mjs에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 3 | <code>export async function fixture(t, override = {}) {</code> | helpers.mjs의 이름 있는 동작과 인자 범위를 정의한다. |
| 4 | <code>  const config = { ...environment({ AI_PROVIDER: &#x27;mock&#x27;, INTEGRATIONS_MODE: &#x27;mock&#x27; }), ...override };</code> | helpers.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 5 | <code>  const app = await createApp({ store: await openStore({ path: &#x27;:memory:&#x27; }), config, quiet: true });</code> | helpers.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 6 | <code>  await new Promise(resolve =&gt; app.server.listen(0, &#x27;127.0.0.1&#x27;, resolve));</code> | helpers.mjs의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 7 | <code>  const base = `http://127.0.0.1:${app.server.address().port}`;</code> | helpers.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 8 | <code>  t.after(() =&gt; app.close());</code> | helpers.mjs: 테스트 종료 시 서버·DB·MCP 연결을 정리한다. |
| 9 | <code>  async function request(path, { token, method = &#x27;GET&#x27;, body, headers = {} } = {}) {</code> | helpers.mjs의 이름 있는 동작과 인자 범위를 정의한다. |
| 10 | <code>    const response = await fetch(base + path, { method, headers: { ...(body !== undefined ? { &#x27;Content-Type&#x27;: &#x27;application/json&#x27; } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, ...(body !== undefined ? { body: typeof body === &#x27;string&#x27; ? body : JSON.stringify(body) } : {}) });</code> | helpers.mjs: 명시한 URL·method·header·body로 HTTP 요청을 보낸다. |
| 11 | <code>    const value = response.status === 204 ? undefined : await response.json();</code> | helpers.mjs: 본문이 없는 성공 응답에서 JSON 파싱을 생략한다. |
| 12 | <code>    return { status: response.status, headers: response.headers, value };</code> | helpers.mjs의 현재 처리 결과를 호출자에게 돌려준다. |
| 13 | <code>  }</code> | helpers.mjs의 현재 블록 또는 선언을 닫는다. |
| 14 | <code>  async function account(label = &#x27;mina&#x27;) {</code> | helpers.mjs의 이름 있는 동작과 인자 범위를 정의한다. |
| 15 | <code>    const input = { email: `${label}@example.com`, nickname: label, password: &#x27;password123&#x27; };</code> | helpers.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 16 | <code>    await request(&#x27;/api/auth/signup&#x27;, { method: &#x27;POST&#x27;, body: input });</code> | helpers.mjs의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 17 | <code>    return (await request(&#x27;/api/auth/login&#x27;, { method: &#x27;POST&#x27;, body: input })).value.data;</code> | helpers.mjs의 현재 처리 결과를 호출자에게 돌려준다. |
| 18 | <code>  }</code> | helpers.mjs의 현재 블록 또는 선언을 닫는다. |
| 19 | <code>  return { ...app, base, config, request, account };</code> | helpers.mjs의 현재 처리 결과를 호출자에게 돌려준다. |
| 20 | <code>}</code> | helpers.mjs의 현재 블록 또는 선언을 닫는다. |

### tests/api.test.mjs 전체 코드

[tests/api.test.mjs](tests/api.test.mjs)

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './helpers.mjs';
test('health·OpenAPI·404 공통 오류와 requestId', async t => {
  const { request } = await fixture(t);
  assert.deepEqual((await request('/health')).value, { status: 'ok' });
  const spec = await request('/api-docs'); assert.equal(spec.value.openapi, '3.0.3'); assert.ok(spec.value.paths['/api/posts/{id}'].patch);
  const result = await request('/api/missing', { headers: { 'X-Request-Id': 'test-request' } });
  assert.equal(result.status, 404); assert.equal(result.value.error.requestId, 'test-request'); assert.equal(result.headers.get('x-request-id'), 'test-request');
});
test('회원가입·중복 이메일·로그인·해시 비노출·로그아웃·만료', async t => {
  const { request, account, repo } = await fixture(t);
  const session = await account(); assert.equal(session.user.nickname, 'mina'); assert.ok(session.accessToken);
  const saved = (await repo.all('users'))[0]; assert.notEqual(saved.passwordHash, 'password123'); assert.ok(!JSON.stringify(session).includes('passwordHash'));
  assert.equal((await request('/api/auth/signup', { method: 'POST', body: { email: 'mina@example.com', nickname: 'm', password: 'password123' } })).status, 409);
  assert.equal((await request('/api/auth/login', { method: 'POST', body: { email: 'mina@example.com', password: 'wrong' } })).status, 401);
  assert.equal((await request('/api/auth/me', { token: session.accessToken })).status, 200);
  const row = (await repo.all('sessions'))[0]; await repo.put('sessions', { ...row, expiresAt: 0 });
  assert.equal((await request('/api/auth/me', { token: session.accessToken })).status, 401);
  const next = (await request('/api/auth/login', { method: 'POST', body: { email: 'mina@example.com', password: 'password123' } })).value.data;
  assert.equal((await request('/api/auth/logout', { method: 'POST', token: next.accessToken })).status, 204);
  assert.equal((await request('/api/auth/me', { token: next.accessToken })).status, 401);
});
test('CRUD·검색·정렬·페이지·권한·댓글·캐시 무효화 계약', async t => {
  const { request, account } = await fixture(t); const a = await account('author'); const b = await account('other');
  assert.equal((await request('/api/posts', { method: 'POST', body: {} })).status, 401);
  const created = await request('/api/posts', { method: 'POST', token: a.accessToken, body: { title: 'Solid 글', body: '시그널 학습', tags: ['solid'] } });
  assert.equal(created.status, 201); const id = created.value.data.id; assert.equal(created.headers.get('location'), `/api/posts/${id}`);
  assert.deepEqual(created.value.data.author, { id: a.user.id, nickname: 'author' }); assert.equal(created.value.data.commentCount, 0);
  assert.ok(created.value.data.createdAt.endsWith('Z'));
  let list = await request('/api/posts?q=SOLID&limit=99'); assert.equal(list.value.meta.limit, 50); assert.equal(list.value.meta.total, 1); assert.equal(list.value.meta.totalPages, 1);
  assert.equal((await request('/api/posts?q=SOLID&limit=99')).headers.get('x-cache'), 'HIT');
  assert.equal((await request(`/api/posts/${id}`, { method: 'PATCH', token: b.accessToken, body: { title: '해킹' } })).status, 403);
  const updated = await request(`/api/posts/${id}`, { method: 'PATCH', token: a.accessToken, body: { title: '수정' } }); assert.equal(updated.value.data.title, '수정'); assert.equal(updated.value.data.body, '시그널 학습');
  assert.equal((await request('/api/posts?q=SOLID&limit=99')).headers.get('x-cache'), 'MISS');
  const comment = await request(`/api/posts/${id}/comments`, { method: 'POST', token: b.accessToken, body: { body: '댓글입니다' } }); assert.equal(comment.status, 201);
  assert.equal((await request(`/api/posts/${id}`)).value.data.commentCount, 1);
  assert.equal((await request('/api/posts?sort=-commentCount')).value.data[0].id, id);
  assert.equal((await request(`/api/comments/${comment.value.data.id}`, { method: 'DELETE', token: a.accessToken })).status, 403);
  assert.equal((await request(`/api/comments/${comment.value.data.id}`, { method: 'DELETE', token: b.accessToken })).status, 204);
  assert.equal((await request(`/api/posts/${id}`, { method: 'DELETE', token: a.accessToken })).status, 204);
  assert.equal((await request(`/api/posts/${id}`)).status, 404);
});
test('검증 오류·잘못된 JSON·숫자 id·태그·CORS', async t => {
  const { request, account } = await fixture(t); const { accessToken: token } = await account();
  for (const body of ['{', 'null', '[]']) assert.equal((await request('/api/posts', { method: 'POST', token, body })).status, 400);
  const invalid = await request('/api/posts', { method: 'POST', token, body: { title: '', body: 'x' } }); assert.equal(invalid.value.error.code, 'VALIDATION_ERROR'); assert.ok(invalid.value.error.fields.title);
  assert.equal((await request('/api/posts', { method: 'POST', token, body: { title: 'x', body: 'x', tags: [42] } })).status, 400);
  assert.equal((await request('/api/posts/nope')).status, 400);
  assert.equal((await request('/api/posts?sort=unsafe')).status, 400);
  assert.equal((await request('/api/posts', { headers: { Origin: 'https://evil.example' } })).status, 403);
  assert.equal((await request('/api/posts', { headers: { Origin: 'http://localhost:5173' } })).headers.get('access-control-allow-origin'), 'http://localhost:5173');
});
test('동시 회원가입 중복 방지', async t => {
  const { request } = await fixture(t); const body = { email: 'same@example.com', password: 'password123', nickname: 'same' };
  const results = await Promise.all([1, 2].map(() => request('/api/auth/signup', { method: 'POST', body })));
  assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
});
test('문서 권한·mock SSE·질문 기록·사용량·작업 큐', async t => {
  const { request, account, base, repo } = await fixture(t); const a = await account('one'); const b = await account('two');
  const doc = await request('/api/documents', { method: 'POST', token: a.accessToken, body: { filename: 'signals.md', content: '시그널은 읽는 위치를 추적합니다. Solid 학습 문서입니다.' } });
  assert.equal(doc.status, 201); const id = doc.value.data.id;
  assert.equal((await request(`/api/documents/${id}`, { token: b.accessToken })).status, 403);
  const response = await fetch(`${base}/api/ai/chat/stream`, { method: 'POST', headers: { Authorization: `Bearer ${a.accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId: id, question: '시그널은 무엇인가요?' }) });
  assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /text\/event-stream/);
  const stream = await response.text(); assert.ok(stream.includes('data: [DONE]')); assert.ok(stream.includes('sources'));
  const history = await request(`/api/documents/${id}/questions`, { token: a.accessToken }); assert.equal(history.value.data.length, 1); assert.match(history.value.data[0].answer, /발췌 1/);
  assert.equal((await repo.all('usage'))[0].state, 'complete');
  const queued = await request(`/api/documents/${id}/analyze`, { method: 'POST', token: a.accessToken }); assert.equal(queued.status, 202);
  let job; for (let i = 0; i < 30; i++) { job = await request(`/api/jobs/${queued.value.data.id}`, { token: a.accessToken }); if (job.value.data.state === 'complete') break; await new Promise(r => setTimeout(r, 50)); }
  assert.equal(job.value.data.state, 'complete'); assert.equal(job.value.data.result.characters, doc.value.data.content.length);
});
test('AI 한도·업로드 형식·크기 검증', async t => {
  const { request, account } = await fixture(t, { aiLimit: 1 }); const { accessToken: token } = await account();
  assert.equal((await request('/api/documents', { method: 'POST', token, body: { filename: 'script.html', content: '<script>x</script>' } })).status, 400);
  const doc = await request('/api/documents', { method: 'POST', token, body: { filename: 'x.txt', content: 'hello' } });
  assert.equal((await request('/api/ai/chat/stream', { method: 'POST', token, body: { documentId: doc.value.data.id, question: 'hello?' } })).status, 429);
  assert.equal((await request('/api/documents', { method: 'POST', token, body: { filename: 'x.txt', content: '한'.repeat(190000) } })).status, 413);
});
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>import test from &#x27;node:test&#x27;;</code> | node:test에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 2 | <code>import assert from &#x27;node:assert/strict&#x27;;</code> | node:assert/strict에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 3 | <code>import { fixture } from &#x27;./helpers.mjs&#x27;;</code> | ./helpers.mjs에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 4 | <code>test(&#x27;health·OpenAPI·404 공통 오류와 requestId&#x27;, async t =&gt; {</code> | api.test.mjs: 요청 추적 ID를 생성하거나 응답·로그로 전달한다. |
| 5 | <code>  const { request } = await fixture(t);</code> | api.test.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 6 | <code>  assert.deepEqual((await request(&#x27;/health&#x27;)).value, { status: &#x27;ok&#x27; });</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 7 | <code>  const spec = await request(&#x27;/api-docs&#x27;); assert.equal(spec.value.openapi, &#x27;3.0.3&#x27;); assert.ok(spec.value.paths[&#x27;/api/posts/{id}&#x27;].patch);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 8 | <code>  const result = await request(&#x27;/api/missing&#x27;, { headers: { &#x27;X-Request-Id&#x27;: &#x27;test-request&#x27; } });</code> | api.test.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 9 | <code>  assert.equal(result.status, 404); assert.equal(result.value.error.requestId, &#x27;test-request&#x27;); assert.equal(result.headers.get(&#x27;x-request-id&#x27;), &#x27;test-request&#x27;);</code> | api.test.mjs: 요청 추적 ID를 생성하거나 응답·로그로 전달한다. |
| 10 | <code>});</code> | api.test.mjs의 현재 블록 또는 선언을 닫는다. |
| 11 | <code>test(&#x27;회원가입·중복 이메일·로그인·해시 비노출·로그아웃·만료&#x27;, async t =&gt; {</code> | api.test.mjs: 독립적인 검증 시나리오와 비동기 정리 범위를 정의한다. |
| 12 | <code>  const { request, account, repo } = await fixture(t);</code> | api.test.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 13 | <code>  const session = await account(); assert.equal(session.user.nickname, &#x27;mina&#x27;); assert.ok(session.accessToken);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 14 | <code>  const saved = (await repo.all(&#x27;users&#x27;))[0]; assert.notEqual(saved.passwordHash, &#x27;password123&#x27;); assert.ok(!JSON.stringify(session).includes(&#x27;passwordHash&#x27;));</code> | api.test.mjs: bucket의 레코드를 읽어 검증·필터·조회에 사용한다. |
| 15 | <code>  assert.equal((await request(&#x27;/api/auth/signup&#x27;, { method: &#x27;POST&#x27;, body: { email: &#x27;mina@example.com&#x27;, nickname: &#x27;m&#x27;, password: &#x27;password123&#x27; } })).status, 409);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 16 | <code>  assert.equal((await request(&#x27;/api/auth/login&#x27;, { method: &#x27;POST&#x27;, body: { email: &#x27;mina@example.com&#x27;, password: &#x27;wrong&#x27; } })).status, 401);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 17 | <code>  assert.equal((await request(&#x27;/api/auth/me&#x27;, { token: session.accessToken })).status, 200);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 18 | <code>  const row = (await repo.all(&#x27;sessions&#x27;))[0]; await repo.put(&#x27;sessions&#x27;, { ...row, expiresAt: 0 });</code> | api.test.mjs: 기존 id의 레코드를 새 값으로 저장한다. |
| 19 | <code>  assert.equal((await request(&#x27;/api/auth/me&#x27;, { token: session.accessToken })).status, 401);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 20 | <code>  const next = (await request(&#x27;/api/auth/login&#x27;, { method: &#x27;POST&#x27;, body: { email: &#x27;mina@example.com&#x27;, password: &#x27;password123&#x27; } })).value.data;</code> | api.test.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 21 | <code>  assert.equal((await request(&#x27;/api/auth/logout&#x27;, { method: &#x27;POST&#x27;, token: next.accessToken })).status, 204);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 22 | <code>  assert.equal((await request(&#x27;/api/auth/me&#x27;, { token: next.accessToken })).status, 401);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 23 | <code>});</code> | api.test.mjs의 현재 블록 또는 선언을 닫는다. |
| 24 | <code>test(&#x27;CRUD·검색·정렬·페이지·권한·댓글·캐시 무효화 계약&#x27;, async t =&gt; {</code> | api.test.mjs: 독립적인 검증 시나리오와 비동기 정리 범위를 정의한다. |
| 25 | <code>  const { request, account } = await fixture(t); const a = await account(&#x27;author&#x27;); const b = await account(&#x27;other&#x27;);</code> | api.test.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 26 | <code>  assert.equal((await request(&#x27;/api/posts&#x27;, { method: &#x27;POST&#x27;, body: {} })).status, 401);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 27 | <code>  const created = await request(&#x27;/api/posts&#x27;, { method: &#x27;POST&#x27;, token: a.accessToken, body: { title: &#x27;Solid 글&#x27;, body: &#x27;시그널 학습&#x27;, tags: [&#x27;solid&#x27;] } });</code> | api.test.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 28 | <code>  assert.equal(created.status, 201); const id = created.value.data.id; assert.equal(created.headers.get(&#x27;location&#x27;), `/api/posts/${id}`);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 29 | <code>  assert.deepEqual(created.value.data.author, { id: a.user.id, nickname: &#x27;author&#x27; }); assert.equal(created.value.data.commentCount, 0);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 30 | <code>  assert.ok(created.value.data.createdAt.endsWith(&#x27;Z&#x27;));</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 31 | <code>  let list = await request(&#x27;/api/posts?q=SOLID&amp;limit=99&#x27;); assert.equal(list.value.meta.limit, 50); assert.equal(list.value.meta.total, 1); assert.equal(list.value.meta.totalPages, 1);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 32 | <code>  assert.equal((await request(&#x27;/api/posts?q=SOLID&amp;limit=99&#x27;)).headers.get(&#x27;x-cache&#x27;), &#x27;HIT&#x27;);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 33 | <code>  assert.equal((await request(`/api/posts/${id}`, { method: &#x27;PATCH&#x27;, token: b.accessToken, body: { title: &#x27;해킹&#x27; } })).status, 403);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 34 | <code>  const updated = await request(`/api/posts/${id}`, { method: &#x27;PATCH&#x27;, token: a.accessToken, body: { title: &#x27;수정&#x27; } }); assert.equal(updated.value.data.title, &#x27;수정&#x27;); assert.equal(updated.value.data.body, &#x27;시그널 학습&#x27;);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 35 | <code>  assert.equal((await request(&#x27;/api/posts?q=SOLID&amp;limit=99&#x27;)).headers.get(&#x27;x-cache&#x27;), &#x27;MISS&#x27;);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 36 | <code>  const comment = await request(`/api/posts/${id}/comments`, { method: &#x27;POST&#x27;, token: b.accessToken, body: { body: &#x27;댓글입니다&#x27; } }); assert.equal(comment.status, 201);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 37 | <code>  assert.equal((await request(`/api/posts/${id}`)).value.data.commentCount, 1);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 38 | <code>  assert.equal((await request(&#x27;/api/posts?sort=-commentCount&#x27;)).value.data[0].id, id);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 39 | <code>  assert.equal((await request(`/api/comments/${comment.value.data.id}`, { method: &#x27;DELETE&#x27;, token: a.accessToken })).status, 403);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 40 | <code>  assert.equal((await request(`/api/comments/${comment.value.data.id}`, { method: &#x27;DELETE&#x27;, token: b.accessToken })).status, 204);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 41 | <code>  assert.equal((await request(`/api/posts/${id}`, { method: &#x27;DELETE&#x27;, token: a.accessToken })).status, 204);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 42 | <code>  assert.equal((await request(`/api/posts/${id}`)).status, 404);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 43 | <code>});</code> | api.test.mjs의 현재 블록 또는 선언을 닫는다. |
| 44 | <code>test(&#x27;검증 오류·잘못된 JSON·숫자 id·태그·CORS&#x27;, async t =&gt; {</code> | api.test.mjs: 독립적인 검증 시나리오와 비동기 정리 범위를 정의한다. |
| 45 | <code>  const { request, account } = await fixture(t); const { accessToken: token } = await account();</code> | api.test.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 46 | <code>  for (const body of [&#x27;{&#x27;, &#x27;null&#x27;, &#x27;[]&#x27;]) assert.equal((await request(&#x27;/api/posts&#x27;, { method: &#x27;POST&#x27;, token, body })).status, 400);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 47 | <code>  const invalid = await request(&#x27;/api/posts&#x27;, { method: &#x27;POST&#x27;, token, body: { title: &#x27;&#x27;, body: &#x27;x&#x27; } }); assert.equal(invalid.value.error.code, &#x27;VALIDATION_ERROR&#x27;); assert.ok(invalid.value.error.fields.title);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 48 | <code>  assert.equal((await request(&#x27;/api/posts&#x27;, { method: &#x27;POST&#x27;, token, body: { title: &#x27;x&#x27;, body: &#x27;x&#x27;, tags: [42] } })).status, 400);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 49 | <code>  assert.equal((await request(&#x27;/api/posts/nope&#x27;)).status, 400);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 50 | <code>  assert.equal((await request(&#x27;/api/posts?sort=unsafe&#x27;)).status, 400);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 51 | <code>  assert.equal((await request(&#x27;/api/posts&#x27;, { headers: { Origin: &#x27;https://evil.example&#x27; } })).status, 403);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 52 | <code>  assert.equal((await request(&#x27;/api/posts&#x27;, { headers: { Origin: &#x27;http://localhost:5173&#x27; } })).headers.get(&#x27;access-control-allow-origin&#x27;), &#x27;http://localhost:5173&#x27;);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 53 | <code>});</code> | api.test.mjs의 현재 블록 또는 선언을 닫는다. |
| 54 | <code>test(&#x27;동시 회원가입 중복 방지&#x27;, async t =&gt; {</code> | api.test.mjs: 독립적인 검증 시나리오와 비동기 정리 범위를 정의한다. |
| 55 | <code>  const { request } = await fixture(t); const body = { email: &#x27;same@example.com&#x27;, password: &#x27;password123&#x27;, nickname: &#x27;same&#x27; };</code> | api.test.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 56 | <code>  const results = await Promise.all([1, 2].map(() =&gt; request(&#x27;/api/auth/signup&#x27;, { method: &#x27;POST&#x27;, body })));</code> | api.test.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 57 | <code>  assert.deepEqual(results.map(r =&gt; r.status).sort(), [201, 409]);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 58 | <code>});</code> | api.test.mjs의 현재 블록 또는 선언을 닫는다. |
| 59 | <code>test(&#x27;문서 권한·mock SSE·질문 기록·사용량·작업 큐&#x27;, async t =&gt; {</code> | api.test.mjs: 독립적인 검증 시나리오와 비동기 정리 범위를 정의한다. |
| 60 | <code>  const { request, account, base, repo } = await fixture(t); const a = await account(&#x27;one&#x27;); const b = await account(&#x27;two&#x27;);</code> | api.test.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 61 | <code>  const doc = await request(&#x27;/api/documents&#x27;, { method: &#x27;POST&#x27;, token: a.accessToken, body: { filename: &#x27;signals.md&#x27;, content: &#x27;시그널은 읽는 위치를 추적합니다. Solid 학습 문서입니다.&#x27; } });</code> | api.test.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 62 | <code>  assert.equal(doc.status, 201); const id = doc.value.data.id;</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 63 | <code>  assert.equal((await request(`/api/documents/${id}`, { token: b.accessToken })).status, 403);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 64 | <code>  const response = await fetch(`${base}/api/ai/chat/stream`, { method: &#x27;POST&#x27;, headers: { Authorization: `Bearer ${a.accessToken}`, &#x27;Content-Type&#x27;: &#x27;application/json&#x27; }, body: JSON.stringify({ documentId: id, question: &#x27;시그널은 무엇인가요?&#x27; }) });</code> | api.test.mjs: 명시한 URL·method·header·body로 HTTP 요청을 보낸다. |
| 65 | <code>  assert.equal(response.status, 200); assert.match(response.headers.get(&#x27;content-type&#x27;), /text\/event-stream/);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 66 | <code>  const stream = await response.text(); assert.ok(stream.includes(&#x27;data: [DONE]&#x27;)); assert.ok(stream.includes(&#x27;sources&#x27;));</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 67 | <code>  const history = await request(`/api/documents/${id}/questions`, { token: a.accessToken }); assert.equal(history.value.data.length, 1); assert.match(history.value.data[0].answer, /발췌 1/);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 68 | <code>  assert.equal((await repo.all(&#x27;usage&#x27;))[0].state, &#x27;complete&#x27;);</code> | api.test.mjs: bucket의 레코드를 읽어 검증·필터·조회에 사용한다. |
| 69 | <code>  const queued = await request(`/api/documents/${id}/analyze`, { method: &#x27;POST&#x27;, token: a.accessToken }); assert.equal(queued.status, 202);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 70 | <code>  let job; for (let i = 0; i &lt; 30; i++) { job = await request(`/api/jobs/${queued.value.data.id}`, { token: a.accessToken }); if (job.value.data.state === &#x27;complete&#x27;) break; await new Promise(r =&gt; setTimeout(r, 50)); }</code> | api.test.mjs: 시간 상한 또는 재연결 대기 후 작업을 예약한다. |
| 71 | <code>  assert.equal(job.value.data.state, &#x27;complete&#x27;); assert.equal(job.value.data.result.characters, doc.value.data.content.length);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 72 | <code>});</code> | api.test.mjs의 현재 블록 또는 선언을 닫는다. |
| 73 | <code>test(&#x27;AI 한도·업로드 형식·크기 검증&#x27;, async t =&gt; {</code> | api.test.mjs: 독립적인 검증 시나리오와 비동기 정리 범위를 정의한다. |
| 74 | <code>  const { request, account } = await fixture(t, { aiLimit: 1 }); const { accessToken: token } = await account();</code> | api.test.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 75 | <code>  assert.equal((await request(&#x27;/api/documents&#x27;, { method: &#x27;POST&#x27;, token, body: { filename: &#x27;script.html&#x27;, content: &#x27;&lt;script&gt;x&lt;/script&gt;&#x27; } })).status, 400);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 76 | <code>  const doc = await request(&#x27;/api/documents&#x27;, { method: &#x27;POST&#x27;, token, body: { filename: &#x27;x.txt&#x27;, content: &#x27;hello&#x27; } });</code> | api.test.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 77 | <code>  assert.equal((await request(&#x27;/api/ai/chat/stream&#x27;, { method: &#x27;POST&#x27;, token, body: { documentId: doc.value.data.id, question: &#x27;hello?&#x27; } })).status, 429);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 78 | <code>  assert.equal((await request(&#x27;/api/documents&#x27;, { method: &#x27;POST&#x27;, token, body: { filename: &#x27;x.txt&#x27;, content: &#x27;한&#x27;.repeat(190000) } })).status, 413);</code> | api.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 79 | <code>});</code> | api.test.mjs의 현재 블록 또는 선언을 닫는다. |

## ④ 🔗 연동 포인트

tests/helpers가 의존성을 주입해 메모리 DB를 사용하고 외부 fetch는 가짜 응답으로 바꾼다. 이 검증을 study16 CI에서 그대로 실행한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| E2E에 JSON만 보임 | 빌드 산출물 없음 | build 완료 후 E2E |
| 테스트끼리 간섭 | 공유 DB 사용 | fixture별 메모리 DB |
| mock인데 과금 | 실제 fetch 호출 경로 잔존 | 어댑터 fetcher 주입과 mock 모드 확인 |

## ⑥ 직접 해보기

1. 의도적으로 owner 검사를 제거해 테스트가 실패하는지 확인한 후 복구한다.
2. 잘못된 tags 입력 케이스를 하나 추가한다.
3. requestId 하나로 브라우저와 서버 기록을 연결한다.

## ⑦ ☐ 체크리스트

- [ ] 단위·HTTP·브라우저 테스트 경계를 구분한다.
- [ ] DB·외부 API를 격리하여 테스트한다.
- [ ] 오류 TOP 10을 재현 또는 설명했다.

## ⑧ 다음 단계 연결 문장

동작과 계약을 테스트하고 요청 ID로 오류를 추적한다를 마쳤다면 [study10.md](study10.md)에서 이어 간다.

공식 자료: [SolidJS 1.x 소스](https://github.com/solidjs/solid/tree/v1.9.20), [Solid Router](https://docs.solidjs.com/solid-router/getting-started/installation-and-setup), [Node SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html). 최신 문서와 설치 버전이 다를 수 있어 package-lock.json을 실행 기준으로 삼는다.
