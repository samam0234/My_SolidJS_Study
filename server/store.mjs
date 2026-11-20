import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// 동일한 레코드 매퍼 계약: bucket + 숫자 id + JSON payload. 비밀은 API DTO에서 제거한다.
export async function openStore({ driver = 'sqlite', url = '', path = 'data/study.sqlite' } = {}) {
  if (process.env.DB_ACCESS === 'orm' && driver !== 'sqlite') {
    const { openOrmStore } = await import('./orm-store.mjs'); return openOrmStore(driver, url);
  }
  if (driver === 'sqlite') {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    const db = new DatabaseSync(path);
    db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS records(bucket TEXT NOT NULL,id INTEGER NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(bucket,id))');
    return {
      all: async bucket => db.prepare('SELECT payload FROM records WHERE bucket=? ORDER BY id').all(bucket).map(r => JSON.parse(r.payload)),
      put: async (bucket, row) => { db.prepare('INSERT INTO records VALUES(?,?,?) ON CONFLICT(bucket,id) DO UPDATE SET payload=excluded.payload').run(bucket, row.id, JSON.stringify(row)); return row; },
      delete: async (bucket, id) => { db.prepare('DELETE FROM records WHERE bucket=? AND id=?').run(bucket, id); },
      close: async () => db.close()
    };
  }
  if (driver === 'postgres') {
    const { default: pg } = await import('pg'); const pool = new pg.Pool({ connectionString: url });
    await pool.query('CREATE TABLE IF NOT EXISTS records(bucket TEXT NOT NULL,id BIGINT NOT NULL,payload JSONB NOT NULL,PRIMARY KEY(bucket,id))');
    return {
      all: async bucket => (await pool.query('SELECT payload FROM records WHERE bucket=$1 ORDER BY id', [bucket])).rows.map(r => r.payload),
      put: async (bucket, row) => { await pool.query('INSERT INTO records VALUES($1,$2,$3) ON CONFLICT(bucket,id) DO UPDATE SET payload=EXCLUDED.payload', [bucket, row.id, JSON.stringify(row)]); return row; },
      delete: async (bucket, id) => { await pool.query('DELETE FROM records WHERE bucket=$1 AND id=$2', [bucket, id]); },
      close: () => pool.end()
    };
  }
  if (driver === 'mariadb') {
    const { default: mariadb } = await import('mariadb'); const address = new URL(url);
    const pool = mariadb.createPool({ host: address.hostname, port: Number(address.port || 3306), user: decodeURIComponent(address.username), password: decodeURIComponent(address.password), database: address.pathname.slice(1), connectionLimit: 5 });
    await pool.query('CREATE TABLE IF NOT EXISTS records(bucket VARCHAR(100) NOT NULL,id BIGINT NOT NULL,payload LONGTEXT NOT NULL,PRIMARY KEY(bucket,id))');
    return {
      all: async bucket => (await pool.query('SELECT payload FROM records WHERE bucket=? ORDER BY id', [bucket])).map(r => JSON.parse(r.payload)),
      put: async (bucket, row) => { await pool.query('INSERT INTO records VALUES(?,?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload)', [bucket, row.id, JSON.stringify(row)]); return row; },
      delete: async (bucket, id) => { await pool.query('DELETE FROM records WHERE bucket=? AND id=?', [bucket, id]); },
      close: () => pool.end()
    };
  }
  if (driver === 'mongodb') {
    const { MongoClient } = await import('mongodb'); const client = new MongoClient(url); await client.connect();
    const collection = client.db().collection('records'); await collection.createIndex({ bucket: 1, id: 1 }, { unique: true });
    return {
      all: async bucket => (await collection.find({ bucket }).sort({ id: 1 }).toArray()).map(r => r.payload),
      put: async (bucket, row) => { await collection.updateOne({ bucket, id: row.id }, { $set: { payload: row } }, { upsert: true }); return row; },
      delete: async (bucket, id) => { await collection.deleteOne({ bucket, id }); },
      close: () => client.close()
    };
  }
  throw new Error('DB_DRIVER는 sqlite, postgres, mariadb, mongodb 중 하나입니다.');
}

// 단일 프로세스 실습에서 쓰기를 직렬화하여 ID·이메일·한도 경쟁을 막는다.
export function repository(store) {
  let tail = Promise.resolve();
  const serial = work => { const next = tail.then(work); tail = next.catch(() => {}); return next; };
  return {
    ...store, serial,
    get: async (bucket, id) => (await store.all(bucket)).find(r => r.id === id),
    insert: async (bucket, values) => {
      const rows = await store.all(bucket);
      return store.put(bucket, { ...values, id: Math.max(0, ...rows.map(r => r.id)) + 1 });
    }
  };
}
