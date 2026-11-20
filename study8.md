# study8 · SolidJS 구조화·재사용·환경 분리

> 기준: [SolidJS 노션 원문](https://app.notion.com/p/40bd7dec5e2e813080f8d54cf5968ad5) · [게시판 API v1](https://app.notion.com/p/3d6d7dec5e2e8139adbfd36dd506c65e) · 문서 기준일 2026-11-20 (Asia/Seoul).

## ① 목표 한 줄

화면·통신·모델·설정을 분리하여 같은 규칙을 재사용한다.

## ② 📖 이론

중복은 코드 줄 수보다 규칙이 여러 곳에서 달라지는 것이 문제다. api는 헤더·204·오류를 통일하고 PostForm은 등록·수정에서 같은 입력 규칙을 재사용한다. 서버 errors는 오류 envelope, auth는 권한, posts는 검증과 DTO, store는 데이터 접근을 맡는다.

환경변수는 브라우저 빌드 시점과 서버 실행 시점을 구분한다. import.meta.env.VITE_API_BASE는 번들에 들어가는 공개 값이다. process.env.DATABASE_URL과 API 키는 Node 프로세스에서만 읽는다. 배포 후 VITE 값을 변경하려면 재빌드하고 서버 값은 프로세스를 재시작한다.

의존성은 화면 → API 계약 → 서버 도메인 → 저장소 방향으로 흐른다. 경로 문자열·타입·오류 규칙을 한곳에서 관리하면 DB를 바꿔도 화면 컴포넌트를 유지할 수 있다.

## ③ 🛠️ 실기 · 전체 코드와 줄별 설명

이 저장소는 완성 코드와 학습 노트를 함께 제공한다. 아래 파일을 지정 경로에서 읽고 실행한다. 이 단계에서 새로 다루는 파일은 생략 없이 수록하며, import되는 공통 파일은 README와 앞선 단계의 전체 코드를 따른다. 학습 진행 상황은 체크박스에 직접 기록한다.

1. types.ts의 User/Post/PostInput/Meta가 실제 JSON과 같은지 확인한다.
2. config.ts에는 공개 API base와 mode만 둔다. session은 로그인 자료, api는 네트워크만 맡는다.
3. 개발은 .env, 기초 빌드는 공개 VITE_STAGE만 담은 .env.basic, 운영은 호스트의 비밀 설정을 사용한다. .env.basic에는 키를 넣지 않는다.
4. npm ls로 버전을 확인하고 lockfile을 함께 커밋한다. 다른 컴퓨터·CI에서는 npm install 대신 npm ci로 재현한다.

실행 명령은 저장소 루트의 PowerShell 기준이다. 서버를 유지하는 명령 다음의 작업은 별도 터미널에서 실행한다.

```powershell
npm ls --depth=0
git check-ignore .env
npm run build
```

### src/config.ts 전체 코드

[src/config.ts](src/config.ts)

```typescript
export const config = Object.freeze({
  apiBase: (import.meta.env.VITE_API_BASE || '').replace(/\/$/, ''),
  mode: import.meta.env.MODE
});
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>export const config = Object.freeze({</code> | config.ts에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 2 | <code>  apiBase: (import.meta.env.VITE_API_BASE &#124;&#124; &#x27;&#x27;).replace(/\/$/, &#x27;&#x27;),</code> | config.ts의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 3 | <code>  mode: import.meta.env.MODE</code> | config.ts의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 4 | <code>});</code> | config.ts의 현재 블록 또는 선언을 닫는다. |

### src/types.ts 전체 코드

[src/types.ts](src/types.ts)

```typescript
export type User = { id: number; email: string; nickname: string };
export type Post = { id: number; title: string; body: string; tags: string[]; author: { id: number; nickname: string }; commentCount: number; createdAt: string; updatedAt: string };
export type PostInput = Pick<Post, 'title' | 'body' | 'tags'>;
export type Meta = { page: number; limit: number; total: number; totalPages: number; q: string };
export type Document = { id: number; filename: string; content: string; createdAt: string };
export type Source = { index: number; text: string; score: number };
export type Question = { id: number; question: string; answer: string; sources: Source[]; stopReason?: string };
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>export type User = { id: number; email: string; nickname: string };</code> | types.ts에서 사용하는 데이터 필드와 타입 계약을 선언한다. |
| 2 | <code>export type Post = { id: number; title: string; body: string; tags: string[]; author: { id: number; nickname: string }; commentCount: number; createdAt: string; updatedAt: string };</code> | types.ts에서 사용하는 데이터 필드와 타입 계약을 선언한다. |
| 3 | <code>export type PostInput = Pick&lt;Post, &#x27;title&#x27; &#124; &#x27;body&#x27; &#124; &#x27;tags&#x27;&gt;;</code> | types.ts에서 사용하는 데이터 필드와 타입 계약을 선언한다. |
| 4 | <code>export type Meta = { page: number; limit: number; total: number; totalPages: number; q: string };</code> | types.ts에서 사용하는 데이터 필드와 타입 계약을 선언한다. |
| 5 | <code>export type Document = { id: number; filename: string; content: string; createdAt: string };</code> | types.ts에서 사용하는 데이터 필드와 타입 계약을 선언한다. |
| 6 | <code>export type Source = { index: number; text: string; score: number };</code> | types.ts에서 사용하는 데이터 필드와 타입 계약을 선언한다. |
| 7 | <code>export type Question = { id: number; question: string; answer: string; sources: Source[]; stopReason?: string };</code> | types.ts에서 사용하는 데이터 필드와 타입 계약을 선언한다. |

### .env.example 전체 코드

[.env.example](.env.example)

```text
HOST=127.0.0.1
PORT=3000
CORS_ORIGIN=http://localhost:5173
PUBLIC_ORIGIN=http://localhost:5173
VITE_API_BASE=
DB_DRIVER=sqlite
DB_ACCESS=native
DATABASE_URL=
SQLITE_PATH=data/study.sqlite
SESSION_TTL_SECONDS=3600
INTEGRATIONS_MODE=mock
STRIPE_SECRET_KEY=
STRIPE_PRICE_ID=
RESEND_API_KEY=
MAIL_FROM=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
AI_PROVIDER=mock
ANTHROPIC_API_KEY=
ANTHROPIC_VERSION=2023-06-01
AI_MODEL=
OLLAMA_URL=http://127.0.0.1:11434
AI_DAILY_TOKEN_LIMIT=12000
MCP_API_BASE=http://127.0.0.1:3000
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>HOST=127.0.0.1</code> | .env.example의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 2 | <code>PORT=3000</code> | .env.example의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 3 | <code>CORS_ORIGIN=http://localhost:5173</code> | .env.example의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 4 | <code>PUBLIC_ORIGIN=http://localhost:5173</code> | .env.example의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 5 | <code>VITE_API_BASE=</code> | .env.example의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 6 | <code>DB_DRIVER=sqlite</code> | .env.example의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 7 | <code>DB_ACCESS=native</code> | .env.example의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 8 | <code>DATABASE_URL=</code> | .env.example의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 9 | <code>SQLITE_PATH=data/study.sqlite</code> | .env.example의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 10 | <code>SESSION_TTL_SECONDS=3600</code> | .env.example의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 11 | <code>INTEGRATIONS_MODE=mock</code> | .env.example의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 12 | <code>STRIPE_SECRET_KEY=</code> | .env.example의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 13 | <code>STRIPE_PRICE_ID=</code> | .env.example의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 14 | <code>RESEND_API_KEY=</code> | .env.example의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 15 | <code>MAIL_FROM=</code> | .env.example의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 16 | <code>GITHUB_CLIENT_ID=</code> | .env.example의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 17 | <code>GITHUB_CLIENT_SECRET=</code> | .env.example의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 18 | <code>AI_PROVIDER=mock</code> | .env.example의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 19 | <code>ANTHROPIC_API_KEY=</code> | .env.example의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 20 | <code>ANTHROPIC_VERSION=2023-06-01</code> | .env.example의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 21 | <code>AI_MODEL=</code> | .env.example의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 22 | <code>OLLAMA_URL=http://127.0.0.1:11434</code> | .env.example의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 23 | <code>AI_DAILY_TOKEN_LIMIT=12000</code> | .env.example의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 24 | <code>MCP_API_BASE=http://127.0.0.1:3000</code> | .env.example의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |

### server/errors.mjs 전체 코드

[server/errors.mjs](server/errors.mjs)

```javascript
import { randomUUID } from 'node:crypto';
export class HttpError extends Error {
  constructor(status, code, message, fields = {}) {
    super(message); Object.assign(this, { status, code, fields });
  }
}
export const fail = (status, code, message, fields) => { throw new HttpError(status, code, message, fields); };
export function requestId(req) {
  const value = req.headers['x-request-id'];
  return typeof value === 'string' && /^[\w-]{1,100}$/.test(value) ? value : randomUUID();
}
export function send(res, status, data) {
  res.statusCode = status;
  if (status === 204) return res.end();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}
export function errorResponse(res, error, id) {
  if (res.headersSent) return res.end();
  send(res, error.status || 500, { error: {
    code: error.code || 'INTERNAL', message: error.status ? error.message : '서버 오류입니다.',
    fields: error.fields || {}, requestId: id
  } });
}
export async function readJson(req, max = 2 * 1024 * 1024) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > max) fail(413, 'PAYLOAD_TOO_LARGE', '요청 크기를 줄여 주세요.');
    chunks.push(chunk);
  }
  let value;
  try { value = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
  catch { fail(400, 'BAD_REQUEST', '올바른 JSON을 보내 주세요.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(400, 'BAD_REQUEST', 'JSON 객체를 보내 주세요.');
  return value;
}
export function text(value, name, max, min = 1) {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max)
    fail(400, 'VALIDATION_ERROR', '입력값을 확인하세요.', { [name]: [`${min}~${max}자로 입력하세요.`] });
  return value.trim();
}
export function numericId(value) {
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) fail(400, 'BAD_REQUEST', 'id는 양의 정수입니다.');
  return Number(value);
}
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>import { randomUUID } from &#x27;node:crypto&#x27;;</code> | node:crypto에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 2 | <code>export class HttpError extends Error {</code> | HTTP 검증과 공통 오류의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 3 | <code>  constructor(status, code, message, fields = {}) {</code> | HTTP 검증과 공통 오류의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 4 | <code>    super(message); Object.assign(this, { status, code, fields });</code> | HTTP 검증과 공통 오류의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 5 | <code>  }</code> | HTTP 검증과 공통 오류의 현재 블록 또는 선언을 닫는다. |
| 6 | <code>}</code> | HTTP 검증과 공통 오류의 현재 블록 또는 선언을 닫는다. |
| 7 | <code>export const fail = (status, code, message, fields) =&gt; { throw new HttpError(status, code, message, fields); };</code> | HTTP 검증과 공통 오류에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 8 | <code>export function requestId(req) {</code> | HTTP 검증과 공통 오류: 요청 추적 ID를 생성하거나 응답·로그로 전달한다. |
| 9 | <code>  const value = req.headers[&#x27;x-request-id&#x27;];</code> | HTTP 검증과 공통 오류에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 10 | <code>  return typeof value === &#x27;string&#x27; &amp;&amp; /^[\w-]{1,100}$/.test(value) ? value : randomUUID();</code> | HTTP 검증과 공통 오류: 독립적인 검증 시나리오와 비동기 정리 범위를 정의한다. |
| 11 | <code>}</code> | HTTP 검증과 공통 오류의 현재 블록 또는 선언을 닫는다. |
| 12 | <code>export function send(res, status, data) {</code> | HTTP 검증과 공통 오류: 현재 분기의 상태 코드와 JSON 또는 빈 응답을 전송한다. |
| 13 | <code>  res.statusCode = status;</code> | HTTP 검증과 공통 오류의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 14 | <code>  if (status === 204) return res.end();</code> | HTTP 검증과 공통 오류에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 15 | <code>  res.setHeader(&#x27;Content-Type&#x27;, &#x27;application/json; charset=utf-8&#x27;);</code> | HTTP 검증과 공통 오류: HTTP 응답의 보안·형식·추적·캐시 헤더를 설정한다. |
| 16 | <code>  res.end(JSON.stringify(data));</code> | HTTP 검증과 공통 오류: 객체를 네트워크·저장용 JSON 문자열로 직렬화한다. |
| 17 | <code>}</code> | HTTP 검증과 공통 오류의 현재 블록 또는 선언을 닫는다. |
| 18 | <code>export function errorResponse(res, error, id) {</code> | HTTP 검증과 공통 오류의 이름 있는 동작과 인자 범위를 정의한다. |
| 19 | <code>  if (res.headersSent) return res.end();</code> | HTTP 검증과 공통 오류에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 20 | <code>  send(res, error.status &#124;&#124; 500, { error: {</code> | HTTP 검증과 공통 오류: 현재 분기의 상태 코드와 JSON 또는 빈 응답을 전송한다. |
| 21 | <code>    code: error.code &#124;&#124; &#x27;INTERNAL&#x27;, message: error.status ? error.message : &#x27;서버 오류입니다.&#x27;,</code> | HTTP 검증과 공통 오류의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 22 | <code>    fields: error.fields &#124;&#124; {}, requestId: id</code> | HTTP 검증과 공통 오류: 요청 추적 ID를 생성하거나 응답·로그로 전달한다. |
| 23 | <code>  } });</code> | HTTP 검증과 공통 오류의 현재 구문·화면·설정 블록을 닫거나 다음 분기로 연결한다. |
| 24 | <code>}</code> | HTTP 검증과 공통 오류의 현재 블록 또는 선언을 닫는다. |
| 25 | <code>export async function readJson(req, max = 2 * 1024 * 1024) {</code> | HTTP 검증과 공통 오류의 이름 있는 동작과 인자 범위를 정의한다. |
| 26 | <code>  const chunks = []; let size = 0;</code> | HTTP 검증과 공통 오류에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 27 | <code>  for await (const chunk of req) {</code> | HTTP 검증과 공통 오류의 각 항목·프레임·작업을 순서대로 처리한다. |
| 28 | <code>    size += chunk.length;</code> | HTTP 검증과 공통 오류의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 29 | <code>    if (size &gt; max) fail(413, &#x27;PAYLOAD_TOO_LARGE&#x27;, &#x27;요청 크기를 줄여 주세요.&#x27;);</code> | HTTP 검증과 공통 오류: 규칙 위반을 HTTP 상태·code·필드 오류로 중단한다. |
| 30 | <code>    chunks.push(chunk);</code> | HTTP 검증과 공통 오류의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 31 | <code>  }</code> | HTTP 검증과 공통 오류의 현재 블록 또는 선언을 닫는다. |
| 32 | <code>  let value;</code> | HTTP 검증과 공통 오류에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 33 | <code>  try { value = JSON.parse(Buffer.concat(chunks).toString(&#x27;utf8&#x27;) &#124;&#124; &#x27;{}&#x27;); }</code> | HTTP 검증과 공통 오류: 문자열 JSON을 파싱한다. 미완성 프레임은 앞선 버퍼에서 보관한다. |
| 34 | <code>  catch { fail(400, &#x27;BAD_REQUEST&#x27;, &#x27;올바른 JSON을 보내 주세요.&#x27;); }</code> | HTTP 검증과 공통 오류: 규칙 위반을 HTTP 상태·code·필드 오류로 중단한다. |
| 35 | <code>  if (!value &#124;&#124; typeof value !== &#x27;object&#x27; &#124;&#124; Array.isArray(value)) fail(400, &#x27;BAD_REQUEST&#x27;, &#x27;JSON 객체를 보내 주세요.&#x27;);</code> | HTTP 검증과 공통 오류: 규칙 위반을 HTTP 상태·code·필드 오류로 중단한다. |
| 36 | <code>  return value;</code> | HTTP 검증과 공통 오류의 현재 처리 결과를 호출자에게 돌려준다. |
| 37 | <code>}</code> | HTTP 검증과 공통 오류의 현재 블록 또는 선언을 닫는다. |
| 38 | <code>export function text(value, name, max, min = 1) {</code> | HTTP 검증과 공통 오류의 이름 있는 동작과 인자 범위를 정의한다. |
| 39 | <code>  if (typeof value !== &#x27;string&#x27; &#124;&#124; value.trim().length &lt; min &#124;&#124; value.length &gt; max)</code> | HTTP 검증과 공통 오류에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 40 | <code>    fail(400, &#x27;VALIDATION_ERROR&#x27;, &#x27;입력값을 확인하세요.&#x27;, { [name]: [`${min}~${max}자로 입력하세요.`] });</code> | HTTP 검증과 공통 오류: 규칙 위반을 HTTP 상태·code·필드 오류로 중단한다. |
| 41 | <code>  return value.trim();</code> | HTTP 검증과 공통 오류의 현재 처리 결과를 호출자에게 돌려준다. |
| 42 | <code>}</code> | HTTP 검증과 공통 오류의 현재 블록 또는 선언을 닫는다. |
| 43 | <code>export function numericId(value) {</code> | HTTP 검증과 공통 오류의 이름 있는 동작과 인자 범위를 정의한다. |
| 44 | <code>  if (!/^[1-9]\d*$/.test(value) &#124;&#124; !Number.isSafeInteger(Number(value))) fail(400, &#x27;BAD_REQUEST&#x27;, &#x27;id는 양의 정수입니다.&#x27;);</code> | HTTP 검증과 공통 오류: 규칙 위반을 HTTP 상태·code·필드 오류로 중단한다. |
| 45 | <code>  return Number(value);</code> | HTTP 검증과 공통 오류의 현재 처리 결과를 호출자에게 돌려준다. |
| 46 | <code>}</code> | HTTP 검증과 공통 오류의 현재 블록 또는 선언을 닫는다. |

## ④ 🔗 연동 포인트

DB·외부 서비스 어댑터가 늘어나는 study11 이후에도 PostInput·Post DTO는 동일하다. study9 테스트는 계층별로 가짜 의존성을 넣어 이 경계를 검증한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| 운영 API 주소가 개발 주소 | VITE 값을 런타임에만 변경 | 프론트 재빌드 |
| 키가 번들에 포함 | VITE_ 접두어 오용 | 키를 서버 전용으로 이동하고 유출 키 폐기 |
| 설치 결과가 다름 | lockfile 미사용 | lockfile 커밋 후 npm ci |

## ⑥ 직접 해보기

1. 공개·비공개 설정 표를 작성한다.
2. 같은 PostForm이 등록·수정 두 곳에서 쓰이는 흐름을 따라간다.

## ⑦ ☐ 체크리스트

- [ ] 통신·모델·권한·저장소 책임을 분리했다.
- [ ] 개발·운영 변수의 적용 시점을 구분한다.
- [ ] 실제 비밀과 DB 파일을 Git에서 제외한다.

## ⑧ 다음 단계 연결 문장

화면·통신·모델·설정을 분리하여 같은 규칙을 재사용한다를 마쳤다면 [study9.md](study9.md)에서 이어 간다.

공식 자료: [SolidJS 1.x 소스](https://github.com/solidjs/solid/tree/v1.9.20), [Solid Router](https://docs.solidjs.com/solid-router/getting-started/installation-and-setup), [Node SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html). 최신 문서와 설치 버전이 다를 수 있어 package-lock.json을 실행 기준으로 삼는다.
