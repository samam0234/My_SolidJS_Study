// midpoint: study0~10의 인증·CRUD·SQLite·정적 배포만 사용한다.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { openStore, repository } from './store.mjs';
import { fail, send, requestId, errorResponse, readJson, numericId, text } from './errors.mjs';
import { authenticate, signUp, publicUser, verifyPassword, issueSession, owner } from './auth.mjs';
import { validatePost, postDto, listPosts } from './posts.mjs';
const store = await openStore({ path: process.env.SQLITE_PATH || 'data/midpoint.sqlite' });
const repo = repository(store); const origin = process.env.CORS_ORIGIN || 'http://localhost:5173';
const attempts = new Map();
function throttle(key) {
  const now = Date.now(); const current = attempts.get(key) || { count: 0, until: now + 60000 };
  if (current.until < now) { current.count = 0; current.until = now + 60000; }
  attempts.set(key, current); if (++current.count > 20) fail(429, 'RATE_LIMITED', '잠시 후 다시 시도하세요.');
}
const required = async id => { const post = await repo.get('posts', id); if (!post) fail(404, 'NOT_FOUND', '없는 글입니다.'); return post; };
const server = createServer(async (req, res) => {
  const id = requestId(req); res.setHeader('X-Request-Id', id); res.setHeader('X-Content-Type-Options', 'nosniff');
  const path = new URL(req.url, 'http://localhost');
  try {
    if (req.headers.origin && req.headers.origin !== origin) fail(403, 'FORBIDDEN', 'Origin을 확인하세요.');
    if (req.headers.origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
    if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization'); return send(res, 204); }
    await repo.serial(async () => {
      const method = req.method; const auth = () => authenticate(repo, req.headers.authorization);
      if (path.pathname === '/health' && method === 'GET') return send(res, 200, { status: 'ok' });
      if (path.pathname === '/api/auth/signup' && method === 'POST') { throttle(req.socket.remoteAddress); return send(res, 201, { data: publicUser(await signUp(repo, await readJson(req))) }); }
      if (path.pathname === '/api/auth/login' && method === 'POST') {
        throttle(req.socket.remoteAddress); const input = await readJson(req); const email = text(input.email, 'email', 254).toLowerCase(); const password = text(input.password, 'password', 128);
        const user = (await repo.all('users')).find(u => u.email === email);
        if (!user || !await verifyPassword(password, user.passwordHash)) fail(401, 'INVALID_CREDENTIALS', '로그인 정보를 확인하세요.');
        return send(res, 200, { data: await issueSession(repo, user) });
      }
      if (path.pathname === '/api/auth/me' && method === 'GET') return send(res, 200, { data: publicUser((await auth()).user) });
      if (path.pathname === '/api/auth/logout' && method === 'POST') { await repo.delete('sessions', (await auth()).session.id); return send(res, 204); }
      if (path.pathname === '/api/posts' && method === 'GET') return send(res, 200, await listPosts(repo, path.searchParams));
      if (path.pathname === '/api/posts' && method === 'POST') {
        const { user } = await auth(); const input = validatePost(await readJson(req)); const now = new Date().toISOString();
        const post = await repo.insert('posts', { ...input, authorId: user.id, createdAt: now, updatedAt: now });
        res.setHeader('Location', `/api/posts/${post.id}`); return send(res, 201, { data: await postDto(repo, post) });
      }
      const match = path.pathname.match(/^\/api\/posts\/([^/]+)$/);
      if (match) {
        const post = await required(numericId(match[1]));
        if (method === 'GET') return send(res, 200, { data: await postDto(repo, post) });
        if (method === 'PATCH' || method === 'DELETE') {
          owner(post, (await auth()).user);
          if (method === 'PATCH') { const result = await repo.put('posts', { ...post, ...validatePost(await readJson(req), true), updatedAt: new Date().toISOString() }); return send(res, 200, { data: await postDto(repo, result) }); }
          for (const c of await repo.all('comments')) if (c.postId === post.id) await repo.delete('comments', c.id);
          await repo.delete('posts', post.id); return send(res, 204);
        }
      }
      const comments = path.pathname.match(/^\/api\/posts\/([^/]+)\/comments$/);
      if (comments) {
        const post = await required(numericId(comments[1]));
        if (method === 'GET') return send(res, 200, { data: await Promise.all((await repo.all('comments')).filter(c => c.postId === post.id).map(async c => ({ ...c, author: publicUser(await repo.get('users', c.authorId)) }))) });
        if (method === 'POST') { const { user } = await auth(); const input = await readJson(req); const comment = await repo.insert('comments', { postId: post.id, authorId: user.id, body: text(input.body, 'body', 2000), createdAt: new Date().toISOString() }); return send(res, 201, { data: { ...comment, author: publicUser(user) } }); }
      }
      const comment = path.pathname.match(/^\/api\/comments\/([^/]+)$/);
      if (comment && method === 'DELETE') { const row = await repo.get('comments', numericId(comment[1])); if (!row) fail(404, 'NOT_FOUND', '없는 댓글입니다.'); owner(row, (await auth()).user); await repo.delete('comments', row.id); return send(res, 204); }
      if (method === 'GET' && !path.pathname.startsWith('/api')) {
        const root = resolve('dist'); let file = resolve(root, '.' + decodeURIComponent(path.pathname));
        if (file !== root && !file.startsWith(root + sep)) fail(404, 'NOT_FOUND', '없는 경로입니다.');
        if (!extname(file)) file = resolve(root, 'index.html');
        try { const bytes = await readFile(file); res.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript' })[extname(file)] || 'application/octet-stream'); return res.end(bytes); } catch {}
      }
      fail(404, 'NOT_FOUND', '없는 경로입니다.');
    });
  } catch (error) { errorResponse(res, error, id); }
});
server.listen(Number(process.env.PORT || 3000), process.env.HOST || '127.0.0.1', () => console.log('midpoint API 준비 완료'));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(async () => { await store.close(); process.exit(0); }));
