import { createResource, createSignal, For, onCleanup, Show } from 'solid-js';
import { api, streamQuestion } from '../api';
import { user } from '../session';
import type { Document, Question, Source } from '../types';
export default function Documents() {
  const [revision, setRevision] = createSignal(0); const [selected, setSelected] = createSignal<number>();
  const [documents] = createResource(() => user() && `${user()!.id}-${revision()}`, () => api<{ data: Document[] }>('/api/documents'));
  const [history, { refetch }] = createResource(() => selected(), id => api<{ data: Question[] }>(`/api/documents/${id}/questions`));
  const [question, setQuestion] = createSignal('문서를 3줄로 요약해 주세요.'); const [answer, setAnswer] = createSignal('');
  const [sources, setSources] = createSignal<Source[]>([]); const [busy, setBusy] = createSignal(false); const [error, setError] = createSignal('');
  const [job, setJob] = createSignal(''); let controller: AbortController | undefined;
  onCleanup(() => controller?.abort());
  async function upload(file?: File) {
    if (!file || busy()) return; setError('');
    if (file.size > 512000 || !/\.(txt|md)$/i.test(file.name)) { setError('UTF-8 TXT·MD, 500KB 이하를 선택하세요.'); return; }
    setBusy(true);
    try {
      const content = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
      const result = await api<{ data: Document }>('/api/documents', { method: 'POST', body: JSON.stringify({ filename: file.name, content }) });
      setRevision(v => v + 1); setSelected(result.data.id);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function ask(e: SubmitEvent) {
    e.preventDefault(); if (!selected() || busy()) return; controller = new AbortController(); setBusy(true); setAnswer(''); setSources([]); setError('');
    try {
      await streamQuestion(selected()!, question(), event => { if (event.text) setAnswer(v => v + event.text); if (event.sources) setSources(event.sources as Source[]); if (event.stopReason === 'max_tokens') setError('출력 한도에 도달했습니다. 질문을 나눠 주세요.'); }, controller.signal);
      await refetch();
    } catch (e) { setError((e as Error).name === 'AbortError' ? '요청을 취소했습니다.' : (e as Error).message); } finally { setBusy(false); }
  }
  async function analyze() {
    try { const result = await api<{ data: { id: number } }>(`/api/documents/${selected()}/analyze`, { method: 'POST' }); setJob(String(result.data.id)); } catch (e) { setError((e as Error).message); }
  }
  async function checkJob() { try { const result = await api<{ data: unknown }>(`/api/jobs/${job()}`); setError(JSON.stringify(result.data)); } catch (e) { setError((e as Error).message); } }
  return <section><p class="eyebrow">DOCUFORGE · SOLID EDITION</p><h1>문서에서 답 찾기</h1><p>UTF-8 TXT·MD → 발췌 검색 → 근거를 인용하는 답변. 기본 AI는 명시적인 mock입니다.</p>
    <Show when={user()} fallback={<p>문서를 올리려면 로그인하세요.</p>}>
      <label>문서 업로드<input type="file" accept=".txt,.md" disabled={busy()} onChange={e => upload(e.currentTarget.files?.[0])} /></label>
      <label>내 문서<select aria-label="내 문서" value={selected() || ''} disabled={busy()} onChange={e => { setSelected(Number(e.currentTarget.value) || undefined); setAnswer(''); setSources([]); }}><option value="">문서 선택</option><For each={documents()?.data}>{d => <option value={d.id}>{d.filename}</option>}</For></select></label>
      <Show when={selected()}><form onSubmit={ask}><label>질문<input required maxLength={500} value={question()} onInput={e => setQuestion(e.currentTarget.value)} /></label><button disabled={busy()}>근거로 답하기</button><button type="button" disabled={!busy()} onClick={() => controller?.abort()}>중단</button></form>
        <article class="card" aria-live="polite"><p class="prose">{answer() || '답변이 여기에 표시됩니다.'}</p><For each={sources()}>{(s, i) => <blockquote>(발췌 {i() + 1}) {s.text}</blockquote>}</For></article>
        <button disabled={busy()} onClick={analyze}>백그라운드 분석</button><Show when={job()}><button onClick={checkJob}>작업 {job()} 상태 확인</button></Show>
        <h2>질문 기록</h2><For each={history()?.data}>{h => <details><summary>{h.question}</summary><p>{h.answer}</p></details>}</For>
      </Show>
    </Show><Show when={error()}><p role="status">{error()}</p></Show>
  </section>;
}
