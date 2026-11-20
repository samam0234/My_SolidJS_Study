# study3 · SolidJS 상태·파생 값·로컬 저장

> 기준: [SolidJS 노션 원문](https://app.notion.com/p/40bd7dec5e2e813080f8d54cf5968ad5) · [게시판 API v1](https://app.notion.com/p/3d6d7dec5e2e8139adbfd36dd506c65e) · 문서 기준일 2026-11-20 (Asia/Seoul).

## ① 목표 한 줄

시그널을 DOM과 연결하고 초안을 브라우저에 저장한다.

## ② 📖 이론

createSignal은 현재 값을 읽는 accessor와 값을 쓰는 setter를 반환한다. count는 함수이므로 count()로 읽는다. JSX와 effect 안에서 읽으면 의존성이 추적된다. setCount(v => v + 1)은 직전 값을 기준으로 갱신한다.

createMemo는 원본에서 계산한 값을 캐시한다. createEffect는 localStorage 기록이나 로그처럼 외부에 영향을 주는 일을 수행한다. 계산 결과를 effect로 다시 signal에 복사하면 불필요한 상태와 순환을 만들기 쉽다. 온도계가 원본이고 화씨 환산은 memo, 측정 일지를 쓰는 일은 effect에 비유할 수 있다.

For는 배열 항목별 DOM을 유지하고 Show는 조건에 맞는 화면을 선택한다. localStorage는 같은 Origin 안의 문자열 저장소이며 민감한 세션 토큰 저장 장소로 쓰지 않는다. 서버에서 실행할 코드에서는 localStorage가 없으므로 이 실험은 SPA 브라우저에서만 실행한다.

## ③ 🛠️ 실기 · 전체 코드와 줄별 설명

이 저장소는 완성 코드와 학습 노트를 함께 제공한다. 아래 파일을 지정 경로에서 읽고 실행한다. 이 단계에서 새로 다루는 파일은 생략 없이 수록하며, import되는 공통 파일은 README와 앞선 단계의 전체 코드를 따른다. 학습 진행 상황은 체크박스에 직접 기록한다.

1. /labs에서 count 증가 전후의 doubled와 조건 문구를 관찰한다.
2. 메모를 입력한 뒤 새로고침한다. count는 초기화되지만 메모는 남는다.
3. 개발자도구 Application → Local Storage에서 solid-study-note를 확인한다.
4. 항목을 직접 지우고 다시 접속해 빈 문자열 기본값을 확인한다. 저장소 접근이 차단된 환경에서는 try/catch와 메모리 fallback을 추가하는 연습을 한다.

실행 명령은 저장소 루트의 PowerShell 기준이다. 서버를 유지하는 명령 다음의 작업은 별도 터미널에서 실행한다.

```powershell
npm run test:ui
# /labs → 증가 3회 → 메모 입력 → 새로고침
```

### src/labs/Signals.tsx 전체 코드

[src/labs/Signals.tsx](src/labs/Signals.tsx)

```tsx
import { createSignal, createMemo, createEffect, For, Show } from 'solid-js';
let executions = 0;
export default function Signals() {
  const instance = ++executions;
  const [count, setCount] = createSignal(0);
  const [note, setNote] = createSignal(localStorage.getItem('solid-study-note') || '');
  const doubled = createMemo(() => count() * 2);
  createEffect(() => { localStorage.setItem('solid-study-note', note()); });
  createEffect(() => { console.info('count 변경', count()); });
  return <article class="card"><h2>시그널 실험실</h2><p>컴포넌트 생성 번호: {instance} (버튼을 눌러도 유지)</p>
    <button onClick={() => setCount(v => v + 1)}>증가</button><p>원본 {count()} / 파생 {doubled()}</p>
    <Show when={count() > 2} fallback={<p>3번 눌러 보세요.</p>}><p>조건이 충족되었습니다.</p></Show>
    <For each={Array.from({ length: Math.min(count(), 20) }, (_, i) => i + 1)}>{n => <span class="tag">{n}</span>}</For>
    <label>새로고침 후 남는 메모<input value={note()} onInput={e => setNote(e.currentTarget.value)} /></label>
  </article>;
}
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>import { createSignal, createMemo, createEffect, For, Show } from &#x27;solid-js&#x27;;</code> | solid-js에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 2 | <code>let executions = 0;</code> | 시그널·memo·effect 실험에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 3 | <code>export default function Signals() {</code> | 시그널·memo·effect 실험의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 4 | <code>  const instance = ++executions;</code> | 시그널·memo·effect 실험에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 5 | <code>  const [count, setCount] = createSignal(0);</code> | 시그널·memo·effect 실험: 변경될 값을 accessor·setter 쌍으로 만들고 이후 JSX·함수에서 읽게 한다. |
| 6 | <code>  const [note, setNote] = createSignal(localStorage.getItem(&#x27;solid-study-note&#x27;) &#124;&#124; &#x27;&#x27;);</code> | 시그널·memo·effect 실험: 변경될 값을 accessor·setter 쌍으로 만들고 이후 JSX·함수에서 읽게 한다. |
| 7 | <code>  const doubled = createMemo(() =&gt; count() * 2);</code> | 시그널·memo·effect 실험: 시그널을 읽어 계산한 파생 값을 추적·캐시한다. |
| 8 | <code>  createEffect(() =&gt; { localStorage.setItem(&#x27;solid-study-note&#x27;, note()); });</code> | 시그널·memo·effect 실험: 읽은 시그널이 바뀔 때 외부 저장·로그 작업을 수행한다. |
| 9 | <code>  createEffect(() =&gt; { console.info(&#x27;count 변경&#x27;, count()); });</code> | 시그널·memo·effect 실험: 읽은 시그널이 바뀔 때 외부 저장·로그 작업을 수행한다. |
| 10 | <code>  return &lt;article class=&quot;card&quot;&gt;&lt;h2&gt;시그널 실험실&lt;/h2&gt;&lt;p&gt;컴포넌트 생성 번호: {instance} (버튼을 눌러도 유지)&lt;/p&gt;</code> | 시그널·memo·effect 실험: 현재 상태·props를 읽는 JSX 화면 트리를 반환한다. |
| 11 | <code>    &lt;button onClick={() =&gt; setCount(v =&gt; v + 1)}&gt;증가&lt;/button&gt;&lt;p&gt;원본 {count()} / 파생 {doubled()}&lt;/p&gt;</code> | 시그널·memo·effect 실험: 사용자 동작을 함수와 연결하고 필요하면 disabled로 잠근다. |
| 12 | <code>    &lt;Show when={count() &gt; 2} fallback={&lt;p&gt;3번 눌러 보세요.&lt;/p&gt;}&gt;&lt;p&gt;조건이 충족되었습니다.&lt;/p&gt;&lt;/Show&gt;</code> | 시그널·memo·effect 실험: 조건 accessor에 따라 본문 또는 fallback 화면을 선택한다. |
| 13 | <code>    &lt;For each={Array.from({ length: Math.min(count(), 20) }, (_, i) =&gt; i + 1)}&gt;{n =&gt; &lt;span class=&quot;tag&quot;&gt;{n}&lt;/span&gt;}&lt;/For&gt;</code> | 시그널·memo·effect 실험: 배열 항목별 화면을 생성하고 항목 정체성에 따라 갱신한다. |
| 14 | <code>    &lt;label&gt;새로고침 후 남는 메모&lt;input value={note()} onInput={e =&gt; setNote(e.currentTarget.value)} /&gt;&lt;/label&gt;</code> | 시그널·memo·effect 실험: 입력 요소의 현재 값을 상태 setter에 전달한다. |
| 15 | <code>  &lt;/article&gt;;</code> | 시그널·memo·effect 실험의 현재 구문·화면·설정 블록을 닫거나 다음 분기로 연결한다. |
| 16 | <code>}</code> | 시그널·memo·effect 실험의 현재 블록 또는 선언을 닫는다. |

## ④ 🔗 연동 포인트

폼 초안은 브라우저에, 공유 게시물은 study6의 서버 DB에 저장한다. UI에서 accessor를 읽는 방법은 다음 단계 URL 파라미터와 createResource에도 이어진다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| 함수 문자열 표시 | count() 대신 count 사용 | accessor를 호출한다 |
| 무한 갱신 | effect 안에서 읽은 상태를 무조건 다시 설정 | 파생 값은 memo로 옮긴다 |
| 배열 변경 안 보임 | 같은 배열을 직접 push | 새 배열로 setter 호출 |

## ⑥ 직접 해보기

1. 감소 버튼과 0 미만 방지 조건을 추가한다.
2. 메모 글자 수를 memo로 표시한다.
3. Show의 fallback 문구를 입력 길이에 따라 바꾼다.

## ⑦ ☐ 체크리스트

노션 [FW] 학습 목표 원문 항목은 다음과 같이 보존한다. 괄호가 포함된 원문을 인용하되 다른 프레임워크 비교 실습은 수행하지 않는다.

- [ ] `createSignal`, `createEffect`, `createMemo`
- [ ] `<For>`, `<Show>` 제어 흐름 컴포넌트

- [ ] 새로고침 후 localStorage와 메모리 상태 차이를 확인했다.

## ⑧ 다음 단계 연결 문장

시그널을 DOM과 연결하고 초안을 브라우저에 저장한다를 마쳤다면 [study4.md](study4.md)에서 이어 간다.

공식 자료: [SolidJS 1.x 소스](https://github.com/solidjs/solid/tree/v1.9.20), [Solid Router](https://docs.solidjs.com/solid-router/getting-started/installation-and-setup), [Node SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html). 최신 문서와 설치 버전이 다를 수 있어 package-lock.json을 실행 기준으로 삼는다.
