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
