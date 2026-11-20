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
