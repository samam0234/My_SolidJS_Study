import { readFile } from 'node:fs/promises';
import { openStore } from '../server/store.mjs';
const buckets = ['users', 'sessions', 'posts', 'comments', 'documents', 'questions', 'usage', 'jobs', 'oauthStates', 'oauthCodes'];
if (!process.argv[2]) throw new Error('사용법: npm run restore -- backups/파일.json (빈 DB에만 복원)');
const backup = JSON.parse(await readFile(process.argv[2], 'utf8'));
if (backup.version !== 1 || buckets.some(b => !Array.isArray(backup.data?.[b]))) throw new Error('백업 형식이 다릅니다.');
const store = await openStore({ driver: process.env.DB_DRIVER, url: process.env.DATABASE_URL, path: process.env.SQLITE_PATH });
try {
  for (const bucket of buckets) if ((await store.all(bucket)).length) throw new Error('대상 DB가 비어 있지 않습니다. 새 DB 경로를 지정하세요.');
  for (const bucket of buckets.filter(b => !['sessions', 'oauthStates', 'oauthCodes'].includes(b)))
    for (const row of backup.data[bucket]) await store.put(bucket, row);
  console.log('복원 완료. 세션·일회용 코드는 복원하지 않았습니다.');
} finally { await store.close(); }
