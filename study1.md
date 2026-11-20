# study1 · SolidJS Hello World와 기본 문법

> 기준: [SolidJS 노션 원문](https://app.notion.com/p/40bd7dec5e2e813080f8d54cf5968ad5) · [게시판 API v1](https://app.notion.com/p/3d6d7dec5e2e8139adbfd36dd506c65e) · 문서 기준일 2026-11-20 (Asia/Seoul).

## ① 목표 한 줄

JSX 표현식과 DOM 속성으로 첫 화면을 만든다.

## ② 📖 이론

JSX의 중괄호는 JS 값을 화면에 넣는 창이다. 문자열 리터럴은 그대로 보이지만 `{2 + 3}`은 계산 후 표시된다. 함수는 JSX를 반환하여 컴포넌트가 된다. 하나의 루트 요소 또는 fragment로 묶고 컴포넌트 이름은 대문자로 시작한다.

Solid JSX는 class, for 같은 DOM 친화적 속성을 지원한다. 이벤트는 onClick/onInput으로 연결한다. 일반 const를 바꾸는 것만으로 화면이 반응하지는 않는다. 값이 계속 바뀔 때 사용할 시그널은 study3에서 도입한다. 사용자 문자열을 JSX 텍스트로 넣으면 마크업으로 실행하지 않는다.

## ③ 🛠️ 실기 · 전체 코드와 줄별 설명

이 저장소는 완성 코드와 학습 노트를 함께 제공한다. 아래 파일을 지정 경로에서 읽고 실행한다. 이 단계에서 새로 다루는 파일은 생략 없이 수록하며, import되는 공통 파일은 README와 앞선 단계의 전체 코드를 따른다. 학습 진행 상황은 체크박스에 직접 기록한다.

1. npm run dev로 시작하고 /labs를 연다. Hello.tsx의 greeting과 nickname을 바꾼다.
2. 저장 직후 Vite HMR이 갱신하는 것을 확인한다. HMR은 실행 문맥을 다시 만들 수 있으므로 컴포넌트 실행 횟수 실험과 구분한다.
3. 개발자도구 Elements에서 h2와 p의 실제 DOM을 확인한다. Console에서 문법 오류를 보고 Network에서 /src 모듈 재요청을 관찰한다.
4. 소스의 입력 요소에 문장을 입력하고 일반 JSX 텍스트와 DOM 입력값이 어떻게 다른지 확인한다. 서버는 GET /health로 별도 확인한다.

실행 명령은 저장소 루트의 PowerShell 기준이다. 서버를 유지하는 명령 다음의 작업은 별도 터미널에서 실행한다.

```powershell
npm run dev
# 브라우저 http://localhost:5173/labs
Invoke-RestMethod http://127.0.0.1:3000/health
```

### src/labs/Hello.tsx 전체 코드

[src/labs/Hello.tsx](src/labs/Hello.tsx)

```tsx
export default function Hello() {
  const greeting = 'Hello SolidJS';
  const learner = { nickname: '학습자' };
  return <article class="card"><h2>{greeting}</h2><p>{learner.nickname}님, {2 + 3}번째 예제입니다.</p><input placeholder="JSX는 class, for 등 DOM 속성을 지원합니다." /></article>;
}
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>export default function Hello() {</code> | 첫 JSX 화면의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 2 | <code>  const greeting = &#x27;Hello SolidJS&#x27;;</code> | 첫 JSX 화면에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 3 | <code>  const learner = { nickname: &#x27;학습자&#x27; };</code> | 첫 JSX 화면에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 4 | <code>  return &lt;article class=&quot;card&quot;&gt;&lt;h2&gt;{greeting}&lt;/h2&gt;&lt;p&gt;{learner.nickname}님, {2 + 3}번째 예제입니다.&lt;/p&gt;&lt;input placeholder=&quot;JSX는 class, for 등 DOM 속성을 지원합니다.&quot; /&gt;&lt;/article&gt;;</code> | 첫 JSX 화면: 현재 상태·props를 읽는 JSX 화면 트리를 반환한다. |
| 5 | <code>}</code> | 첫 JSX 화면의 현재 블록 또는 선언을 닫는다. |

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

### index.html 전체 코드

[index.html](index.html)

```html
<!doctype html>
<html lang="ko"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>Solid Study · Board & Docs</title></head><body><div id="root"></div><script type="module" src="/src/index.tsx"></script></body></html>
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>&lt;!doctype html&gt;</code> | index.html의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 2 | <code>&lt;html lang=&quot;ko&quot;&gt;&lt;head&gt;&lt;meta charset=&quot;UTF-8&quot;/&gt;&lt;meta name=&quot;viewport&quot; content=&quot;width=device-width, initial-scale=1.0&quot;/&gt;&lt;title&gt;Solid Study · Board &amp; Docs&lt;/title&gt;&lt;/head&gt;&lt;body&gt;&lt;div id=&quot;root&quot;&gt;&lt;/div&gt;&lt;script type=&quot;module&quot; src=&quot;/src/index.tsx&quot;&gt;&lt;/script&gt;&lt;/body&gt;&lt;/html&gt;</code> | index.html의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |

## ④ 🔗 연동 포인트

index.html의 root 요소 → index.tsx → main.tsx → /labs → Hello 순서로 화면에 도달한다. study2에서 이 화면 단위를 부모·자식으로 나눈다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| 빈 화면 | root id와 render 대상 불일치 | index.html과 진입점 id 확인 |
| 변수가 문자 그대로 표시 | 중괄호 누락 | JS 표현식을 { }로 감싼다 |
| 컴파일 오류 | 닫히지 않은 JSX 태그 | input 같은 빈 요소도 />로 닫는다 |

## ⑥ 직접 해보기

1. 인사말에 오늘 날짜를 toLocaleDateString으로 추가한다.
2. 버튼 클릭 시 console.info로 닉네임을 출력한다.

## ⑦ ☐ 체크리스트

- [ ] HMR로 문구가 바뀌는 것을 확인했다.
- [ ] Elements·Console·Network에서 화면 생성 흐름을 확인했다.

## ⑧ 다음 단계 연결 문장

JSX 표현식과 DOM 속성으로 첫 화면을 만든다를 마쳤다면 [study2.md](study2.md)에서 이어 간다.

공식 자료: [SolidJS 1.x 소스](https://github.com/solidjs/solid/tree/v1.9.20), [Solid Router](https://docs.solidjs.com/solid-router/getting-started/installation-and-setup), [Node SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html). 최신 문서와 설치 버전이 다를 수 있어 package-lock.json을 실행 기준으로 삼는다.
