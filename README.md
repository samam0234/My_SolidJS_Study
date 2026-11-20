# SolidJS · 신호에서 서비스까지

SolidJS 하나의 학습 과정이다. 프론트는 SolidJS 1.9.20·Vite·TypeScript, 서버는 Node 24.14 표준 HTTP, 기본 DB는 SQLite다. 다른 웹 프레임워크의 구현을 통합하지 않는다. 노션이 요구하는 createResource를 유지하기 위해 Solid 1.x를 고정했다.

## 실행

```powershell
npm ci
Copy-Item -LiteralPath .env.example -Destination .env
npm run dev
```

브라우저에서 http://localhost:5173 을 연다. localhost와 127.0.0.1을 혼용하면 Origin 검사가 실패할 수 있다. 127.0.0.1을 사용하려면 .env의 PUBLIC_ORIGIN·CORS_ORIGIN도 같은 주소로 맞춘다. 기본 AI·결제·메일·OAuth는 명시적 mock이며 실제 외부 과금·발송을 하지 않는다. 가입 비밀번호는 10자 이상이다. 토큰은 메모리에 두어 새로고침하면 재로그인한다.

```powershell
# 기초 구간만 실행 (심화 모듈이 포함되지 않는 빌드)
npm run build:basic
$env:PUBLIC_ORIGIN="http://localhost:3000"
$env:CORS_ORIGIN="http://localhost:3000"
npm run start:basic
```

기초 DB는 기본 data/midpoint.sqlite다. `.env`에 SQLITE_PATH가 지정되면 그 값이 우선하므로 별도 DB가 필요하면 경로를 바꾼다. 심화로 돌아올 때는 `npm run build`를 다시 실행한다.

```powershell
# 심화 빌드 실행 (같은 Origin에서 SPA와 API 제공)
npm run build
$env:PUBLIC_ORIGIN="http://localhost:3000"
$env:CORS_ORIGIN="http://localhost:3000"
npm start
```

## 학습 순서

각 문서는 목표·이론·전체 실습 코드와 모든 줄 해설·연동·오류·직접 해보기·체크리스트·다음 단계로 구성한다. midpoint와 final도 study 접두어를 사용한다. 원래 폴더가 비어 있어 덮어쓸 기존 학습 문서는 없었다.

| 문서 | 내용 |
| --- | --- |
| [study0](study0.md) | 환경 설정 |
| [study1](study1.md) | Hello World와 기본 문법 |
| [study2](study2.md) | 핵심 구조와 데이터 전달 |
| [study3](study3.md) | 상태·파생 값·로컬 저장 |
| [study4](study4.md) | 라우팅과 요청 처리 |
| [study5](study5.md) | 폼·입력·검증 |
| [study6](study6.md) | DB·API CRUD |
| [study7](study7.md) | 인증·보안 기초 |
| [study8](study8.md) | 구조화·재사용·환경 분리 |
| [study9](study9.md) | 테스트·디버깅·오류 TOP 10 |
| [study10](study10.md) | 빌드·배포·기초 정리 |
| [studymidpoint](studymidpoint.md) | 중간 응용 · 로그인 게시판 |
| [study11](study11.md) | DB 교체와 ORM·ODM |
| [study12](study12.md) | UI·상태 관리·폼 라이브러리 |
| [study13](study13.md) | 결제·메일·업로드·OAuth |
| [study14](study14.md) | REST·OpenAPI·버전·오류 규칙 |
| [study15](study15.md) | 성능·캐시·비동기·작업 큐 |
| [study16](study16.md) | Docker·CI/CD·로그·백업 |
| [study17](study17.md) | WebSocket·알림·파일 확장 |
| [study18](study18.md) | AI 모델·SSE·MCP·DocuForge |
| [studyfinal](studyfinal.md) | 심화 응용 · Solid Study 서비스 완성 |

## 코드 구조

```text
src/labs/          Hello·시그널·Solid UI/폼 실험
src/components/    PostCard·PostForm·LiveNotice
src/pages/         게시판·로그인·문서 AI·외부 연동
src/basic.tsx      midpoint 전용 UI
src/main.tsx       final UI
server/basic.mjs   기초 서버
server/app.mjs     심화 서버와 API 조립
server/store.mjs   SQLite·PostgreSQL·MariaDB·MongoDB native
server/orm-store.mjs Sequelize·Mongoose
server/ai.mjs      RAG·mock/Anthropic/Ollama·SSE·한도
server/mcp-*.mjs   실제 stdio MCP 서버·클라이언트
tests/ e2e/        API·DB·UI·브라우저 검증
scripts/           문서 생성·검사·측정·백업 복원
```

공통 API: /health, /api/auth/*, /api/posts, /api/posts/{id}/comments, /api/comments/{id}. 확장 API: /api/documents, /api/documents/{id}/questions, /api/documents/{id}/analyze, /api/jobs/{id}, /api/ai/chat/stream, /api/services/*, /api/oauth/*. /api-docs는 OpenAPI JSON이다.

## 검증

```powershell
npm run check:docs
npm test
npm run test:ui
npm run build
npx playwright install chromium
npm run test:e2e
npm audit --audit-level=moderate
```

실제 DB 검증은 Docker 서비스가 준비된 뒤 실행한다. 이 명령은 로컬 학습 전용 compose DB를 사용한다.

```powershell
docker compose -p solidjs-study --profile postgres --profile mariadb --profile mongodb up -d postgres mariadb mongodb
node --test --test-concurrency=1 tests/db-matrix.mjs
docker build -t solid-study:local .
```

서버가 처음 준비되는 데 시간이 걸리면 DB health와 로그를 확인한 뒤 실행한다. DB 기본 포트는 15432·13306·27027이다. 자세한 URL·native/ORM 전환·이관은 [study11](study11.md), Docker·CI·백업은 [study16](study16.md)에 있다. 실제 DB 시험은 테스트 데이터를 남기며 운영 DB를 대상으로 실행하면 안 된다.

## 범위와 증거

- [노션 항목 반영표와 제외 항목](docs/coverage.md)
- [실제 실행한 검증과 남은 외부 작업](docs/verification.md)
- [공식 출처](docs/sources.md)

브라우저는 DB·모델·결제 비밀을 읽지 않는다. 현재 서버는 단일 프로세스 학습용 JSON 레코드 매퍼이며 대용량 운영에는 관계 모델·제약·인덱스·트랜잭션·분산 잠금이 필요하다. 문서 AI는 TXT·MD와 간단한 bigram 검색을 지원하며 원본 DocuForge의 모든 파일 추출 기능을 구현했다고 주장하지 않는다. Checkout URL 생성은 실제 결제 승인·상품 지급 기능과 구분한다.

문서 코드 스냅샷은 `npm run docs:generate`로 재생성한다. 설명 원본은 scripts/curriculum.py에 있고 `npm run check:docs`가 구조·링크·원문 체크·코드 동기화를 검사한다.
