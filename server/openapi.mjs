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
