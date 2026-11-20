import { createSignal, For, Show } from 'solid-js';
import { ApiError } from '../api';
import type { PostInput } from '../types';
export default function PostForm(props: { initial?: PostInput; save: (input: PostInput) => Promise<void> }) {
  const [title, setTitle] = createSignal(props.initial?.title || '');
  const [body, setBody] = createSignal(props.initial?.body || '');
  const [tags, setTags] = createSignal(props.initial?.tags.join(',') || '');
  const [busy, setBusy] = createSignal(false); const [error, setError] = createSignal('');
  const [fields, setFields] = createSignal<Record<string, string[]>>({});
  async function submit(event: SubmitEvent) {
    event.preventDefault(); if (busy()) return; setFields({}); setError('');
    if (!title().trim() || title().length > 200 || !body().trim() || body().length > 20000) { setError('제목 1~200자, 본문 1~20,000자를 확인하세요.'); return; }
    setBusy(true);
    try { await props.save({ title: title().trim(), body: body().trim(), tags: tags().split(',').map(t => t.trim()).filter(Boolean) }); }
    catch (e) {
      if (e instanceof ApiError && [400, 422].includes(e.status)) setFields(e.fields);
      setError(e instanceof Error ? e.message : '저장 실패');
    } finally { setBusy(false); }
  }
  return <form onSubmit={submit} aria-busy={busy()}>
    <label>제목<input name="title" required maxLength={200} value={title()} onInput={e => setTitle(e.currentTarget.value)} /></label>
    <label>본문<textarea name="body" required maxLength={20000} rows={8} value={body()} onInput={e => setBody(e.currentTarget.value)} /></label>
    <label>태그 (쉼표로 구분)<input value={tags()} onInput={e => setTags(e.currentTarget.value)} /></label>
    <Show when={error()}><p role="alert">{error()}</p></Show>
    <For each={Object.entries(fields())}>{([name, messages]) => <p role="alert">{name}: {messages.join(', ')}</p>}</For>
    <button disabled={busy()} type="submit">{busy() ? '저장 중…' : '저장'}</button>
  </form>;
}
