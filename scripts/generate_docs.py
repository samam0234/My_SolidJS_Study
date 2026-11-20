from pathlib import Path
import html
import json
import re
from curriculum import CHAPTERS

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'https://app.notion.com/p/40bd7dec5e2e813080f8d54cf5968ad5'
API_SOURCE = 'https://app.notion.com/p/3d6d7dec5e2e8139adbfd36dd506c65e'
ORIGINAL = {
 '0': ['`npm create solid` 로 프로젝트 (Vite)'],
 '2': ['컴포넌트 함수가 한 번만 실행된다는 점 확인 (React와 가장 큰 차이)'],
 '3': ['`createSignal`, `createEffect`, `createMemo`', '`<For>`, `<Show>` 제어 흐름 컴포넌트'],
 '4': ['`@solidjs/router` 로 목록·상세·작성 페이지'],
 '6': ['`createResource` 로 게시판 API 불러오기']
}
CONTEXT = {
 'Hello.tsx': '첫 JSX 화면', 'Signals.tsx': '시그널·memo·effect 실험',
 'PostCard.tsx': '부모가 전달한 게시글 표시', 'PostForm.tsx': '검증과 중복 제출 제어',
 'Posts.tsx': 'URL 검색 조건과 비동기 목록', 'Editor.tsx': '등록·수정 저장 콜백',
 'Detail.tsx': '상세·댓글·작성자 기능', 'Login.tsx': '가입·로그인과 세션 연결',
 'Documents.tsx': '문서 업로드·질문·스트리밍 UI', 'Ui.tsx': 'UI·store·폼 연동',
 'auth.mjs': '비밀번호·세션·권한', 'posts.mjs': '게시글 검증·DTO·목록 계약',
 'store.mjs': 'DB별 레코드 접근', 'orm-store.mjs': 'ORM·ODM 모델과 저장소 계약',
 'errors.mjs': 'HTTP 검증과 공통 오류', 'api.ts': '브라우저 API와 SSE 처리',
 'ai.mjs': '발췌 검색·모델·한도·SSE', 'integrations.mjs': '외부 서비스 경계',
 'realtime.mjs': '공개 WebSocket 알림', 'LiveNotice.tsx': '소켓 수명과 재연결',
 'jobs.mjs': '영속 작업 상태와 Worker 실행', 'openapi.mjs': 'OpenAPI 계약 생성',
 'basic.mjs': '기초 HTTP 서비스', 'basic.tsx': '기초 SPA 라우팅',
 'app.mjs': '심화 API 조립과 보안 경계', 'App.tsx': '심화 화면 셸과 오류 경계',
 'mcp-server.mjs': '읽기 전용 MCP 도구', 'mcp-client.mjs': 'MCP stdio 연결·호출·종료'
}

