import test from 'node:test';
import assert from 'node:assert/strict';
import { openStore } from '../server/store.mjs';
import { openOrmStore } from '../server/orm-store.mjs';
import { createApp, environment } from '../server/app.mjs';
const urls = {
  postgres: process.env.TEST_POSTGRES_URL || 'postgres://study:local-study-password@127.0.0.1:15432/study',
  mariadb: process.env.TEST_MARIADB_URL || 'mariadb://study:local-study-password@127.0.0.1:13306/study',
  mongodb: process.env.TEST_MONGODB_URL || 'mongodb://study:local-study-password@127.0.0.1:27027/study?authSource=admin'
};
for (const driver of Object.keys(urls)) for (const access of ['native', 'orm']) {
  test(`${driver}/${access}: 실제 DB 위 회원가입·로그인·CRUD`, async t => {
    const store = access === 'orm' ? await openOrmStore(driver, urls[driver]) : await openStore({ driver, url: urls[driver] });
    const app = await createApp({ store, config: environment({}), quiet: true });
    await new Promise(r => app.server.listen(0, '127.0.0.1', r)); t.after(() => app.close());
    const base = `http://127.0.0.1:${app.server.address().port}`; let token;
    async function call(path, method = 'GET', data) {
      const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) });
      return { status: response.status, value: response.status === 204 ? null : await response.json() };
    }
    const input = { email: `matrix-${driver}-${access}-${Date.now()}@example.com`, password: 'password123', nickname: 'matrix' };
    assert.equal((await call('/api/auth/signup', 'POST', input)).status, 201);
    token = (await call('/api/auth/login', 'POST', input)).value.data.accessToken;
    const created = await call('/api/posts', 'POST', { title: 'DB 왕복', body: '한글 보존', tags: ['db'] }); assert.equal(created.status, 201);
    const path = `/api/posts/${created.value.data.id}`;
    assert.equal((await call(path)).value.data.body, '한글 보존');
    assert.equal((await call(path, 'PATCH', { title: '수정' })).value.data.title, '수정');
    assert.equal((await call(path, 'DELETE')).status, 204); assert.equal((await call(path)).status, 404);
  });
}
