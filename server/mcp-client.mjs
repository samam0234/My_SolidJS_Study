import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';
const client = new Client({ name: 'solid-study-client', version: '1.0.0' });
const transport = new StdioClientTransport({
  command: process.execPath, args: [fileURLToPath(new URL('./mcp-server.mjs', import.meta.url))],
  env: { ...process.env, MCP_API_BASE: process.env.MCP_API_BASE || 'http://127.0.0.1:3000' }
});
try {
  await client.connect(transport);
  console.log(JSON.stringify(await client.listTools(), null, 2));
  console.log(JSON.stringify(await client.callTool({ name: 'search_posts', arguments: { q: process.argv[2] || '', limit: 5 } }), null, 2));
} finally { await client.close(); }
