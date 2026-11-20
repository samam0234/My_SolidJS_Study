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
