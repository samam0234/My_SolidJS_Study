const base = process.env.API_BASE || 'http://127.0.0.1:3101';
let token;
async function request(path, method = 'GET', body) {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status}`);
  console.log(`${method} ${path}: ${response.status}`);
  return response.status === 204 ? undefined : response.json();
}
await request('/health');
const account = { email: `container-${Date.now()}@example.com`, nickname: 'container-test', password: 'password123' };
await request('/api/auth/signup', 'POST', account);
token = (await request('/api/auth/login', 'POST', account)).data.accessToken;
const post = (await request('/api/posts', 'POST', { title: '컨테이너 검증', body: '실제 Node 컨테이너 SQLite 왕복' })).data;
await request(`/api/posts/${post.id}`); await request(`/api/posts/${post.id}`, 'PATCH', { title: '수정 검증' }); await request(`/api/posts/${post.id}`, 'DELETE');
const document = (await request('/api/documents', 'POST', { filename: 'smoke.md', content: '시그널은 상태 변경을 추적합니다.' })).data;
const stream = await fetch(`${base}/api/ai/chat/stream`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ documentId: document.id, question: '시그널 설명' }) });
if (!stream.ok || !(await stream.text()).includes('data: [DONE]')) throw new Error('컨테이너 SSE 검증 실패');
console.log('POST /api/ai/chat/stream: 200, [DONE] 확인');