def explain(line, name):
    s = line.strip()
    context = CONTEXT.get(name, name)
    if not s: return '빈 줄로 논리 단위를 구분한다.'
    if s.startswith('//') or s.startswith('# '): return s.lstrip('/# ').strip()
    if s.startswith('import '):
        match = re.search(r"from ['\"]([^'\"]+)", s)
        return f"{match.group(1) if match else '모듈'}에서 이 파일의 실행에 필요한 기능·타입을 가져온다."
    if s in ('}', '};', '});', ']', ']', ');', '</section>;', '</form>;'): return f'{context}의 현재 블록 또는 선언을 닫는다.'
    rules = [
      ('createSignal', '변경될 값을 accessor·setter 쌍으로 만들고 이후 JSX·함수에서 읽게 한다.'),
      ('createMemo', '시그널을 읽어 계산한 파생 값을 추적·캐시한다.'),
      ('createEffect', '읽은 시그널이 바뀔 때 외부 저장·로그 작업을 수행한다.'),
      ('createResource', 'source를 추적하여 비동기 조회와 pending·error·value를 관리한다.'),
      ('createStore', '객체 경로를 반응적으로 관리하는 store와 setter를 만든다.'),
      ('createForm', '폼 상태와 Form·Field 컴포넌트를 생성한다.'),
      ('onCleanup', '화면이 해제될 때 타이머·네트워크 자원을 정리한다.'),
      ('onMount', '브라우저에서 컴포넌트가 마운트된 뒤 초기 작업을 시작한다.'),
      ('new AbortController', '취소 신호를 만들어 연결된 비동기 요청을 중단할 수 있게 한다.'),
      ('setTimeout', '시간 상한 또는 재연결 대기 후 작업을 예약한다.'),
      ('setInterval', '주기적으로 작업 큐 또는 연결 생존 상태를 점검한다.'),
      ('clearTimeout', '더 이상 필요하지 않은 예약 타이머를 제거한다.'),
      ('authenticate(', 'Bearer 세션 해시·만료·사용자를 서버에서 확인한다.'),
      ('owner(', '현재 사용자와 작성자를 비교하여 변경 권한을 확인한다.'),
      ('validatePost(', 'title·body·tags가 공통 게시글 입력 규칙을 만족하는지 검사한다.'),
      ('repo.serial', '단일 서버 프로세스에서 데이터 작업 순서를 보장한다.'),
      ('repo.insert', '도메인 레코드에 숫자 id를 부여하여 저장한다.'),
      ('repo.put', '기존 id의 레코드를 새 값으로 저장한다.'),
      ('repo.delete', '지정한 bucket과 id의 레코드를 제거한다.'),
      ('repo.get', 'id에 해당하는 저장 레코드를 조회한다.'),
      ('repo.all', 'bucket의 레코드를 읽어 검증·필터·조회에 사용한다.'),
      ('scrypt', 'salt를 포함한 비밀번호 키 유도 연산을 수행한다.'),
      ('timingSafeEqual', '길이가 같은 비밀번호 해시를 상수 시간 비교한다.'),
      ('randomBytes', '예측하기 어려운 세션·OAuth 값을 생성한다.'),
      ('response.ok', 'HTTP 성공 여부를 확인하고 오류 응답을 별도로 처리한다.'),
      ('response.status === 204', '본문이 없는 성공 응답에서 JSON 파싱을 생략한다.'),
      ('fetch(', '명시한 URL·method·header·body로 HTTP 요청을 보낸다.'),
      ('fetcher(', '주입된 HTTP 함수로 요청한다. 테스트에서는 실제 외부 연결을 대체한다.'),
      ('res.setHeader', 'HTTP 응답의 보안·형식·추적·캐시 헤더를 설정한다.'),
      ('res.write', '연결을 닫지 않고 SSE 프레임을 브라우저로 전송한다.'),
      ('send(res', '현재 분기의 상태 코드와 JSON 또는 빈 응답을 전송한다.'),
      ('fail(', '규칙 위반을 HTTP 상태·code·필드 오류로 중단한다.'),
      ('requestId', '요청 추적 ID를 생성하거나 응답·로그로 전달한다.'),
      ('JSON.parse', '문자열 JSON을 파싱한다. 미완성 프레임은 앞선 버퍼에서 보관한다.'),
      ('JSON.stringify', '객체를 네트워크·저장용 JSON 문자열로 직렬화한다.'),
      ('new URL', '고정 base에 경로·쿼리를 연결하거나 URL 부분을 안전하게 해석한다.'),
      ('URLSearchParams', '검색·페이지 등의 쿼리 값을 URL 인코딩 규칙에 따라 만든다.'),
      ('useParams', '현재 동적 라우트의 id를 읽는다.'),
      ('useSearchParams', '검색·페이지 상태를 주소 쿼리와 연결한다.'),
      ('navigate(', '저장·로그인 결과에 따라 다음 화면 주소로 이동한다.'),
      ('ErrorBoundary', '하위 화면의 오류를 사용자가 확인할 수 있는 안내로 바꾼다.'),
      ('<Show', '조건 accessor에 따라 본문 또는 fallback 화면을 선택한다.'),
      ('<For', '배열 항목별 화면을 생성하고 항목 정체성에 따라 갱신한다.'),
      ('<Route', '주소 패턴과 렌더링 컴포넌트를 연결한다.'),
      ('<Dialog', '대화상자의 포커스·설명·열기·닫기 접근성 경계를 구성한다.'),
      ('<Field', '폼 라이브러리의 이름·검증·값·입력 이벤트를 연결한다.'),
      ('onSubmit', '브라우저 제출 이벤트를 도메인 저장 함수와 연결한다.'),
      ('onInput', '입력 요소의 현재 값을 상태 setter에 전달한다.'),
      ('<label', '입력 필드의 화면 문구와 접근성 이름을 제공한다.'),
      ('<button', '사용자 동작을 함수와 연결하고 필요하면 disabled로 잠근다.'),
      ('<A ', 'SPA 라우터 링크로 화면 전환을 연결한다.'),
      ('return <', '현재 상태·props를 읽는 JSX 화면 트리를 반환한다.'),
      ('assert.', '실제 결과와 기대 계약을 비교하여 회귀를 검출한다.'),
      ('expect(', '화면 또는 반환 값이 사용자 시나리오의 기대 결과인지 확인한다.'),
      ('test(', '독립적인 검증 시나리오와 비동기 정리 범위를 정의한다.'),
      ('t.after', '테스트 종료 시 서버·DB·MCP 연결을 정리한다.'),
      ('PRIMARY KEY', 'bucket·id의 중복을 DB 키로 차단한다.'),
      ('createIndex', 'MongoDB의 bucket·id 복합 고유 인덱스를 보장한다.'),
      ('query(', 'DB 자리표시자와 매개변수를 사용해 쿼리를 실행한다.'),
      ('upsert', '키가 있으면 갱신하고 없으면 삽입한다.'),
      ('registerTool', 'MCP 도구의 이름·스키마·읽기 전용 정책·실행 함수를 등록한다.'),
      ('client.connect', 'MCP 프로세스와 연결해 초기 프로토콜 교환을 수행한다.'),
      ('client.callTool', '스키마로 검증되는 인자로 MCP 도구를 호출한다.'),
      ('client.close', 'MCP 연결과 자식 프로세스의 수명을 종료한다.'),
      ('FROM ', '컨테이너 빌드 또는 실행 기준 이미지를 선택한다.'),
      ('RUN ', '이미지 생성 시 설치·빌드·디렉터리 준비 명령을 수행한다.'),
      ('COPY ', '필요한 소스·설정·빌드 산출물을 이미지에 복사한다.'),
      ('USER ', '최종 앱을 root가 아닌 사용자로 실행한다.'),
      ('HEALTHCHECK', '실행 컨테이너의 HTTP 생존 상태를 주기적으로 검사한다.'),
      ('CMD ', '컨테이너 시작 때 실행할 Node 진입점을 정한다.'),
      ('uses:', 'GitHub Actions의 검증된 작업 단계를 불러온다.'),
      ('run:', 'CI 러너에서 검증·빌드·배포 명령을 실행한다.'),
      ('ports:', '컨테이너 포트를 지정한 로컬 호스트 포트로 공개한다.'),
      ('volumes:', '데이터를 컨테이너 수명과 분리해 영속 저장한다.'),
      ('profiles:', '선택한 DB 서비스만 실행하도록 프로필을 정의한다.')
    ]
    for token, description in rules:
        if token in s: return f'{context}: {description}'
    if s.startswith(('export type ', 'type ')): return f'{context}에서 사용하는 데이터 필드와 타입 계약을 선언한다.'
    if re.match(r'(export )?(async )?function', s): return f'{context}의 이름 있는 동작과 인자 범위를 정의한다.'
    if s.startswith(('const ', 'let ', 'export const ')): return f'{context}에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다.'
    if s.startswith(('if ', 'if(', 'else', '} else')): return f'{context}에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다.'
    if 'catch' in s: return f'{context}의 실패를 잡아 오류 안내·복구·상태 갱신으로 전환한다.'
    if 'finally' in s: return f'{context}의 성공·실패와 관계없이 잠금과 자원을 정리한다.'
    if s.startswith(('for ', 'while ')): return f'{context}의 각 항목·프레임·작업을 순서대로 처리한다.'
    if s.startswith('return '): return f'{context}의 현재 처리 결과를 호출자에게 돌려준다.'
    if s.startswith(('}', ']', ')', '</')): return f'{context}의 현재 구문·화면·설정 블록을 닫거나 다음 분기로 연결한다.'
    if name.endswith(('.json', '.yaml', '.yml')) or name.startswith('.env'): return f'{context}의 이 키·항목에 실행 정책과 설정값을 지정한다. 비밀은 예시 파일에 넣지 않는다.'
    if name == '.gitignore': return '해당 경로를 Git 추적에서 제외한다. !로 시작하면 예시 파일만 다시 포함한다.'
    return f'{context}의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다.'

