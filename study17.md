# study17 · SolidJS WebSocket·알림·파일 확장

> 기준: [SolidJS 노션 원문](https://app.notion.com/p/40bd7dec5e2e813080f8d54cf5968ad5) · [게시판 API v1](https://app.notion.com/p/3d6d7dec5e2e8139adbfd36dd506c65e) · 문서 기준일 2026-11-20 (Asia/Seoul).

## ① 목표 한 줄

공개 게시판 변경 알림과 문서 작업 상태를 안전하게 확장한다.

## ② 📖 이론

HTTP는 요청할 때 답하고 WebSocket은 연결을 유지하여 서버가 먼저 알릴 수 있다. 이 실습 채널은 공개 게시글의 변경 시각만 보낸다. 개인 문서나 세션 정보를 보내지 않으므로 누구나 볼 수 있는 알림 경계를 유지한다.

서버는 upgrade 경로와 Origin을 검사하고 payload 상한·ping/pong 생존 확인을 적용한다. 브라우저는 연결이 끊기면 1초에서 30초까지 지수 재연결하고 onCleanup에서 타이머와 소켓을 닫는다. HTTPS에서는 WSS를 사용한다.

알림은 데이터 자체를 대체하지 않는다. 사용자는 변경 안내를 받은 뒤 인증된 API로 실제 자료를 다시 읽는다. 여러 서버로 늘리면 각 프로세스의 소켓 집합이 다르므로 메시지 브로커·fan-out·중복 알림 처리가 필요하다. 파일 분석은 별도 job id로 상태를 조회하며 현재 구현은 문서 통계 결과를 공개 소켓에 섞지 않는다.

## ③ 🛠️ 실기 · 전체 코드와 줄별 설명

이 저장소는 완성 코드와 학습 노트를 함께 제공한다. 아래 파일을 지정 경로에서 읽고 실행한다. 이 단계에서 새로 다루는 파일은 생략 없이 수록하며, import되는 공통 파일은 README와 앞선 단계의 전체 코드를 따른다. 학습 진행 상황은 체크박스에 직접 기록한다.

1. 두 창에서 목록을 열고 한쪽에서 글을 작성한다. 다른 창 하단에 변경 안내가 오는지 확인한다.
2. Network WS에서 posts.changed 프레임만 보이는지 확인한다. 토큰·본문·문서 id는 보내지 않는다.
3. 서버를 중지했다 다시 시작해 재연결 상태를 확인한다. 페이지를 떠나면 기존 소켓이 정리된다.
4. 업로드는 파일명을 디스크 경로로 쓰지 않고 검증된 UTF-8 텍스트를 DB에 저장한다. 분석은 202로 예약하고 /api/jobs/{id}에서 인증·소유자 검사 후 조회한다.
5. 개인 알림을 확장하려면 인증 후 user별 채널에 가입시키고 재연결 때 다시 인증한다. 브라우저 WebSocket은 임의 Authorization 헤더를 붙이기 어려워 짧은 1회용 ticket 등의 별도 설계가 필요하다.

실행 명령은 저장소 루트의 PowerShell 기준이다. 서버를 유지하는 명령 다음의 작업은 별도 터미널에서 실행한다.

```powershell
npm test
# 두 탭에서 http://localhost:5173 열기
npm run dev
```

### server/realtime.mjs 전체 코드

[server/realtime.mjs](server/realtime.mjs)

```javascript
import { WebSocketServer, WebSocket } from 'ws';
export function realtime(server, origin) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 });
  server.on('upgrade', (req, socket, head) => {
    if (req.url !== '/ws' || req.headers.origin !== origin) { socket.destroy(); return; }
    // 공개 게시판 변경 알림만 보낸다. 토큰·문서·개인정보를 이 채널에 넣지 않는다.
    wss.handleUpgrade(req, socket, head, ws => {
      ws.isAlive = true; ws.on('pong', () => { ws.isAlive = true; });
      ws.on('error', () => ws.terminate()); wss.emit('connection', ws, req);
    });
  });
  const timer = setInterval(() => {
    for (const ws of wss.clients) { if (!ws.isAlive) ws.terminate(); else { ws.isAlive = false; ws.ping(); } }
  }, 30000); timer.unref();
  return {
    publish: event => { for (const ws of wss.clients) if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(event)); },
    close: () => { clearInterval(timer); for (const ws of wss.clients) ws.terminate(); wss.close(); }
  };
}
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>import { WebSocketServer, WebSocket } from &#x27;ws&#x27;;</code> | ws에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 2 | <code>export function realtime(server, origin) {</code> | 공개 WebSocket 알림의 이름 있는 동작과 인자 범위를 정의한다. |
| 3 | <code>  const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 });</code> | 공개 WebSocket 알림에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 4 | <code>  server.on(&#x27;upgrade&#x27;, (req, socket, head) =&gt; {</code> | 공개 WebSocket 알림의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 5 | <code>    if (req.url !== &#x27;/ws&#x27; &#124;&#124; req.headers.origin !== origin) { socket.destroy(); return; }</code> | 공개 WebSocket 알림에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 6 | <code>    // 공개 게시판 변경 알림만 보낸다. 토큰·문서·개인정보를 이 채널에 넣지 않는다.</code> | 공개 게시판 변경 알림만 보낸다. 토큰·문서·개인정보를 이 채널에 넣지 않는다. |
| 7 | <code>    wss.handleUpgrade(req, socket, head, ws =&gt; {</code> | 공개 WebSocket 알림의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 8 | <code>      ws.isAlive = true; ws.on(&#x27;pong&#x27;, () =&gt; { ws.isAlive = true; });</code> | 공개 WebSocket 알림의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 9 | <code>      ws.on(&#x27;error&#x27;, () =&gt; ws.terminate()); wss.emit(&#x27;connection&#x27;, ws, req);</code> | 공개 WebSocket 알림의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 10 | <code>    });</code> | 공개 WebSocket 알림의 현재 블록 또는 선언을 닫는다. |
| 11 | <code>  });</code> | 공개 WebSocket 알림의 현재 블록 또는 선언을 닫는다. |
| 12 | <code>  const timer = setInterval(() =&gt; {</code> | 공개 WebSocket 알림: 주기적으로 작업 큐 또는 연결 생존 상태를 점검한다. |
| 13 | <code>    for (const ws of wss.clients) { if (!ws.isAlive) ws.terminate(); else { ws.isAlive = false; ws.ping(); } }</code> | 공개 WebSocket 알림의 각 항목·프레임·작업을 순서대로 처리한다. |
| 14 | <code>  }, 30000); timer.unref();</code> | 공개 WebSocket 알림의 현재 구문·화면·설정 블록을 닫거나 다음 분기로 연결한다. |
| 15 | <code>  return {</code> | 공개 WebSocket 알림의 현재 처리 결과를 호출자에게 돌려준다. |
| 16 | <code>    publish: event =&gt; { for (const ws of wss.clients) if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(event)); },</code> | 공개 WebSocket 알림: 객체를 네트워크·저장용 JSON 문자열로 직렬화한다. |
| 17 | <code>    close: () =&gt; { clearInterval(timer); for (const ws of wss.clients) ws.terminate(); wss.close(); }</code> | 공개 WebSocket 알림의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 18 | <code>  };</code> | 공개 WebSocket 알림의 현재 블록 또는 선언을 닫는다. |
| 19 | <code>}</code> | 공개 WebSocket 알림의 현재 블록 또는 선언을 닫는다. |

### src/components/LiveNotice.tsx 전체 코드

[src/components/LiveNotice.tsx](src/components/LiveNotice.tsx)

```tsx
import { createSignal, onMount, onCleanup } from 'solid-js';
import { config } from '../config';
export default function LiveNotice() {
  const [status, setStatus] = createSignal('실시간 연결 준비'); let socket: WebSocket | undefined; let timer: ReturnType<typeof setTimeout>; let stopped = false; let delay = 1000;
  function connect() {
    if (stopped) return;
    const address = new URL(config.apiBase || location.origin); address.protocol = address.protocol === 'https:' ? 'wss:' : 'ws:'; address.pathname = '/ws';
    socket = new WebSocket(address);
    socket.onopen = () => { delay = 1000; setStatus('실시간 연결됨'); };
    socket.onmessage = event => { try { if (JSON.parse(event.data).type === 'posts.changed') setStatus('새 변경 사항이 있습니다. 목록을 다시 열어 확인하세요.'); } catch {} };
    socket.onclose = () => { if (!stopped) { setStatus('재연결 중…'); timer = setTimeout(connect, delay); delay = Math.min(delay * 2, 30000); } };
    socket.onerror = () => socket?.close();
  }
  onMount(connect); onCleanup(() => { stopped = true; clearTimeout(timer); socket?.close(); });
  return <small role="status" class="live">{status()}</small>;
}
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>import { createSignal, onMount, onCleanup } from &#x27;solid-js&#x27;;</code> | solid-js에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 2 | <code>import { config } from &#x27;../config&#x27;;</code> | ../config에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 3 | <code>export default function LiveNotice() {</code> | 소켓 수명과 재연결의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 4 | <code>  const [status, setStatus] = createSignal(&#x27;실시간 연결 준비&#x27;); let socket: WebSocket &#124; undefined; let timer: ReturnType&lt;typeof setTimeout&gt;; let stopped = false; let delay = 1000;</code> | 소켓 수명과 재연결: 변경될 값을 accessor·setter 쌍으로 만들고 이후 JSX·함수에서 읽게 한다. |
| 5 | <code>  function connect() {</code> | 소켓 수명과 재연결의 이름 있는 동작과 인자 범위를 정의한다. |
| 6 | <code>    if (stopped) return;</code> | 소켓 수명과 재연결에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 7 | <code>    const address = new URL(config.apiBase &#124;&#124; location.origin); address.protocol = address.protocol === &#x27;https:&#x27; ? &#x27;wss:&#x27; : &#x27;ws:&#x27;; address.pathname = &#x27;/ws&#x27;;</code> | 소켓 수명과 재연결: 고정 base에 경로·쿼리를 연결하거나 URL 부분을 안전하게 해석한다. |
| 8 | <code>    socket = new WebSocket(address);</code> | 소켓 수명과 재연결의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 9 | <code>    socket.onopen = () =&gt; { delay = 1000; setStatus(&#x27;실시간 연결됨&#x27;); };</code> | 소켓 수명과 재연결의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 10 | <code>    socket.onmessage = event =&gt; { try { if (JSON.parse(event.data).type === &#x27;posts.changed&#x27;) setStatus(&#x27;새 변경 사항이 있습니다. 목록을 다시 열어 확인하세요.&#x27;); } catch {} };</code> | 소켓 수명과 재연결: 문자열 JSON을 파싱한다. 미완성 프레임은 앞선 버퍼에서 보관한다. |
| 11 | <code>    socket.onclose = () =&gt; { if (!stopped) { setStatus(&#x27;재연결 중…&#x27;); timer = setTimeout(connect, delay); delay = Math.min(delay * 2, 30000); } };</code> | 소켓 수명과 재연결: 시간 상한 또는 재연결 대기 후 작업을 예약한다. |
| 12 | <code>    socket.onerror = () =&gt; socket?.close();</code> | 소켓 수명과 재연결의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 13 | <code>  }</code> | 소켓 수명과 재연결의 현재 블록 또는 선언을 닫는다. |
| 14 | <code>  onMount(connect); onCleanup(() =&gt; { stopped = true; clearTimeout(timer); socket?.close(); });</code> | 소켓 수명과 재연결: 화면이 해제될 때 타이머·네트워크 자원을 정리한다. |
| 15 | <code>  return &lt;small role=&quot;status&quot; class=&quot;live&quot;&gt;{status()}&lt;/small&gt;;</code> | 소켓 수명과 재연결: 현재 상태·props를 읽는 JSX 화면 트리를 반환한다. |
| 16 | <code>}</code> | 소켓 수명과 재연결의 현재 블록 또는 선언을 닫는다. |

### src/pages/Documents.tsx 전체 코드

[src/pages/Documents.tsx](src/pages/Documents.tsx)

```tsx
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
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>import { createResource, createSignal, For, onCleanup, Show } from &#x27;solid-js&#x27;;</code> | solid-js에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 2 | <code>import { api, streamQuestion } from &#x27;../api&#x27;;</code> | ../api에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 3 | <code>import { user } from &#x27;../session&#x27;;</code> | ../session에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 4 | <code>import type { Document, Question, Source } from &#x27;../types&#x27;;</code> | ../types에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 5 | <code>export default function Documents() {</code> | 문서 업로드·질문·스트리밍 UI의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 6 | <code>  const [revision, setRevision] = createSignal(0); const [selected, setSelected] = createSignal&lt;number&gt;();</code> | 문서 업로드·질문·스트리밍 UI: 변경될 값을 accessor·setter 쌍으로 만들고 이후 JSX·함수에서 읽게 한다. |
| 7 | <code>  const [documents] = createResource(() =&gt; user() &amp;&amp; `${user()!.id}-${revision()}`, () =&gt; api&lt;{ data: Document[] }&gt;(&#x27;/api/documents&#x27;));</code> | 문서 업로드·질문·스트리밍 UI: source를 추적하여 비동기 조회와 pending·error·value를 관리한다. |
| 8 | <code>  const [history, { refetch }] = createResource(() =&gt; selected(), id =&gt; api&lt;{ data: Question[] }&gt;(`/api/documents/${id}/questions`));</code> | 문서 업로드·질문·스트리밍 UI: source를 추적하여 비동기 조회와 pending·error·value를 관리한다. |
| 9 | <code>  const [question, setQuestion] = createSignal(&#x27;문서를 3줄로 요약해 주세요.&#x27;); const [answer, setAnswer] = createSignal(&#x27;&#x27;);</code> | 문서 업로드·질문·스트리밍 UI: 변경될 값을 accessor·setter 쌍으로 만들고 이후 JSX·함수에서 읽게 한다. |
| 10 | <code>  const [sources, setSources] = createSignal&lt;Source[]&gt;([]); const [busy, setBusy] = createSignal(false); const [error, setError] = createSignal(&#x27;&#x27;);</code> | 문서 업로드·질문·스트리밍 UI: 변경될 값을 accessor·setter 쌍으로 만들고 이후 JSX·함수에서 읽게 한다. |
| 11 | <code>  const [job, setJob] = createSignal(&#x27;&#x27;); let controller: AbortController &#124; undefined;</code> | 문서 업로드·질문·스트리밍 UI: 변경될 값을 accessor·setter 쌍으로 만들고 이후 JSX·함수에서 읽게 한다. |
| 12 | <code>  onCleanup(() =&gt; controller?.abort());</code> | 문서 업로드·질문·스트리밍 UI: 화면이 해제될 때 타이머·네트워크 자원을 정리한다. |
| 13 | <code>  async function upload(file?: File) {</code> | 문서 업로드·질문·스트리밍 UI의 이름 있는 동작과 인자 범위를 정의한다. |
| 14 | <code>    if (!file &#124;&#124; busy()) return; setError(&#x27;&#x27;);</code> | 문서 업로드·질문·스트리밍 UI에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 15 | <code>    if (file.size &gt; 512000 &#124;&#124; !/\.(txt&#124;md)$/i.test(file.name)) { setError(&#x27;UTF-8 TXT·MD, 500KB 이하를 선택하세요.&#x27;); return; }</code> | 문서 업로드·질문·스트리밍 UI: 독립적인 검증 시나리오와 비동기 정리 범위를 정의한다. |
| 16 | <code>    setBusy(true);</code> | 문서 업로드·질문·스트리밍 UI의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 17 | <code>    try {</code> | 문서 업로드·질문·스트리밍 UI의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 18 | <code>      const content = new TextDecoder(&#x27;utf-8&#x27;, { fatal: true }).decode(await file.arrayBuffer());</code> | 문서 업로드·질문·스트리밍 UI에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 19 | <code>      const result = await api&lt;{ data: Document }&gt;(&#x27;/api/documents&#x27;, { method: &#x27;POST&#x27;, body: JSON.stringify({ filename: file.name, content }) });</code> | 문서 업로드·질문·스트리밍 UI: 객체를 네트워크·저장용 JSON 문자열로 직렬화한다. |
| 20 | <code>      setRevision(v =&gt; v + 1); setSelected(result.data.id);</code> | 문서 업로드·질문·스트리밍 UI의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 21 | <code>    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }</code> | 문서 업로드·질문·스트리밍 UI의 실패를 잡아 오류 안내·복구·상태 갱신으로 전환한다. |
| 22 | <code>  }</code> | 문서 업로드·질문·스트리밍 UI의 현재 블록 또는 선언을 닫는다. |
| 23 | <code>  async function ask(e: SubmitEvent) {</code> | 문서 업로드·질문·스트리밍 UI의 이름 있는 동작과 인자 범위를 정의한다. |
| 24 | <code>    e.preventDefault(); if (!selected() &#124;&#124; busy()) return; controller = new AbortController(); setBusy(true); setAnswer(&#x27;&#x27;); setSources([]); setError(&#x27;&#x27;);</code> | 문서 업로드·질문·스트리밍 UI: 취소 신호를 만들어 연결된 비동기 요청을 중단할 수 있게 한다. |
| 25 | <code>    try {</code> | 문서 업로드·질문·스트리밍 UI의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 26 | <code>      await streamQuestion(selected()!, question(), event =&gt; { if (event.text) setAnswer(v =&gt; v + event.text); if (event.sources) setSources(event.sources as Source[]); if (event.stopReason === &#x27;max_tokens&#x27;) setError(&#x27;출력 한도에 도달했습니다. 질문을 나눠 주세요.&#x27;); }, controller.signal);</code> | 문서 업로드·질문·스트리밍 UI의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 27 | <code>      await refetch();</code> | 문서 업로드·질문·스트리밍 UI: 명시한 URL·method·header·body로 HTTP 요청을 보낸다. |
| 28 | <code>    } catch (e) { setError((e as Error).name === &#x27;AbortError&#x27; ? &#x27;요청을 취소했습니다.&#x27; : (e as Error).message); } finally { setBusy(false); }</code> | 문서 업로드·질문·스트리밍 UI의 실패를 잡아 오류 안내·복구·상태 갱신으로 전환한다. |
| 29 | <code>  }</code> | 문서 업로드·질문·스트리밍 UI의 현재 블록 또는 선언을 닫는다. |
| 30 | <code>  async function analyze() {</code> | 문서 업로드·질문·스트리밍 UI의 이름 있는 동작과 인자 범위를 정의한다. |
| 31 | <code>    try { const result = await api&lt;{ data: { id: number } }&gt;(`/api/documents/${selected()}/analyze`, { method: &#x27;POST&#x27; }); setJob(String(result.data.id)); } catch (e) { setError((e as Error).message); }</code> | 문서 업로드·질문·스트리밍 UI의 실패를 잡아 오류 안내·복구·상태 갱신으로 전환한다. |
| 32 | <code>  }</code> | 문서 업로드·질문·스트리밍 UI의 현재 블록 또는 선언을 닫는다. |
| 33 | <code>  async function checkJob() { try { const result = await api&lt;{ data: unknown }&gt;(`/api/jobs/${job()}`); setError(JSON.stringify(result.data)); } catch (e) { setError((e as Error).message); } }</code> | 문서 업로드·질문·스트리밍 UI: 객체를 네트워크·저장용 JSON 문자열로 직렬화한다. |
| 34 | <code>  return &lt;section&gt;&lt;p class=&quot;eyebrow&quot;&gt;DOCUFORGE · SOLID EDITION&lt;/p&gt;&lt;h1&gt;문서에서 답 찾기&lt;/h1&gt;&lt;p&gt;UTF-8 TXT·MD → 발췌 검색 → 근거를 인용하는 답변. 기본 AI는 명시적인 mock입니다.&lt;/p&gt;</code> | 문서 업로드·질문·스트리밍 UI: 현재 상태·props를 읽는 JSX 화면 트리를 반환한다. |
| 35 | <code>    &lt;Show when={user()} fallback={&lt;p&gt;문서를 올리려면 로그인하세요.&lt;/p&gt;}&gt;</code> | 문서 업로드·질문·스트리밍 UI: 조건 accessor에 따라 본문 또는 fallback 화면을 선택한다. |
| 36 | <code>      &lt;label&gt;문서 업로드&lt;input type=&quot;file&quot; accept=&quot;.txt,.md&quot; disabled={busy()} onChange={e =&gt; upload(e.currentTarget.files?.[0])} /&gt;&lt;/label&gt;</code> | 문서 업로드·질문·스트리밍 UI: 입력 필드의 화면 문구와 접근성 이름을 제공한다. |
| 37 | <code>      &lt;label&gt;내 문서&lt;select aria-label=&quot;내 문서&quot; value={selected() &#124;&#124; &#x27;&#x27;} disabled={busy()} onChange={e =&gt; { setSelected(Number(e.currentTarget.value) &#124;&#124; undefined); setAnswer(&#x27;&#x27;); setSources([]); }}&gt;&lt;option value=&quot;&quot;&gt;문서 선택&lt;/option&gt;&lt;For each={documents()?.data}&gt;{d =&gt; &lt;option value={d.id}&gt;{d.filename}&lt;/option&gt;}&lt;/For&gt;&lt;/select&gt;&lt;/label&gt;</code> | 문서 업로드·질문·스트리밍 UI: 배열 항목별 화면을 생성하고 항목 정체성에 따라 갱신한다. |
| 38 | <code>      &lt;Show when={selected()}&gt;&lt;form onSubmit={ask}&gt;&lt;label&gt;질문&lt;input required maxLength={500} value={question()} onInput={e =&gt; setQuestion(e.currentTarget.value)} /&gt;&lt;/label&gt;&lt;button disabled={busy()}&gt;근거로 답하기&lt;/button&gt;&lt;button type=&quot;button&quot; disabled={!busy()} onClick={() =&gt; controller?.abort()}&gt;중단&lt;/button&gt;&lt;/form&gt;</code> | 문서 업로드·질문·스트리밍 UI: 조건 accessor에 따라 본문 또는 fallback 화면을 선택한다. |
| 39 | <code>        &lt;article class=&quot;card&quot; aria-live=&quot;polite&quot;&gt;&lt;p class=&quot;prose&quot;&gt;{answer() &#124;&#124; &#x27;답변이 여기에 표시됩니다.&#x27;}&lt;/p&gt;&lt;For each={sources()}&gt;{(s, i) =&gt; &lt;blockquote&gt;(발췌 {i() + 1}) {s.text}&lt;/blockquote&gt;}&lt;/For&gt;&lt;/article&gt;</code> | 문서 업로드·질문·스트리밍 UI: 배열 항목별 화면을 생성하고 항목 정체성에 따라 갱신한다. |
| 40 | <code>        &lt;button disabled={busy()} onClick={analyze}&gt;백그라운드 분석&lt;/button&gt;&lt;Show when={job()}&gt;&lt;button onClick={checkJob}&gt;작업 {job()} 상태 확인&lt;/button&gt;&lt;/Show&gt;</code> | 문서 업로드·질문·스트리밍 UI: 조건 accessor에 따라 본문 또는 fallback 화면을 선택한다. |
| 41 | <code>        &lt;h2&gt;질문 기록&lt;/h2&gt;&lt;For each={history()?.data}&gt;{h =&gt; &lt;details&gt;&lt;summary&gt;{h.question}&lt;/summary&gt;&lt;p&gt;{h.answer}&lt;/p&gt;&lt;/details&gt;}&lt;/For&gt;</code> | 문서 업로드·질문·스트리밍 UI: 배열 항목별 화면을 생성하고 항목 정체성에 따라 갱신한다. |
| 42 | <code>      &lt;/Show&gt;</code> | 문서 업로드·질문·스트리밍 UI의 현재 구문·화면·설정 블록을 닫거나 다음 분기로 연결한다. |
| 43 | <code>    &lt;/Show&gt;&lt;Show when={error()}&gt;&lt;p role=&quot;status&quot;&gt;{error()}&lt;/p&gt;&lt;/Show&gt;</code> | 문서 업로드·질문·스트리밍 UI: 조건 accessor에 따라 본문 또는 fallback 화면을 선택한다. |
| 44 | <code>  &lt;/section&gt;;</code> | 문서 업로드·질문·스트리밍 UI의 현재 블록 또는 선언을 닫는다. |
| 45 | <code>}</code> | 문서 업로드·질문·스트리밍 UI의 현재 블록 또는 선언을 닫는다. |

## ④ 🔗 연동 포인트

공개 변경 알림 → API 재조회가 기본 흐름이다. 파일의 검증·분석·소유자 경계는 study18에서 문서 AI 입력과 RAG 발췌에도 그대로 적용한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| WS 연결 즉시 종료 | Origin 불일치·proxy 누락 | PUBLIC_ORIGIN과 /ws proxy 확인 |
| 탭 전환마다 알림 증가 | cleanup 누락 | 소켓·타이머를 해제 |
| 다른 서버 탭에 알림 없음 | 프로세스별 소켓 집합 | 확장 전 브로커·fan-out 설계 |

## ⑥ 직접 해보기

1. 서버 재시작 후 재연결 최대 지연을 확인한다.
2. 다른 Origin의 소켓 연결이 거절되는지 확인한다.
3. 개인 작업 완료 알림에 필요한 인증 ticket 흐름을 설계한다.

## ⑦ ☐ 체크리스트

- [ ] 웹소켓 Origin·크기·heartbeat·재연결을 확인했다.
- [ ] 공개 알림에 민감한 정보를 넣지 않는다.
- [ ] 파일 처리·분석 작업·소유자 검사를 연결했다.

## ⑧ 다음 단계 연결 문장

공개 게시판 변경 알림과 문서 작업 상태를 안전하게 확장한다를 마쳤다면 [study18.md](study18.md)에서 이어 간다.

공식 자료: [SolidJS 1.x 소스](https://github.com/solidjs/solid/tree/v1.9.20), [Solid Router](https://docs.solidjs.com/solid-router/getting-started/installation-and-setup), [Node SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html). 최신 문서와 설치 버전이 다를 수 있어 package-lock.json을 실행 기준으로 삼는다.
