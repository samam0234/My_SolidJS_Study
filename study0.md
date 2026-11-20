# study0 · SolidJS 환경 설정

> 기준: [SolidJS 노션 원문](https://app.notion.com/p/40bd7dec5e2e813080f8d54cf5968ad5) · [게시판 API v1](https://app.notion.com/p/3d6d7dec5e2e8139adbfd36dd506c65e) · 문서 기준일 2026-11-20 (Asia/Seoul).

## ① 목표 한 줄

Node·Vite·SolidJS 개발 환경을 만들고 Git과 환경변수의 경계를 정한다.

## ② 📖 이론

SolidJS는 JSX를 실제 DOM 갱신 코드로 컴파일한다. Vite는 개발 서버와 배포용 번들을 만들며 TypeScript는 실행 전 데이터 형태를 검사한다. Node.js는 빌드 도구와 서버 코드를 실행한다. 세 도구는 각각 작업대, 설계 검사기, 실행 엔진에 비유할 수 있다.

노션은 createResource를 사용하는 SolidJS 1.x 학습 과정이다. 최신 버전으로 무조건 올리면 API가 달라질 수 있어 solid-js 1.9.20, router 0.15.4, Vite 7.3.8을 고정했다. 실제 설치 버전은 package-lock.json과 npm ls로 확인한다. Node는 이 저장소에서 검증한 24.14.0을 사용한다.

핵심 용어: 컴포넌트는 화면 단위, JSX는 JS 안의 선언적 화면 표현, signal은 읽기·쓰기 쌍, accessor는 값을 읽는 함수, effect는 외부 작업, memo는 파생 값, resource는 비동기 상태, props는 부모가 전달하는 읽기 경로다. SPA는 주소에 따라 화면을 교체하며 API는 서버와 주고받는 계약이다. 서버 비밀은 VITE_ 접두어를 붙이지 않는다.

## ③ 🛠️ 실기 · 전체 코드와 줄별 설명

이 저장소는 완성 코드와 학습 노트를 함께 제공한다. 아래 파일을 지정 경로에서 읽고 실행한다. 이 단계에서 새로 다루는 파일은 생략 없이 수록하며, import되는 공통 파일은 README와 앞선 단계의 전체 코드를 따른다. 학습 진행 상황은 체크박스에 직접 기록한다.

1. Node 24.14와 Git을 설치하고 아래 버전 명령을 실행한다. VS Code에는 Solid Language Support, ESLint, Prettier 확장을 설치한다. 확장 설치가 컴파일러 설치를 대신하지 않는다.
2. **빈 새 폴더에서만** `npm create solid@latest`를 실행하는 것이 노션의 생성 연습이다. 앱 이름을 정하고 Vite 기반 기본 템플릿과 TypeScript를 선택한다. 이 저장소는 이미 생성된 완성 코드이므로 다시 생성하지 않고 `npm ci`를 쓴다. 최신 생성기의 선택지가 다르면 공식 안내를 확인하고 이 저장소의 package.json 버전을 유지한다.
3. 루트에서 `.env.example`을 `.env`로 복사한다. 포트·개발 Origin·SQLite 경로만 먼저 설정한다. 기본 mock 서비스에는 API 키가 필요 없다.
4. src는 브라우저 코드, server는 Node 서버, tests는 요청·계약 테스트, e2e는 실제 브라우저, scripts는 문서·백업 도구다. node_modules와 dist는 재생성 가능한 산출물이다.
5. `npm run dev`는 Vite 5173과 API 3000을 함께 시작한다. 표시된 **localhost:5173**을 사용하면 기본 Origin 설정과 일치한다. 127.0.0.1로 접속하려면 PUBLIC_ORIGIN과 CORS_ORIGIN도 같은 주소로 바꾼다.
6. Git이 없는 새 폴더에서 `git init -b main`을 실행하고 `.gitignore`가 `.env`, data, backups를 제외하는지 확인한다. 원격 주소는 실제 사용자 저장소만 설정한다.

실행 명령은 저장소 루트의 PowerShell 기준이다. 서버를 유지하는 명령 다음의 작업은 별도 터미널에서 실행한다.

```powershell
node --version
npm --version
git --version
npm ci
Copy-Item -LiteralPath .env.example -Destination .env
npm ls solid-js @solidjs/router vite
npm run dev
```

### package.json 전체 코드

[package.json](package.json)

```json
{
  "name": "solidjs-study-board",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=24.14.0 <25"
  },
  "scripts": {
    "dev": "concurrently -k \"npm:dev:api\" \"npm:dev:web\"",
    "dev:api": "node --env-file-if-exists=.env --watch server/index.mjs",
    "dev:web": "vite --host 127.0.0.1",
    "build": "tsc --noEmit && vite build",
    "build:basic": "tsc --noEmit && vite build --mode basic",
    "start:basic": "node --env-file-if-exists=.env server/basic.mjs",
    "start": "node --env-file-if-exists=.env server/index.mjs",
    "test": "node --test --test-concurrency=1 tests/*.test.mjs",
    "test:ui": "vitest run",
    "test:e2e": "playwright test",
    "check:docs": "python scripts/check_docs.py",
    "docs:generate": "python scripts/generate_docs.py",
    "mcp:client": "node --env-file-if-exists=.env server/mcp-client.mjs",
    "backup": "node --env-file-if-exists=.env scripts/backup.mjs",
    "restore": "node --env-file-if-exists=.env scripts/restore.mjs",
    "test:db": "node --env-file-if-exists=.env --test tests/db.integration.mjs"
  },
  "overrides": { "sequelize": { "uuid": "11.1.1" } },
  "dependencies": {
    "@kobalte/core": "0.13.14",
    "@modelcontextprotocol/sdk": "1.32.2",
    "@modular-forms/solid": "0.25.1",
    "@solidjs/router": "0.15.4",
    "mariadb": "^3.4.5",
    "mongodb": "^6.20.0",
    "mongoose": "^8.24.10",
    "pg": "^8.16.3",
    "sequelize": "^6.37.8",
    "solid-js": "1.9.20",
    "ws": "^8.18.3",
    "zod": "^4.6.7"
  },
  "devDependencies": {
    "@playwright/test": "^1.56.1",
    "@solidjs/testing-library": "^0.8.10",
    "@testing-library/jest-dom": "^6.9.1",
    "@types/node": "^24.10.1",
    "concurrently": "^9.2.1",
    "jsdom": "^26.1.0",
    "typescript": "^5.9.3",
    "vite": "7.3.8",
    "vite-plugin-solid": "2.11.17",
    "vitest": "^5.1.1"
  }
}
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>{</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 2 | <code>  &quot;name&quot;: &quot;solidjs-study-board&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 3 | <code>  &quot;version&quot;: &quot;1.0.0&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 4 | <code>  &quot;private&quot;: true,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 5 | <code>  &quot;type&quot;: &quot;module&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 6 | <code>  &quot;engines&quot;: {</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 7 | <code>    &quot;node&quot;: &quot;&gt;=24.14.0 &lt;25&quot;</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 8 | <code>  },</code> | package.json의 현재 구문·화면·설정 블록을 닫거나 다음 분기로 연결한다. |
| 9 | <code>  &quot;scripts&quot;: {</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 10 | <code>    &quot;dev&quot;: &quot;concurrently -k \&quot;npm:dev:api\&quot; \&quot;npm:dev:web\&quot;&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 11 | <code>    &quot;dev:api&quot;: &quot;node --env-file-if-exists=.env --watch server/index.mjs&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 12 | <code>    &quot;dev:web&quot;: &quot;vite --host 127.0.0.1&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 13 | <code>    &quot;build&quot;: &quot;tsc --noEmit &amp;&amp; vite build&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 14 | <code>    &quot;build:basic&quot;: &quot;tsc --noEmit &amp;&amp; vite build --mode basic&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 15 | <code>    &quot;start:basic&quot;: &quot;node --env-file-if-exists=.env server/basic.mjs&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 16 | <code>    &quot;start&quot;: &quot;node --env-file-if-exists=.env server/index.mjs&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 17 | <code>    &quot;test&quot;: &quot;node --test --test-concurrency=1 tests/*.test.mjs&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 18 | <code>    &quot;test:ui&quot;: &quot;vitest run&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 19 | <code>    &quot;test:e2e&quot;: &quot;playwright test&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 20 | <code>    &quot;check:docs&quot;: &quot;python scripts/check_docs.py&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 21 | <code>    &quot;docs:generate&quot;: &quot;python scripts/generate_docs.py&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 22 | <code>    &quot;mcp:client&quot;: &quot;node --env-file-if-exists=.env server/mcp-client.mjs&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 23 | <code>    &quot;backup&quot;: &quot;node --env-file-if-exists=.env scripts/backup.mjs&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 24 | <code>    &quot;restore&quot;: &quot;node --env-file-if-exists=.env scripts/restore.mjs&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 25 | <code>    &quot;test:db&quot;: &quot;node --env-file-if-exists=.env --test tests/db.integration.mjs&quot;</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 26 | <code>  },</code> | package.json의 현재 구문·화면·설정 블록을 닫거나 다음 분기로 연결한다. |
| 27 | <code>  &quot;overrides&quot;: { &quot;sequelize&quot;: { &quot;uuid&quot;: &quot;11.1.1&quot; } },</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 28 | <code>  &quot;dependencies&quot;: {</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 29 | <code>    &quot;@kobalte/core&quot;: &quot;0.13.14&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 30 | <code>    &quot;@modelcontextprotocol/sdk&quot;: &quot;1.32.2&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 31 | <code>    &quot;@modular-forms/solid&quot;: &quot;0.25.1&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 32 | <code>    &quot;@solidjs/router&quot;: &quot;0.15.4&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 33 | <code>    &quot;mariadb&quot;: &quot;^3.4.5&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 34 | <code>    &quot;mongodb&quot;: &quot;^6.20.0&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 35 | <code>    &quot;mongoose&quot;: &quot;^8.24.10&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 36 | <code>    &quot;pg&quot;: &quot;^8.16.3&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 37 | <code>    &quot;sequelize&quot;: &quot;^6.37.8&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 38 | <code>    &quot;solid-js&quot;: &quot;1.9.20&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 39 | <code>    &quot;ws&quot;: &quot;^8.18.3&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 40 | <code>    &quot;zod&quot;: &quot;^4.6.7&quot;</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 41 | <code>  },</code> | package.json의 현재 구문·화면·설정 블록을 닫거나 다음 분기로 연결한다. |
| 42 | <code>  &quot;devDependencies&quot;: {</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 43 | <code>    &quot;@playwright/test&quot;: &quot;^1.56.1&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 44 | <code>    &quot;@solidjs/testing-library&quot;: &quot;^0.8.10&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 45 | <code>    &quot;@testing-library/jest-dom&quot;: &quot;^6.9.1&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 46 | <code>    &quot;@types/node&quot;: &quot;^24.10.1&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 47 | <code>    &quot;concurrently&quot;: &quot;^9.2.1&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 48 | <code>    &quot;jsdom&quot;: &quot;^26.1.0&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 49 | <code>    &quot;typescript&quot;: &quot;^5.9.3&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 50 | <code>    &quot;vite&quot;: &quot;7.3.8&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 51 | <code>    &quot;vite-plugin-solid&quot;: &quot;2.11.17&quot;,</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 52 | <code>    &quot;vitest&quot;: &quot;^5.1.1&quot;</code> | package.json의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 53 | <code>  }</code> | package.json의 현재 블록 또는 선언을 닫는다. |
| 54 | <code>}</code> | package.json의 현재 블록 또는 선언을 닫는다. |

### .gitignore 전체 코드

[.gitignore](.gitignore)

```text
node_modules/
dist/
.env
.env.*
!.env.example
!.env.basic
data/
backups/
playwright-report/
test-results/
coverage/
__pycache__/
*.log
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>node_modules/</code> | 해당 경로를 Git 추적에서 제외한다. !로 시작하면 예시 파일만 다시 포함한다. |
| 2 | <code>dist/</code> | 해당 경로를 Git 추적에서 제외한다. !로 시작하면 예시 파일만 다시 포함한다. |
| 3 | <code>.env</code> | 해당 경로를 Git 추적에서 제외한다. !로 시작하면 예시 파일만 다시 포함한다. |
| 4 | <code>.env.*</code> | 해당 경로를 Git 추적에서 제외한다. !로 시작하면 예시 파일만 다시 포함한다. |
| 5 | <code>!.env.example</code> | 해당 경로를 Git 추적에서 제외한다. !로 시작하면 예시 파일만 다시 포함한다. |
| 6 | <code>!.env.basic</code> | 해당 경로를 Git 추적에서 제외한다. !로 시작하면 예시 파일만 다시 포함한다. |
| 7 | <code>data/</code> | 해당 경로를 Git 추적에서 제외한다. !로 시작하면 예시 파일만 다시 포함한다. |
| 8 | <code>backups/</code> | 해당 경로를 Git 추적에서 제외한다. !로 시작하면 예시 파일만 다시 포함한다. |
| 9 | <code>playwright-report/</code> | 해당 경로를 Git 추적에서 제외한다. !로 시작하면 예시 파일만 다시 포함한다. |
| 10 | <code>test-results/</code> | 해당 경로를 Git 추적에서 제외한다. !로 시작하면 예시 파일만 다시 포함한다. |
| 11 | <code>coverage/</code> | 해당 경로를 Git 추적에서 제외한다. !로 시작하면 예시 파일만 다시 포함한다. |
| 12 | <code>__pycache__/</code> | 해당 경로를 Git 추적에서 제외한다. !로 시작하면 예시 파일만 다시 포함한다. |
| 13 | <code>*.log</code> | 해당 경로를 Git 추적에서 제외한다. !로 시작하면 예시 파일만 다시 포함한다. |

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

### vite.config.ts 전체 코드

[vite.config.ts](vite.config.ts)

```typescript
import { defineConfig } from 'vitest/config';
import solid from 'vite-plugin-solid';
export default defineConfig({
  plugins: [solid()],
  server: { port: 5173, strictPort: true, proxy: { '/api': 'http://127.0.0.1:3000', '/health': 'http://127.0.0.1:3000', '/ws': { target: 'ws://127.0.0.1:3000', ws: true } } },
  test: { environment: 'jsdom', include: ['src/**/*.test.tsx'], setupFiles: ['src/test-setup.ts'] }
});
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>import { defineConfig } from &#x27;vitest/config&#x27;;</code> | vitest/config에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 2 | <code>import solid from &#x27;vite-plugin-solid&#x27;;</code> | vite-plugin-solid에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 3 | <code>export default defineConfig({</code> | vite.config.ts의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 4 | <code>  plugins: [solid()],</code> | vite.config.ts의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 5 | <code>  server: { port: 5173, strictPort: true, proxy: { &#x27;/api&#x27;: &#x27;http://127.0.0.1:3000&#x27;, &#x27;/health&#x27;: &#x27;http://127.0.0.1:3000&#x27;, &#x27;/ws&#x27;: { target: &#x27;ws://127.0.0.1:3000&#x27;, ws: true } } },</code> | vite.config.ts의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 6 | <code>  test: { environment: &#x27;jsdom&#x27;, include: [&#x27;src/**/*.test.tsx&#x27;], setupFiles: [&#x27;src/test-setup.ts&#x27;] }</code> | vite.config.ts의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 7 | <code>});</code> | vite.config.ts의 현재 블록 또는 선언을 닫는다. |

## ④ 🔗 연동 포인트

개발용 Vite proxy가 /api와 /health를 3000으로 전달한다. study1은 src/labs/Hello.tsx를 수정한다. Git에는 예시 환경변수만 커밋하고 배포 환경에는 실제 비밀을 별도로 입력한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| npm 실행 불가 | Node 설치 후 터미널 PATH가 갱신되지 않음 | 터미널을 새로 열고 node --version 확인 |
| 포트 사용 중 | 기존 3000/5173 프로세스 | 프로세스를 확인하고 앱 포트와 proxy를 함께 변경 |
| 403 Origin | localhost와 127.0.0.1 혼용 | 브라우저 주소와 두 Origin 변수를 일치 |

## ⑥ 직접 해보기

1. 노션의 프로젝트 생성 명령을 별도의 임시 폴더에서 실행하고 구조를 그려 본다.
2. 환경변수를 VITE_ 공개 값과 서버 전용 값으로 분류한다.
3. git check-ignore .env로 제외 규칙을 확인한다.

## ⑦ ☐ 체크리스트

노션 [FW] 학습 목표 원문 항목은 다음과 같이 보존한다. 괄호가 포함된 원문을 인용하되 다른 프레임워크 비교 실습은 수행하지 않는다.

- [ ] `npm create solid` 로 프로젝트 (Vite)

- [ ] Node·npm·Git·Solid 버전을 확인했다.
- [ ] .env를 만들고 Git 제외를 확인했다.

## ⑧ 다음 단계 연결 문장

Node·Vite·SolidJS 개발 환경을 만들고 Git과 환경변수의 경계를 정한다를 마쳤다면 [study1.md](study1.md)에서 이어 간다.

공식 자료: [SolidJS 1.x 소스](https://github.com/solidjs/solid/tree/v1.9.20), [Solid Router](https://docs.solidjs.com/solid-router/getting-started/installation-and-setup), [Node SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html). 최신 문서와 설치 버전이 다를 수 있어 package-lock.json을 실행 기준으로 삼는다.
