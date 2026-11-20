"""사람이 작성한 단계별 학습 내용. generate_docs.py가 소스 전체와 줄별 해설을 결합한다."""
CHAPTERS = [
dict(key='0', title='환경 설정', goal='Node·Vite·SolidJS 개발 환경을 만들고 Git과 환경변수의 경계를 정한다.',
 theory='''SolidJS는 JSX를 실제 DOM 갱신 코드로 컴파일한다. Vite는 개발 서버와 배포용 번들을 만들며 TypeScript는 실행 전 데이터 형태를 검사한다. Node.js는 빌드 도구와 서버 코드를 실행한다. 세 도구는 각각 작업대, 설계 검사기, 실행 엔진에 비유할 수 있다.

노션은 createResource를 사용하는 SolidJS 1.x 학습 과정이다. 최신 버전으로 무조건 올리면 API가 달라질 수 있어 solid-js 1.9.20, router 0.15.4, Vite 7.3.8을 고정했다. 실제 설치 버전은 package-lock.json과 npm ls로 확인한다. Node는 이 저장소에서 검증한 24.14.0을 사용한다.

핵심 용어: 컴포넌트는 화면 단위, JSX는 JS 안의 선언적 화면 표현, signal은 읽기·쓰기 쌍, accessor는 값을 읽는 함수, effect는 외부 작업, memo는 파생 값, resource는 비동기 상태, props는 부모가 전달하는 읽기 경로다. SPA는 주소에 따라 화면을 교체하며 API는 서버와 주고받는 계약이다. 서버 비밀은 VITE_ 접두어를 붙이지 않는다.''',
 steps='''1. Node 24.14와 Git을 설치하고 아래 버전 명령을 실행한다. VS Code에는 Solid Language Support, ESLint, Prettier 확장을 설치한다. 확장 설치가 컴파일러 설치를 대신하지 않는다.
2. **빈 새 폴더에서만** `npm create solid@latest`를 실행하는 것이 노션의 생성 연습이다. 앱 이름을 정하고 Vite 기반 기본 템플릿과 TypeScript를 선택한다. 이 저장소는 이미 생성된 완성 코드이므로 다시 생성하지 않고 `npm ci`를 쓴다. 최신 생성기의 선택지가 다르면 공식 안내를 확인하고 이 저장소의 package.json 버전을 유지한다.
3. 루트에서 `.env.example`을 `.env`로 복사한다. 포트·개발 Origin·SQLite 경로만 먼저 설정한다. 기본 mock 서비스에는 API 키가 필요 없다.
4. src는 브라우저 코드, server는 Node 서버, tests는 요청·계약 테스트, e2e는 실제 브라우저, scripts는 문서·백업 도구다. node_modules와 dist는 재생성 가능한 산출물이다.
5. `npm run dev`는 Vite 5173과 API 3000을 함께 시작한다. 표시된 **localhost:5173**을 사용하면 기본 Origin 설정과 일치한다. 127.0.0.1로 접속하려면 PUBLIC_ORIGIN과 CORS_ORIGIN도 같은 주소로 바꾼다.
6. Git이 없는 새 폴더에서 `git init -b main`을 실행하고 `.gitignore`가 `.env`, data, backups를 제외하는지 확인한다. 원격 주소는 실제 사용자 저장소만 설정한다.''',
 commands='node --version\nnpm --version\ngit --version\nnpm ci\nCopy-Item -LiteralPath .env.example -Destination .env\nnpm ls solid-js @solidjs/router vite\nnpm run dev', files=['package.json','.gitignore','.env.example','vite.config.ts'],
 links='개발용 Vite proxy가 /api와 /health를 3000으로 전달한다. study1은 src/labs/Hello.tsx를 수정한다. Git에는 예시 환경변수만 커밋하고 배포 환경에는 실제 비밀을 별도로 입력한다.',
 errors=[('npm 실행 불가','Node 설치 후 터미널 PATH가 갱신되지 않음','터미널을 새로 열고 node --version 확인'),('포트 사용 중','기존 3000/5173 프로세스','프로세스를 확인하고 앱 포트와 proxy를 함께 변경'),('403 Origin','localhost와 127.0.0.1 혼용','브라우저 주소와 두 Origin 변수를 일치')], exercises=['노션의 프로젝트 생성 명령을 별도의 임시 폴더에서 실행하고 구조를 그려 본다.','환경변수를 VITE_ 공개 값과 서버 전용 값으로 분류한다.','git check-ignore .env로 제외 규칙을 확인한다.'], checks=['npm create solid 로 프로젝트 (Vite)','Node·npm·Git·Solid 버전을 확인했다.','.env를 만들고 Git 제외를 확인했다.'], next='study1.md'),
dict(key='1',title='Hello World와 기본 문법',goal='JSX 표현식과 DOM 속성으로 첫 화면을 만든다.',
 theory='''JSX의 중괄호는 JS 값을 화면에 넣는 창이다. 문자열 리터럴은 그대로 보이지만 `{2 + 3}`은 계산 후 표시된다. 함수는 JSX를 반환하여 컴포넌트가 된다. 하나의 루트 요소 또는 fragment로 묶고 컴포넌트 이름은 대문자로 시작한다.

Solid JSX는 class, for 같은 DOM 친화적 속성을 지원한다. 이벤트는 onClick/onInput으로 연결한다. 일반 const를 바꾸는 것만으로 화면이 반응하지는 않는다. 값이 계속 바뀔 때 사용할 시그널은 study3에서 도입한다. 사용자 문자열을 JSX 텍스트로 넣으면 마크업으로 실행하지 않는다.''',
 steps='''1. npm run dev로 시작하고 /labs를 연다. Hello.tsx의 greeting과 nickname을 바꾼다.
2. 저장 직후 Vite HMR이 갱신하는 것을 확인한다. HMR은 실행 문맥을 다시 만들 수 있으므로 컴포넌트 실행 횟수 실험과 구분한다.
3. 개발자도구 Elements에서 h2와 p의 실제 DOM을 확인한다. Console에서 문법 오류를 보고 Network에서 /src 모듈 재요청을 관찰한다.
4. 소스의 입력 요소에 문장을 입력하고 일반 JSX 텍스트와 DOM 입력값이 어떻게 다른지 확인한다. 서버는 GET /health로 별도 확인한다.''', commands='npm run dev\n# 브라우저 http://localhost:5173/labs\nInvoke-RestMethod http://127.0.0.1:3000/health', files=['src/labs/Hello.tsx','src/index.tsx','index.html'],
 links='index.html의 root 요소 → index.tsx → main.tsx → /labs → Hello 순서로 화면에 도달한다. study2에서 이 화면 단위를 부모·자식으로 나눈다.', errors=[('빈 화면','root id와 render 대상 불일치','index.html과 진입점 id 확인'),('변수가 문자 그대로 표시','중괄호 누락','JS 표현식을 { }로 감싼다'),('컴파일 오류','닫히지 않은 JSX 태그','input 같은 빈 요소도 />로 닫는다')],exercises=['인사말에 오늘 날짜를 toLocaleDateString으로 추가한다.','버튼 클릭 시 console.info로 닉네임을 출력한다.'],checks=['HMR로 문구가 바뀌는 것을 확인했다.','Elements·Console·Network에서 화면 생성 흐름을 확인했다.'],next='study2.md'),
dict(key='2',title='핵심 구조와 데이터 전달',goal='부모·자식 컴포넌트를 분리하고 props와 콜백으로 연결한다.',
 theory='''컴포넌트는 DOM 조각과 그 조각의 초기 설정을 묶는 단위다. 부모는 props로 자료를 내려 주고 자식은 콜백으로 사용자 의도를 알린다. 식당에서 주문서를 내려 주고 확인 버튼을 통해 주문을 올리는 흐름과 같다.

Solid 컴포넌트 함수는 각 마운트에서 초기 설정을 한 번 수행한다. 상태 변경 때 추적된 표현식이 갱신된다. 재마운트·라우트 이동·HMR은 새 실행을 만든다. 따라서 “앱 전체에서 단 한 번”이라는 의미가 아니다.

반응적인 props를 const { post } = props처럼 일찍 구조분해하면 현재 값만 읽어 추적이 끊길 수 있다. 렌더 안에서 props.post.title을 읽거나 필요한 경우 splitProps를 사용한다. 정적인 설정 객체의 구조분해와 구분한다.''',
 steps='''1. PostCard는 post 한 개만 받아 목록 항목을 표시한다. 네트워크 요청은 부모 Posts가 담당한다.
2. PostForm은 입력 상태를 갖지만 저장 위치를 모른다. 부모 Editor가 save 함수를 전달하여 등록·수정 요청을 결정한다.
3. Signals 실험실에서 증가 버튼을 누른다. 생성 번호는 그대로인데 원본·파생 값은 변하는 것을 관찰한다.
4. props.post를 구조분해하지 않은 이유를 설명하고, 변경되는 부모 데이터를 getter 경로로 읽는지 확인한다.''',commands='npm run dev\n# /labs에서 생성 번호와 증가 버튼 확인',files=['src/components/PostCard.tsx','src/pages/Editor.tsx'],links='Posts → PostCard는 자료 전달, Editor → PostForm.save는 함수 전달이다. 이 경계를 유지하면 study6의 API 구현을 바꿔도 표시 컴포넌트를 유지할 수 있다.',errors=[('props 갱신 누락','컴포넌트 처음에 구조분해','props 경로를 추적되는 표현식에서 읽는다'),('함수가 여러 번 실행된 듯 보임','HMR 또는 재마운트','버튼 갱신과 라우트 이동을 분리 관찰'),('자식이 서버 주소를 알아야 함','책임이 섞임','저장 콜백을 부모에서 주입')],exercises=['PostCard에 onSelect 콜백을 추가하고 부모에서 선택된 id를 출력한다.','본문 미리보기 길이를 props로 받도록 확장한다.'],checks=['컴포넌트 함수가 한 번만 실행된다는 점 확인 (React와 가장 큰 차이)','변경되는 props를 일찍 구조분해하지 않는다.','컴포넌트 사이 데이터와 이벤트 방향을 설명했다.'],next='study3.md'),
dict(key='3',title='상태·파생 값·로컬 저장',goal='시그널을 DOM과 연결하고 초안을 브라우저에 저장한다.',
 theory='''createSignal은 현재 값을 읽는 accessor와 값을 쓰는 setter를 반환한다. count는 함수이므로 count()로 읽는다. JSX와 effect 안에서 읽으면 의존성이 추적된다. setCount(v => v + 1)은 직전 값을 기준으로 갱신한다.

createMemo는 원본에서 계산한 값을 캐시한다. createEffect는 localStorage 기록이나 로그처럼 외부에 영향을 주는 일을 수행한다. 계산 결과를 effect로 다시 signal에 복사하면 불필요한 상태와 순환을 만들기 쉽다. 온도계가 원본이고 화씨 환산은 memo, 측정 일지를 쓰는 일은 effect에 비유할 수 있다.

For는 배열 항목별 DOM을 유지하고 Show는 조건에 맞는 화면을 선택한다. localStorage는 같은 Origin 안의 문자열 저장소이며 민감한 세션 토큰 저장 장소로 쓰지 않는다. 서버에서 실행할 코드에서는 localStorage가 없으므로 이 실험은 SPA 브라우저에서만 실행한다.''',steps='''1. /labs에서 count 증가 전후의 doubled와 조건 문구를 관찰한다.
2. 메모를 입력한 뒤 새로고침한다. count는 초기화되지만 메모는 남는다.
3. 개발자도구 Application → Local Storage에서 solid-study-note를 확인한다.
4. 항목을 직접 지우고 다시 접속해 빈 문자열 기본값을 확인한다. 저장소 접근이 차단된 환경에서는 try/catch와 메모리 fallback을 추가하는 연습을 한다.''',commands='npm run test:ui\n# /labs → 증가 3회 → 메모 입력 → 새로고침',files=['src/labs/Signals.tsx'],links='폼 초안은 브라우저에, 공유 게시물은 study6의 서버 DB에 저장한다. UI에서 accessor를 읽는 방법은 다음 단계 URL 파라미터와 createResource에도 이어진다.',errors=[('함수 문자열 표시','count() 대신 count 사용','accessor를 호출한다'),('무한 갱신','effect 안에서 읽은 상태를 무조건 다시 설정','파생 값은 memo로 옮긴다'),('배열 변경 안 보임','같은 배열을 직접 push','새 배열로 setter 호출')],exercises=['감소 버튼과 0 미만 방지 조건을 추가한다.','메모 글자 수를 memo로 표시한다.','Show의 fallback 문구를 입력 길이에 따라 바꾼다.'],checks=['createSignal, createEffect, createMemo','<For>, <Show> 제어 흐름 컴포넌트','새로고침 후 localStorage와 메모리 상태 차이를 확인했다.'],next='study4.md'),
dict(key='4',title='라우팅과 요청 처리',goal='목록·상세·작성·수정 URL과 서버 경로를 구분하여 연결한다.',theory='''라우터는 주소와 화면의 대응표다. /posts/new는 작성 화면, /posts/:id는 상세, /posts/:id/edit는 수정 화면이다. 동적 id는 useParams로 읽고 검색·페이지 번호는 useSearchParams로 관리한다. 검색 조건을 URL에 두면 새로고침·공유·뒤로가기를 이해하기 쉽다.

브라우저의 /posts/1과 서버 JSON 주소 /api/posts/1은 역할이 다르다. SPA의 직접 접근에는 index.html fallback이 필요하지만 /api의 없는 자원은 JSON 404를 반환해야 한다. 없는 화면은 *404 라우트로, 없는 게시글은 ApiError와 ErrorBoundary로 표시한다.''',steps='''1. main.tsx에서 Route들의 고정 경로와 동적 경로를 읽는다. /posts/new가 숫자 id로 API에 전달되지 않는지 확인한다.
2. 로그인 후 글을 만들고 상세 URL의 id를 바꾼다. /api/posts/nope는 400, 존재하지 않는 숫자는 404다.
3. 목록에서 q/page/sort를 변경하고 주소창과 Network를 같이 본다.
4. 빌드 후 서버로 /posts/1을 직접 열어 SPA fallback을 확인한다. /missing은 화면 404다.''',commands='npm run build\nnpm start\n# http://localhost:3000/posts/1 (운영용 Origin은 .env에서 3000으로 변경)',files=['src/main.tsx','src/pages/Posts.tsx'],links='주소의 q/page/sort → URLSearchParams → /api/posts → data/meta → For 렌더링이다. study5의 작성 성공 후 navigate는 생성된 id를 상세 화면으로 전달한다.',errors=[('새로고침 404','호스트에 SPA fallback 없음','API 경로를 제외하고 index.html 제공'),('page가 NaN','문자열 쿼리를 그대로 계산','숫자 변환과 기본값 적용'),('API 대신 HTML 수신','/api에도 fallback 적용','서버 API와 화면 경로 분리')],exercises=['검색 조건이 있는 주소를 새 탭에서 연다.','동적 id가 잘못된 경우와 자원이 없는 경우를 각각 확인한다.'],checks=['@solidjs/router 로 목록·상세·작성 페이지','q/page/sort가 URL과 API에 전달된다.','화면 404와 API 404를 구별했다.'],next='study5.md'),
dict(key='5',title='폼·입력·검증',goal='입력 검증과 서버 필드 오류를 표시하고 중복 저장을 막는다.',theory='''클라이언트 검증은 빠른 안내, 서버 검증은 데이터 보호다. required와 maxLength가 있어도 직접 HTTP를 보내면 우회할 수 있어 서버에서 다시 검사한다. 폼 제출은 preventDefault로 브라우저의 전체 페이지 전송을 멈추고 API 요청으로 처리한다.

busy는 제출 중 표시이자 중복 이벤트 가드다. disabled만으로는 함수 직접 호출을 막지 못하므로 핸들러 입구에서도 busy()를 확인한다. finally에서 풀어 주어 오류 이후 다시 제출할 수 있게 한다.

공통 스펙 v1 검증 오류는 400 + error.fields다. 외부 API가 422를 반환할 경우 같은 fields를 UI에서 처리할 수 있도록 호환 경로를 둔다. 등록 201과 수정 200은 성공으로 처리하며 삭제 204는 JSON을 읽지 않는다.''',steps='''1. 제목·본문·쉼표 태그를 입력하고 신호 상태가 onInput으로 갱신되는지 확인한다.
2. 제목을 비우면 브라우저 검증, 200자를 넘긴 API 요청에는 서버 검증이 작동한다.
3. save 콜백이 resolve되면 부모가 상세로 이동하고 reject되면 폼은 입력을 유지한다.
4. Network를 느리게 설정해 저장 버튼이 잠기는지 확인한다. 오류 필드는 name과 메시지를 함께 보여 준다.''',commands='npm run test:ui\nnpm test',files=['src/components/PostForm.tsx','server/posts.mjs'],links='PostInput {title,body,tags}를 POST 또는 PATCH로 보내고 {data:Post}의 id로 이동한다. 다음 단계는 이 계약을 DB CRUD로 완성한다.',errors=[('두 번 등록','재클릭·중복 이벤트','입구 busy 가드와 disabled 병행'),('저장 후 버튼 잠김','catch에서만 상태 복구','finally에서 busy 해제'),('오류가 사라짐','실패 시 입력 초기화','성공 후에만 이동·초기화')],exercises=['태그 10개 제한을 화면에도 표시한다.','가짜 save가 422 ApiError를 던지도록 만들어 fields 렌더링을 확인한다.','수정 200과 등록 201의 동작을 비교 없이 각각 기록한다.'],checks=['입력값을 서버에서도 검증한다.','200/201 성공·400/422 필드 오류·204 본문 없음을 처리한다.','진행 중 중복 제출이 차단된다.'],next='study6.md'),
dict(key='6',title='DB·API CRUD',goal='공통 게시판 API v1을 SQLite 저장소와 연결한다.',theory='''SolidJS 브라우저 코드는 DB 비밀번호를 가질 수 없다. 화면은 API 계약만 알고 서버가 저장소를 호출한다. 이 저장소의 서버는 Node 표준 http와 sqlite 모듈을 사용한다. 다른 웹 프레임워크를 추가하지 않는다.

모델은 User, Post, Comment다. Post의 title/body/tags와 authorId를 저장하고 API 직렬화에서 author와 commentCount를 만든다. DTO는 저장 모델에서 공개 필드만 골라 보내는 포장 상자다. 시간은 ISO 8601 UTC, 필드명은 camelCase다.

학습용 records 테이블은 bucket,id,payload 복합 키를 갖는다. JSON payload 안에 모델을 보관하여 DB 교체를 단순화했다. 실제 대용량 서비스에서는 posts/users/comments를 독립 테이블로 정규화하고 FK·unique·인덱스·트랜잭션으로 무결성을 강화해야 한다. 현재 직렬화 잠금은 단일 프로세스까지만 보호한다.''',steps='''1. SQLITE_PATH를 data/study.sqlite로 설정한다. 최초 실행 시 디렉터리와 records 테이블이 생성된다.
2. createResource의 source가 검색 URL 문자열이므로 검색 조건 변경 때 fetcher가 실행된다. pending·error·empty·success를 구분한다.
3. 목록 GET /api/posts, 상세 GET /api/posts/{id}, 등록 POST, 수정 PATCH, 삭제 DELETE를 순서대로 실행한다. POST 응답 Location을 확인한다.
4. 목록 meta의 page/limit/total/totalPages/q, sort 허용 목록, limit 최대 50을 확인한다. 경로는 /api/v1/posts로 바꾸지 않는다. v1은 계약 버전이다.
5. API 공통 error.code/message/fields/requestId와 X-Request-Id를 연결한다. 서버 연결 정보는 .env, 프론트는 VITE_API_BASE만 읽는다.''',commands='npm run dev\nInvoke-RestMethod "http://127.0.0.1:3000/api/posts?page=1&limit=10&sort=-createdAt"\nnpm test',files=['src/api.ts','server/store.mjs','server/posts.mjs'],links='브라우저 createResource → api<T> → Node route → repository → SQLite → DTO → data/meta로 돌아온다. 서버의 기초 라우트 전체는 studymidpoint.md에 수록한다. 인증을 붙이는 study7에서도 공개 GET 계약은 유지한다.',errors=[('SQLite 열기 실패','경로·권한 문제','부모 폴더 권한과 SQLITE_PATH 확인'),('목록 undefined','data envelope 누락','resource 값의 data를 읽는다'),('삭제 JSON 파싱 실패','204에서 json 호출','본문 없이 반환')],exercises=['글 12개를 만들고 limit=5로 페이지 경계를 확인한다.','한글·영문 대소문자 검색과 빈 목록 meta를 확인한다.','서버를 재시작해 SQLite 데이터가 남는지 확인한다.'],checks=['createResource 로 게시판 API 불러오기','공통 /api/posts v1과 data/meta/error 형식을 맞췄다.','목록·상세·등록·수정·삭제·댓글 계약을 실행했다.'],next='study7.md'),
dict(key='7',title='인증·보안 기초',goal='서버 세션 토큰과 작성자 검사로 사용자 경계를 만든다.',theory='''인증은 누구인가, 인가는 무엇을 바꿀 수 있는가다. 회원가입은 salt와 scrypt로 비밀번호를 해시한다. 복호화가 가능한 암호화가 아니며 원문을 DB·응답·로그에 남기지 않는다. 로그인은 같은 입력에서 계산한 키를 timingSafeEqual로 검사한다.

이 과정은 JWT 대신 무작위 opaque Bearer 세션을 사용한다. 토큰 원문은 메모리의 프론트 상태에만 있고 DB에는 SHA-256 해시와 만료 시각을 저장한다. 서버가 세션을 지워 즉시 로그아웃시킬 수 있다. 만료 기본값은 1시간이다. 새로고침하면 메모리가 사라져 다시 로그인한다.

CORS는 허용 Origin 정책이며 인증을 대신하지 않는다. 일반 API는 자동 첨부 쿠키 대신 명시적인 Authorization을 사용하여 CSRF 표면을 줄인다. httpOnly 쿠키로 전환하면 SameSite·Secure·Origin 검증과 CSRF 토큰 전략이 필요하다. XSS는 문자열을 텍스트로 렌더링하고 innerHTML을 피하며 서버의 CSP와 함께 줄인다. UI의 수정 버튼 숨김 외에도 서버 owner 검사가 반드시 필요하다.''',steps='''1. 이메일·10~128자 비밀번호·닉네임으로 가입한다. 중복 이메일은 409다.
2. 로그인 200 응답을 acceptSession에 전달한다. api 함수가 Authorization 헤더를 붙인다.
3. 다른 계정으로 남의 글 PATCH/DELETE를 시도해 403을 확인한다. 토큰 없음·만료·위조는 401이다.
4. 로그아웃은 서버 세션을 삭제한 뒤 프론트 상태를 지운다. 401 응답에도 프론트 세션을 초기화한다.
5. 악성 마크업을 본문으로 저장해도 글자로 표시되는지 브라우저 테스트로 확인한다. 로그인 실패 제한도 서버에서 검사한다.''',commands='npm test\nnpm run test:e2e',files=['server/auth.mjs','src/session.ts','src/pages/Login.tsx'],links='프론트 토큰과 서버 세션 해시가 같은 로그인 상태를 나타낸다. 이 토큰으로 study13 외부 기능과 study18 문서 AI의 사용자 경계를 재사용한다.',errors=[('401 반복','메모리 토큰 소실 또는 만료','재로그인 후 Bearer 확인'),('남의 글 변경 가능','화면 버튼만 숨김','서버에서 authorId와 user.id 비교'),('XSS 실행','innerHTML 사용','JSX 텍스트로 출력하고 입력 HTML을 실행하지 않는다')],exercises=['토큰 한 글자를 바꾸어 401을 확인한다.','DB에 비밀번호 원문과 세션 원문이 없는지 확인한다.','두 계정의 수정·댓글 삭제 권한을 검증한다.'],checks=['회원가입·로그인·만료·로그아웃을 확인했다.','비밀번호 해시와 Bearer 세션을 서버에서 검증한다.','CORS·XSS·CSRF의 역할을 설명했다.'],next='study8.md'),
dict(key='8',title='구조화·재사용·환경 분리',goal='화면·통신·모델·설정을 분리하여 같은 규칙을 재사용한다.',theory='''중복은 코드 줄 수보다 규칙이 여러 곳에서 달라지는 것이 문제다. api는 헤더·204·오류를 통일하고 PostForm은 등록·수정에서 같은 입력 규칙을 재사용한다. 서버 errors는 오류 envelope, auth는 권한, posts는 검증과 DTO, store는 데이터 접근을 맡는다.

환경변수는 브라우저 빌드 시점과 서버 실행 시점을 구분한다. import.meta.env.VITE_API_BASE는 번들에 들어가는 공개 값이다. process.env.DATABASE_URL과 API 키는 Node 프로세스에서만 읽는다. 배포 후 VITE 값을 변경하려면 재빌드하고 서버 값은 프로세스를 재시작한다.

의존성은 화면 → API 계약 → 서버 도메인 → 저장소 방향으로 흐른다. 경로 문자열·타입·오류 규칙을 한곳에서 관리하면 DB를 바꿔도 화면 컴포넌트를 유지할 수 있다.''',steps='''1. types.ts의 User/Post/PostInput/Meta가 실제 JSON과 같은지 확인한다.
2. config.ts에는 공개 API base와 mode만 둔다. session은 로그인 자료, api는 네트워크만 맡는다.
3. 개발은 .env, 기초 빌드는 공개 VITE_STAGE만 담은 .env.basic, 운영은 호스트의 비밀 설정을 사용한다. .env.basic에는 키를 넣지 않는다.
4. npm ls로 버전을 확인하고 lockfile을 함께 커밋한다. 다른 컴퓨터·CI에서는 npm install 대신 npm ci로 재현한다.''',commands='npm ls --depth=0\ngit check-ignore .env\nnpm run build',files=['src/config.ts','src/types.ts','.env.example','server/errors.mjs'],links='DB·외부 서비스 어댑터가 늘어나는 study11 이후에도 PostInput·Post DTO는 동일하다. study9 테스트는 계층별로 가짜 의존성을 넣어 이 경계를 검증한다.',errors=[('운영 API 주소가 개발 주소','VITE 값을 런타임에만 변경','프론트 재빌드'),('키가 번들에 포함','VITE_ 접두어 오용','키를 서버 전용으로 이동하고 유출 키 폐기'),('설치 결과가 다름','lockfile 미사용','lockfile 커밋 후 npm ci')],exercises=['공개·비공개 설정 표를 작성한다.','같은 PostForm이 등록·수정 두 곳에서 쓰이는 흐름을 따라간다.'],checks=['통신·모델·권한·저장소 책임을 분리했다.','개발·운영 변수의 적용 시점을 구분한다.','실제 비밀과 DB 파일을 Git에서 제외한다.'],next='study9.md'),
dict(key='9',title='테스트·디버깅·오류 TOP 10',goal='동작과 계약을 테스트하고 요청 ID로 오류를 추적한다.',theory='''단위 테스트는 작은 규칙, 요청 테스트는 실제 HTTP·DB 계약, 브라우저 테스트는 사용자 행동을 검증한다. 테스트를 많이 만드는 것보다 깨졌을 때 중요한 오류를 잡는 것이 목적이다. node:test의 메모리 SQLite는 실제 SQL 저장소를 외부 설치 없이 실행한다.

가짜 fetch는 네트워크 경계를 대체한다. Stripe·메일·모델 API의 호출 URL·헤더·본문·스트림을 검사하면서 실제 과금·발송을 하지 않는다. UI 테스트는 시그널 갱신과 중복 제출을, Playwright는 실제 브라우저의 가입부터 CRUD·AI 응답까지 검증한다.

개발자도구 Network에서 상태·본문·X-Request-Id를 확인하고 서버 JSON 로그의 requestId와 연결한다. VS Code의 Node 디버거에서 server/index.mjs를 실행하면 검증과 owner 지점에 breakpoint를 둘 수 있다. 토큰·비밀번호·문서 본문을 로그로 출력하지 않는다.''',steps='''1. npm test에서 계약·권한·잘못된 JSON·동시 가입·AI 한도·실제 MCP stdio를 확인한다.
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
| 스트림 JSON 오류 | 패킷을 완성 프레임으로 간주 | UTF-8 decoder와 buffer 사용 |''',commands='npm test\nnpm run test:ui\nnpm run build\nnpx playwright install chromium\nnpm run test:e2e',files=['src/labs/Signals.test.tsx','tests/helpers.mjs','tests/api.test.mjs'],links='tests/helpers가 의존성을 주입해 메모리 DB를 사용하고 외부 fetch는 가짜 응답으로 바꾼다. 이 검증을 study16 CI에서 그대로 실행한다.',errors=[('E2E에 JSON만 보임','빌드 산출물 없음','build 완료 후 E2E'),('테스트끼리 간섭','공유 DB 사용','fixture별 메모리 DB'),('mock인데 과금','실제 fetch 호출 경로 잔존','어댑터 fetcher 주입과 mock 모드 확인')],exercises=['의도적으로 owner 검사를 제거해 테스트가 실패하는지 확인한 후 복구한다.','잘못된 tags 입력 케이스를 하나 추가한다.','requestId 하나로 브라우저와 서버 기록을 연결한다.'],checks=['단위·HTTP·브라우저 테스트 경계를 구분한다.','DB·외부 API를 격리하여 테스트한다.','오류 TOP 10을 재현 또는 설명했다.'],next='study10.md'),
dict(key='10',title='빌드·배포·기초 정리',goal='검증한 SPA와 API를 같은 Origin에서 제공한다.',theory='''npm run build는 TypeScript 검사 후 JS·CSS·HTML을 dist에 만든다. Vite 개발 서버는 학습 편의를 위한 서버이고 배포에서는 Node 서버가 dist와 /api를 제공한다. 도메인의 DNS가 서버 주소를 가리키고 HTTPS는 인증서로 전송을 암호화한다.

단일 Origin은 브라우저 화면과 API의 출처를 같게 만들어 경로·CORS 설정을 단순하게 한다. Node 3000 앞의 TLS 종료 프록시가 인증서를 관리할 수 있다. SQLite 데이터 디렉터리는 배포 산출물과 분리한 영속 볼륨에 둔다. 일회성 컨테이너 파일 시스템에만 두면 재배포 때 데이터가 사라진다.''',steps='''1. 환경변수의 PUBLIC_ORIGIN·CORS_ORIGIN을 실제 배포 주소로 맞춘다. 로컬 빌드 확인은 둘 다 http://localhost:3000이다.
2. npm test와 npm run test:ui를 통과시킨 뒤 빌드한다. /health, 목록, 상세 직접 접근, 로그인, 작성·수정·삭제를 확인한다.
3. 기본 배포는 Node 24 호스트에서 npm ci, npm run build, npm start다. Docker 자동화는 study16에서 확장한다.
4. 프록시는 /api를 Node로 보내고 SPA 화면 경로를 유지한다. HTTPS 페이지에서는 API와 WebSocket도 HTTPS/WSS를 사용한다.
5. DB 경로·파일 권한·백업·재시작 복구를 점검한다. 실제 외부 배포 완료 여부는 별도의 검증 기록을 확인한다.''',commands='npm ci\nnpm test\nnpm run test:ui\nnpm run build\n$env:PUBLIC_ORIGIN="http://localhost:3000"\n$env:CORS_ORIGIN="http://localhost:3000"\nnpm start',files=['server/index.mjs','src/index.tsx'],links='시그널→컴포넌트→URL→폼→API→저장소→인증→검증을 하나의 작은 서비스로 묶는 단계가 studymidpoint다. 운영 DB 교체는 study11에서 다룬다.',errors=[('혼합 콘텐츠 차단','HTTPS 화면에서 HTTP API','같은 HTTPS Origin 사용'),('재배포 후 데이터 소실','DB를 임시 경로에 저장','영속 볼륨·복구 검증'),('빈 화면','이전 캐시·산출물 경로 오류','asset 404와 HTML no-cache 확인')],exercises=['/posts/존재하는id 직접 접근을 새 탭에서 확인한다.','서버 재시작 후 데이터가 남는지 확인한다.','개발·배포 환경변수 차이를 기록한다.'],checks=['빌드와 정적 파일 제공을 확인했다.','도메인·DNS·HTTPS 역할을 설명했다.','배포 주소·환경변수·DB 영속성·404·권한을 점검했다.'],next='studymidpoint.md'),
]

