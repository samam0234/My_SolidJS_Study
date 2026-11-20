# study10 · SolidJS 빌드·배포·기초 정리

> 기준: [SolidJS 노션 원문](https://app.notion.com/p/40bd7dec5e2e813080f8d54cf5968ad5) · [게시판 API v1](https://app.notion.com/p/3d6d7dec5e2e8139adbfd36dd506c65e) · 문서 기준일 2026-11-20 (Asia/Seoul).

## ① 목표 한 줄

검증한 SPA와 API를 같은 Origin에서 제공한다.

## ② 📖 이론

npm run build는 TypeScript 검사 후 JS·CSS·HTML을 dist에 만든다. Vite 개발 서버는 학습 편의를 위한 서버이고 배포에서는 Node 서버가 dist와 /api를 제공한다. 도메인의 DNS가 서버 주소를 가리키고 HTTPS는 인증서로 전송을 암호화한다.

단일 Origin은 브라우저 화면과 API의 출처를 같게 만들어 경로·CORS 설정을 단순하게 한다. Node 3000 앞의 TLS 종료 프록시가 인증서를 관리할 수 있다. SQLite 데이터 디렉터리는 배포 산출물과 분리한 영속 볼륨에 둔다. 일회성 컨테이너 파일 시스템에만 두면 재배포 때 데이터가 사라진다.

## ③ 🛠️ 실기 · 전체 코드와 줄별 설명

이 저장소는 완성 코드와 학습 노트를 함께 제공한다. 아래 파일을 지정 경로에서 읽고 실행한다. 이 단계에서 새로 다루는 파일은 생략 없이 수록하며, import되는 공통 파일은 README와 앞선 단계의 전체 코드를 따른다. 학습 진행 상황은 체크박스에 직접 기록한다.

1. 환경변수의 PUBLIC_ORIGIN·CORS_ORIGIN을 실제 배포 주소로 맞춘다. 로컬 빌드 확인은 둘 다 http://localhost:3000이다.
2. npm test와 npm run test:ui를 통과시킨 뒤 빌드한다. /health, 목록, 상세 직접 접근, 로그인, 작성·수정·삭제를 확인한다.
3. 기본 배포는 Node 24 호스트에서 npm ci, npm run build, npm start다. Docker 자동화는 study16에서 확장한다.
4. 프록시는 /api를 Node로 보내고 SPA 화면 경로를 유지한다. HTTPS 페이지에서는 API와 WebSocket도 HTTPS/WSS를 사용한다.
5. DB 경로·파일 권한·백업·재시작 복구를 점검한다. 실제 외부 배포 완료 여부는 별도의 검증 기록을 확인한다.

실행 명령은 저장소 루트의 PowerShell 기준이다. 서버를 유지하는 명령 다음의 작업은 별도 터미널에서 실행한다.

```powershell
npm ci
npm test
npm run test:ui
npm run build
$env:PUBLIC_ORIGIN="http://localhost:3000"
$env:CORS_ORIGIN="http://localhost:3000"
npm start
```

### server/index.mjs 전체 코드

[server/index.mjs](server/index.mjs)

```javascript
import { createApp } from './app.mjs';
const app = await createApp();
app.server.listen(Number(process.env.PORT || 3000), process.env.HOST || '127.0.0.1', () => console.log('Solid Study API 준비 완료'));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await app.close(); process.exit(0); });
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>import { createApp } from &#x27;./app.mjs&#x27;;</code> | ./app.mjs에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 2 | <code>const app = await createApp();</code> | index.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 3 | <code>app.server.listen(Number(process.env.PORT &#124;&#124; 3000), process.env.HOST &#124;&#124; &#x27;127.0.0.1&#x27;, () =&gt; console.log(&#x27;Solid Study API 준비 완료&#x27;));</code> | index.mjs의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 4 | <code>for (const signal of [&#x27;SIGINT&#x27;, &#x27;SIGTERM&#x27;]) process.once(signal, async () =&gt; { await app.close(); process.exit(0); });</code> | index.mjs의 각 항목·프레임·작업을 순서대로 처리한다. |

### src/index.tsx 전체 코드

[src/index.tsx](src/index.tsx)

```tsx
if (import.meta.env.VITE_STAGE === 'basic') await import('./basic');
else await import('./main');
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>if (import.meta.env.VITE_STAGE === &#x27;basic&#x27;) await import(&#x27;./basic&#x27;);</code> | index.tsx에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 2 | <code>else await import(&#x27;./main&#x27;);</code> | index.tsx에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |

## ④ 🔗 연동 포인트

시그널→컴포넌트→URL→폼→API→저장소→인증→검증을 하나의 작은 서비스로 묶는 단계가 studymidpoint다. 운영 DB 교체는 study11에서 다룬다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| 혼합 콘텐츠 차단 | HTTPS 화면에서 HTTP API | 같은 HTTPS Origin 사용 |
| 재배포 후 데이터 소실 | DB를 임시 경로에 저장 | 영속 볼륨·복구 검증 |
| 빈 화면 | 이전 캐시·산출물 경로 오류 | asset 404와 HTML no-cache 확인 |

## ⑥ 직접 해보기

1. /posts/존재하는id 직접 접근을 새 탭에서 확인한다.
2. 서버 재시작 후 데이터가 남는지 확인한다.
3. 개발·배포 환경변수 차이를 기록한다.

## ⑦ ☐ 체크리스트

- [ ] 빌드와 정적 파일 제공을 확인했다.
- [ ] 도메인·DNS·HTTPS 역할을 설명했다.
- [ ] 배포 주소·환경변수·DB 영속성·404·권한을 점검했다.

## ⑧ 다음 단계 연결 문장

검증한 SPA와 API를 같은 Origin에서 제공한다를 마쳤다면 [studymidpoint.md](studymidpoint.md)에서 이어 간다.

공식 자료: [SolidJS 1.x 소스](https://github.com/solidjs/solid/tree/v1.9.20), [Solid Router](https://docs.solidjs.com/solid-router/getting-started/installation-and-setup), [Node SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html). 최신 문서와 설치 버전이 다를 수 있어 package-lock.json을 실행 기준으로 삼는다.
