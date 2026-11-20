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
