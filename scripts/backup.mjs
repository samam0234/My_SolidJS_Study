import { openStore } from '../server/store.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
export const buckets = ['users', 'sessions', 'posts', 'comments', 'documents', 'questions', 'usage', 'jobs', 'oauthStates', 'oauthCodes'];
const store = await openStore({ driver: process.env.DB_DRIVER, url: process.env.DATABASE_URL, path: process.env.SQLITE_PATH });
try {
  const data = {};
  for (const bucket of buckets) data[bucket] = await store.all(bucket);
  await mkdir('backups', { recursive: true });
  const filename = `backups/study-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  await writeFile(filename, JSON.stringify({ version: 1, createdAt: new Date().toISOString(), data }, null, 2), { mode: 0o600 });
  console.log(filename);
} finally { await store.close(); }
