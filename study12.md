# study12 · SolidJS UI·상태 관리·폼 라이브러리

> 기준: [SolidJS 노션 원문](https://app.notion.com/p/40bd7dec5e2e813080f8d54cf5968ad5) · [게시판 API v1](https://app.notion.com/p/3d6d7dec5e2e8139adbfd36dd506c65e) · 문서 기준일 2026-11-20 (Asia/Seoul).

## ① 목표 한 줄

Solid 전용 UI·store·폼 라이브러리로 접근 가능한 설정 화면을 만든다.

## ② 📖 이론

UI 라이브러리는 열기·닫기·포커스 같은 반복 상호작용을 맡고, 상태 관리는 도메인 값을, 폼 라이브러리는 필드 검증·dirty·submitting을 맡는다. 이 역할을 나누면 같은 값을 여러 저장소에 중복으로 복사하지 않아도 된다.

Kobalte Dialog는 모달의 포커스·Escape·접근성 연결을 제공한다. createStore는 중첩 객체의 경로를 반응적으로 읽고 갱신한다. Modular Forms의 createForm은 Form/Field와 폼 상태를 만든다. 현재 Modular Forms는 유지보수 모드지만 이 저장소는 Solid 1.x와 검증한 버전을 고정해 연동 원리를 학습한다.

Dialog는 문을 여닫는 장치, store는 저장된 설정, form은 제출 전 작성 중인 종이에 비유할 수 있다. 폼 submit에서만 store를 바꾸고 서버 설정이 필요하면 그 자리에 API 호출을 추가한다.

## ③ 🛠️ 실기 · 전체 코드와 줄별 설명

이 저장소는 완성 코드와 학습 노트를 함께 제공한다. 아래 파일을 지정 경로에서 읽고 실행한다. 이 단계에서 새로 다루는 파일은 생략 없이 수록하며, import되는 공통 파일은 README와 앞선 단계의 전체 코드를 따른다. 학습 진행 상황은 체크박스에 직접 기록한다.

1. /labs → 설정 열기를 누른다. title/description이 dialog 접근성 이름·설명으로 연결되는지 확인한다.
2. Field에 name, validate, value, 이벤트 props를 연결한다. 빈 값을 제출하여 필드 오류를 확인한다.
3. 새 이름을 저장하면 createStore의 nickname과 saved가 갱신된다. 닫기 버튼 aria-label도 화면 언어와 일치시킨다.
4. Tab/Shift+Tab/Escape로 포커스를 확인한다. UI 라이브러리를 쓰더라도 label·오류 문구·버튼 이름은 직접 검증한다.
5. 사용자 프로필을 서버에 저장하려면 Form submit에서 PATCH 성공을 기다린 뒤 store를 바꾸고 400 fields를 해당 Field 오류로 연결한다.

실행 명령은 저장소 루트의 PowerShell 기준이다. 서버를 유지하는 명령 다음의 작업은 별도 터미널에서 실행한다.

```powershell
npm ls @kobalte/core @modular-forms/solid solid-js
npm run build
npm run test:e2e
```

### src/labs/Ui.tsx 전체 코드

[src/labs/Ui.tsx](src/labs/Ui.tsx)

```tsx
import { createForm, required } from '@modular-forms/solid';
import { Dialog } from '@kobalte/core/dialog';
import { createStore } from 'solid-js/store';
type Preferences = { nickname: string };
export default function Ui() {
  const [settings, setSettings] = createStore({ nickname: '학습자', saved: false });
  const [form, { Form, Field }] = createForm<Preferences>({ initialValues: { nickname: settings.nickname } });
  return <article class="card"><h2>UI · 상태 · 폼</h2><p>현재 이름: {settings.nickname}</p><p role="status">{settings.saved ? '저장됨' : '설정 대기'}</p>
    <Dialog><Dialog.Trigger>설정 열기</Dialog.Trigger><Dialog.Portal><Dialog.Overlay class="overlay" /><Dialog.Content class="dialog"><Dialog.Title>학습 설정</Dialog.Title><Dialog.Description>Tab으로 필드를 이동하고 Escape로 닫을 수 있습니다.</Dialog.Description>
      <Form onSubmit={values => { setSettings({ nickname: values.nickname, saved: true }); }}>
        <Field name="nickname" validate={required('이름을 입력하세요.')}>{(field, props) => <label>표시 이름<input {...props} value={field.value || ''} aria-invalid={!!field.error} /><span role="alert">{field.error}</span></label>}</Field>
        <button disabled={form.submitting}>설정 저장</button>
      </Form><Dialog.CloseButton aria-label="닫기">닫기</Dialog.CloseButton></Dialog.Content></Dialog.Portal></Dialog>
  </article>;
}
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>import { createForm, required } from &#x27;@modular-forms/solid&#x27;;</code> | @modular-forms/solid에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 2 | <code>import { Dialog } from &#x27;@kobalte/core/dialog&#x27;;</code> | @kobalte/core/dialog에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 3 | <code>import { createStore } from &#x27;solid-js/store&#x27;;</code> | solid-js/store에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 4 | <code>type Preferences = { nickname: string };</code> | UI·store·폼 연동에서 사용하는 데이터 필드와 타입 계약을 선언한다. |
| 5 | <code>export default function Ui() {</code> | UI·store·폼 연동의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 6 | <code>  const [settings, setSettings] = createStore({ nickname: &#x27;학습자&#x27;, saved: false });</code> | UI·store·폼 연동: 객체 경로를 반응적으로 관리하는 store와 setter를 만든다. |
| 7 | <code>  const [form, { Form, Field }] = createForm&lt;Preferences&gt;({ initialValues: { nickname: settings.nickname } });</code> | UI·store·폼 연동: 폼 상태와 Form·Field 컴포넌트를 생성한다. |
| 8 | <code>  return &lt;article class=&quot;card&quot;&gt;&lt;h2&gt;UI · 상태 · 폼&lt;/h2&gt;&lt;p&gt;현재 이름: {settings.nickname}&lt;/p&gt;&lt;p role=&quot;status&quot;&gt;{settings.saved ? &#x27;저장됨&#x27; : &#x27;설정 대기&#x27;}&lt;/p&gt;</code> | UI·store·폼 연동: 현재 상태·props를 읽는 JSX 화면 트리를 반환한다. |
| 9 | <code>    &lt;Dialog&gt;&lt;Dialog.Trigger&gt;설정 열기&lt;/Dialog.Trigger&gt;&lt;Dialog.Portal&gt;&lt;Dialog.Overlay class=&quot;overlay&quot; /&gt;&lt;Dialog.Content class=&quot;dialog&quot;&gt;&lt;Dialog.Title&gt;학습 설정&lt;/Dialog.Title&gt;&lt;Dialog.Description&gt;Tab으로 필드를 이동하고 Escape로 닫을 수 있습니다.&lt;/Dialog.Description&gt;</code> | UI·store·폼 연동: 대화상자의 포커스·설명·열기·닫기 접근성 경계를 구성한다. |
| 10 | <code>      &lt;Form onSubmit={values =&gt; { setSettings({ nickname: values.nickname, saved: true }); }}&gt;</code> | UI·store·폼 연동: 배열 항목별 화면을 생성하고 항목 정체성에 따라 갱신한다. |
| 11 | <code>        &lt;Field name=&quot;nickname&quot; validate={required(&#x27;이름을 입력하세요.&#x27;)}&gt;{(field, props) =&gt; &lt;label&gt;표시 이름&lt;input {...props} value={field.value &#124;&#124; &#x27;&#x27;} aria-invalid={!!field.error} /&gt;&lt;span role=&quot;alert&quot;&gt;{field.error}&lt;/span&gt;&lt;/label&gt;}&lt;/Field&gt;</code> | UI·store·폼 연동: 폼 라이브러리의 이름·검증·값·입력 이벤트를 연결한다. |
| 12 | <code>        &lt;button disabled={form.submitting}&gt;설정 저장&lt;/button&gt;</code> | UI·store·폼 연동: 사용자 동작을 함수와 연결하고 필요하면 disabled로 잠근다. |
| 13 | <code>      &lt;/Form&gt;&lt;Dialog.CloseButton aria-label=&quot;닫기&quot;&gt;닫기&lt;/Dialog.CloseButton&gt;&lt;/Dialog.Content&gt;&lt;/Dialog.Portal&gt;&lt;/Dialog&gt;</code> | UI·store·폼 연동: 대화상자의 포커스·설명·열기·닫기 접근성 경계를 구성한다. |
| 14 | <code>  &lt;/article&gt;;</code> | UI·store·폼 연동의 현재 구문·화면·설정 블록을 닫거나 다음 분기로 연결한다. |
| 15 | <code>}</code> | UI·store·폼 연동의 현재 블록 또는 선언을 닫는다. |

## ④ 🔗 연동 포인트

초기 PostForm은 기초 원리를 보여 주고 이 단계는 라이브러리 폼으로 확장하는 별도 실험이다. 전역 로그인 상태는 session에 유지하며 UI 설정 store와 섞지 않는다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| Dialog가 배경 아래 표시 | Portal·레이어 스타일 누락 | Portal·Overlay·Content 스타일 확인 |
| 값이 입력 안 됨 | Field 이벤트 props 누락 | props spread와 value 연결 |
| 닫기 버튼 못 찾음 | 기본 접근성 이름이 다른 언어 | aria-label을 명시하고 브라우저 검증 |

## ⑥ 직접 해보기

1. 색상 설정 필드를 store에 추가한다.
2. 빈 이름 검증과 Escape 닫기를 직접 확인한다.
3. 폼 저장 실패 가짜 API를 주입하고 입력 유지 여부를 확인한다.

## ⑦ ☐ 체크리스트

- [ ] Solid 전용 UI·store·폼을 연결했다.
- [ ] 필드 검증과 submitting을 표시했다.
- [ ] 키보드·레이블·Dialog 이름을 확인했다.

## ⑧ 다음 단계 연결 문장

Solid 전용 UI·store·폼 라이브러리로 접근 가능한 설정 화면을 만든다를 마쳤다면 [study13.md](study13.md)에서 이어 간다.

공식 자료: [SolidJS 1.x 소스](https://github.com/solidjs/solid/tree/v1.9.20), [Solid Router](https://docs.solidjs.com/solid-router/getting-started/installation-and-setup), [Node SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html). 최신 문서와 설치 버전이 다를 수 있어 package-lock.json을 실행 기준으로 삼는다.
