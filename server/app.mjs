import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { randomBytes } from 'node:crypto';
import { HttpError, fail, send, requestId, errorResponse, readJson, text, numericId } from './errors.mjs';
import { openStore, repository } from './store.mjs';
import { authenticate, signUp, verifyPassword, publicUser, issueSession, owner, digest, hashPassword } from './auth.mjs';
import { validatePost, postDto, listPosts } from './posts.mjs';
import { streamAnswer } from './ai.mjs';
import { checkout, mail, oauthStart, oauthIdentity } from './integrations.mjs';
import { realtime } from './realtime.mjs';
import { jobRunner } from './jobs.mjs';
import { openapi } from './openapi.mjs';

export function environment(env = process.env) {
  const origin = env.PUBLIC_ORIGIN || 'http://localhost:5173';
  return {
    origin, cors: env.CORS_ORIGIN || origin, ttl: Number(env.SESSION_TTL_SECONDS || 3600),
    aiLimit: Number(env.AI_DAILY_TOKEN_LIMIT || 12000), production: env.NODE_ENV === 'production',
    ai: { provider: env.AI_PROVIDER || 'mock', model: env.AI_MODEL, key: env.ANTHROPIC_API_KEY, version: env.ANTHROPIC_VERSION, ollamaUrl: env.OLLAMA_URL || 'http://127.0.0.1:11434' },
    services: { mode: env.INTEGRATIONS_MODE || 'mock', origin, stripeKey: env.STRIPE_SECRET_KEY, priceId: env.STRIPE_PRICE_ID, mailKey: env.RESEND_API_KEY, mailFrom: env.MAIL_FROM, githubId: env.GITHUB_CLIENT_ID, githubSecret: env.GITHUB_CLIENT_SECRET }
  };
}
export async function createApp(options = {}) {
  const config = options.config || environment();
  const store = options.store || await openStore({ driver: process.env.DB_DRIVER, url: process.env.DATABASE_URL, path: process.env.SQLITE_PATH });
  const repo = repository(store); const cache = new Map(); const rates = new Map();
  let live;
  const changed = () => { cache.clear(); live?.publish({ type: 'posts.changed', at: new Date().toISOString() }); };
  const required = async (bucket, id) => { const row = await repo.get(bucket, id); if (!row) fail(404, 'NOT_FOUND', '자원을 찾을 수 없습니다.'); return row; };
  const limit = (key, count, window = 60000) => {
    const now = Date.now(); let entry = rates.get(key);
    if (!entry || entry.until < now) { entry = { count: 0, until: now + window }; rates.set(key, entry); }
    if (++entry.count > count) fail(429, 'RATE_LIMITED', '잠시 후 다시 시도하세요.');
    if (rates.size > 10000) for (const [k, v] of rates) if (v.until < now) rates.delete(k);
  };
  async function route(req, res, url) {
    const path = url.pathname; const method = req.method;
    const auth = () => authenticate(repo, req.headers.authorization);
    if (path === '/health' && method === 'GET') return send(res, 200, { status: 'ok' });
    if (path === '/api-docs' && method === 'GET') return send(res, 200, openapi);
    if (path === '/api/auth/signup' && method === 'POST') {
      limit(`auth:${req.socket.remoteAddress}`, 20);
      return send(res, 201, { data: publicUser(await signUp(repo, await readJson(req))) });
    }
    if (path === '/api/auth/login' && method === 'POST') {
      limit(`auth:${req.socket.remoteAddress}`, 20);
      const input = await readJson(req); const email = text(input.email, 'email', 254).toLowerCase(); const password = text(input.password, 'password', 128);
      const user = (await repo.all('users')).find(u => u.email === email);
      const valid = await verifyPassword(password, user?.passwordHash || `${'0'.repeat(32)}:${'0'.repeat(128)}`);
      if (!user || !valid) fail(401, 'INVALID_CREDENTIALS', '로그인 정보를 확인하세요.');
      return send(res, 200, { data: await issueSession(repo, user, config.ttl) });
    }
    if (path === '/api/auth/me' && method === 'GET') return send(res, 200, { data: publicUser((await auth()).user) });
    if (path === '/api/auth/logout' && method === 'POST') { const { session } = await auth(); await repo.delete('sessions', session.id); return send(res, 204); }
    if (path === '/api/posts' && method === 'GET') {
      const key = url.search; const hit = cache.get(key);
      res.setHeader('X-Cache', hit && hit.until > Date.now() ? 'HIT' : 'MISS');
      if (hit && hit.until > Date.now()) return send(res, 200, hit.value);
      const value = await listPosts(repo, url.searchParams);
      if (cache.size >= 100) cache.delete(cache.keys().next().value);
      cache.set(key, { value, until: Date.now() + 5000 }); return send(res, 200, value);
    }
    if (path === '/api/posts' && method === 'POST') {
      const { user } = await auth(); const fields = validatePost(await readJson(req)); const now = new Date().toISOString();
      const post = await repo.insert('posts', { ...fields, authorId: user.id, createdAt: now, updatedAt: now });
      changed(); res.setHeader('Location', `/api/posts/${post.id}`); return send(res, 201, { data: await postDto(repo, post) });
    }
    const postPath = path.match(/^\/api\/posts\/([^/]+)$/);
    if (postPath) {
      const id = numericId(postPath[1]); const post = await required('posts', id);
      if (method === 'GET') return send(res, 200, { data: await postDto(repo, post) });
      if (['PATCH', 'DELETE'].includes(method)) {
        const { user } = await auth(); owner(post, user);
        if (method === 'PATCH') {
          const updated = await repo.put('posts', { ...post, ...validatePost(await readJson(req), true), updatedAt: new Date().toISOString() });
          changed(); return send(res, 200, { data: await postDto(repo, updated) });
        }
        for (const comment of await repo.all('comments')) if (comment.postId === id) await repo.delete('comments', comment.id);
        await repo.delete('posts', id); changed(); return send(res, 204);
      }
    }
    const commentsPath = path.match(/^\/api\/posts\/([^/]+)\/comments$/);
    if (commentsPath) {
      const id = numericId(commentsPath[1]); await required('posts', id);
      const dto = async c => ({ id: c.id, body: c.body, createdAt: c.createdAt, author: { id: c.authorId, nickname: (await repo.get('users', c.authorId)).nickname } });
      if (method === 'GET') return send(res, 200, { data: await Promise.all((await repo.all('comments')).filter(c => c.postId === id).map(dto)) });
      if (method === 'POST') {
        const { user } = await auth(); const input = await readJson(req);
        const comment = await repo.insert('comments', { postId: id, authorId: user.id, body: text(input.body, 'body', 2000), createdAt: new Date().toISOString() });
        changed(); return send(res, 201, { data: await dto(comment) });
      }
    }
    const commentPath = path.match(/^\/api\/comments\/([^/]+)$/);
    if (commentPath && method === 'DELETE') {
      const { user } = await auth(); const comment = await required('comments', numericId(commentPath[1])); owner(comment, user);
      await repo.delete('comments', comment.id); changed(); return send(res, 204);
    }
    if (path === '/api/documents') {
      const { user } = await auth();
      if (method === 'GET') return send(res, 200, { data: (await repo.all('documents')).filter(d => d.userId === user.id).map(({ content, ...d }) => d) });
      if (method === 'POST') {
        const input = await readJson(req); const filename = text(input.filename, 'filename', 100);
        if (!/\.(txt|md)$/i.test(filename)) fail(400, 'VALIDATION_ERROR', 'UTF-8 TXT·MD 파일을 사용하세요.');
        const content = text(input.content, 'content', 200000);
        if (Buffer.byteLength(content) > 512000) fail(413, 'PAYLOAD_TOO_LARGE', '파일은 500KB 이하입니다.');
        return send(res, 201, { data: await repo.insert('documents', { filename, content, userId: user.id, createdAt: new Date().toISOString() }) });
      }
    }
    const documentPath = path.match(/^\/api\/documents\/([^/]+)(?:\/(questions|analyze))?$/);
    if (documentPath) {
      const { user } = await auth(); const document = await required('documents', numericId(documentPath[1]));
      if (document.userId !== user.id) fail(403, 'FORBIDDEN', '내 문서만 열 수 있습니다.');
      if (!documentPath[2] && method === 'GET') return send(res, 200, { data: document });
      if (documentPath[2] === 'questions' && method === 'GET') return send(res, 200, { data: (await repo.all('questions')).filter(q => q.documentId === document.id && q.userId === user.id) });
      if (documentPath[2] === 'analyze' && method === 'POST') return send(res, 202, { data: await repo.insert('jobs', { documentId: document.id, userId: user.id, state: 'queued', createdAt: new Date().toISOString() }) });
    }
    const jobPath = path.match(/^\/api\/jobs\/([^/]+)$/);
    if (jobPath && method === 'GET') {
      const { user } = await auth(); const job = await required('jobs', numericId(jobPath[1]));
      if (job.userId !== user.id) fail(403, 'FORBIDDEN', '내 작업만 조회할 수 있습니다.'); return send(res, 200, { data: job });
    }
    if (path === '/api/services/checkout' && method === 'POST') {
      const { user } = await auth(); limit(`checkout:${user.id}`, 5);
      const key = text(req.headers['idempotency-key'], 'idempotency-key', 100);
      return send(res, 200, { data: await checkout(config.services, user, key) });
    }
    if (path === '/api/services/mail' && method === 'POST') {
      const { user } = await auth(); limit(`mail:${user.id}`, 3); return send(res, 200, { data: await mail(config.services, user) });
    }
    if (path === '/api/oauth/start' && method === 'GET') {
      limit(`oauth:${req.socket.remoteAddress}`, 10); const result = await oauthStart(repo, config.services);
      res.setHeader('Set-Cookie', `oauth_state=${result.state}; HttpOnly; SameSite=Lax; Path=/api/oauth; Max-Age=300${config.production ? '; Secure' : ''}`);
      res.statusCode = 302; res.setHeader('Location', result.url); return res.end();
    }
    if (path === '/api/oauth/callback' && method === 'GET') {
      const state = url.searchParams.get('state') || ''; const cookie = req.headers.cookie?.split(';').map(c => c.trim()).find(c => c.startsWith('oauth_state='))?.slice(12);
      const saved = (await repo.all('oauthStates')).find(s => s.hash === digest(state) && s.expiresAt > Date.now());
      if (!cookie || cookie !== state || !saved) fail(400, 'BAD_REQUEST', 'OAuth state 검증 실패');
      await repo.delete('oauthStates', saved.id);
      const identity = await oauthIdentity(config.services, url.searchParams.get('code'));
      let user = (await repo.all('users')).find(u => u.githubId === String(identity.id));
      if (!user) user = await repo.insert('users', { email: `github-${identity.id}@oauth.invalid`, githubId: String(identity.id), nickname: String(identity.login).slice(0, 40), passwordHash: await hashPassword(randomBytes(32).toString('hex')) });
      const exchangeCode = randomBytes(32).toString('base64url');
      await repo.insert('oauthCodes', { hash: digest(exchangeCode), userId: user.id, expiresAt: Date.now() + 60000 });
      res.setHeader('Set-Cookie', 'oauth_state=; HttpOnly; SameSite=Lax; Path=/api/oauth; Max-Age=0');
      res.statusCode = 302; res.setHeader('Location', `${config.origin}/login?code=${exchangeCode}`); return res.end();
    }
    if (path === '/api/oauth/exchange' && method === 'POST') {
      const input = await readJson(req); const code = text(input.code, 'code', 100);
      const saved = (await repo.all('oauthCodes')).find(s => s.hash === digest(code) && s.expiresAt > Date.now());
      if (!saved) fail(401, 'UNAUTHORIZED', '일회용 코드가 만료되었습니다.');
      await repo.delete('oauthCodes', saved.id); return send(res, 200, { data: await issueSession(repo, await required('users', saved.userId), config.ttl) });
    }
    if (!path.startsWith('/api') && !path.startsWith('/health') && method === 'GET') {
      const root = resolve('dist'); let file;
      try { file = resolve(root, `.${decodeURIComponent(path)}`); } catch { fail(400, 'BAD_REQUEST', '잘못된 경로입니다.'); }
      if (file !== root && !file.startsWith(root + sep)) fail(404, 'NOT_FOUND', '없는 경로입니다.');
      let info; try { info = await stat(file); } catch {}
      if (!info?.isFile()) { if (extname(path)) fail(404, 'NOT_FOUND', '파일을 찾을 수 없습니다.'); file = resolve(root, 'index.html'); }
      try {
        const content = await readFile(file); res.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' })[extname(file)] || 'application/octet-stream');
        res.setHeader('Cache-Control', file.includes(`${sep}assets${sep}`) ? 'public,max-age=31536000,immutable' : 'no-cache'); res.end(content); return;
      } catch { fail(404, 'NOT_FOUND', 'npm run build 후 화면을 제공할 수 있습니다.'); }
    }
    fail(404, 'NOT_FOUND', '없는 경로입니다.');
  }
  const server = createServer(async (req, res) => {
    const id = requestId(req); const start = performance.now(); const url = new URL(req.url, 'http://localhost');
    res.setHeader('X-Request-Id', id); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'");
    res.on('finish', () => { if (!options.quiet) console.log(JSON.stringify({ requestId: id, method: req.method, path: url.pathname, status: res.statusCode, durationMs: Math.round(performance.now() - start) })); });
    try {
      const origin = req.headers.origin;
      if (origin && origin !== config.cors && origin !== config.origin) fail(403, 'FORBIDDEN', '허용되지 않은 Origin입니다.');
      if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
      res.setHeader('Access-Control-Expose-Headers', 'X-Request-Id, Location, X-Cache');
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Request-Id,Idempotency-Key'); return send(res, 204);
      }
      limit(`global:${req.socket.remoteAddress}`, 300);
      if (req.method === 'POST' && url.pathname === '/api/ai/chat/stream') {
        const { user } = await authenticate(repo, req.headers.authorization); limit(`ai:${user.id}`, 10);
        const input = await readJson(req); const document = await required('documents', numericId(String(input.documentId)));
        if (document.userId !== user.id) fail(403, 'FORBIDDEN', '내 문서만 사용할 수 있습니다.');
        return await streamAnswer({ req, res, repo, user, document, input, config });
      }
      // 스트림은 별도 처리하고, 그 밖의 요청은 데이터 변경과 조회를 일관되게 직렬화한다.
      await repo.serial(() => route(req, res, url));
    } catch (error) {
      if (!(error instanceof HttpError) && !options.quiet) console.error(JSON.stringify({ requestId: id, code: 'INTERNAL', type: error.name }));
      errorResponse(res, error, id);
    }
  });
  server.requestTimeout = 20000; server.headersTimeout = 10000;
  live = realtime(server, config.origin); const jobs = jobRunner(repo); await jobs.recover();
  return { server, repo, close: async () => { live.close(); await new Promise(resolve => { server.close(resolve); server.closeIdleConnections(); }); await jobs.stop(); await store.close(); } };
}
