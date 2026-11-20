import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { resolve } from 'node:path';
import { fixture } from './helpers.mjs';
test('MCP initialize·tools/list·tools/call 실제 stdio 왕복', async t => {
  const { base, request, account } = await fixture(t); const { accessToken: token } = await account();
  await request('/api/posts', { method: 'POST', token, body: { title: 'MCP 검색', body: '읽기 전용 검색' } });
  const client = new Client({ name: 'test', version: '1.0.0' });
  const transport = new StdioClientTransport({ command: process.execPath, args: [resolve('server/mcp-server.mjs')], env: { ...process.env, MCP_API_BASE: base } });
  t.after(() => client.close()); await client.connect(transport);
  assert.equal((await client.listTools()).tools[0].name, 'search_posts');
  const result = await client.callTool({ name: 'search_posts', arguments: { q: 'MCP', limit: 5 } });
  assert.equal(JSON.parse(result.content[0].text)[0].title, 'MCP 검색');
});