def source_block(path):
    value = (ROOT / path).read_text(encoding='utf-8')
    suffix = Path(path).suffix
    language = {'.tsx':'tsx','.ts':'typescript','.mjs':'javascript','.json':'json','.yaml':'yaml','.yml':'yaml','.html':'html'}.get(suffix, 'text')
    result = f'### {path} 전체 코드\n\n[{path}]({path})\n\n```{language}\n{value.rstrip()}\n```\n\n'
    result += '줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.\n\n| 줄 | 해당 코드 | 설명 |\n| --- | --- | --- |\n'
    for number, line in enumerate(value.splitlines(), 1):
        escaped = html.escape(line).replace('|', '&#124;')
        result += f'| {number} | <code>{escaped or "(빈 줄)"}</code> | {explain(line, Path(path).name).replace("|", "&#124;")} |\n'
    return result + '\n'

def render(chapter):
    key = chapter['key']; name = f'study{key}.md'
    result = f'# study{key} · SolidJS {chapter["title"]}\n\n'
    result += f'> 기준: [SolidJS 노션 원문]({SOURCE}) · [게시판 API v1]({API_SOURCE}) · 문서 기준일 2026-11-20 (Asia/Seoul).\n\n'
    result += f'## ① 목표 한 줄\n\n{chapter["goal"]}\n\n## ② 📖 이론\n\n{chapter["theory"]}\n\n'
    result += '## ③ 🛠️ 실기 · 전체 코드와 줄별 설명\n\n'
    result += '이 저장소는 완성 코드와 학습 노트를 함께 제공한다. 아래 파일을 지정 경로에서 읽고 실행한다. 이 단계에서 새로 다루는 파일은 생략 없이 수록하며, import되는 공통 파일은 README와 앞선 단계의 전체 코드를 따른다. 학습 진행 상황은 체크박스에 직접 기록한다.\n\n'
    result += chapter['steps'] + '\n\n실행 명령은 저장소 루트의 PowerShell 기준이다. 서버를 유지하는 명령 다음의 작업은 별도 터미널에서 실행한다.\n\n```powershell\n' + chapter['commands'] + '\n```\n\n'
    for path in chapter['files']: result += source_block(path)
    result += f'## ④ 🔗 연동 포인트\n\n{chapter["links"]}\n\n'
    result += '## ⑤ 오류 노트\n\n| 증상 | 원인 | 해결 |\n| --- | --- | --- |\n'
    for row in chapter['errors']: result += '| ' + ' | '.join(row) + ' |\n'
    result += '\n## ⑥ 직접 해보기\n\n' + '\n'.join(f'{i}. {exercise}' for i, exercise in enumerate(chapter['exercises'],1)) + '\n\n'
    result += '## ⑦ ☐ 체크리스트\n\n'
    if key in ORIGINAL:
        result += '노션 [FW] 학습 목표 원문 항목은 다음과 같이 보존한다. 괄호가 포함된 원문을 인용하되 다른 프레임워크 비교 실습은 수행하지 않는다.\n\n'
        result += '\n'.join('- [ ] ' + item for item in ORIGINAL[key]) + '\n\n'
    originals_plain = [re.sub(r'`','', item) for item in ORIGINAL.get(key, [])]
    for item in chapter['checks']:
        if item not in originals_plain: result += '- [ ] ' + item + '\n'
    result += f'\n## ⑧ 다음 단계 연결 문장\n\n{chapter["goal"].rstrip(".")}를 마쳤다면 [{chapter["next"]}]({chapter["next"]})에서 이어 간다.\n\n'
    result += '공식 자료: [SolidJS 1.x 소스](https://github.com/solidjs/solid/tree/v1.9.20), [Solid Router](https://docs.solidjs.com/solid-router/getting-started/installation-and-setup), [Node SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html). 최신 문서와 설치 버전이 다를 수 있어 package-lock.json을 실행 기준으로 삼는다.\n'
    (ROOT / name).write_text(result, encoding='utf-8')

def main():
    for chapter in CHAPTERS: render(chapter)
    index = '\n'.join(f'| [{"study" + c["key"]}](study{c["key"]}.md) | {c["title"]} |' for c in CHAPTERS)
    (ROOT / 'README.md').write_text('''# SolidJS · 신호에서 서비스까지

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
''' + index + '''

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
''', encoding='utf-8')
    print(f'{len(CHAPTERS)}개 study 문서와 README 생성 완료')

if __name__ == '__main__': main()
