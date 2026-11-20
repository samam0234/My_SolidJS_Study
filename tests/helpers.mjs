import { createApp, environment } from '../server/app.mjs';
import { openStore } from '../server/store.mjs';
export async function fixture(t, override = {}) {
  const config = { ...environment({ AI_PROVIDER: 'mock', INTEGRATIONS_MODE: 'mock' }), ...override };
  const app = await createApp({ store: await openStore({ path: ':memory:' }), config, quiet: true });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  t.after(() => app.close());
  async function request(path, { token, method = 'GET', body, headers = {} } = {}) {
    const response = await fetch(base + path, { method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, ...(body !== undefined ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}) });
    const value = response.status === 204 ? undefined : await response.json();
    return { status: response.status, headers: response.headers, value };
  }
  async function account(label = 'mina') {
    const input = { email: `${label}@example.com`, nickname: label, password: 'password123' };
    await request('/api/auth/signup', { method: 'POST', body: input });
    return (await request('/api/auth/login', { method: 'POST', body: input })).value.data;
  }
  return { ...app, base, config, request, account };
}
