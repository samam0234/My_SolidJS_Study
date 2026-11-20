# 공식 출처와 버전 기준

실행 버전은 package-lock.json으로 재현한다. 다음 공식 자료에서 API와 연결 규칙을 확인했다. 문서의 최신 버전과 고정한 학습 버전은 구분한다.

- [SolidJS 1.9.20 소스](https://github.com/solidjs/solid/tree/v1.9.20): createSignal·createEffect·createMemo·createResource와 컴포넌트 동작.
- [Solid Router 설치·구성](https://docs.solidjs.com/solid-router/getting-started/installation-and-setup): Router·Route·주소 구성.
- [Node 24 SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html): DatabaseSync. 실험적 API 경고는 Node 실행 결과에 나타날 수 있다.
- [Sequelize v6 시작](https://sequelize.org/docs/v6/getting-started/): dialect와 드라이버·모델 연결.
- [Mongoose 연결](https://mongoosejs.com/docs/connections.html): URL·connection·모델. 이 저장소는 Mongoose 8을 lockfile로 고정한다.
- [Kobalte Dialog](https://kobalte.dev/docs/core/components/dialog): Portal·포커스·접근성.
- [Modular Forms 폼 생성](https://modularforms.dev/solid/guides/create-your-form): createForm·Form·Field. 유지보수 모드인 버전을 학습용으로 고정했다.
- [Stripe Checkout Session](https://docs.stripe.com/api/checkout/sessions/create): 서버 세션 생성과 Idempotency-Key.
- [Resend 메일 API](https://resend.com/docs/api-reference/emails/send-email): 서버 발신 요청.
- [GitHub OAuth 앱 인증](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps): code·state·callback 교환.
- [Anthropic Messages](https://platform.claude.com/docs/en/api/messages): 서버 메시지·스트림·usage. 실제 모델 ID와 사용 권한은 계정에서 확인한다.
- [Ollama Chat](https://docs.ollama.com/api/chat): NDJSON 스트림·usage 필드.
- [MCP SDK v1 서버](https://ts.sdk.modelcontextprotocol.io/server): 고정 SDK v1.32.2 stdio·도구 등록.
- [MCP SDK v1](https://ts.sdk.modelcontextprotocol.io/): 최신 규격과 v1 지원 범위를 구분한다.

요구사항 원문은 [반영표](coverage.md)에 연결했다.
