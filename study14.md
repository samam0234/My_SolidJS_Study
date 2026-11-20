# study14 · SolidJS REST·OpenAPI·버전·오류 규칙

> 기준: [SolidJS 노션 원문](https://app.notion.com/p/40bd7dec5e2e813080f8d54cf5968ad5) · [게시판 API v1](https://app.notion.com/p/3d6d7dec5e2e8139adbfd36dd506c65e) · 문서 기준일 2026-11-20 (Asia/Seoul).

## ① 목표 한 줄

게시판 v1 계약을 OpenAPI로 문서화하고 변경을 관리한다.

## ② 📖 이론

REST는 URL을 자원으로 보고 HTTP method로 동작을 표현한다. 복수 명사 /api/posts, /api/posts/{id}, /api/posts/{id}/comments를 사용하며 수정은 PATCH로 통일한다. GET에는 조회 조건을 query로 보내고 POST/PATCH에는 JSON body를 보낸다.

OpenAPI는 사람이 읽는 설명과 도구가 읽는 스키마를 함께 제공한다. 이 서버 /api-docs는 OpenAPI 3.0.3 JSON 문서이며 Swagger UI 화면 자체는 아니다. Swagger Editor나 UI에 이 JSON을 import할 수 있다. 성공 단건은 data, 목록은 data/meta, 실패는 error로 통일한다.

v1은 원문 공통 계약의 버전이고 현재 경로 /api/posts를 보존한다. 호환 필드 추가는 v1 안에서 관리하되 필드 삭제·의미 변경은 새 계약과 명시적 마이그레이션을 설계한다. 임의로 /api/v1만 도입하면 기존 노션 최소 코드가 깨진다.

## ③ 🛠️ 실기 · 전체 코드와 줄별 설명

이 저장소는 완성 코드와 학습 노트를 함께 제공한다. 아래 파일을 지정 경로에서 읽고 실행한다. 이 단계에서 새로 다루는 파일은 생략 없이 수록하며, import되는 공통 파일은 README와 앞선 단계의 전체 코드를 따른다. 학습 진행 상황은 체크박스에 직접 기록한다.

1. /api-docs를 열고 실제 경로·인증·상태·파라미터·schemas가 일치하는지 확인한다.
2. 목록 query는 page≥1, limit=1~50, q 부분 검색, sort=createdAt/-createdAt/-commentCount다. totalPages는 ceil(total/limit)이며 빈 목록은 0이다.
3. POST는 201과 Location, PATCH는 200, DELETE는 204 본문 없음을 확인한다. 입력 오류는 400 fields다. id 문법 오류는 BAD_REQUEST, 없는 자원은 NOT_FOUND다.
4. X-Request-Id를 오류 본문 requestId와 일치시키고 500에서 스택을 숨긴다. 401·403·409·413·429·502·503의 의도를 문서화한다.
5. 스키마 변경 후 계약 테스트와 Swagger import를 수행한다. SSE 응답은 JSON envelope 대신 text/event-stream이라는 별도 계약이다.

실행 명령은 저장소 루트의 PowerShell 기준이다. 서버를 유지하는 명령 다음의 작업은 별도 터미널에서 실행한다.

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api-docs | ConvertTo-Json -Depth 30
npm test
```

### server/openapi.mjs 전체 코드

[server/openapi.mjs](server/openapi.mjs)

```javascript
const error = { description: '공통 오류', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };
const json = schema => ({ content: { 'application/json': { schema } } });
const ref = name => ({ $ref: `#/components/schemas/${name}` });
const object = properties => ({ type: 'object', properties });
const str = { type: 'string' }; const integer = { type: 'integer' };
const body = schema => ({ required: true, ...json(schema) });
const response = schema => ({ description: '성공', ...json(schema) });
const data = schema => object({ data: schema });
const operation = (summary, status, schema, input, secured = false) => ({ summary, ...(secured ? { security: [{ bearer: [] }] } : {}), ...(input ? { requestBody: body(input) } : {}), responses: { [status]: status === 204 ? { description: '본문 없음' } : response(schema), '400': error, '401': error, '403': error, '404': error, '409': error, '429': error, '500': error } });
const idParameter = { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } };
const postInput = object({ title: { type: 'string', minLength: 1, maxLength: 200 }, body: { type: 'string', minLength: 1, maxLength: 20000 }, tags: { type: 'array', items: str, maxItems: 10 } });
export const openapi = {
  openapi: '3.0.3', info: { title: 'Solid Study 게시판 공통 API', version: '1.0.0', description: 'v1은 계약 버전이다. 경로는 원문대로 /api/posts를 유지한다. /api-docs는 Swagger UI에 가져올 수 있는 OpenAPI JSON이다.' },
  servers: [{ url: '/' }],
  components: { securitySchemes: { bearer: { type: 'http', scheme: 'bearer', description: '1시간 opaque 세션 토큰' } }, schemas: {
    User: object({ id: integer, email: str, nickname: str }),
    Post: object({ id: integer, title: str, body: str, tags: { type: 'array', items: str }, author: object({ id: integer, nickname: str }), commentCount: integer, createdAt: { type: 'string', format: 'date-time' }, updatedAt: { type: 'string', format: 'date-time' } }),
    Meta: object({ page: integer, limit: integer, total: integer, totalPages: integer, q: str }),
    Error: object({ error: object({ code: str, message: str, fields: { type: 'object', additionalProperties: { type: 'array', items: str } }, requestId: str }) })
  } },
  paths: {
    '/health': { get: operation('상태 확인', 200, object({ status: str })) },
    '/api/auth/signup': { post: operation('회원가입', 201, data(ref('User')), { ...object({ email: str, password: { type: 'string', minLength: 10, maxLength: 128 }, nickname: str }), required: ['email', 'password', 'nickname'] }) },
    '/api/auth/login': { post: operation('로그인', 200, data(object({ user: ref('User'), accessToken: str })), { ...object({ email: str, password: str }), required: ['email', 'password'] }) },
    '/api/auth/me': { get: operation('내 정보', 200, data(ref('User')), null, true) },
    '/api/auth/logout': { post: operation('로그아웃', 204, null, null, true) },
    '/api/posts': {
      get: { ...operation('검색·페이지 목록', 200, object({ data: { type: 'array', items: ref('Post') }, meta: ref('Meta') })), parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10, minimum: 1, maximum: 50 } },
        { name: 'q', in: 'query', schema: str },
        { name: 'sort', in: 'query', schema: { type: 'string', enum: ['createdAt', '-createdAt', '-commentCount'], default: '-createdAt' } }
      ] },
      post: { ...operation('게시글 등록', 201, data(ref('Post')), { ...postInput, required: ['title', 'body'] }, true), responses: { ...operation('', 201, data(ref('Post'))).responses, '201': { ...response(data(ref('Post'))), headers: { Location: { schema: str, description: '/api/posts/{id}' } } } } }
    },
    '/api/posts/{id}': { parameters: [idParameter], get: operation('상세', 200, data(ref('Post'))), patch: operation('부분 수정', 200, data(ref('Post')), postInput, true), delete: operation('삭제', 204, null, null, true) },
    '/api/posts/{id}/comments': { parameters: [idParameter], get: operation('댓글 목록', 200, data({ type: 'array', items: { type: 'object' } })), post: operation('댓글 작성', 201, data({ type: 'object' }), { ...object({ body: { type: 'string', maxLength: 2000 } }), required: ['body'] }, true) },
    '/api/comments/{id}': { parameters: [idParameter], delete: operation('댓글 삭제', 204, null, null, true) },
    '/api/documents': { get: operation('내 문서 목록', 200, data({ type: 'array', items: { type: 'object' } }), null, true), post: operation('UTF-8 TXT·MD 업로드', 201, data({ type: 'object' }), { ...object({ filename: str, content: str }), required: ['filename', 'content'] }, true) },
    '/api/documents/{id}': { parameters: [idParameter], get: operation('내 문서 상세', 200, data({ type: 'object' }), null, true) },
    '/api/documents/{id}/questions': { parameters: [idParameter], get: operation('문서 질문 기록', 200, data({ type: 'array', items: { type: 'object' } }), null, true) },
    '/api/documents/{id}/analyze': { parameters: [idParameter], post: operation('분석 작업 예약', 202, data({ type: 'object' }), null, true) },
    '/api/jobs/{id}': { parameters: [idParameter], get: operation('작업 상태', 200, data({ type: 'object' }), null, true) },
    '/api/ai/chat/stream': { post: { ...operation('근거 기반 AI SSE', 200, {}, { ...object({ documentId: integer, question: { type: 'string', maxLength: 500 } }), required: ['documentId', 'question'] }, true), responses: { '200': { description: 'data: JSON 또는 [DONE]', content: { 'text/event-stream': { schema: str } } }, '400': error, '401': error, '403': error, '429': error, '500': error } } },
    '/api/services/checkout': { post: { ...operation('Checkout URL 생성, 결제 확정 아님', 200, data({ type: 'object' }), null, true), parameters: [{ name: 'Idempotency-Key', in: 'header', required: true, schema: str }] } },
    '/api/services/mail': { post: operation('본인 이메일 알림', 200, data({ type: 'object' }), null, true) },
    '/api/oauth/start': { get: operation('OAuth 시작 리다이렉트', 302, {}) },
    '/api/oauth/callback': { get: { ...operation('OAuth state 검증', 302, {}), parameters: ['code', 'state'].map(name => ({ name, in: 'query', required: true, schema: str })) } },
    '/api/oauth/exchange': { post: operation('일회용 코드 교환', 200, data(object({ user: ref('User'), accessToken: str })), { ...object({ code: str }), required: ['code'] }) }
  }
};
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>const error = { description: &#x27;공통 오류&#x27;, content: { &#x27;application/json&#x27;: { schema: { $ref: &#x27;#/components/schemas/Error&#x27; } } } };</code> | OpenAPI 계약 생성에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 2 | <code>const json = schema =&gt; ({ content: { &#x27;application/json&#x27;: { schema } } });</code> | OpenAPI 계약 생성에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 3 | <code>const ref = name =&gt; ({ $ref: `#/components/schemas/${name}` });</code> | OpenAPI 계약 생성에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 4 | <code>const object = properties =&gt; ({ type: &#x27;object&#x27;, properties });</code> | OpenAPI 계약 생성에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 5 | <code>const str = { type: &#x27;string&#x27; }; const integer = { type: &#x27;integer&#x27; };</code> | OpenAPI 계약 생성에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 6 | <code>const body = schema =&gt; ({ required: true, ...json(schema) });</code> | OpenAPI 계약 생성에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 7 | <code>const response = schema =&gt; ({ description: &#x27;성공&#x27;, ...json(schema) });</code> | OpenAPI 계약 생성에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 8 | <code>const data = schema =&gt; object({ data: schema });</code> | OpenAPI 계약 생성에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 9 | <code>const operation = (summary, status, schema, input, secured = false) =&gt; ({ summary, ...(secured ? { security: [{ bearer: [] }] } : {}), ...(input ? { requestBody: body(input) } : {}), responses: { [status]: status === 204 ? { description: &#x27;본문 없음&#x27; } : response(schema), &#x27;400&#x27;: error, &#x27;401&#x27;: error, &#x27;403&#x27;: error, &#x27;404&#x27;: error, &#x27;409&#x27;: error, &#x27;429&#x27;: error, &#x27;500&#x27;: error } });</code> | OpenAPI 계약 생성에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 10 | <code>const idParameter = { name: &#x27;id&#x27;, in: &#x27;path&#x27;, required: true, schema: { type: &#x27;integer&#x27;, minimum: 1 } };</code> | OpenAPI 계약 생성에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 11 | <code>const postInput = object({ title: { type: &#x27;string&#x27;, minLength: 1, maxLength: 200 }, body: { type: &#x27;string&#x27;, minLength: 1, maxLength: 20000 }, tags: { type: &#x27;array&#x27;, items: str, maxItems: 10 } });</code> | OpenAPI 계약 생성에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 12 | <code>export const openapi = {</code> | OpenAPI 계약 생성에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 13 | <code>  openapi: &#x27;3.0.3&#x27;, info: { title: &#x27;Solid Study 게시판 공통 API&#x27;, version: &#x27;1.0.0&#x27;, description: &#x27;v1은 계약 버전이다. 경로는 원문대로 /api/posts를 유지한다. /api-docs는 Swagger UI에 가져올 수 있는 OpenAPI JSON이다.&#x27; },</code> | OpenAPI 계약 생성의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 14 | <code>  servers: [{ url: &#x27;/&#x27; }],</code> | OpenAPI 계약 생성의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 15 | <code>  components: { securitySchemes: { bearer: { type: &#x27;http&#x27;, scheme: &#x27;bearer&#x27;, description: &#x27;1시간 opaque 세션 토큰&#x27; } }, schemas: {</code> | OpenAPI 계약 생성의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 16 | <code>    User: object({ id: integer, email: str, nickname: str }),</code> | OpenAPI 계약 생성의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 17 | <code>    Post: object({ id: integer, title: str, body: str, tags: { type: &#x27;array&#x27;, items: str }, author: object({ id: integer, nickname: str }), commentCount: integer, createdAt: { type: &#x27;string&#x27;, format: &#x27;date-time&#x27; }, updatedAt: { type: &#x27;string&#x27;, format: &#x27;date-time&#x27; } }),</code> | OpenAPI 계약 생성의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 18 | <code>    Meta: object({ page: integer, limit: integer, total: integer, totalPages: integer, q: str }),</code> | OpenAPI 계약 생성의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 19 | <code>    Error: object({ error: object({ code: str, message: str, fields: { type: &#x27;object&#x27;, additionalProperties: { type: &#x27;array&#x27;, items: str } }, requestId: str }) })</code> | OpenAPI 계약 생성: 요청 추적 ID를 생성하거나 응답·로그로 전달한다. |
| 20 | <code>  } },</code> | OpenAPI 계약 생성의 현재 구문·화면·설정 블록을 닫거나 다음 분기로 연결한다. |
| 21 | <code>  paths: {</code> | OpenAPI 계약 생성의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 22 | <code>    &#x27;/health&#x27;: { get: operation(&#x27;상태 확인&#x27;, 200, object({ status: str })) },</code> | OpenAPI 계약 생성의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 23 | <code>    &#x27;/api/auth/signup&#x27;: { post: operation(&#x27;회원가입&#x27;, 201, data(ref(&#x27;User&#x27;)), { ...object({ email: str, password: { type: &#x27;string&#x27;, minLength: 10, maxLength: 128 }, nickname: str }), required: [&#x27;email&#x27;, &#x27;password&#x27;, &#x27;nickname&#x27;] }) },</code> | OpenAPI 계약 생성의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 24 | <code>    &#x27;/api/auth/login&#x27;: { post: operation(&#x27;로그인&#x27;, 200, data(object({ user: ref(&#x27;User&#x27;), accessToken: str })), { ...object({ email: str, password: str }), required: [&#x27;email&#x27;, &#x27;password&#x27;] }) },</code> | OpenAPI 계약 생성의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 25 | <code>    &#x27;/api/auth/me&#x27;: { get: operation(&#x27;내 정보&#x27;, 200, data(ref(&#x27;User&#x27;)), null, true) },</code> | OpenAPI 계약 생성의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 26 | <code>    &#x27;/api/auth/logout&#x27;: { post: operation(&#x27;로그아웃&#x27;, 204, null, null, true) },</code> | OpenAPI 계약 생성의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 27 | <code>    &#x27;/api/posts&#x27;: {</code> | OpenAPI 계약 생성의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 28 | <code>      get: { ...operation(&#x27;검색·페이지 목록&#x27;, 200, object({ data: { type: &#x27;array&#x27;, items: ref(&#x27;Post&#x27;) }, meta: ref(&#x27;Meta&#x27;) })), parameters: [</code> | OpenAPI 계약 생성의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 29 | <code>        { name: &#x27;page&#x27;, in: &#x27;query&#x27;, schema: { type: &#x27;integer&#x27;, default: 1, minimum: 1 } },</code> | OpenAPI 계약 생성의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 30 | <code>        { name: &#x27;limit&#x27;, in: &#x27;query&#x27;, schema: { type: &#x27;integer&#x27;, default: 10, minimum: 1, maximum: 50 } },</code> | OpenAPI 계약 생성의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 31 | <code>        { name: &#x27;q&#x27;, in: &#x27;query&#x27;, schema: str },</code> | OpenAPI 계약 생성의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 32 | <code>        { name: &#x27;sort&#x27;, in: &#x27;query&#x27;, schema: { type: &#x27;string&#x27;, enum: [&#x27;createdAt&#x27;, &#x27;-createdAt&#x27;, &#x27;-commentCount&#x27;], default: &#x27;-createdAt&#x27; } }</code> | OpenAPI 계약 생성의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 33 | <code>      ] },</code> | OpenAPI 계약 생성의 현재 구문·화면·설정 블록을 닫거나 다음 분기로 연결한다. |
| 34 | <code>      post: { ...operation(&#x27;게시글 등록&#x27;, 201, data(ref(&#x27;Post&#x27;)), { ...postInput, required: [&#x27;title&#x27;, &#x27;body&#x27;] }, true), responses: { ...operation(&#x27;&#x27;, 201, data(ref(&#x27;Post&#x27;))).responses, &#x27;201&#x27;: { ...response(data(ref(&#x27;Post&#x27;))), headers: { Location: { schema: str, description: &#x27;/api/posts/{id}&#x27; } } } } }</code> | OpenAPI 계약 생성의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 35 | <code>    },</code> | OpenAPI 계약 생성의 현재 구문·화면·설정 블록을 닫거나 다음 분기로 연결한다. |
| 36 | <code>    &#x27;/api/posts/{id}&#x27;: { parameters: [idParameter], get: operation(&#x27;상세&#x27;, 200, data(ref(&#x27;Post&#x27;))), patch: operation(&#x27;부분 수정&#x27;, 200, data(ref(&#x27;Post&#x27;)), postInput, true), delete: operation(&#x27;삭제&#x27;, 204, null, null, true) },</code> | OpenAPI 계약 생성의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 37 | <code>    &#x27;/api/posts/{id}/comments&#x27;: { parameters: [idParameter], get: operation(&#x27;댓글 목록&#x27;, 200, data({ type: &#x27;array&#x27;, items: { type: &#x27;object&#x27; } })), post: operation(&#x27;댓글 작성&#x27;, 201, data({ type: &#x27;object&#x27; }), { ...object({ body: { type: &#x27;string&#x27;, maxLength: 2000 } }), required: [&#x27;body&#x27;] }, true) },</code> | OpenAPI 계약 생성의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 38 | <code>    &#x27;/api/comments/{id}&#x27;: { parameters: [idParameter], delete: operation(&#x27;댓글 삭제&#x27;, 204, null, null, true) },</code> | OpenAPI 계약 생성의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 39 | <code>    &#x27;/api/documents&#x27;: { get: operation(&#x27;내 문서 목록&#x27;, 200, data({ type: &#x27;array&#x27;, items: { type: &#x27;object&#x27; } }), null, true), post: operation(&#x27;UTF-8 TXT·MD 업로드&#x27;, 201, data({ type: &#x27;object&#x27; }), { ...object({ filename: str, content: str }), required: [&#x27;filename&#x27;, &#x27;content&#x27;] }, true) },</code> | OpenAPI 계약 생성의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 40 | <code>    &#x27;/api/documents/{id}&#x27;: { parameters: [idParameter], get: operation(&#x27;내 문서 상세&#x27;, 200, data({ type: &#x27;object&#x27; }), null, true) },</code> | OpenAPI 계약 생성의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 41 | <code>    &#x27;/api/documents/{id}/questions&#x27;: { parameters: [idParameter], get: operation(&#x27;문서 질문 기록&#x27;, 200, data({ type: &#x27;array&#x27;, items: { type: &#x27;object&#x27; } }), null, true) },</code> | OpenAPI 계약 생성의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 42 | <code>    &#x27;/api/documents/{id}/analyze&#x27;: { parameters: [idParameter], post: operation(&#x27;분석 작업 예약&#x27;, 202, data({ type: &#x27;object&#x27; }), null, true) },</code> | OpenAPI 계약 생성의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 43 | <code>    &#x27;/api/jobs/{id}&#x27;: { parameters: [idParameter], get: operation(&#x27;작업 상태&#x27;, 200, data({ type: &#x27;object&#x27; }), null, true) },</code> | OpenAPI 계약 생성의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 44 | <code>    &#x27;/api/ai/chat/stream&#x27;: { post: { ...operation(&#x27;근거 기반 AI SSE&#x27;, 200, {}, { ...object({ documentId: integer, question: { type: &#x27;string&#x27;, maxLength: 500 } }), required: [&#x27;documentId&#x27;, &#x27;question&#x27;] }, true), responses: { &#x27;200&#x27;: { description: &#x27;data: JSON 또는 [DONE]&#x27;, content: { &#x27;text/event-stream&#x27;: { schema: str } } }, &#x27;400&#x27;: error, &#x27;401&#x27;: error, &#x27;403&#x27;: error, &#x27;429&#x27;: error, &#x27;500&#x27;: error } } },</code> | OpenAPI 계약 생성의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 45 | <code>    &#x27;/api/services/checkout&#x27;: { post: { ...operation(&#x27;Checkout URL 생성, 결제 확정 아님&#x27;, 200, data({ type: &#x27;object&#x27; }), null, true), parameters: [{ name: &#x27;Idempotency-Key&#x27;, in: &#x27;header&#x27;, required: true, schema: str }] } },</code> | OpenAPI 계약 생성의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 46 | <code>    &#x27;/api/services/mail&#x27;: { post: operation(&#x27;본인 이메일 알림&#x27;, 200, data({ type: &#x27;object&#x27; }), null, true) },</code> | OpenAPI 계약 생성의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 47 | <code>    &#x27;/api/oauth/start&#x27;: { get: operation(&#x27;OAuth 시작 리다이렉트&#x27;, 302, {}) },</code> | OpenAPI 계약 생성의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 48 | <code>    &#x27;/api/oauth/callback&#x27;: { get: { ...operation(&#x27;OAuth state 검증&#x27;, 302, {}), parameters: [&#x27;code&#x27;, &#x27;state&#x27;].map(name =&gt; ({ name, in: &#x27;query&#x27;, required: true, schema: str })) } },</code> | OpenAPI 계약 생성의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 49 | <code>    &#x27;/api/oauth/exchange&#x27;: { post: operation(&#x27;일회용 코드 교환&#x27;, 200, data(object({ user: ref(&#x27;User&#x27;), accessToken: str })), { ...object({ code: str }), required: [&#x27;code&#x27;] }) }</code> | OpenAPI 계약 생성의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 50 | <code>  }</code> | OpenAPI 계약 생성의 현재 블록 또는 선언을 닫는다. |
| 51 | <code>};</code> | OpenAPI 계약 생성의 현재 블록 또는 선언을 닫는다. |

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

OpenAPI는 src/types.ts와 서버 DTO의 기준이다. 페이지네이션·오류의 일관성은 study15 캐시와 운영 로그를 해석하는 기준으로도 쓰인다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| Swagger에는 성공인데 실제 오류 | 스키마·핸들러 불일치 | 계약 테스트로 실제 응답 검증 |
| 빈 페이지가 실패로 표시 | 0개 결과를 오류로 취급 | data=[]와 meta를 정상 응답 |
| 추적 불가 | 본문 id와 헤더 id가 다름 | 한 requestId를 재사용 |

## ⑥ 직접 해보기

1. API 문서를 Swagger Editor에 import한다.
2. 등록·수정·삭제 상태와 헤더를 표로 기록한다.
3. 호환 필드 추가와 breaking change 예시를 각각 설계한다.

## ⑦ ☐ 체크리스트

- [ ] REST 자원·method·버전 정책을 문서화했다.
- [ ] OpenAPI와 실제 응답의 필드·인증·상태를 확인했다.
- [ ] 페이지네이션·정렬·공통 오류·requestId를 검증했다.

## ⑧ 다음 단계 연결 문장

게시판 v1 계약을 OpenAPI로 문서화하고 변경을 관리한다를 마쳤다면 [study15.md](study15.md)에서 이어 간다.

공식 자료: [SolidJS 1.x 소스](https://github.com/solidjs/solid/tree/v1.9.20), [Solid Router](https://docs.solidjs.com/solid-router/getting-started/installation-and-setup), [Node SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html). 최신 문서와 설치 버전이 다를 수 있어 package-lock.json을 실행 기준으로 삼는다.
