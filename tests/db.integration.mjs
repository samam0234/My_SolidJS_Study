import test from 'node:test';
import assert from 'node:assert/strict';
import { openStore } from '../server/store.mjs';
for (const driver of ['postgres', 'mariadb', 'mongodb']) {
  test(`${driver} 실제 DB 레코드 왕복`, { skip: process.env.DB_DRIVER !== driver || !process.env.DATABASE_URL }, async () => {
    const store = await openStore({ driver, url: process.env.DATABASE_URL }); const bucket = `test-${Date.now()}`;
    try { await store.put(bucket, { id: 1, title: '한글' }); assert.deepEqual(await store.all(bucket), [{ id: 1, title: '한글' }]); await store.delete(bucket, 1); assert.deepEqual(await store.all(bucket), []); }
    finally { await store.delete(bucket, 1); await store.close(); }
  });
}
