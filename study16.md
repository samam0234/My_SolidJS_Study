# study16 · SolidJS Docker·CI/CD·로그·백업

> 기준: [SolidJS 노션 원문](https://app.notion.com/p/40bd7dec5e2e813080f8d54cf5968ad5) · [게시판 API v1](https://app.notion.com/p/3d6d7dec5e2e8139adbfd36dd506c65e) · 문서 기준일 2026-11-20 (Asia/Seoul).

## ① 목표 한 줄

같은 검증을 컨테이너와 CI에서 재현하고 복구 절차를 갖춘다.

## ② 📖 이론

Docker 이미지는 실행에 필요한 파일과 런타임을 묶는다. 다단계 빌드는 빌드 도구를 최종 이미지에서 제외하고 node 사용자로 실행한다. DB와 문서는 이미지에 굽지 않고 볼륨에 보관한다.

CI는 변경이 계약을 지키는지 확인하고 CD는 통과한 변경을 배포한다. 이 저장소 Actions는 문서 검사→API·UI→빌드→브라우저→의존성→Docker 순서로 검증한다. 배포는 DEPLOY_ENABLED=true와 DEPLOY_HOOK_URL을 구성한 호스트에 hook을 보낸 뒤 HEALTH_URL을 확인한다. 설정 전에는 검증만 실행한다.

백업은 파일 생성이 아니라 복원까지 확인해야 의미가 있다. 실행 중인 SQLite 파일만 복사하면 WAL이 빠질 수 있어 이 실습은 쓰기 중지 후 논리 레코드를 export한다. 백업에는 해시·문서가 포함되므로 비밀 저장소로 취급하고 Git에서 제외한다. 다중 서버 운영에서는 DB별 snapshot·트랜잭션 일관 백업으로 확장한다.

## ③ 🛠️ 실기 · 전체 코드와 줄별 설명

이 저장소는 완성 코드와 학습 노트를 함께 제공한다. 아래 파일을 지정 경로에서 읽고 실행한다. 이 단계에서 새로 다루는 파일은 생략 없이 수록하며, import되는 공통 파일은 README와 앞선 단계의 전체 코드를 따른다. 학습 진행 상황은 체크박스에 직접 기록한다.

**구현·운영 점검 순서**

1. [ ] .dockerignore가 .env·data·backups를 빌드 context에서 제외한다.
2. [ ] Dockerfile의 npm ci·빌드·비root 실행·healthcheck를 확인한다.
3. [ ] docker compose up --build로 같은 Origin 3000을 제공하고 볼륨 영속성을 확인한다.
4. [ ] GitHub main push/PR에 Actions가 실행되는지 확인한다. 로컬 통과와 실제 Actions 실행은 구분하여 기록한다.
5. [ ] 배포 호스트를 Git 저장소 main과 연결하고 배포 명령 npm ci/build/start 또는 Docker를 설정한다. production 환경에 비밀과 URL을 넣고 DEPLOY_ENABLED를 켠다.
6. [ ] stdout JSON의 requestId/status/durationMs를 수집한다. /health와 5xx 비율·응답 지연·디스크 용량·AI 한도에 알림을 설정한다.
7. [ ] 쓰기를 중단한 상태에서 backup을 만들고 새 빈 DB에 restore한다. 세션·OAuth 코드는 복원하지 않는다. 로그에 토큰과 본문이 없는지 확인한다.
8. [ ] 배포 실패 시 직전 이미지·커밋과 DB 호환성을 확인하여 롤백한다. 스키마 변경은 데이터 복구 전략을 먼저 확보한다.

실행 명령은 저장소 루트의 PowerShell 기준이다. 서버를 유지하는 명령 다음의 작업은 별도 터미널에서 실행한다.

```powershell
docker compose -p solidjs-study up -d --build app
docker compose -p solidjs-study ps
docker compose -p solidjs-study logs --tail 30 app
npm run backup
# 서버를 중지하고 빈 경로에만 복원
$env:SQLITE_PATH="data/restore-check.sqlite"
npm run restore -- backups/실제-백업파일.json
```

### Dockerfile 전체 코드

[Dockerfile](Dockerfile)

```text
FROM node:24.14.0-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM node:24.14.0-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && mkdir data && chown node:node data
COPY --from=build /app/dist ./dist
COPY server ./server
COPY scripts ./scripts
USER node
VOLUME ["/app/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/index.mjs"]
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>FROM node:24.14.0-bookworm-slim AS build</code> | Dockerfile: 컨테이너 빌드 또는 실행 기준 이미지를 선택한다. |
| 2 | <code>WORKDIR /app</code> | Dockerfile의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 3 | <code>COPY package*.json ./</code> | Dockerfile: 필요한 소스·설정·빌드 산출물을 이미지에 복사한다. |
| 4 | <code>RUN npm ci</code> | Dockerfile: 이미지 생성 시 설치·빌드·디렉터리 준비 명령을 수행한다. |
| 5 | <code>COPY . .</code> | Dockerfile: 필요한 소스·설정·빌드 산출물을 이미지에 복사한다. |
| 6 | <code>RUN npm run build</code> | Dockerfile: 이미지 생성 시 설치·빌드·디렉터리 준비 명령을 수행한다. |
| 7 | <code>FROM node:24.14.0-bookworm-slim</code> | Dockerfile: 컨테이너 빌드 또는 실행 기준 이미지를 선택한다. |
| 8 | <code>ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000</code> | Dockerfile의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 9 | <code>WORKDIR /app</code> | Dockerfile의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 10 | <code>COPY package*.json ./</code> | Dockerfile: 필요한 소스·설정·빌드 산출물을 이미지에 복사한다. |
| 11 | <code>RUN npm ci --omit=dev &amp;&amp; mkdir data &amp;&amp; chown node:node data</code> | Dockerfile: 이미지 생성 시 설치·빌드·디렉터리 준비 명령을 수행한다. |
| 12 | <code>COPY --from=build /app/dist ./dist</code> | Dockerfile: 필요한 소스·설정·빌드 산출물을 이미지에 복사한다. |
| 13 | <code>COPY server ./server</code> | Dockerfile: 필요한 소스·설정·빌드 산출물을 이미지에 복사한다. |
| 14 | <code>COPY scripts ./scripts</code> | Dockerfile: 필요한 소스·설정·빌드 산출물을 이미지에 복사한다. |
| 15 | <code>USER node</code> | Dockerfile: 최종 앱을 root가 아닌 사용자로 실행한다. |
| 16 | <code>VOLUME [&quot;/app/data&quot;]</code> | Dockerfile의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 17 | <code>EXPOSE 3000</code> | Dockerfile의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 18 | <code>HEALTHCHECK --interval=30s --timeout=3s CMD node -e &quot;fetch(&#x27;http://127.0.0.1:3000/health&#x27;).then(r=&gt;process.exit(r.ok?0:1)).catch(()=&gt;process.exit(1))&quot;</code> | Dockerfile: 명시한 URL·method·header·body로 HTTP 요청을 보낸다. |
| 19 | <code>CMD [&quot;node&quot;, &quot;server/index.mjs&quot;]</code> | Dockerfile: 컨테이너 시작 때 실행할 Node 진입점을 정한다. |

### compose.yaml 전체 코드

[compose.yaml](compose.yaml)

```yaml
services:
  app:
    build: .
    ports: ["127.0.0.1:3000:3000"]
    environment:
      PUBLIC_ORIGIN: ${PUBLIC_ORIGIN:-http://localhost:3000}
      CORS_ORIGIN: ${PUBLIC_ORIGIN:-http://localhost:3000}
      DB_DRIVER: ${DB_DRIVER:-sqlite}
      DB_ACCESS: ${DB_ACCESS:-native}
      DATABASE_URL: ${DATABASE_URL:-}
      AI_PROVIDER: ${AI_PROVIDER:-mock}
      AI_MODEL: ${AI_MODEL:-}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-}
      OLLAMA_URL: ${OLLAMA_URL:-http://host.docker.internal:11434}
      INTEGRATIONS_MODE: ${INTEGRATIONS_MODE:-mock}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY:-}
      STRIPE_PRICE_ID: ${STRIPE_PRICE_ID:-}
      RESEND_API_KEY: ${RESEND_API_KEY:-}
      MAIL_FROM: ${MAIL_FROM:-}
      GITHUB_CLIENT_ID: ${GITHUB_CLIENT_ID:-}
      GITHUB_CLIENT_SECRET: ${GITHUB_CLIENT_SECRET:-}
    volumes: ["app-data:/app/data"]
    restart: unless-stopped
  postgres:
    image: postgres:17
    profiles: ["postgres"]
    environment:
      POSTGRES_USER: study
      POSTGRES_PASSWORD: ${DB_PASSWORD:-local-study-password}
      POSTGRES_DB: study
    ports: ["127.0.0.1:${POSTGRES_PORT:-15432}:5432"]
    volumes: ["pg-data:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U study"]
      interval: 5s
      retries: 15
  mariadb:
    image: mariadb:11.4
    profiles: ["mariadb"]
    environment:
      MARIADB_ROOT_PASSWORD: ${DB_PASSWORD:-local-study-password}
      MARIADB_DATABASE: study
      MARIADB_USER: study
      MARIADB_PASSWORD: ${DB_PASSWORD:-local-study-password}
    ports: ["127.0.0.1:${MARIADB_PORT:-13306}:3306"]
    volumes: ["maria-data:/var/lib/mysql"]
  mongodb:
    image: mongo:8
    profiles: ["mongodb"]
    environment:
      MONGO_INITDB_ROOT_USERNAME: study
      MONGO_INITDB_ROOT_PASSWORD: ${DB_PASSWORD:-local-study-password}
    ports: ["127.0.0.1:${MONGODB_PORT:-27027}:27017"]
    volumes: ["mongo-data:/data/db"]
volumes:
  app-data:
  pg-data:
  maria-data:
  mongo-data:
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>services:</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 2 | <code>  app:</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 3 | <code>    build: .</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 4 | <code>    ports: [&quot;127.0.0.1:3000:3000&quot;]</code> | compose.yaml: 컨테이너 포트를 지정한 로컬 호스트 포트로 공개한다. |
| 5 | <code>    environment:</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 6 | <code>      PUBLIC_ORIGIN: ${PUBLIC_ORIGIN:-http://localhost:3000}</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 7 | <code>      CORS_ORIGIN: ${PUBLIC_ORIGIN:-http://localhost:3000}</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 8 | <code>      DB_DRIVER: ${DB_DRIVER:-sqlite}</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 9 | <code>      DB_ACCESS: ${DB_ACCESS:-native}</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 10 | <code>      DATABASE_URL: ${DATABASE_URL:-}</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 11 | <code>      AI_PROVIDER: ${AI_PROVIDER:-mock}</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 12 | <code>      AI_MODEL: ${AI_MODEL:-}</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 13 | <code>      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-}</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 14 | <code>      OLLAMA_URL: ${OLLAMA_URL:-http://host.docker.internal:11434}</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 15 | <code>      INTEGRATIONS_MODE: ${INTEGRATIONS_MODE:-mock}</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 16 | <code>      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY:-}</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 17 | <code>      STRIPE_PRICE_ID: ${STRIPE_PRICE_ID:-}</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 18 | <code>      RESEND_API_KEY: ${RESEND_API_KEY:-}</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 19 | <code>      MAIL_FROM: ${MAIL_FROM:-}</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 20 | <code>      GITHUB_CLIENT_ID: ${GITHUB_CLIENT_ID:-}</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 21 | <code>      GITHUB_CLIENT_SECRET: ${GITHUB_CLIENT_SECRET:-}</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 22 | <code>    volumes: [&quot;app-data:/app/data&quot;]</code> | compose.yaml: 데이터를 컨테이너 수명과 분리해 영속 저장한다. |
| 23 | <code>    restart: unless-stopped</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 24 | <code>  postgres:</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 25 | <code>    image: postgres:17</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 26 | <code>    profiles: [&quot;postgres&quot;]</code> | compose.yaml: 선택한 DB 서비스만 실행하도록 프로필을 정의한다. |
| 27 | <code>    environment:</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 28 | <code>      POSTGRES_USER: study</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 29 | <code>      POSTGRES_PASSWORD: ${DB_PASSWORD:-local-study-password}</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 30 | <code>      POSTGRES_DB: study</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 31 | <code>    ports: [&quot;127.0.0.1:${POSTGRES_PORT:-15432}:5432&quot;]</code> | compose.yaml: 컨테이너 포트를 지정한 로컬 호스트 포트로 공개한다. |
| 32 | <code>    volumes: [&quot;pg-data:/var/lib/postgresql/data&quot;]</code> | compose.yaml: 데이터를 컨테이너 수명과 분리해 영속 저장한다. |
| 33 | <code>    healthcheck:</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 34 | <code>      test: [&quot;CMD-SHELL&quot;, &quot;pg_isready -U study&quot;]</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 35 | <code>      interval: 5s</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 36 | <code>      retries: 15</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 37 | <code>  mariadb:</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 38 | <code>    image: mariadb:11.4</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 39 | <code>    profiles: [&quot;mariadb&quot;]</code> | compose.yaml: 선택한 DB 서비스만 실행하도록 프로필을 정의한다. |
| 40 | <code>    environment:</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 41 | <code>      MARIADB_ROOT_PASSWORD: ${DB_PASSWORD:-local-study-password}</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 42 | <code>      MARIADB_DATABASE: study</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 43 | <code>      MARIADB_USER: study</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 44 | <code>      MARIADB_PASSWORD: ${DB_PASSWORD:-local-study-password}</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 45 | <code>    ports: [&quot;127.0.0.1:${MARIADB_PORT:-13306}:3306&quot;]</code> | compose.yaml: 컨테이너 포트를 지정한 로컬 호스트 포트로 공개한다. |
| 46 | <code>    volumes: [&quot;maria-data:/var/lib/mysql&quot;]</code> | compose.yaml: 데이터를 컨테이너 수명과 분리해 영속 저장한다. |
| 47 | <code>  mongodb:</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 48 | <code>    image: mongo:8</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 49 | <code>    profiles: [&quot;mongodb&quot;]</code> | compose.yaml: 선택한 DB 서비스만 실행하도록 프로필을 정의한다. |
| 50 | <code>    environment:</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 51 | <code>      MONGO_INITDB_ROOT_USERNAME: study</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 52 | <code>      MONGO_INITDB_ROOT_PASSWORD: ${DB_PASSWORD:-local-study-password}</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 53 | <code>    ports: [&quot;127.0.0.1:${MONGODB_PORT:-27027}:27017&quot;]</code> | compose.yaml: 컨테이너 포트를 지정한 로컬 호스트 포트로 공개한다. |
| 54 | <code>    volumes: [&quot;mongo-data:/data/db&quot;]</code> | compose.yaml: 데이터를 컨테이너 수명과 분리해 영속 저장한다. |
| 55 | <code>volumes:</code> | compose.yaml: 데이터를 컨테이너 수명과 분리해 영속 저장한다. |
| 56 | <code>  app-data:</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 57 | <code>  pg-data:</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 58 | <code>  maria-data:</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 59 | <code>  mongo-data:</code> | compose.yaml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |

### .github/workflows/ci.yml 전체 코드

[.github/workflows/ci.yml](.github/workflows/ci.yml)

```yaml
name: Verify and deploy Solid Study
on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:
permissions:
  contents: read
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24.14.0
          cache: npm
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: npm ci
      - run: npm run check:docs
      - run: npm test
      - run: npm run test:ui
      - run: npm run build
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - run: npm audit --audit-level=moderate
      - run: docker build -t solid-study:ci .
  deploy:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main' && vars.DEPLOY_ENABLED == 'true'
    needs: [verify, databases]
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Trigger configured host deployment
        env:
          DEPLOY_HOOK_URL: ${{ secrets.DEPLOY_HOOK_URL }}
        run: |
          test -n "$DEPLOY_HOOK_URL"
          curl --fail --silent --show-error -X POST "$DEPLOY_HOOK_URL"
      - name: Verify deployed health
        env:
          HEALTH_URL: ${{ vars.HEALTH_URL }}
        run: |
          test -n "$HEALTH_URL"
          for attempt in $(seq 1 30); do
            if curl --fail --silent "$HEALTH_URL" | python -c 'import json,sys; assert json.load(sys.stdin)["status"] == "ok"'; then exit 0; fi
            sleep 10
          done
          exit 1
  databases:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_USER: study
          POSTGRES_PASSWORD: local-study-password
          POSTGRES_DB: study
        ports: ["15432:5432"]
        options: >-
          --health-cmd "pg_isready -U study"
          --health-interval 5s --health-retries 20
      mariadb:
        image: mariadb:11.4
        env:
          MARIADB_ROOT_PASSWORD: local-study-password
          MARIADB_USER: study
          MARIADB_PASSWORD: local-study-password
          MARIADB_DATABASE: study
        ports: ["13306:3306"]
        options: >-
          --health-cmd "healthcheck.sh --connect --innodb_initialized"
          --health-interval 5s --health-retries 20
      mongodb:
        image: mongo:8
        env:
          MONGO_INITDB_ROOT_USERNAME: study
          MONGO_INITDB_ROOT_PASSWORD: local-study-password
        ports: ["27027:27017"]
        options: >-
          --health-cmd "mongosh --quiet --eval 'db.adminCommand({ping:1}).ok'"
          --health-interval 5s --health-retries 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24.14.0
          cache: npm
      - run: npm ci
      - run: node --test --test-concurrency=1 tests/db-matrix.mjs
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>name: Verify and deploy Solid Study</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 2 | <code>on:</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 3 | <code>  push:</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 4 | <code>    branches: [main]</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 5 | <code>  pull_request:</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 6 | <code>  workflow_dispatch:</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 7 | <code>permissions:</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 8 | <code>  contents: read</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 9 | <code>jobs:</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 10 | <code>  verify:</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 11 | <code>    runs-on: ubuntu-latest</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 12 | <code>    steps:</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 13 | <code>      - uses: actions/checkout@v4</code> | ci.yml: GitHub Actions의 검증된 작업 단계를 불러온다. |
| 14 | <code>      - uses: actions/setup-node@v4</code> | ci.yml: GitHub Actions의 검증된 작업 단계를 불러온다. |
| 15 | <code>        with:</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 16 | <code>          node-version: 24.14.0</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 17 | <code>          cache: npm</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 18 | <code>      - uses: actions/setup-python@v5</code> | ci.yml: GitHub Actions의 검증된 작업 단계를 불러온다. |
| 19 | <code>        with:</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 20 | <code>          python-version: &#x27;3.12&#x27;</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 21 | <code>      - run: npm ci</code> | ci.yml: CI 러너에서 검증·빌드·배포 명령을 실행한다. |
| 22 | <code>      - run: npm run check:docs</code> | ci.yml: CI 러너에서 검증·빌드·배포 명령을 실행한다. |
| 23 | <code>      - run: npm test</code> | ci.yml: CI 러너에서 검증·빌드·배포 명령을 실행한다. |
| 24 | <code>      - run: npm run test:ui</code> | ci.yml: CI 러너에서 검증·빌드·배포 명령을 실행한다. |
| 25 | <code>      - run: npm run build</code> | ci.yml: CI 러너에서 검증·빌드·배포 명령을 실행한다. |
| 26 | <code>      - run: npx playwright install --with-deps chromium</code> | ci.yml: CI 러너에서 검증·빌드·배포 명령을 실행한다. |
| 27 | <code>      - run: npm run test:e2e</code> | ci.yml: CI 러너에서 검증·빌드·배포 명령을 실행한다. |
| 28 | <code>      - run: npm audit --audit-level=moderate</code> | ci.yml: CI 러너에서 검증·빌드·배포 명령을 실행한다. |
| 29 | <code>      - run: docker build -t solid-study:ci .</code> | ci.yml: CI 러너에서 검증·빌드·배포 명령을 실행한다. |
| 30 | <code>  deploy:</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 31 | <code>    if: github.event_name == &#x27;push&#x27; &amp;&amp; github.ref == &#x27;refs/heads/main&#x27; &amp;&amp; vars.DEPLOY_ENABLED == &#x27;true&#x27;</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 32 | <code>    needs: [verify, databases]</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 33 | <code>    runs-on: ubuntu-latest</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 34 | <code>    environment: production</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 35 | <code>    steps:</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 36 | <code>      - name: Trigger configured host deployment</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 37 | <code>        env:</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 38 | <code>          DEPLOY_HOOK_URL: ${{ secrets.DEPLOY_HOOK_URL }}</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 39 | <code>        run: &#124;</code> | ci.yml: CI 러너에서 검증·빌드·배포 명령을 실행한다. |
| 40 | <code>          test -n &quot;$DEPLOY_HOOK_URL&quot;</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 41 | <code>          curl --fail --silent --show-error -X POST &quot;$DEPLOY_HOOK_URL&quot;</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 42 | <code>      - name: Verify deployed health</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 43 | <code>        env:</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 44 | <code>          HEALTH_URL: ${{ vars.HEALTH_URL }}</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 45 | <code>        run: &#124;</code> | ci.yml: CI 러너에서 검증·빌드·배포 명령을 실행한다. |
| 46 | <code>          test -n &quot;$HEALTH_URL&quot;</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 47 | <code>          for attempt in $(seq 1 30); do</code> | ci.yml의 각 항목·프레임·작업을 순서대로 처리한다. |
| 48 | <code>            if curl --fail --silent &quot;$HEALTH_URL&quot; &#124; python -c &#x27;import json,sys; assert json.load(sys.stdin)[&quot;status&quot;] == &quot;ok&quot;&#x27;; then exit 0; fi</code> | ci.yml에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 49 | <code>            sleep 10</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 50 | <code>          done</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 51 | <code>          exit 1</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 52 | <code>  databases:</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 53 | <code>    runs-on: ubuntu-latest</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 54 | <code>    services:</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 55 | <code>      postgres:</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 56 | <code>        image: postgres:17</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 57 | <code>        env:</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 58 | <code>          POSTGRES_USER: study</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 59 | <code>          POSTGRES_PASSWORD: local-study-password</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 60 | <code>          POSTGRES_DB: study</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 61 | <code>        ports: [&quot;15432:5432&quot;]</code> | ci.yml: 컨테이너 포트를 지정한 로컬 호스트 포트로 공개한다. |
| 62 | <code>        options: &gt;-</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 63 | <code>          --health-cmd &quot;pg_isready -U study&quot;</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 64 | <code>          --health-interval 5s --health-retries 20</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 65 | <code>      mariadb:</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 66 | <code>        image: mariadb:11.4</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 67 | <code>        env:</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 68 | <code>          MARIADB_ROOT_PASSWORD: local-study-password</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 69 | <code>          MARIADB_USER: study</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 70 | <code>          MARIADB_PASSWORD: local-study-password</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 71 | <code>          MARIADB_DATABASE: study</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 72 | <code>        ports: [&quot;13306:3306&quot;]</code> | ci.yml: 컨테이너 포트를 지정한 로컬 호스트 포트로 공개한다. |
| 73 | <code>        options: &gt;-</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 74 | <code>          --health-cmd &quot;healthcheck.sh --connect --innodb_initialized&quot;</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 75 | <code>          --health-interval 5s --health-retries 20</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 76 | <code>      mongodb:</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 77 | <code>        image: mongo:8</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 78 | <code>        env:</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 79 | <code>          MONGO_INITDB_ROOT_USERNAME: study</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 80 | <code>          MONGO_INITDB_ROOT_PASSWORD: local-study-password</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 81 | <code>        ports: [&quot;27027:27017&quot;]</code> | ci.yml: 컨테이너 포트를 지정한 로컬 호스트 포트로 공개한다. |
| 82 | <code>        options: &gt;-</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 83 | <code>          --health-cmd &quot;mongosh --quiet --eval &#x27;db.adminCommand({ping:1}).ok&#x27;&quot;</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 84 | <code>          --health-interval 5s --health-retries 20</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 85 | <code>    steps:</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 86 | <code>      - uses: actions/checkout@v4</code> | ci.yml: GitHub Actions의 검증된 작업 단계를 불러온다. |
| 87 | <code>      - uses: actions/setup-node@v4</code> | ci.yml: GitHub Actions의 검증된 작업 단계를 불러온다. |
| 88 | <code>        with:</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 89 | <code>          node-version: 24.14.0</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 90 | <code>          cache: npm</code> | ci.yml의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다. |
| 91 | <code>      - run: npm ci</code> | ci.yml: CI 러너에서 검증·빌드·배포 명령을 실행한다. |
| 92 | <code>      - run: node --test --test-concurrency=1 tests/db-matrix.mjs</code> | ci.yml: CI 러너에서 검증·빌드·배포 명령을 실행한다. |

### scripts/backup.mjs 전체 코드

[scripts/backup.mjs](scripts/backup.mjs)

```javascript
import { openStore } from '../server/store.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
export const buckets = ['users', 'sessions', 'posts', 'comments', 'documents', 'questions', 'usage', 'jobs', 'oauthStates', 'oauthCodes'];
const store = await openStore({ driver: process.env.DB_DRIVER, url: process.env.DATABASE_URL, path: process.env.SQLITE_PATH });
try {
  const data = {};
  for (const bucket of buckets) data[bucket] = await store.all(bucket);
  await mkdir('backups', { recursive: true });
  const filename = `backups/study-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  await writeFile(filename, JSON.stringify({ version: 1, createdAt: new Date().toISOString(), data }, null, 2), { mode: 0o600 });
  console.log(filename);
} finally { await store.close(); }
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>import { openStore } from &#x27;../server/store.mjs&#x27;;</code> | ../server/store.mjs에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 2 | <code>import { mkdir, writeFile } from &#x27;node:fs/promises&#x27;;</code> | node:fs/promises에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 3 | <code>export const buckets = [&#x27;users&#x27;, &#x27;sessions&#x27;, &#x27;posts&#x27;, &#x27;comments&#x27;, &#x27;documents&#x27;, &#x27;questions&#x27;, &#x27;usage&#x27;, &#x27;jobs&#x27;, &#x27;oauthStates&#x27;, &#x27;oauthCodes&#x27;];</code> | backup.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 4 | <code>const store = await openStore({ driver: process.env.DB_DRIVER, url: process.env.DATABASE_URL, path: process.env.SQLITE_PATH });</code> | backup.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 5 | <code>try {</code> | backup.mjs의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 6 | <code>  const data = {};</code> | backup.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 7 | <code>  for (const bucket of buckets) data[bucket] = await store.all(bucket);</code> | backup.mjs의 각 항목·프레임·작업을 순서대로 처리한다. |
| 8 | <code>  await mkdir(&#x27;backups&#x27;, { recursive: true });</code> | backup.mjs의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 9 | <code>  const filename = `backups/study-${new Date().toISOString().replace(/[:.]/g, &#x27;-&#x27;)}.json`;</code> | backup.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 10 | <code>  await writeFile(filename, JSON.stringify({ version: 1, createdAt: new Date().toISOString(), data }, null, 2), { mode: 0o600 });</code> | backup.mjs: 객체를 네트워크·저장용 JSON 문자열로 직렬화한다. |
| 11 | <code>  console.log(filename);</code> | backup.mjs의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 12 | <code>} finally { await store.close(); }</code> | backup.mjs의 성공·실패와 관계없이 잠금과 자원을 정리한다. |

### scripts/restore.mjs 전체 코드

[scripts/restore.mjs](scripts/restore.mjs)

```javascript
import { readFile } from 'node:fs/promises';
import { openStore } from '../server/store.mjs';
const buckets = ['users', 'sessions', 'posts', 'comments', 'documents', 'questions', 'usage', 'jobs', 'oauthStates', 'oauthCodes'];
if (!process.argv[2]) throw new Error('사용법: npm run restore -- backups/파일.json (빈 DB에만 복원)');
const backup = JSON.parse(await readFile(process.argv[2], 'utf8'));
if (backup.version !== 1 || buckets.some(b => !Array.isArray(backup.data?.[b]))) throw new Error('백업 형식이 다릅니다.');
const store = await openStore({ driver: process.env.DB_DRIVER, url: process.env.DATABASE_URL, path: process.env.SQLITE_PATH });
try {
  for (const bucket of buckets) if ((await store.all(bucket)).length) throw new Error('대상 DB가 비어 있지 않습니다. 새 DB 경로를 지정하세요.');
  for (const bucket of buckets.filter(b => !['sessions', 'oauthStates', 'oauthCodes'].includes(b)))
    for (const row of backup.data[bucket]) await store.put(bucket, row);
  console.log('복원 완료. 세션·일회용 코드는 복원하지 않았습니다.');
} finally { await store.close(); }
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>import { readFile } from &#x27;node:fs/promises&#x27;;</code> | node:fs/promises에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 2 | <code>import { openStore } from &#x27;../server/store.mjs&#x27;;</code> | ../server/store.mjs에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 3 | <code>const buckets = [&#x27;users&#x27;, &#x27;sessions&#x27;, &#x27;posts&#x27;, &#x27;comments&#x27;, &#x27;documents&#x27;, &#x27;questions&#x27;, &#x27;usage&#x27;, &#x27;jobs&#x27;, &#x27;oauthStates&#x27;, &#x27;oauthCodes&#x27;];</code> | restore.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 4 | <code>if (!process.argv[2]) throw new Error(&#x27;사용법: npm run restore -- backups/파일.json (빈 DB에만 복원)&#x27;);</code> | restore.mjs에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 5 | <code>const backup = JSON.parse(await readFile(process.argv[2], &#x27;utf8&#x27;));</code> | restore.mjs: 문자열 JSON을 파싱한다. 미완성 프레임은 앞선 버퍼에서 보관한다. |
| 6 | <code>if (backup.version !== 1 &#124;&#124; buckets.some(b =&gt; !Array.isArray(backup.data?.[b]))) throw new Error(&#x27;백업 형식이 다릅니다.&#x27;);</code> | restore.mjs에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 7 | <code>const store = await openStore({ driver: process.env.DB_DRIVER, url: process.env.DATABASE_URL, path: process.env.SQLITE_PATH });</code> | restore.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 8 | <code>try {</code> | restore.mjs의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 9 | <code>  for (const bucket of buckets) if ((await store.all(bucket)).length) throw new Error(&#x27;대상 DB가 비어 있지 않습니다. 새 DB 경로를 지정하세요.&#x27;);</code> | restore.mjs의 각 항목·프레임·작업을 순서대로 처리한다. |
| 10 | <code>  for (const bucket of buckets.filter(b =&gt; ![&#x27;sessions&#x27;, &#x27;oauthStates&#x27;, &#x27;oauthCodes&#x27;].includes(b)))</code> | restore.mjs의 각 항목·프레임·작업을 순서대로 처리한다. |
| 11 | <code>    for (const row of backup.data[bucket]) await store.put(bucket, row);</code> | restore.mjs의 각 항목·프레임·작업을 순서대로 처리한다. |
| 12 | <code>  console.log(&#x27;복원 완료. 세션·일회용 코드는 복원하지 않았습니다.&#x27;);</code> | restore.mjs의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 13 | <code>} finally { await store.close(); }</code> | restore.mjs의 성공·실패와 관계없이 잠금과 자원을 정리한다. |

## ④ 🔗 연동 포인트

공통 requestId가 브라우저·서버·공급자 오류를 연결한다. DB 교체의 이관도 이 논리 백업 형식을 사용한다. 실제 호스트·Secrets가 없으면 자동 배포 실행 완료로 표시하지 않는다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| 컨테이너 재시작 반복 | 파일 권한·DB 연결 오류 | logs와 볼륨 소유권 확인 |
| 배포 job skipped | DEPLOY_ENABLED 미설정 | 호스트 준비 후 repository variable 설정 |
| 복원 거절 | 빈 DB가 아님 | 기존 파일을 지우지 말고 새 경로로 복원 |

## ⑥ 직접 해보기

1. 이미지를 빌드해 healthcheck와 비root uid를 확인한다.
2. 새 SQLite 경로에 복원하고 글·댓글 수를 비교한다.
3. 잘못된 HEALTH_URL로 배포 실패 감지를 확인한다.

## ⑦ ☐ 체크리스트

- [ ] Docker 빌드·health·비root·영속 볼륨을 확인했다.
- [ ] Actions 검증·배포 조건·Secrets 설정을 구분했다.
- [ ] 로그·모니터링·백업·빈 DB 복원을 점검했다.

## ⑧ 다음 단계 연결 문장

같은 검증을 컨테이너와 CI에서 재현하고 복구 절차를 갖춘다를 마쳤다면 [study17.md](study17.md)에서 이어 간다.

공식 자료: [SolidJS 1.x 소스](https://github.com/solidjs/solid/tree/v1.9.20), [Solid Router](https://docs.solidjs.com/solid-router/getting-started/installation-and-setup), [Node SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html). 최신 문서와 설치 버전이 다를 수 있어 package-lock.json을 실행 기준으로 삼는다.