CHAPTERS += [
dict(key='midpoint',title='중간 응용 · 로그인 게시판',goal='study0~10의 기술만으로 로그인·게시판·댓글 서비스를 완성한다.',
 theory='''이 단계의 범위는 SolidJS 컴포넌트·시그널·라우터·폼·createResource, Node 표준 HTTP, SQLite, 세션, 테스트, 정적 빌드다. 심화 UI 라이브러리·외부 결제·AI·WebSocket·Docker를 사용하지 않는 별도 진입점을 제공한다. 한 번에 모든 기능을 얹기 전에 작은 수직 흐름을 완성하는 것이 목적이다.

목록 화면만 완성해도 서버·DB 계약이 맞지 않으면 서비스가 아니다. 가입한 사용자가 글을 저장하고 재조회한 결과를 실제 DOM에서 확인해야 완료다. API가 택배 창구라면 DB는 창고이고 인증은 출고 권한 확인에 해당한다.''',
 steps='''### 목표

가입한 사용자가 학습 글을 작성·수정·삭제하고 다른 사용자와 댓글로 의견을 나눈다. 배포 후 직접 상세 URL을 열어도 동작한다.

### 기능 목록

- 회원가입·로그인·내 정보·로그아웃, 1시간 세션.
- 글 목록·검색·정렬·페이지·상세·작성·부분 수정·삭제.
- 댓글 등록·목록·작성자 삭제, 글 삭제 시 댓글 정리.
- 필드 오류·401·403·404 안내, 비밀번호 해시·텍스트 출력.

### 폴더 구조

```text
src/basic.tsx          기초 라우터와 셸
src/pages/            Posts·Detail·Editor·Login
src/components/       PostCard·PostForm
src/api.ts            통신 공통 규칙
server/basic.mjs      기초 HTTP 서버
server/auth.mjs       해시·세션·인가
server/posts.mjs      검증·DTO·목록
server/store.mjs      SQLite 저장소
tests/                계약·권한 테스트
```

### 단계별 구현 순서

1. study0 환경과 .env를 준비하고, .env.basic의 VITE_STAGE=basic을 확인한다.
2. Hello·컴포넌트·상태 실험을 끝낸 뒤 목록·상세·작성 URL을 연결한다.
3. PostForm의 save 콜백을 API에 연결하고 SQLite에서 Post를 읽고 쓴다.
4. 가입·로그인·세션 해시를 구현하고 모든 쓰기에 인증·작성자 검사를 넣는다.
5. 검색·정렬·페이지·댓글을 붙이고 오류 envelope를 통일한다.
6. `npm run build:basic` 후 `npm run start:basic`로 실행한다. 심화 진입점은 이 빌드에 포함하지 않는다. **기초 실행은 기본 SQLITE_PATH=data/midpoint.sqlite를 사용**하며 심화 DB로 덮어쓰지 않는다.

### DB·API 연동 구성도

```mermaid
flowchart LR
  UI[SolidJS 기초 SPA] -->|JSON + Bearer| HTTP[Node HTTP /api]
  HTTP --> Rules[검증 · 세션 · 작성자 검사]
  Rules --> Repo[repository]
  Repo --> DB[(SQLite)]
  DB --> DTO[data · meta · error]
  DTO --> UI
```

### 1차 배포 체크리스트

- [ ] 기초 빌드로 회원가입부터 댓글 삭제까지 직접 실행한다.
- [ ] /health와 목록 GET, 상세 직접 접근, 화면 404를 점검한다.
- [ ] .env·DB·백업을 제외하고 lockfile을 보관한다.
- [ ] 배포 주소·CORS·HTTPS·영속 저장 경로를 맞춘다.
- [ ] 두 계정으로 남의 글 수정·삭제가 403인지 확인한다.

### 회고

완료 증거는 응답 상태와 화면 변화로 남긴다. “어떤 기능을 만들었나”, “어느 경계에서 막혔나”, “왜 props 구조분해와 204 처리에 주의했나”, “DB를 바꿀 때 화면은 무엇을 알아야 하나”를 각각 2문장으로 기록한다. 실제 외부 배포는 URL·검증 기록이 있을 때만 완료로 적는다.''',
commands='npm ci\nnpm run build:basic\n# 자동 브라우저 확인 (별도 서버 실행 없이 테스트가 서버를 띄움)\n$env:BASIC_E2E="1"\nnpm run test:e2e\nRemove-Item Env:BASIC_E2E\n$env:PUBLIC_ORIGIN="http://localhost:3000"\n$env:CORS_ORIGIN="http://localhost:3000"\nnpm run start:basic',files=['src/basic.tsx','server/basic.mjs'],links='기초 서비스의 Post/Meta/Error 계약을 동결한다. study11은 이 계약을 유지한 채 서버 저장소만 교체한다. 심화로 돌아올 때 npm run build를 다시 실행한다.',errors=[('AI 메뉴가 보임','심화 빌드를 실행','build:basic으로 다시 빌드'),('글이 사라진 듯 보임','기초·심화 SQLite 파일이 다름','실행 모드와 SQLITE_PATH 확인'),('수정은 막았는데 삭제 가능','DELETE에 owner 누락','모든 쓰기에 동일 인가 적용')],exercises=['가입→글→댓글→수정→삭제 전체 시나리오를 두 계정으로 실행한다.','1차 배포 전후 데이터 영속성을 확인한다.','DB를 재생성 가능한 가짜 데이터와 보존할 데이터로 나눈다.'],checks=['study0~10만 사용하는 기초 실행 경로를 확인했다.','로그인·CRUD·댓글·권한·오류 흐름을 연결했다.','구성도·배포 점검·회고를 작성했다.'],next='study11.md'),
dict(key='11',title='DB 교체와 ORM·ODM',goal='Post API를 유지하면서 PostgreSQL·MariaDB·MongoDB 저장소를 교체한다.',theory='''DB 교체는 브라우저에서 드라이버를 바꾸는 작업이 아니다. 서버 환경 설정과 저장소 어댑터를 바꾸고 같은 API 테스트를 다시 통과시킨다. 전원 플러그 어댑터를 바꾸어도 기기 조작법이 유지되는 것과 같다.

native 어댑터는 pg·mariadb·mongodb 드라이버를 직접 사용한다. ORM 경로는 PostgreSQL/MariaDB에 Sequelize, MongoDB에 Mongoose ODM을 사용한다. ORM은 SQL 모델과 쿼리 생성을 돕고 ODM은 문서 스키마와 인덱스를 관리한다. 두 경로 모두 all/put/delete/close라는 저장소 계약을 구현한다.

PostgreSQL native payload는 JSONB와 $1 자리표시자, MariaDB는 LONGTEXT JSON과 ?·ON DUPLICATE KEY, MongoDB는 문서와 복합 unique 인덱스를 사용한다. SQL ORM의 orm_records는 native records와 별도 테이블이다. DB_ACCESS 변경이 기존 데이터를 자동 변환하지 않으므로 백업·복원 또는 명시적인 이관이 필요하다.

현재 학습 매퍼는 JSON 레코드 모델이며 관계형 최적화의 완성형은 아니다. 다중 프로세스로 늘리기 전 DB sequence·email unique·FK·트랜잭션·행 잠금·검색 인덱스를 도입해야 한다.''',steps='''1. 격리된 학습 DB를 compose profile로 실행한다. 호스트 기본 포트는 충돌을 줄이기 위해 PostgreSQL 15432, MariaDB 13306, MongoDB 27027이다.
2. .env의 DB_DRIVER와 DATABASE_URL을 아래 표처럼 설정한다. 값은 로컬 학습 기본 비밀번호이며 운영에서는 별도 비밀을 사용한다.

| DB_DRIVER | DATABASE_URL 예시 | DB_ACCESS=orm |
| --- | --- | --- |
| postgres | postgres://study:local-study-password@127.0.0.1:15432/study | Sequelize dialect=postgres, pg |
| mariadb | mariadb://study:local-study-password@127.0.0.1:13306/study | Sequelize dialect=mariadb, mariadb |
| mongodb | mongodb://study:local-study-password@127.0.0.1:27027/study?authSource=admin | Mongoose connection·Schema·unique index |

3. DB_ACCESS=native로 먼저 왕복한다. orm으로 바꾼 뒤 서버를 재시작하여 ORM 모델 생성·upsert·조회·삭제를 실행한다. 운영에서는 sync alter/force 대신 버전 마이그레이션을 사용한다.
4. 테스트 DB만 대상으로 db-matrix를 실행하면 각 DB의 native/orm 총 6개 계약을 확인한다. 외부 실제 DB를 사용하려면 TEST_POSTGRES_URL 등 환경변수로 별도 테스트 DB를 지정한다.
5. 데이터를 옮길 때 쓰기를 잠시 중지하고 npm run backup → 새 빈 DB에 npm run restore를 적용한다. 레코드 수·한글·authorId 연결·댓글 수를 확인한다. 세션은 복원하지 않는다.''',commands='docker compose -p solidjs-study --profile postgres --profile mariadb --profile mongodb up -d postgres mariadb mongodb\nnode --test --test-concurrency=1 tests/db-matrix.mjs\n# .env 변경 뒤 서버 재시작\nnpm start',files=['server/store.mjs','server/orm-store.mjs','tests/db-matrix.mjs'],links='프론트 PostCard와 PostForm은 DB 종류를 모른다. 연결 정보는 서버 전용이고 Docker 내부에서는 127.0.0.1 대신 postgres:5432, mariadb:3306, mongodb:27017 같은 서비스 이름을 사용한다.',errors=[('ECONNREFUSED','DB 준비 전 접속·잘못된 포트','health·서비스 로그·호스트 포트 확인'),('인증 실패','URL 비밀번호 특수문자·authSource','URL 인코딩과 Mongo authSource=admin 확인'),('ORM 전환 뒤 빈 목록','별도 테이블 사용','백업·빈 DB 복원으로 명시적 이관')],exercises=['같은 게시글 API 요청을 DB 3종에서 실행한다.','native에서 ORM으로 이관해 레코드 수와 관계를 확인한다.','운영용 정규화 Post 테이블과 authorId 인덱스를 설계한다.'],checks=['MariaDB·PostgreSQL·MongoDB 연결 설정을 분리했다.','ORM·ODM 모델·키·인덱스·드라이버 차이를 설명했다.','6가지 실제 DB 접근 경로의 계약을 검증했다.'],next='study12.md'),
dict(key='12',title='UI·상태 관리·폼 라이브러리',goal='Solid 전용 UI·store·폼 라이브러리로 접근 가능한 설정 화면을 만든다.',theory='''UI 라이브러리는 열기·닫기·포커스 같은 반복 상호작용을 맡고, 상태 관리는 도메인 값을, 폼 라이브러리는 필드 검증·dirty·submitting을 맡는다. 이 역할을 나누면 같은 값을 여러 저장소에 중복으로 복사하지 않아도 된다.

Kobalte Dialog는 모달의 포커스·Escape·접근성 연결을 제공한다. createStore는 중첩 객체의 경로를 반응적으로 읽고 갱신한다. Modular Forms의 createForm은 Form/Field와 폼 상태를 만든다. 현재 Modular Forms는 유지보수 모드지만 이 저장소는 Solid 1.x와 검증한 버전을 고정해 연동 원리를 학습한다.

Dialog는 문을 여닫는 장치, store는 저장된 설정, form은 제출 전 작성 중인 종이에 비유할 수 있다. 폼 submit에서만 store를 바꾸고 서버 설정이 필요하면 그 자리에 API 호출을 추가한다.''',steps='''1. /labs → 설정 열기를 누른다. title/description이 dialog 접근성 이름·설명으로 연결되는지 확인한다.
2. Field에 name, validate, value, 이벤트 props를 연결한다. 빈 값을 제출하여 필드 오류를 확인한다.
3. 새 이름을 저장하면 createStore의 nickname과 saved가 갱신된다. 닫기 버튼 aria-label도 화면 언어와 일치시킨다.
4. Tab/Shift+Tab/Escape로 포커스를 확인한다. UI 라이브러리를 쓰더라도 label·오류 문구·버튼 이름은 직접 검증한다.
5. 사용자 프로필을 서버에 저장하려면 Form submit에서 PATCH 성공을 기다린 뒤 store를 바꾸고 400 fields를 해당 Field 오류로 연결한다.''',commands='npm ls @kobalte/core @modular-forms/solid solid-js\nnpm run build\nnpm run test:e2e',files=['src/labs/Ui.tsx'],links='초기 PostForm은 기초 원리를 보여 주고 이 단계는 라이브러리 폼으로 확장하는 별도 실험이다. 전역 로그인 상태는 session에 유지하며 UI 설정 store와 섞지 않는다.',errors=[('Dialog가 배경 아래 표시','Portal·레이어 스타일 누락','Portal·Overlay·Content 스타일 확인'),('값이 입력 안 됨','Field 이벤트 props 누락','props spread와 value 연결'),('닫기 버튼 못 찾음','기본 접근성 이름이 다른 언어','aria-label을 명시하고 브라우저 검증')],exercises=['색상 설정 필드를 store에 추가한다.','빈 이름 검증과 Escape 닫기를 직접 확인한다.','폼 저장 실패 가짜 API를 주입하고 입력 유지 여부를 확인한다.'],checks=['Solid 전용 UI·store·폼을 연결했다.','필드 검증과 submitting을 표시했다.','키보드·레이블·Dialog 이름을 확인했다.'],next='study13.md'),
dict(key='13',title='결제·메일·업로드·OAuth',goal='서버 경계를 통해 외부 서비스에 연결하고 mock과 실제 호출을 명확히 구분한다.',theory='''외부 서비스 키는 서버가 보관한다. 브라우저가 상품 가격·메일 수신자·OAuth 비밀을 임의로 결정하지 못하도록 서버 정책으로 제한한다. 요청이 외부 공급자를 거쳐 돌아오는 택배 과정처럼 지연·중복·실패가 정상적인 가능성이다.

결제는 서버에 고정한 Stripe Price로 Checkout URL만 생성한다. Idempotency-Key로 같은 요청을 식별하고 success URL로 돌아왔다고 결제가 확정되었다고 표시하지 않는다. 실제 상품 지급은 서명 검증된 webhook과 DB 주문 상태가 있어야 하며 이 학습 예제는 상품 지급을 하지 않는다.

메일은 Resend로 로그인 사용자 본인의 주소에만 고정된 알림을 보낸다. OAuth는 state를 서버 해시와 httpOnly SameSite 쿠키에 묶어 검증하고, 공급자의 사용자 id로 계정을 연결한다. 이메일이 같다는 이유로 자동 계정 병합하지 않는다. 프론트에는 공급자 토큰 대신 만료 60초의 일회용 교환 코드를 전달한다.

파일은 UTF-8 TXT·MD 500KB로 제한해 원문을 DB에 저장한다. 파일명을 경로로 쓰지 않으므로 경로 탈출을 피한다. 문서 접근은 소유자 검사 후 허용한다. 대용량 객체 저장소를 도입할 때는 private bucket과 짧은 서명 URL, MIME·확장자·스캔 정책을 추가한다.''',steps='''1. 기본 INTEGRATIONS_MODE=mock으로 /services와 소셜 로그인 흐름을 실행한다. 응답 provider=mock을 확인한다.
2. live를 선택할 경우 서버 .env에 Stripe test key/price id, Resend 키/검증된 발신 주소, GitHub OAuth id/secret을 설정한다. 실제 메일 발송·결제는 계정과 테스트 범위가 준비된 사람이 수행한다.
3. OAuth callback URL을 PUBLIC_ORIGIN/api/oauth/callback으로 등록한다. state 일치·만료·재사용 거절과 exchange code 일회성을 확인한다.
4. /documents에서 TXT·MD 업로드, 크기·UTF-8 검증, 다른 계정 접근 거절을 확인한다.
5. HTTP 어댑터 테스트는 fetcher를 가짜로 주입해 실제 외부 요청 없이 호출 형식을 검사한다. live 거래가 검증되었다고 기록하지 않는다.''',commands='npm test\n# .env INTEGRATIONS_MODE=mock 기본 유지\nnpm run dev',files=['server/integrations.mjs','src/pages/Services.tsx','tests/integrations.test.mjs'],links='같은 Bearer 인증으로 외부 API 요청을 보호한다. 문서 업로드는 study18의 근거 검색 입력으로 이어지고 결제·메일 호출 실패는 공통 오류 envelope로 UI에 표시한다.',errors=[('OAuth state 실패','쿠키 Origin·callback 불일치·재사용','같은 Origin으로 start부터 다시 시작'),('메일 거절','발신 도메인 미검증','공급자 설정과 MAIL_FROM 확인'),('결제 완료 오판','성공 리다이렉트만 신뢰','서명 webhook 전에는 paid=false 유지')],exercises=['mock OAuth의 state를 바꾸어 거절되는지 확인한다.','가짜 fetch에서 502와 타임아웃을 만들어 UI 오류를 확인한다.','업로드 경계 500KB와 허용하지 않는 확장자를 시험한다.'],checks=['결제·메일 키를 서버에서만 읽는다.','업로드 형식·크기·소유자를 검증한다.','OAuth state·코드 교환·재사용 차단을 확인했다.','mock 검사와 실제 서비스 거래 검증을 구분한다.'],next='study14.md'),
dict(key='14',title='REST·OpenAPI·버전·오류 규칙',goal='게시판 v1 계약을 OpenAPI로 문서화하고 변경을 관리한다.',theory='''REST는 URL을 자원으로 보고 HTTP method로 동작을 표현한다. 복수 명사 /api/posts, /api/posts/{id}, /api/posts/{id}/comments를 사용하며 수정은 PATCH로 통일한다. GET에는 조회 조건을 query로 보내고 POST/PATCH에는 JSON body를 보낸다.

OpenAPI는 사람이 읽는 설명과 도구가 읽는 스키마를 함께 제공한다. 이 서버 /api-docs는 OpenAPI 3.0.3 JSON 문서이며 Swagger UI 화면 자체는 아니다. Swagger Editor나 UI에 이 JSON을 import할 수 있다. 성공 단건은 data, 목록은 data/meta, 실패는 error로 통일한다.

v1은 원문 공통 계약의 버전이고 현재 경로 /api/posts를 보존한다. 호환 필드 추가는 v1 안에서 관리하되 필드 삭제·의미 변경은 새 계약과 명시적 마이그레이션을 설계한다. 임의로 /api/v1만 도입하면 기존 노션 최소 코드가 깨진다.''',steps='''1. /api-docs를 열고 실제 경로·인증·상태·파라미터·schemas가 일치하는지 확인한다.
2. 목록 query는 page≥1, limit=1~50, q 부분 검색, sort=createdAt/-createdAt/-commentCount다. totalPages는 ceil(total/limit)이며 빈 목록은 0이다.
3. POST는 201과 Location, PATCH는 200, DELETE는 204 본문 없음을 확인한다. 입력 오류는 400 fields다. id 문법 오류는 BAD_REQUEST, 없는 자원은 NOT_FOUND다.
4. X-Request-Id를 오류 본문 requestId와 일치시키고 500에서 스택을 숨긴다. 401·403·409·413·429·502·503의 의도를 문서화한다.
5. 스키마 변경 후 계약 테스트와 Swagger import를 수행한다. SSE 응답은 JSON envelope 대신 text/event-stream이라는 별도 계약이다.''',commands='Invoke-RestMethod http://127.0.0.1:3000/api-docs | ConvertTo-Json -Depth 30\nnpm test',files=['server/openapi.mjs','server/errors.mjs'],links='OpenAPI는 src/types.ts와 서버 DTO의 기준이다. 페이지네이션·오류의 일관성은 study15 캐시와 운영 로그를 해석하는 기준으로도 쓰인다.',errors=[('Swagger에는 성공인데 실제 오류','스키마·핸들러 불일치','계약 테스트로 실제 응답 검증'),('빈 페이지가 실패로 표시','0개 결과를 오류로 취급','data=[]와 meta를 정상 응답'),('추적 불가','본문 id와 헤더 id가 다름','한 requestId를 재사용')],exercises=['API 문서를 Swagger Editor에 import한다.','등록·수정·삭제 상태와 헤더를 표로 기록한다.','호환 필드 추가와 breaking change 예시를 각각 설계한다.'],checks=['REST 자원·method·버전 정책을 문서화했다.','OpenAPI와 실제 응답의 필드·인증·상태를 확인했다.','페이지네이션·정렬·공통 오류·requestId를 검증했다.'],next='study15.md'),
dict(key='15',title='성능·캐시·비동기·작업 큐',goal='측정 후 캐시·지연 로딩·백그라운드 분석을 적용한다.',theory='''캐시는 동일한 질문의 최근 답을 잠시 보관하는 메모다. 응답 캐시 키에는 검색·페이지·정렬 조건이 포함되어야 한다. 이 실습의 공개 목록 캐시는 TTL 5초·최대 100개이며 글·댓글 변경 때 비운다. 개인 문서와 인증 응답은 공유 캐시에 넣지 않는다.

비동기는 대기 시간을 다른 작업과 겹칠 수 있게 하지만 CPU 계산을 자동으로 다른 코어에 옮기지 않는다. 문서 통계는 Worker thread에서 계산하고 DB jobs 상태로 queued/running/complete/failed를 남긴다. 재시작 때 running을 queued로 되돌린다. 현재 워커는 단일 서버 실습용이며 여러 인스턴스 운영에는 원자적 claim·재시도·분산 큐가 필요하다.

지연 로딩은 상세·문서·UI 실험실 코드를 최초 목록 번들에서 분리한다. 측정은 p50·p95·응답 크기·요청 수를 함께 보고 동일한 데이터·워밍업 조건으로 비교한다. API가 빠르더라도 긴 메인 스레드 작업이나 큰 UI 번들이 화면을 느리게 할 수 있다.''',steps='''1. 목록을 같은 query로 두 번 요청해 X-Cache MISS→HIT을 확인한다. 글·댓글을 바꾼 직후 다시 MISS여야 한다.
2. measure.mjs로 50개 샘플의 p50/p95/max를 수집한다. 첫 요청과 캐시된 요청을 구별하고 결과를 기록한다.
3. /documents에서 백그라운드 분석을 예약하고 202의 job id로 상태를 조회한다. 소유자 외 조회는 403이다.
4. 개발자도구 Performance·Network에서 CPU 시간·레이아웃·번들 로드를 확인한다. 큰 데이터로 측정 전후를 기록한다.
5. TTL만 늘려 신선도 문제를 숨기지 않는다. DB 조회 최적화가 필요하면 정규화·필터 인덱스·서버 페이지네이션부터 적용한다.''',commands='node scripts/measure.mjs\nnpm test\nnpm run build',files=['scripts/measure.mjs','server/jobs.mjs','server/text-worker.mjs'],links='서버 목록 캐시는 공개 API에만 적용하고 POST/PATCH/DELETE에서 무효화한다. 영속 jobs와 로그를 study16 운영 도구로 관찰하고 study17 알림으로 완료 상태를 전달할 수 있다.',errors=[('수정해도 옛 제목','캐시 무효화 누락','모든 변경 경로에서 cache.clear'),('CPU 때 서버 멈춤','메인 스레드 계산','Worker로 넘기고 입력 상한 적용'),('재시작 후 running 고정','복구 규칙 없음','진행 상태 재큐잉과 멱등 작업')],exercises=['캐시 TTL을 바꾸고 p95와 신선도 영향을 기록한다.','완료 작업과 실패 작업을 각각 조회한다.','문서가 없는 작업의 실패 상태를 테스트한다.'],checks=['캐시 키·TTL·상한·무효화를 확인했다.','비동기 I/O와 CPU Worker 차이를 설명했다.','p50/p95·번들·백그라운드 상태를 측정했다.'],next='study16.md'),
dict(key='16',title='Docker·CI/CD·로그·백업',goal='같은 검증을 컨테이너와 CI에서 재현하고 복구 절차를 갖춘다.',theory='''Docker 이미지는 실행에 필요한 파일과 런타임을 묶는다. 다단계 빌드는 빌드 도구를 최종 이미지에서 제외하고 node 사용자로 실행한다. DB와 문서는 이미지에 굽지 않고 볼륨에 보관한다.

CI는 변경이 계약을 지키는지 확인하고 CD는 통과한 변경을 배포한다. 이 저장소 Actions는 문서 검사→API·UI→빌드→브라우저→의존성→Docker 순서로 검증한다. 배포는 DEPLOY_ENABLED=true와 DEPLOY_HOOK_URL을 구성한 호스트에 hook을 보낸 뒤 HEALTH_URL을 확인한다. 설정 전에는 검증만 실행한다.

백업은 파일 생성이 아니라 복원까지 확인해야 의미가 있다. 실행 중인 SQLite 파일만 복사하면 WAL이 빠질 수 있어 이 실습은 쓰기 중지 후 논리 레코드를 export한다. 백업에는 해시·문서가 포함되므로 비밀 저장소로 취급하고 Git에서 제외한다. 다중 서버 운영에서는 DB별 snapshot·트랜잭션 일관 백업으로 확장한다.''',steps='''**구현·운영 점검 순서**

1. [ ] .dockerignore가 .env·data·backups를 빌드 context에서 제외한다.
2. [ ] Dockerfile의 npm ci·빌드·비root 실행·healthcheck를 확인한다.
3. [ ] docker compose up --build로 같은 Origin 3000을 제공하고 볼륨 영속성을 확인한다.
4. [ ] GitHub main push/PR에 Actions가 실행되는지 확인한다. 로컬 통과와 실제 Actions 실행은 구분하여 기록한다.
5. [ ] 배포 호스트를 Git 저장소 main과 연결하고 배포 명령 npm ci/build/start 또는 Docker를 설정한다. production 환경에 비밀과 URL을 넣고 DEPLOY_ENABLED를 켠다.
6. [ ] stdout JSON의 requestId/status/durationMs를 수집한다. /health와 5xx 비율·응답 지연·디스크 용량·AI 한도에 알림을 설정한다.
7. [ ] 쓰기를 중단한 상태에서 backup을 만들고 새 빈 DB에 restore한다. 세션·OAuth 코드는 복원하지 않는다. 로그에 토큰과 본문이 없는지 확인한다.
8. [ ] 배포 실패 시 직전 이미지·커밋과 DB 호환성을 확인하여 롤백한다. 스키마 변경은 데이터 복구 전략을 먼저 확보한다.''',commands='docker compose -p solidjs-study up -d --build app\ndocker compose -p solidjs-study ps\ndocker compose -p solidjs-study logs --tail 30 app\nnpm run backup\n# 서버를 중지하고 빈 경로에만 복원\n$env:SQLITE_PATH="data/restore-check.sqlite"\nnpm run restore -- backups/실제-백업파일.json',files=['Dockerfile','compose.yaml','.github/workflows/ci.yml','scripts/backup.mjs','scripts/restore.mjs'],links='공통 requestId가 브라우저·서버·공급자 오류를 연결한다. DB 교체의 이관도 이 논리 백업 형식을 사용한다. 실제 호스트·Secrets가 없으면 자동 배포 실행 완료로 표시하지 않는다.',errors=[('컨테이너 재시작 반복','파일 권한·DB 연결 오류','logs와 볼륨 소유권 확인'),('배포 job skipped','DEPLOY_ENABLED 미설정','호스트 준비 후 repository variable 설정'),('복원 거절','빈 DB가 아님','기존 파일을 지우지 말고 새 경로로 복원')],exercises=['이미지를 빌드해 healthcheck와 비root uid를 확인한다.','새 SQLite 경로에 복원하고 글·댓글 수를 비교한다.','잘못된 HEALTH_URL로 배포 실패 감지를 확인한다.'],checks=['Docker 빌드·health·비root·영속 볼륨을 확인했다.','Actions 검증·배포 조건·Secrets 설정을 구분했다.','로그·모니터링·백업·빈 DB 복원을 점검했다.'],next='study17.md'),
dict(key='17',title='WebSocket·알림·파일 확장',goal='공개 게시판 변경 알림과 문서 작업 상태를 안전하게 확장한다.',theory='''HTTP는 요청할 때 답하고 WebSocket은 연결을 유지하여 서버가 먼저 알릴 수 있다. 이 실습 채널은 공개 게시글의 변경 시각만 보낸다. 개인 문서나 세션 정보를 보내지 않으므로 누구나 볼 수 있는 알림 경계를 유지한다.

서버는 upgrade 경로와 Origin을 검사하고 payload 상한·ping/pong 생존 확인을 적용한다. 브라우저는 연결이 끊기면 1초에서 30초까지 지수 재연결하고 onCleanup에서 타이머와 소켓을 닫는다. HTTPS에서는 WSS를 사용한다.

알림은 데이터 자체를 대체하지 않는다. 사용자는 변경 안내를 받은 뒤 인증된 API로 실제 자료를 다시 읽는다. 여러 서버로 늘리면 각 프로세스의 소켓 집합이 다르므로 메시지 브로커·fan-out·중복 알림 처리가 필요하다. 파일 분석은 별도 job id로 상태를 조회하며 현재 구현은 문서 통계 결과를 공개 소켓에 섞지 않는다.''',steps='''1. 두 창에서 목록을 열고 한쪽에서 글을 작성한다. 다른 창 하단에 변경 안내가 오는지 확인한다.
2. Network WS에서 posts.changed 프레임만 보이는지 확인한다. 토큰·본문·문서 id는 보내지 않는다.
3. 서버를 중지했다 다시 시작해 재연결 상태를 확인한다. 페이지를 떠나면 기존 소켓이 정리된다.
4. 업로드는 파일명을 디스크 경로로 쓰지 않고 검증된 UTF-8 텍스트를 DB에 저장한다. 분석은 202로 예약하고 /api/jobs/{id}에서 인증·소유자 검사 후 조회한다.
5. 개인 알림을 확장하려면 인증 후 user별 채널에 가입시키고 재연결 때 다시 인증한다. 브라우저 WebSocket은 임의 Authorization 헤더를 붙이기 어려워 짧은 1회용 ticket 등의 별도 설계가 필요하다.''',commands='npm test\n# 두 탭에서 http://localhost:5173 열기\nnpm run dev',files=['server/realtime.mjs','src/components/LiveNotice.tsx','src/pages/Documents.tsx'],links='공개 변경 알림 → API 재조회가 기본 흐름이다. 파일의 검증·분석·소유자 경계는 study18에서 문서 AI 입력과 RAG 발췌에도 그대로 적용한다.',errors=[('WS 연결 즉시 종료','Origin 불일치·proxy 누락','PUBLIC_ORIGIN과 /ws proxy 확인'),('탭 전환마다 알림 증가','cleanup 누락','소켓·타이머를 해제'),('다른 서버 탭에 알림 없음','프로세스별 소켓 집합','확장 전 브로커·fan-out 설계')],exercises=['서버 재시작 후 재연결 최대 지연을 확인한다.','다른 Origin의 소켓 연결이 거절되는지 확인한다.','개인 작업 완료 알림에 필요한 인증 ticket 흐름을 설계한다.'],checks=['웹소켓 Origin·크기·heartbeat·재연결을 확인했다.','공개 알림에 민감한 정보를 넣지 않는다.','파일 처리·분석 작업·소유자 검사를 연결했다.'],next='study18.md'),
dict(key='18',title='AI 모델·SSE·MCP·DocuForge',goal='문서 발췌에 근거한 답변과 읽기 전용 MCP 검색을 SolidJS에 연결한다.',theory='''서비스가 모델을 부르는 AI API와 AI 앱이 서비스를 도구로 부르는 MCP는 방향이 다르다. 모델 키는 Node 서버 전용이며 사용자의 Bearer 세션과 별개다. 기본 mock은 결정적인 스트림 검사 도구이며 실제 추론 결과가 아니다. anthropic·ollama를 명시적으로 선택하면 실제 모델 HTTP 어댑터를 사용한다.

DocuForge 원문의 “업로드→요약→문서 질문→근거 발췌→이력”이라는 기능 아이디어를 SolidJS 단독 화면에 적용한다. 원본의 다른 프레임워크 구현을 가져오거나 통합하지 않는다. 이 학습판은 UTF-8 TXT·MD 500KB만 지원하며 PDF/DOCX/PPTX 추출·OCR·임베딩은 원본과 동일 구현이라고 주장하지 않는다.

현재 RAG는 600자 청크를 만들고 한글 bigram 겹침 점수로 상위 3개를 선택한다. 질문과 겹치는 발췌가 없으면 찾을 수 없습니다라고 답하도록 한다. 프롬프트의 발췌는 신뢰하지 않는 데이터이며 그 안의 명령을 실행하지 않는다. 프롬프트 문구만으로 주입 공격이 완전히 방지되는 것은 아니므로 읽기 전용 도구·소유자 검사·입력 상한을 함께 적용한다.

SSE는 text/event-stream 프레임을 보내는 응답 방식이다. POST와 Authorization이 필요해 EventSource 대신 fetch와 ReadableStream을 쓴다. 네트워크 청크가 JSON 경계나 UTF-8 문자 경계와 같지 않아 decoder와 buffer가 필요하다. 종료 [DONE], 공급자 오류·취소·90초 timeout을 처리한다.

MCP는 SDK v1.32.2의 stdio 기반 예제로 고정했다. 최신 규격을 지원한다고 주장하지 않으며 설치 버전의 프로토콜로 initialize→tools/list→tools/call을 실행한다. 브라우저는 stdio 프로세스를 실행하지 않고 Node 클라이언트가 고정된 server 파일을 실행한다.''',steps='''1. 로그인 후 /documents에서 문서를 올린다. “시그널은 무엇인가요?”처럼 발췌와 겹치는 질문을 입력하고 답변·인용·이력을 확인한다.
2. 기본 AI_PROVIDER=mock을 확인한다. 실제 외부 모델을 사용하려면 AI_PROVIDER=anthropic, 서버 ANTHROPIC_API_KEY, 사용 가능한 AI_MODEL을 설정한다. 모델 ID는 공급자 콘솔에서 확인하고 코드에 박지 않는다. Anthropic 버전 헤더는 서버 환경변수로 설정한다.
3. Ollama는 AI_PROVIDER=ollama, AI_MODEL=설치한모델, OLLAMA_URL을 설정하고 `ollama pull 모델명` 후 연결한다. 서버는 /api/chat NDJSON을 SSE로 변환한다.
4. 요청 전에 사용자별 오늘 사용량과 최대 예약량을 검사한다. 입력·출력 상한을 보수적으로 예약해 동시 요청 우회를 줄이고 완료 시 실제 usage로 정산한다. 오류·중단 시 예약량은 보존한다. 여러 프로세스의 원자적 한도는 실제 DB 잠금으로 확장해야 한다.
5. UI 중단 버튼을 눌러 공급자 요청도 abort되는지 확인한다. history에는 userId/documentId/질문/답변/발췌/usage/stopReason을 저장한다. 모델 출력은 텍스트로만 표시한다.
6. API를 실행한 채 `npm run mcp:client -- 시그널`을 실행한다. search_posts만 노출하고 입력 길이·limit를 Zod로 검증한다. tool 결과는 최대 20개 공개 글이며 읽기 전용이다.
7. 도구 목록을 모델에 제공하는 tool use는 별도 오케스트레이션 개념이다. 현재 MCP 클라이언트는 도구를 명시적으로 호출하는 미니 예제이며 모델이 자율적으로 여러 도구를 선택하는 에이전트로 표시하지 않는다.
8. 외부 AI 호출·로컬 LLM 품질·Claude 앱 연결은 실제 계정·모델로 실행한 증거가 있을 때만 검증 완료로 적는다.''',commands='npm test\nnpm run dev\n# 별도 터미널\nnpm run mcp:client -- 시그널',files=['server/ai.mjs','src/api.ts','server/mcp-server.mjs','server/mcp-client.mjs'],links='노션 DocuForge: https://app.notion.com/p/40bd7dec5e2e818d9c91c6fb26dccc4c · AI 모델 연동/MCP: https://app.notion.com/p/40bd7dec5e2e81b9b11dfe5616516df4. 업로드·권한·백업·운영 한도를 studyfinal에서 합친다. 기존 DocuForge 저장소와 서비스는 수정하거나 호출하지 않는다.',errors=[('글자가 깨짐','패킷별로 UTF-8 디코딩','스트리밍 decoder 사용'),('SSE JSON 오류','미완성 프레임 파싱','빈 줄 경계까지 buffer 유지'),('키 노출','모델을 브라우저에서 직접 호출','서버 프록시와 서버 전용 환경변수'),('MCP 프로토콜 깨짐','stdout에 일반 로그','stdout을 JSON-RPC 전용으로 유지')],exercises=['발췌가 있는 질문과 없는 질문을 각각 실행한다.','가짜 SSE 패킷을 한글 문자 중간에서 나누어 복원한다.','MCP search_posts의 q 길이와 limit 검증을 시험한다.'],checks=['모델 키를 서버에만 두고 사용자 인증을 먼저 검사한다.','SSE·취소·한도·usage·질문 기록을 구현했다.','DocuForge 아이디어를 SolidJS 문서 흐름에 연결했다.','MCP 서버·클라이언트 실제 stdio 왕복을 확인했다.','mock 검증과 실제 모델 품질 검증을 구분한다.'],next='studyfinal.md'),
dict(key='final',title='심화 응용 · Solid Study 서비스 완성',goal='게시판·DB 교체·외부 연동·문서 AI·운영 자동화를 하나의 SolidJS 서비스로 조립한다.',theory='''final은 새 프레임워크를 통합하는 작업이 아니라 midpoint의 계약에 심화 기능을 붙이는 작업이다. 화면은 SolidJS 하나, 서버는 Node 표준 HTTP, 저장소·외부 서비스·모델은 명시적인 어댑터로 연결한다. 기능을 조립할수록 인증·오류·설정·관측 규칙을 공통으로 유지해야 한다.

“완성”은 코드 작성·로컬 실행·외부 계정 검증·배포를 구별해 증거를 남기는 일이다. mock에서 지나간 요청을 실제 결제나 모델 추론 완료로 표시하지 않는다. 외부 Secrets와 원격 저장소가 필요한 작업은 설정과 실제 실행 상태를 각각 기록한다.''',steps='''### 목표

학습 게시판에서 글을 공유하고, 내 문서를 업로드하여 근거 기반 답변을 받으며 운영 가능한 배포·백업 절차를 갖춘다.

### 기능 목록

- midpoint 로그인·글·댓글·검색·페이지·권한.
- PostgreSQL/MariaDB/MongoDB native/ORM 교체와 데이터 이관.
- Solid UI·store·폼, mock/live 결제·메일·OAuth, 검증된 파일 입력.
- 목록 캐시·지연 로딩·Worker 분석·공개 WebSocket 알림.
- 문서 RAG·mock/Anthropic/Ollama 스트리밍·사용량·질문 이력.
- 읽기 전용 MCP 검색·Node 클라이언트, Docker·CI·배포 hook·백업 복구.

### 연동 구성도

```mermaid
flowchart TB
  UI[SolidJS SPA] -->|JSON · Bearer · SSE| API[Node HTTP API]
  API --> Auth[세션 · 권한 · 입력 검증 · 한도]
  Auth --> Repo[저장소 계약]
  Repo --> DB[(SQLite 또는 선택 DB)]
  Auth --> Provider[메일 · Checkout · OAuth 어댑터]
  Auth --> AI[발췌 검색 · 모델 어댑터]
  AI --> Model[명시적 mock 또는 실제 모델]
  API --> Jobs[DB 작업 큐 · Worker]
  API --> WS[공개 변경 알림]
  WS --> UI
  MCP[MCP Node 클라이언트] --> Tools[stdio 읽기 전용 서버]
  Tools -->|공개 GET| API
```

### 구현 순서

1. midpoint 기초 시나리오를 통과시키고 API v1·권한 테스트를 고정한다.
2. DB 3종 native/ORM 왕복을 통과시킨다. 기존 데이터는 논리 백업 후 빈 대상에 복원한다.
3. UI 설정 폼과 외부 서비스 어댑터를 연결한다. 기본 mock을 유지한 채 계약·실패 경로부터 검증한다.
4. OpenAPI를 실제 경로와 맞추고 캐시·분석 작업·WebSocket을 추가한다.
5. 문서 소유자 검증→발췌 검색→사용량 예약→모델 스트림→텍스트 렌더→질문 이력 흐름을 연결한다.
6. MCP 서버의 읽기 전용 검색을 실제 Node 클라이언트로 확인한다. 임의 셸 실행이나 개인 문서 조회 도구를 추가하지 않는다.
7. API·UI·브라우저·DB·백업 복구를 검증하고 Docker 이미지를 빌드한다.
8. 원격 Git 저장소에 커밋을 푸시하고 Actions와 배포 호스트를 구성한다. 노션에는 커밋·검증·미완료 외부 설정을 사실대로 반영한다.

### 배포 체크리스트

- [ ] npm ci·문서 검사·API·UI·빌드·브라우저 테스트 통과.
- [ ] DB별 실제 CRUD와 환경변수·ORM 설정 확인.
- [ ] 토큰 만료·작성자 권한·문서 소유자·Origin·XSS·OAuth state 확인.
- [ ] 모델 입력/출력·일일 한도·요청 속도·취소·timeout 확인.
- [ ] API 키·DB 비밀번호·백업·세션 원문이 Git/번들/로그에 없음.
- [ ] Docker health·비root·영속 볼륨·HTTPS·WSS 확인.
- [ ] 빈 DB 복원과 재시작 후 글·문서·질문 기록 복구 확인.
- [ ] 원격 push·Actions 실행·실제 배포 health를 각각 확인.
- [ ] 실제 외부 공급자 거래·모델 품질은 계정 테스트 증거를 남김.

### 최종 회고

반응성: 컴포넌트 마운트와 시그널 갱신을 구분할 수 있는가? 계약: DB를 교체해도 화면이 유지되는 이유는 무엇인가? 보안: UI가 아닌 서버에서 검증한 권한은 무엇인가? 운영: 장애가 났을 때 requestId·백업·롤백으로 어디까지 복구할 수 있는가? AI: 실제 발췌가 답변을 지지하는지 어떻게 검증했는가?

각 질문에 실행 증거와 남은 위험을 함께 기록한다. 이 학습 서비스의 단일 프로세스 JSON 매퍼·간단한 RAG·테스트 Checkout은 실무 완성형이라고 과장하지 않는다.''',commands='npm run check:docs\nnpm test\nnpm run test:ui\nnpm run build\nnpm run test:e2e\nnode --test --test-concurrency=1 tests/db-matrix.mjs\ndocker build -t solid-study:local .',files=['server/app.mjs','src/App.tsx','e2e/board.spec.ts'],links='학습 결과는 README의 인덱스·노션 반영표·검증 기록으로 되짚는다. 다음 확장은 실제 운영 요구에 맞는 정규화 DB·원자적 분산 한도·정교한 RAG이며 현재 코드의 검증 범위를 보존한다.',errors=[('로컬 성공·운영 실패','환경변수·주소·볼륨 차이','각 경계별 health·로그·권한 확인'),('실행 안 한 기능 완료 표시','코드와 운영 증거 혼동','검증 기록에 mock/live·로컬/원격 구분'),('복구 후 로그인 이상','만료 세션 재사용','세션을 복원하지 않고 재로그인')],exercises=['새 환경에서 README만 보고 서비스 실행을 재현한다.','DB 교체·백업 복구·AI 취소 시나리오를 기록한다.','현재 제한 3개와 실제 운영으로 가기 위한 우선순위를 정한다.'],checks=['midpoint와 study11~18의 결과를 같은 계약으로 연결했다.','DB·외부 연동·AI·Docker·자동화 코드를 검증했다.','실제 외부 거래·배포·push 여부를 증거와 구분했다.'],next='README.md')
]
