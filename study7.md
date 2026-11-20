# study7 · SolidJS 인증·보안 기초

> 기준: [SolidJS 노션 원문](https://app.notion.com/p/40bd7dec5e2e813080f8d54cf5968ad5) · [게시판 API v1](https://app.notion.com/p/3d6d7dec5e2e8139adbfd36dd506c65e) · 문서 기준일 2026-11-20 (Asia/Seoul).

## ① 목표 한 줄

서버 세션 토큰과 작성자 검사로 사용자 경계를 만든다.

## ② 📖 이론

인증은 누구인가, 인가는 무엇을 바꿀 수 있는가다. 회원가입은 salt와 scrypt로 비밀번호를 해시한다. 복호화가 가능한 암호화가 아니며 원문을 DB·응답·로그에 남기지 않는다. 로그인은 같은 입력에서 계산한 키를 timingSafeEqual로 검사한다.

이 과정은 JWT 대신 무작위 opaque Bearer 세션을 사용한다. 토큰 원문은 메모리의 프론트 상태에만 있고 DB에는 SHA-256 해시와 만료 시각을 저장한다. 서버가 세션을 지워 즉시 로그아웃시킬 수 있다. 만료 기본값은 1시간이다. 새로고침하면 메모리가 사라져 다시 로그인한다.

CORS는 허용 Origin 정책이며 인증을 대신하지 않는다. 일반 API는 자동 첨부 쿠키 대신 명시적인 Authorization을 사용하여 CSRF 표면을 줄인다. httpOnly 쿠키로 전환하면 SameSite·Secure·Origin 검증과 CSRF 토큰 전략이 필요하다. XSS는 문자열을 텍스트로 렌더링하고 innerHTML을 피하며 서버의 CSP와 함께 줄인다. UI의 수정 버튼 숨김 외에도 서버 owner 검사가 반드시 필요하다.

## ③ 🛠️ 실기 · 전체 코드와 줄별 설명

이 저장소는 완성 코드와 학습 노트를 함께 제공한다. 아래 파일을 지정 경로에서 읽고 실행한다. 이 단계에서 새로 다루는 파일은 생략 없이 수록하며, import되는 공통 파일은 README와 앞선 단계의 전체 코드를 따른다. 학습 진행 상황은 체크박스에 직접 기록한다.

1. 이메일·10~128자 비밀번호·닉네임으로 가입한다. 중복 이메일은 409다.
2. 로그인 200 응답을 acceptSession에 전달한다. api 함수가 Authorization 헤더를 붙인다.
3. 다른 계정으로 남의 글 PATCH/DELETE를 시도해 403을 확인한다. 토큰 없음·만료·위조는 401이다.
4. 로그아웃은 서버 세션을 삭제한 뒤 프론트 상태를 지운다. 401 응답에도 프론트 세션을 초기화한다.
5. 악성 마크업을 본문으로 저장해도 글자로 표시되는지 브라우저 테스트로 확인한다. 로그인 실패 제한도 서버에서 검사한다.

실행 명령은 저장소 루트의 PowerShell 기준이다. 서버를 유지하는 명령 다음의 작업은 별도 터미널에서 실행한다.

```powershell
npm test
npm run test:e2e
```

### server/auth.mjs 전체 코드

[server/auth.mjs](server/auth.mjs)

```javascript
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
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>import { randomBytes, scrypt as derive, timingSafeEqual, createHash } from &#x27;node:crypto&#x27;;</code> | node:crypto에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 2 | <code>import { promisify } from &#x27;node:util&#x27;;</code> | node:util에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 3 | <code>import { fail, text } from &#x27;./errors.mjs&#x27;;</code> | ./errors.mjs에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 4 | <code>const scrypt = promisify(derive);</code> | 비밀번호·세션·권한: salt를 포함한 비밀번호 키 유도 연산을 수행한다. |
| 5 | <code>export const digest = token =&gt; createHash(&#x27;sha256&#x27;).update(token).digest(&#x27;hex&#x27;);</code> | 비밀번호·세션·권한에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 6 | <code>export const publicUser = user =&gt; ({ id: user.id, email: user.email, nickname: user.nickname });</code> | 비밀번호·세션·권한에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 7 | <code>export async function hashPassword(password) {</code> | 비밀번호·세션·권한의 이름 있는 동작과 인자 범위를 정의한다. |
| 8 | <code>  const salt = randomBytes(16).toString(&#x27;hex&#x27;);</code> | 비밀번호·세션·권한: 예측하기 어려운 세션·OAuth 값을 생성한다. |
| 9 | <code>  const key = await scrypt(password, salt, 64);</code> | 비밀번호·세션·권한: salt를 포함한 비밀번호 키 유도 연산을 수행한다. |
| 10 | <code>  return `${salt}:${key.toString(&#x27;hex&#x27;)}`;</code> | 비밀번호·세션·권한의 현재 처리 결과를 호출자에게 돌려준다. |
| 11 | <code>}</code> | 비밀번호·세션·권한의 현재 블록 또는 선언을 닫는다. |
| 12 | <code>export async function verifyPassword(password, encoded) {</code> | 비밀번호·세션·권한의 이름 있는 동작과 인자 범위를 정의한다. |
| 13 | <code>  const [salt, hash] = encoded.split(&#x27;:&#x27;);</code> | 비밀번호·세션·권한에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 14 | <code>  const candidate = await scrypt(password, salt, 64); const expected = Buffer.from(hash, &#x27;hex&#x27;);</code> | 비밀번호·세션·권한: salt를 포함한 비밀번호 키 유도 연산을 수행한다. |
| 15 | <code>  return expected.length === candidate.length &amp;&amp; timingSafeEqual(expected, candidate);</code> | 비밀번호·세션·권한: 길이가 같은 비밀번호 해시를 상수 시간 비교한다. |
| 16 | <code>}</code> | 비밀번호·세션·권한의 현재 블록 또는 선언을 닫는다. |
| 17 | <code>export async function signUp(repo, input) {</code> | 비밀번호·세션·권한의 이름 있는 동작과 인자 범위를 정의한다. |
| 18 | <code>  const email = text(input.email, &#x27;email&#x27;, 254).toLowerCase();</code> | 비밀번호·세션·권한에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 19 | <code>  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, &#x27;VALIDATION_ERROR&#x27;, &#x27;이메일을 확인하세요.&#x27;, { email: [&#x27;이메일 형식이 아닙니다.&#x27;] });</code> | 비밀번호·세션·권한: 규칙 위반을 HTTP 상태·code·필드 오류로 중단한다. |
| 20 | <code>  const password = text(input.password, &#x27;password&#x27;, 128, 10);</code> | 비밀번호·세션·권한에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 21 | <code>  const nickname = text(input.nickname, &#x27;nickname&#x27;, 40);</code> | 비밀번호·세션·권한에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 22 | <code>  if ((await repo.all(&#x27;users&#x27;)).some(u =&gt; u.email === email)) fail(409, &#x27;EMAIL_TAKEN&#x27;, &#x27;이미 등록된 이메일입니다.&#x27;);</code> | 비밀번호·세션·권한: bucket의 레코드를 읽어 검증·필터·조회에 사용한다. |
| 23 | <code>  return repo.insert(&#x27;users&#x27;, { email, nickname, passwordHash: await hashPassword(password) });</code> | 비밀번호·세션·권한: 도메인 레코드에 숫자 id를 부여하여 저장한다. |
| 24 | <code>}</code> | 비밀번호·세션·권한의 현재 블록 또는 선언을 닫는다. |
| 25 | <code>export async function issueSession(repo, user, ttl = 3600) {</code> | 비밀번호·세션·권한의 이름 있는 동작과 인자 범위를 정의한다. |
| 26 | <code>  const accessToken = randomBytes(32).toString(&#x27;base64url&#x27;);</code> | 비밀번호·세션·권한: 예측하기 어려운 세션·OAuth 값을 생성한다. |
| 27 | <code>  await repo.insert(&#x27;sessions&#x27;, { tokenHash: digest(accessToken), userId: user.id, expiresAt: Date.now() + ttl * 1000 });</code> | 비밀번호·세션·권한: 도메인 레코드에 숫자 id를 부여하여 저장한다. |
| 28 | <code>  return { user: publicUser(user), accessToken };</code> | 비밀번호·세션·권한의 현재 처리 결과를 호출자에게 돌려준다. |
| 29 | <code>}</code> | 비밀번호·세션·권한의 현재 블록 또는 선언을 닫는다. |
| 30 | <code>export async function authenticate(repo, header) {</code> | 비밀번호·세션·권한: Bearer 세션 해시·만료·사용자를 서버에서 확인한다. |
| 31 | <code>  const token = typeof header === &#x27;string&#x27; &amp;&amp; header.startsWith(&#x27;Bearer &#x27;) ? header.slice(7) : &#x27;&#x27;;</code> | 비밀번호·세션·권한에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 32 | <code>  if (!token) fail(401, &#x27;UNAUTHORIZED&#x27;, &#x27;로그인이 필요합니다.&#x27;);</code> | 비밀번호·세션·권한: 규칙 위반을 HTTP 상태·code·필드 오류로 중단한다. |
| 33 | <code>  const session = (await repo.all(&#x27;sessions&#x27;)).find(s =&gt; s.tokenHash === digest(token) &amp;&amp; s.expiresAt &gt; Date.now());</code> | 비밀번호·세션·권한: bucket의 레코드를 읽어 검증·필터·조회에 사용한다. |
| 34 | <code>  const user = session &amp;&amp; await repo.get(&#x27;users&#x27;, session.userId);</code> | 비밀번호·세션·권한: id에 해당하는 저장 레코드를 조회한다. |
| 35 | <code>  if (!user) fail(401, &#x27;UNAUTHORIZED&#x27;, &#x27;로그인이 만료되었습니다.&#x27;);</code> | 비밀번호·세션·권한: 규칙 위반을 HTTP 상태·code·필드 오류로 중단한다. |
| 36 | <code>  return { user, session };</code> | 비밀번호·세션·권한의 현재 처리 결과를 호출자에게 돌려준다. |
| 37 | <code>}</code> | 비밀번호·세션·권한의 현재 블록 또는 선언을 닫는다. |
| 38 | <code>export function owner(row, user) {</code> | 비밀번호·세션·권한: 현재 사용자와 작성자를 비교하여 변경 권한을 확인한다. |
| 39 | <code>  if (row.authorId !== user.id) fail(403, &#x27;FORBIDDEN&#x27;, &#x27;작성자만 변경할 수 있습니다.&#x27;);</code> | 비밀번호·세션·권한: 규칙 위반을 HTTP 상태·code·필드 오류로 중단한다. |
| 40 | <code>}</code> | 비밀번호·세션·권한의 현재 블록 또는 선언을 닫는다. |

### src/session.ts 전체 코드

[src/session.ts](src/session.ts)

```typescript
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
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>import { createSignal } from &#x27;solid-js&#x27;;</code> | solid-js에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 2 | <code>import type { User } from &#x27;./types&#x27;;</code> | ./types에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 3 | <code>const [token, setToken] = createSignal(&#x27;&#x27;);</code> | session.ts: 변경될 값을 accessor·setter 쌍으로 만들고 이후 JSX·함수에서 읽게 한다. |
| 4 | <code>const [user, setUser] = createSignal&lt;User&gt;();</code> | session.ts: 변경될 값을 accessor·setter 쌍으로 만들고 이후 JSX·함수에서 읽게 한다. |
| 5 | <code>export { token, user };</code> | session.ts의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 6 | <code>export function acceptSession(session: { user: User; accessToken: string }) {</code> | session.ts의 이름 있는 동작과 인자 범위를 정의한다. |
| 7 | <code>  setToken(session.accessToken); setUser(session.user);</code> | session.ts의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 8 | <code>}</code> | session.ts의 현재 블록 또는 선언을 닫는다. |
| 9 | <code>export function clearSession() { setToken(&#x27;&#x27;); setUser(undefined); }</code> | session.ts의 이름 있는 동작과 인자 범위를 정의한다. |
| 10 | <code>// 토큰은 메모리에만 둔다. 새로고침 뒤에는 다시 로그인한다.</code> | 토큰은 메모리에만 둔다. 새로고침 뒤에는 다시 로그인한다. |

### src/pages/Login.tsx 전체 코드

[src/pages/Login.tsx](src/pages/Login.tsx)

```tsx
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
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>import { useNavigate, useSearchParams } from &#x27;@solidjs/router&#x27;;</code> | @solidjs/router에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 2 | <code>import { createSignal, onMount, Show } from &#x27;solid-js&#x27;;</code> | solid-js에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 3 | <code>import { api } from &#x27;../api&#x27;;</code> | ../api에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 4 | <code>import { config } from &#x27;../config&#x27;;</code> | ../config에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 5 | <code>import { acceptSession } from &#x27;../session&#x27;;</code> | ../session에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 6 | <code>import type { User } from &#x27;../types&#x27;;</code> | ../types에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 7 | <code>export default function Login() {</code> | 가입·로그인과 세션 연결의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 8 | <code>  const [signup, setSignup] = createSignal(false); const [busy, setBusy] = createSignal(false); const [error, setError] = createSignal(&#x27;&#x27;);</code> | 가입·로그인과 세션 연결: 변경될 값을 accessor·setter 쌍으로 만들고 이후 JSX·함수에서 읽게 한다. |
| 9 | <code>  const navigate = useNavigate(); const [query, setQuery] = useSearchParams();</code> | 가입·로그인과 세션 연결: 검색·페이지 상태를 주소 쿼리와 연결한다. |
| 10 | <code>  type Session = { data: { user: User; accessToken: string } };</code> | 가입·로그인과 세션 연결에서 사용하는 데이터 필드와 타입 계약을 선언한다. |
| 11 | <code>  onMount(async () =&gt; {</code> | 가입·로그인과 세션 연결: 브라우저에서 컴포넌트가 마운트된 뒤 초기 작업을 시작한다. |
| 12 | <code>    const code = query.code; if (!code &#124;&#124; typeof code !== &#x27;string&#x27;) return;</code> | 가입·로그인과 세션 연결에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 13 | <code>    setQuery({ code: undefined }); setBusy(true);</code> | 가입·로그인과 세션 연결의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 14 | <code>    try { const result = await api&lt;Session&gt;(&#x27;/api/oauth/exchange&#x27;, { method: &#x27;POST&#x27;, body: JSON.stringify({ code }) }); acceptSession(result.data); navigate(&#x27;/&#x27;); }</code> | 가입·로그인과 세션 연결: 객체를 네트워크·저장용 JSON 문자열로 직렬화한다. |
| 15 | <code>    catch (e) { setError((e as Error).message); } finally { setBusy(false); }</code> | 가입·로그인과 세션 연결의 실패를 잡아 오류 안내·복구·상태 갱신으로 전환한다. |
| 16 | <code>  });</code> | 가입·로그인과 세션 연결의 현재 블록 또는 선언을 닫는다. |
| 17 | <code>  async function submit(event: SubmitEvent) {</code> | 가입·로그인과 세션 연결의 이름 있는 동작과 인자 범위를 정의한다. |
| 18 | <code>    event.preventDefault(); if (busy()) return; const values = Object.fromEntries(new FormData(event.currentTarget as HTMLFormElement)); setBusy(true); setError(&#x27;&#x27;);</code> | 가입·로그인과 세션 연결의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 19 | <code>    try {</code> | 가입·로그인과 세션 연결의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 20 | <code>      if (signup()) await api(&#x27;/api/auth/signup&#x27;, { method: &#x27;POST&#x27;, body: JSON.stringify(values) });</code> | 가입·로그인과 세션 연결: 객체를 네트워크·저장용 JSON 문자열로 직렬화한다. |
| 21 | <code>      const result = await api&lt;Session&gt;(&#x27;/api/auth/login&#x27;, { method: &#x27;POST&#x27;, body: JSON.stringify(values) }); acceptSession(result.data); navigate(&#x27;/&#x27;);</code> | 가입·로그인과 세션 연결: 객체를 네트워크·저장용 JSON 문자열로 직렬화한다. |
| 22 | <code>    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }</code> | 가입·로그인과 세션 연결의 실패를 잡아 오류 안내·복구·상태 갱신으로 전환한다. |
| 23 | <code>  }</code> | 가입·로그인과 세션 연결의 현재 블록 또는 선언을 닫는다. |
| 24 | <code>  return &lt;section class=&quot;narrow&quot;&gt;&lt;p class=&quot;eyebrow&quot;&gt;YOUR LEARNING SPACE&lt;/p&gt;&lt;h1&gt;{signup() ? &#x27;회원가입&#x27; : &#x27;로그인&#x27;}&lt;/h1&gt;&lt;form onSubmit={submit}&gt;</code> | 가입·로그인과 세션 연결: 브라우저 제출 이벤트를 도메인 저장 함수와 연결한다. |
| 25 | <code>    &lt;label&gt;이메일&lt;input name=&quot;email&quot; type=&quot;email&quot; required autocomplete=&quot;username&quot; /&gt;&lt;/label&gt;</code> | 가입·로그인과 세션 연결: 입력 필드의 화면 문구와 접근성 이름을 제공한다. |
| 26 | <code>    &lt;label&gt;비밀번호&lt;input name=&quot;password&quot; type=&quot;password&quot; required minLength={10} maxLength={128} autocomplete={signup() ? &#x27;new-password&#x27; : &#x27;current-password&#x27;} /&gt;&lt;/label&gt;</code> | 가입·로그인과 세션 연결: 입력 필드의 화면 문구와 접근성 이름을 제공한다. |
| 27 | <code>    &lt;Show when={signup()}&gt;&lt;label&gt;닉네임&lt;input name=&quot;nickname&quot; required maxLength={40} /&gt;&lt;/label&gt;&lt;/Show&gt;</code> | 가입·로그인과 세션 연결: 조건 accessor에 따라 본문 또는 fallback 화면을 선택한다. |
| 28 | <code>    &lt;Show when={error()}&gt;&lt;p role=&quot;alert&quot;&gt;{error()}&lt;/p&gt;&lt;/Show&gt;&lt;button disabled={busy()}&gt;{busy() ? &#x27;처리 중…&#x27; : signup() ? &#x27;가입 후 로그인&#x27; : &#x27;로그인&#x27;}&lt;/button&gt;</code> | 가입·로그인과 세션 연결: 조건 accessor에 따라 본문 또는 fallback 화면을 선택한다. |
| 29 | <code>  &lt;/form&gt;&lt;button class=&quot;subtle&quot; onClick={() =&gt; setSignup(v =&gt; !v)}&gt;{signup() ? &#x27;로그인으로&#x27; : &#x27;회원가입으로&#x27;}&lt;/button&gt;&lt;Show when={import.meta.env.VITE_STAGE !== &#x27;basic&#x27;}&gt;&lt;p&gt;&lt;a href={`${config.apiBase}/api/oauth/start`}&gt;소셜 로그인 (기본 mock)&lt;/a&gt;&lt;/p&gt;&lt;/Show&gt;&lt;p class=&quot;muted&quot;&gt;학습용 토큰은 메모리에만 저장되어 새로고침 시 다시 로그인합니다.&lt;/p&gt;&lt;/section&gt;;</code> | 가입·로그인과 세션 연결: 조건 accessor에 따라 본문 또는 fallback 화면을 선택한다. |
| 30 | <code>}</code> | 가입·로그인과 세션 연결의 현재 블록 또는 선언을 닫는다. |

## ④ 🔗 연동 포인트

프론트 토큰과 서버 세션 해시가 같은 로그인 상태를 나타낸다. 이 토큰으로 study13 외부 기능과 study18 문서 AI의 사용자 경계를 재사용한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| 401 반복 | 메모리 토큰 소실 또는 만료 | 재로그인 후 Bearer 확인 |
| 남의 글 변경 가능 | 화면 버튼만 숨김 | 서버에서 authorId와 user.id 비교 |
| XSS 실행 | innerHTML 사용 | JSX 텍스트로 출력하고 입력 HTML을 실행하지 않는다 |

## ⑥ 직접 해보기

1. 토큰 한 글자를 바꾸어 401을 확인한다.
2. DB에 비밀번호 원문과 세션 원문이 없는지 확인한다.
3. 두 계정의 수정·댓글 삭제 권한을 검증한다.

## ⑦ ☐ 체크리스트

- [ ] 회원가입·로그인·만료·로그아웃을 확인했다.
- [ ] 비밀번호 해시와 Bearer 세션을 서버에서 검증한다.
- [ ] CORS·XSS·CSRF의 역할을 설명했다.

## ⑧ 다음 단계 연결 문장

서버 세션 토큰과 작성자 검사로 사용자 경계를 만든다를 마쳤다면 [study8.md](study8.md)에서 이어 간다.

공식 자료: [SolidJS 1.x 소스](https://github.com/solidjs/solid/tree/v1.9.20), [Solid Router](https://docs.solidjs.com/solid-router/getting-started/installation-and-setup), [Node SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html). 최신 문서와 설치 버전이 다를 수 있어 package-lock.json을 실행 기준으로 삼는다.
