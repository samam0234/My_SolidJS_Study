# study11 · SolidJS DB 교체와 ORM·ODM

> 기준: [SolidJS 노션 원문](https://app.notion.com/p/40bd7dec5e2e813080f8d54cf5968ad5) · [게시판 API v1](https://app.notion.com/p/3d6d7dec5e2e8139adbfd36dd506c65e) · 문서 기준일 2026-11-20 (Asia/Seoul).

## ① 목표 한 줄

Post API를 유지하면서 PostgreSQL·MariaDB·MongoDB 저장소를 교체한다.

## ② 📖 이론

DB 교체는 브라우저에서 드라이버를 바꾸는 작업이 아니다. 서버 환경 설정과 저장소 어댑터를 바꾸고 같은 API 테스트를 다시 통과시킨다. 전원 플러그 어댑터를 바꾸어도 기기 조작법이 유지되는 것과 같다.

native 어댑터는 pg·mariadb·mongodb 드라이버를 직접 사용한다. ORM 경로는 PostgreSQL/MariaDB에 Sequelize, MongoDB에 Mongoose ODM을 사용한다. ORM은 SQL 모델과 쿼리 생성을 돕고 ODM은 문서 스키마와 인덱스를 관리한다. 두 경로 모두 all/put/delete/close라는 저장소 계약을 구현한다.

PostgreSQL native payload는 JSONB와 $1 자리표시자, MariaDB는 LONGTEXT JSON과 ?·ON DUPLICATE KEY, MongoDB는 문서와 복합 unique 인덱스를 사용한다. SQL ORM의 orm_records는 native records와 별도 테이블이다. DB_ACCESS 변경이 기존 데이터를 자동 변환하지 않으므로 백업·복원 또는 명시적인 이관이 필요하다.

현재 학습 매퍼는 JSON 레코드 모델이며 관계형 최적화의 완성형은 아니다. 다중 프로세스로 늘리기 전 DB sequence·email unique·FK·트랜잭션·행 잠금·검색 인덱스를 도입해야 한다.

## ③ 🛠️ 실기 · 전체 코드와 줄별 설명

이 저장소는 완성 코드와 학습 노트를 함께 제공한다. 아래 파일을 지정 경로에서 읽고 실행한다. 이 단계에서 새로 다루는 파일은 생략 없이 수록하며, import되는 공통 파일은 README와 앞선 단계의 전체 코드를 따른다. 학습 진행 상황은 체크박스에 직접 기록한다.

1. 격리된 학습 DB를 compose profile로 실행한다. 호스트 기본 포트는 충돌을 줄이기 위해 PostgreSQL 15432, MariaDB 13306, MongoDB 27027이다.
2. .env의 DB_DRIVER와 DATABASE_URL을 아래 표처럼 설정한다. 값은 로컬 학습 기본 비밀번호이며 운영에서는 별도 비밀을 사용한다.

| DB_DRIVER | DATABASE_URL 예시 | DB_ACCESS=orm |
| --- | --- | --- |
| postgres | postgres://study:local-study-password@127.0.0.1:15432/study | Sequelize dialect=postgres, pg |
| mariadb | mariadb://study:local-study-password@127.0.0.1:13306/study | Sequelize dialect=mariadb, mariadb |
| mongodb | mongodb://study:local-study-password@127.0.0.1:27027/study?authSource=admin | Mongoose connection·Schema·unique index |

3. DB_ACCESS=native로 먼저 왕복한다. orm으로 바꾼 뒤 서버를 재시작하여 ORM 모델 생성·upsert·조회·삭제를 실행한다. 운영에서는 sync alter/force 대신 버전 마이그레이션을 사용한다.
4. 테스트 DB만 대상으로 db-matrix를 실행하면 각 DB의 native/orm 총 6개 계약을 확인한다. 외부 실제 DB를 사용하려면 TEST_POSTGRES_URL 등 환경변수로 별도 테스트 DB를 지정한다.
5. 데이터를 옮길 때 쓰기를 잠시 중지하고 npm run backup → 새 빈 DB에 npm run restore를 적용한다. 레코드 수·한글·authorId 연결·댓글 수를 확인한다. 세션은 복원하지 않는다.

실행 명령은 저장소 루트의 PowerShell 기준이다. 서버를 유지하는 명령 다음의 작업은 별도 터미널에서 실행한다.

```powershell
docker compose -p solidjs-study --profile postgres --profile mariadb --profile mongodb up -d postgres mariadb mongodb
node --test --test-concurrency=1 tests/db-matrix.mjs
# .env 변경 뒤 서버 재시작
npm start
```

### server/store.mjs 전체 코드

[server/store.mjs](server/store.mjs)

```javascript
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
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>import { DatabaseSync } from &#x27;node:sqlite&#x27;;</code> | node:sqlite에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 2 | <code>import { mkdirSync } from &#x27;node:fs&#x27;;</code> | node:fs에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 3 | <code>import { dirname } from &#x27;node:path&#x27;;</code> | node:path에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 4 | <code>(빈 줄)</code> | 빈 줄로 논리 단위를 구분한다. |
| 5 | <code>// 동일한 레코드 매퍼 계약: bucket + 숫자 id + JSON payload. 비밀은 API DTO에서 제거한다.</code> | 동일한 레코드 매퍼 계약: bucket + 숫자 id + JSON payload. 비밀은 API DTO에서 제거한다. |
| 6 | <code>export async function openStore({ driver = &#x27;sqlite&#x27;, url = &#x27;&#x27;, path = &#x27;data/study.sqlite&#x27; } = {}) {</code> | DB별 레코드 접근의 이름 있는 동작과 인자 범위를 정의한다. |
| 7 | <code>  if (process.env.DB_ACCESS === &#x27;orm&#x27; &amp;&amp; driver !== &#x27;sqlite&#x27;) {</code> | DB별 레코드 접근에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 8 | <code>    const { openOrmStore } = await import(&#x27;./orm-store.mjs&#x27;); return openOrmStore(driver, url);</code> | DB별 레코드 접근에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 9 | <code>  }</code> | DB별 레코드 접근의 현재 블록 또는 선언을 닫는다. |
| 10 | <code>  if (driver === &#x27;sqlite&#x27;) {</code> | DB별 레코드 접근에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 11 | <code>    if (path !== &#x27;:memory:&#x27;) mkdirSync(dirname(path), { recursive: true });</code> | DB별 레코드 접근에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 12 | <code>    const db = new DatabaseSync(path);</code> | DB별 레코드 접근에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 13 | <code>    db.exec(&#x27;PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS records(bucket TEXT NOT NULL,id INTEGER NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(bucket,id))&#x27;);</code> | DB별 레코드 접근: bucket·id의 중복을 DB 키로 차단한다. |
| 14 | <code>    return {</code> | DB별 레코드 접근의 현재 처리 결과를 호출자에게 돌려준다. |
| 15 | <code>      all: async bucket =&gt; db.prepare(&#x27;SELECT payload FROM records WHERE bucket=? ORDER BY id&#x27;).all(bucket).map(r =&gt; JSON.parse(r.payload)),</code> | DB별 레코드 접근: 문자열 JSON을 파싱한다. 미완성 프레임은 앞선 버퍼에서 보관한다. |
| 16 | <code>      put: async (bucket, row) =&gt; { db.prepare(&#x27;INSERT INTO records VALUES(?,?,?) ON CONFLICT(bucket,id) DO UPDATE SET payload=excluded.payload&#x27;).run(bucket, row.id, JSON.stringify(row)); return row; },</code> | DB별 레코드 접근: 객체를 네트워크·저장용 JSON 문자열로 직렬화한다. |
| 17 | <code>      delete: async (bucket, id) =&gt; { db.prepare(&#x27;DELETE FROM records WHERE bucket=? AND id=?&#x27;).run(bucket, id); },</code> | DB별 레코드 접근: 컨테이너 빌드 또는 실행 기준 이미지를 선택한다. |
| 18 | <code>      close: async () =&gt; db.close()</code> | DB별 레코드 접근의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 19 | <code>    };</code> | DB별 레코드 접근의 현재 블록 또는 선언을 닫는다. |
| 20 | <code>  }</code> | DB별 레코드 접근의 현재 블록 또는 선언을 닫는다. |
| 21 | <code>  if (driver === &#x27;postgres&#x27;) {</code> | DB별 레코드 접근에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 22 | <code>    const { default: pg } = await import(&#x27;pg&#x27;); const pool = new pg.Pool({ connectionString: url });</code> | DB별 레코드 접근에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 23 | <code>    await pool.query(&#x27;CREATE TABLE IF NOT EXISTS records(bucket TEXT NOT NULL,id BIGINT NOT NULL,payload JSONB NOT NULL,PRIMARY KEY(bucket,id))&#x27;);</code> | DB별 레코드 접근: bucket·id의 중복을 DB 키로 차단한다. |
| 24 | <code>    return {</code> | DB별 레코드 접근의 현재 처리 결과를 호출자에게 돌려준다. |
| 25 | <code>      all: async bucket =&gt; (await pool.query(&#x27;SELECT payload FROM records WHERE bucket=$1 ORDER BY id&#x27;, [bucket])).rows.map(r =&gt; r.payload),</code> | DB별 레코드 접근: DB 자리표시자와 매개변수를 사용해 쿼리를 실행한다. |
| 26 | <code>      put: async (bucket, row) =&gt; { await pool.query(&#x27;INSERT INTO records VALUES($1,$2,$3) ON CONFLICT(bucket,id) DO UPDATE SET payload=EXCLUDED.payload&#x27;, [bucket, row.id, JSON.stringify(row)]); return row; },</code> | DB별 레코드 접근: 객체를 네트워크·저장용 JSON 문자열로 직렬화한다. |
| 27 | <code>      delete: async (bucket, id) =&gt; { await pool.query(&#x27;DELETE FROM records WHERE bucket=$1 AND id=$2&#x27;, [bucket, id]); },</code> | DB별 레코드 접근: DB 자리표시자와 매개변수를 사용해 쿼리를 실행한다. |
| 28 | <code>      close: () =&gt; pool.end()</code> | DB별 레코드 접근의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 29 | <code>    };</code> | DB별 레코드 접근의 현재 블록 또는 선언을 닫는다. |
| 30 | <code>  }</code> | DB별 레코드 접근의 현재 블록 또는 선언을 닫는다. |
| 31 | <code>  if (driver === &#x27;mariadb&#x27;) {</code> | DB별 레코드 접근에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 32 | <code>    const { default: mariadb } = await import(&#x27;mariadb&#x27;); const address = new URL(url);</code> | DB별 레코드 접근: 고정 base에 경로·쿼리를 연결하거나 URL 부분을 안전하게 해석한다. |
| 33 | <code>    const pool = mariadb.createPool({ host: address.hostname, port: Number(address.port &#124;&#124; 3306), user: decodeURIComponent(address.username), password: decodeURIComponent(address.password), database: address.pathname.slice(1), connectionLimit: 5 });</code> | DB별 레코드 접근에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 34 | <code>    await pool.query(&#x27;CREATE TABLE IF NOT EXISTS records(bucket VARCHAR(100) NOT NULL,id BIGINT NOT NULL,payload LONGTEXT NOT NULL,PRIMARY KEY(bucket,id))&#x27;);</code> | DB별 레코드 접근: bucket·id의 중복을 DB 키로 차단한다. |
| 35 | <code>    return {</code> | DB별 레코드 접근의 현재 처리 결과를 호출자에게 돌려준다. |
| 36 | <code>      all: async bucket =&gt; (await pool.query(&#x27;SELECT payload FROM records WHERE bucket=? ORDER BY id&#x27;, [bucket])).map(r =&gt; JSON.parse(r.payload)),</code> | DB별 레코드 접근: 문자열 JSON을 파싱한다. 미완성 프레임은 앞선 버퍼에서 보관한다. |
| 37 | <code>      put: async (bucket, row) =&gt; { await pool.query(&#x27;INSERT INTO records VALUES(?,?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload)&#x27;, [bucket, row.id, JSON.stringify(row)]); return row; },</code> | DB별 레코드 접근: 객체를 네트워크·저장용 JSON 문자열로 직렬화한다. |
| 38 | <code>      delete: async (bucket, id) =&gt; { await pool.query(&#x27;DELETE FROM records WHERE bucket=? AND id=?&#x27;, [bucket, id]); },</code> | DB별 레코드 접근: DB 자리표시자와 매개변수를 사용해 쿼리를 실행한다. |
| 39 | <code>      close: () =&gt; pool.end()</code> | DB별 레코드 접근의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 40 | <code>    };</code> | DB별 레코드 접근의 현재 블록 또는 선언을 닫는다. |
| 41 | <code>  }</code> | DB별 레코드 접근의 현재 블록 또는 선언을 닫는다. |
| 42 | <code>  if (driver === &#x27;mongodb&#x27;) {</code> | DB별 레코드 접근에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 43 | <code>    const { MongoClient } = await import(&#x27;mongodb&#x27;); const client = new MongoClient(url); await client.connect();</code> | DB별 레코드 접근: MCP 프로세스와 연결해 초기 프로토콜 교환을 수행한다. |
| 44 | <code>    const collection = client.db().collection(&#x27;records&#x27;); await collection.createIndex({ bucket: 1, id: 1 }, { unique: true });</code> | DB별 레코드 접근: MongoDB의 bucket·id 복합 고유 인덱스를 보장한다. |
| 45 | <code>    return {</code> | DB별 레코드 접근의 현재 처리 결과를 호출자에게 돌려준다. |
| 46 | <code>      all: async bucket =&gt; (await collection.find({ bucket }).sort({ id: 1 }).toArray()).map(r =&gt; r.payload),</code> | DB별 레코드 접근의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 47 | <code>      put: async (bucket, row) =&gt; { await collection.updateOne({ bucket, id: row.id }, { $set: { payload: row } }, { upsert: true }); return row; },</code> | DB별 레코드 접근: 키가 있으면 갱신하고 없으면 삽입한다. |
| 48 | <code>      delete: async (bucket, id) =&gt; { await collection.deleteOne({ bucket, id }); },</code> | DB별 레코드 접근의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 49 | <code>      close: () =&gt; client.close()</code> | DB별 레코드 접근: MCP 연결과 자식 프로세스의 수명을 종료한다. |
| 50 | <code>    };</code> | DB별 레코드 접근의 현재 블록 또는 선언을 닫는다. |
| 51 | <code>  }</code> | DB별 레코드 접근의 현재 블록 또는 선언을 닫는다. |
| 52 | <code>  throw new Error(&#x27;DB_DRIVER는 sqlite, postgres, mariadb, mongodb 중 하나입니다.&#x27;);</code> | DB별 레코드 접근의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 53 | <code>}</code> | DB별 레코드 접근의 현재 블록 또는 선언을 닫는다. |
| 54 | <code>(빈 줄)</code> | 빈 줄로 논리 단위를 구분한다. |
| 55 | <code>// 단일 프로세스 실습에서 쓰기를 직렬화하여 ID·이메일·한도 경쟁을 막는다.</code> | 단일 프로세스 실습에서 쓰기를 직렬화하여 ID·이메일·한도 경쟁을 막는다. |
| 56 | <code>export function repository(store) {</code> | DB별 레코드 접근의 이름 있는 동작과 인자 범위를 정의한다. |
| 57 | <code>  let tail = Promise.resolve();</code> | DB별 레코드 접근에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 58 | <code>  const serial = work =&gt; { const next = tail.then(work); tail = next.catch(() =&gt; {}); return next; };</code> | DB별 레코드 접근에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 59 | <code>  return {</code> | DB별 레코드 접근의 현재 처리 결과를 호출자에게 돌려준다. |
| 60 | <code>    ...store, serial,</code> | DB별 레코드 접근의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 61 | <code>    get: async (bucket, id) =&gt; (await store.all(bucket)).find(r =&gt; r.id === id),</code> | DB별 레코드 접근의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 62 | <code>    insert: async (bucket, values) =&gt; {</code> | DB별 레코드 접근의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 63 | <code>      const rows = await store.all(bucket);</code> | DB별 레코드 접근에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 64 | <code>      return store.put(bucket, { ...values, id: Math.max(0, ...rows.map(r =&gt; r.id)) + 1 });</code> | DB별 레코드 접근의 현재 처리 결과를 호출자에게 돌려준다. |
| 65 | <code>    }</code> | DB별 레코드 접근의 현재 블록 또는 선언을 닫는다. |
| 66 | <code>  };</code> | DB별 레코드 접근의 현재 블록 또는 선언을 닫는다. |
| 67 | <code>}</code> | DB별 레코드 접근의 현재 블록 또는 선언을 닫는다. |

### server/orm-store.mjs 전체 코드

[server/orm-store.mjs](server/orm-store.mjs)

```javascript
// DB_ACCESS=orm일 때 사용하는 실제 ORM/ODM 어댑터. SQLite 기본 실습은 node:sqlite이다.
export async function openOrmStore(driver, url) {
  if (driver === 'mongodb') {
    const { default: mongoose } = await import('mongoose');
    const connection = await mongoose.createConnection(url, { serverSelectionTimeoutMS: 5000 }).asPromise();
    const schema = new mongoose.Schema({ bucket: { type: String, required: true }, id: { type: Number, required: true }, payload: { type: mongoose.Schema.Types.Mixed, required: true } }, { versionKey: false, collection: 'records' });
    schema.index({ bucket: 1, id: 1 }, { unique: true });
    const Record = connection.model('StudyRecord', schema); await Record.init();
    return {
      all: async bucket => (await Record.find({ bucket }).sort({ id: 1 }).lean()).map(r => r.payload),
      put: async (bucket, row) => { await Record.updateOne({ bucket, id: row.id }, { $set: { payload: row } }, { upsert: true, runValidators: true }); return row; },
      delete: async (bucket, id) => { await Record.deleteOne({ bucket, id }); },
      close: () => connection.close()
    };
  }
  if (!['postgres', 'mariadb'].includes(driver)) throw new Error('ORM은 postgres, mariadb, mongodb를 지원합니다.');
  const { Sequelize, DataTypes } = await import('sequelize');
  const db = new Sequelize(url, { dialect: driver, logging: false, pool: { max: 5, min: 0 }, define: { timestamps: false } });
  const Record = db.define('Record', {
    bucket: { type: DataTypes.STRING(100), primaryKey: true }, id: { type: DataTypes.BIGINT, primaryKey: true },
    payload: { type: driver === 'mariadb' ? DataTypes.TEXT('long') : DataTypes.TEXT, allowNull: false }
  }, { tableName: 'orm_records', freezeTableName: true });
  // sync는 새 학습 DB 생성에만 사용한다. 운영 스키마 변경은 마이그레이션으로 관리한다.
  await db.authenticate(); await Record.sync();
  return {
    all: async bucket => (await Record.findAll({ where: { bucket }, order: [['id', 'ASC']], raw: true })).map(r => JSON.parse(r.payload)),
    put: async (bucket, row) => { await Record.upsert({ bucket, id: row.id, payload: JSON.stringify(row) }); return row; },
    delete: async (bucket, id) => { await Record.destroy({ where: { bucket, id } }); },
    close: () => db.close()
  };
}
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>// DB_ACCESS=orm일 때 사용하는 실제 ORM/ODM 어댑터. SQLite 기본 실습은 node:sqlite이다.</code> | DB_ACCESS=orm일 때 사용하는 실제 ORM/ODM 어댑터. SQLite 기본 실습은 node:sqlite이다. |
| 2 | <code>export async function openOrmStore(driver, url) {</code> | ORM·ODM 모델과 저장소 계약의 이름 있는 동작과 인자 범위를 정의한다. |
| 3 | <code>  if (driver === &#x27;mongodb&#x27;) {</code> | ORM·ODM 모델과 저장소 계약에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 4 | <code>    const { default: mongoose } = await import(&#x27;mongoose&#x27;);</code> | ORM·ODM 모델과 저장소 계약에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 5 | <code>    const connection = await mongoose.createConnection(url, { serverSelectionTimeoutMS: 5000 }).asPromise();</code> | ORM·ODM 모델과 저장소 계약에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 6 | <code>    const schema = new mongoose.Schema({ bucket: { type: String, required: true }, id: { type: Number, required: true }, payload: { type: mongoose.Schema.Types.Mixed, required: true } }, { versionKey: false, collection: &#x27;records&#x27; });</code> | ORM·ODM 모델과 저장소 계약에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 7 | <code>    schema.index({ bucket: 1, id: 1 }, { unique: true });</code> | ORM·ODM 모델과 저장소 계약의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 8 | <code>    const Record = connection.model(&#x27;StudyRecord&#x27;, schema); await Record.init();</code> | ORM·ODM 모델과 저장소 계약에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 9 | <code>    return {</code> | ORM·ODM 모델과 저장소 계약의 현재 처리 결과를 호출자에게 돌려준다. |
| 10 | <code>      all: async bucket =&gt; (await Record.find({ bucket }).sort({ id: 1 }).lean()).map(r =&gt; r.payload),</code> | ORM·ODM 모델과 저장소 계약의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 11 | <code>      put: async (bucket, row) =&gt; { await Record.updateOne({ bucket, id: row.id }, { $set: { payload: row } }, { upsert: true, runValidators: true }); return row; },</code> | ORM·ODM 모델과 저장소 계약: 키가 있으면 갱신하고 없으면 삽입한다. |
| 12 | <code>      delete: async (bucket, id) =&gt; { await Record.deleteOne({ bucket, id }); },</code> | ORM·ODM 모델과 저장소 계약의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 13 | <code>      close: () =&gt; connection.close()</code> | ORM·ODM 모델과 저장소 계약의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 14 | <code>    };</code> | ORM·ODM 모델과 저장소 계약의 현재 블록 또는 선언을 닫는다. |
| 15 | <code>  }</code> | ORM·ODM 모델과 저장소 계약의 현재 블록 또는 선언을 닫는다. |
| 16 | <code>  if (![&#x27;postgres&#x27;, &#x27;mariadb&#x27;].includes(driver)) throw new Error(&#x27;ORM은 postgres, mariadb, mongodb를 지원합니다.&#x27;);</code> | ORM·ODM 모델과 저장소 계약에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 17 | <code>  const { Sequelize, DataTypes } = await import(&#x27;sequelize&#x27;);</code> | ORM·ODM 모델과 저장소 계약에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 18 | <code>  const db = new Sequelize(url, { dialect: driver, logging: false, pool: { max: 5, min: 0 }, define: { timestamps: false } });</code> | ORM·ODM 모델과 저장소 계약에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 19 | <code>  const Record = db.define(&#x27;Record&#x27;, {</code> | ORM·ODM 모델과 저장소 계약에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 20 | <code>    bucket: { type: DataTypes.STRING(100), primaryKey: true }, id: { type: DataTypes.BIGINT, primaryKey: true },</code> | ORM·ODM 모델과 저장소 계약의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 21 | <code>    payload: { type: driver === &#x27;mariadb&#x27; ? DataTypes.TEXT(&#x27;long&#x27;) : DataTypes.TEXT, allowNull: false }</code> | ORM·ODM 모델과 저장소 계약의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 22 | <code>  }, { tableName: &#x27;orm_records&#x27;, freezeTableName: true });</code> | ORM·ODM 모델과 저장소 계약의 현재 구문·화면·설정 블록을 닫거나 다음 분기로 연결한다. |
| 23 | <code>  // sync는 새 학습 DB 생성에만 사용한다. 운영 스키마 변경은 마이그레이션으로 관리한다.</code> | sync는 새 학습 DB 생성에만 사용한다. 운영 스키마 변경은 마이그레이션으로 관리한다. |
| 24 | <code>  await db.authenticate(); await Record.sync();</code> | ORM·ODM 모델과 저장소 계약: Bearer 세션 해시·만료·사용자를 서버에서 확인한다. |
| 25 | <code>  return {</code> | ORM·ODM 모델과 저장소 계약의 현재 처리 결과를 호출자에게 돌려준다. |
| 26 | <code>    all: async bucket =&gt; (await Record.findAll({ where: { bucket }, order: [[&#x27;id&#x27;, &#x27;ASC&#x27;]], raw: true })).map(r =&gt; JSON.parse(r.payload)),</code> | ORM·ODM 모델과 저장소 계약: 문자열 JSON을 파싱한다. 미완성 프레임은 앞선 버퍼에서 보관한다. |
| 27 | <code>    put: async (bucket, row) =&gt; { await Record.upsert({ bucket, id: row.id, payload: JSON.stringify(row) }); return row; },</code> | ORM·ODM 모델과 저장소 계약: 객체를 네트워크·저장용 JSON 문자열로 직렬화한다. |
| 28 | <code>    delete: async (bucket, id) =&gt; { await Record.destroy({ where: { bucket, id } }); },</code> | ORM·ODM 모델과 저장소 계약의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 29 | <code>    close: () =&gt; db.close()</code> | ORM·ODM 모델과 저장소 계약의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 30 | <code>  };</code> | ORM·ODM 모델과 저장소 계약의 현재 블록 또는 선언을 닫는다. |
| 31 | <code>}</code> | ORM·ODM 모델과 저장소 계약의 현재 블록 또는 선언을 닫는다. |

### tests/db-matrix.mjs 전체 코드

[tests/db-matrix.mjs](tests/db-matrix.mjs)

```javascript
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
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>import test from &#x27;node:test&#x27;;</code> | node:test에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 2 | <code>import assert from &#x27;node:assert/strict&#x27;;</code> | node:assert/strict에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 3 | <code>import { openStore } from &#x27;../server/store.mjs&#x27;;</code> | ../server/store.mjs에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 4 | <code>import { openOrmStore } from &#x27;../server/orm-store.mjs&#x27;;</code> | ../server/orm-store.mjs에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 5 | <code>import { createApp, environment } from &#x27;../server/app.mjs&#x27;;</code> | ../server/app.mjs에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 6 | <code>const urls = {</code> | db-matrix.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 7 | <code>  postgres: process.env.TEST_POSTGRES_URL &#124;&#124; &#x27;postgres://study:local-study-password@127.0.0.1:15432/study&#x27;,</code> | db-matrix.mjs의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 8 | <code>  mariadb: process.env.TEST_MARIADB_URL &#124;&#124; &#x27;mariadb://study:local-study-password@127.0.0.1:13306/study&#x27;,</code> | db-matrix.mjs의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 9 | <code>  mongodb: process.env.TEST_MONGODB_URL &#124;&#124; &#x27;mongodb://study:local-study-password@127.0.0.1:27027/study?authSource=admin&#x27;</code> | db-matrix.mjs의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 10 | <code>};</code> | db-matrix.mjs의 현재 블록 또는 선언을 닫는다. |
| 11 | <code>for (const driver of Object.keys(urls)) for (const access of [&#x27;native&#x27;, &#x27;orm&#x27;]) {</code> | db-matrix.mjs의 각 항목·프레임·작업을 순서대로 처리한다. |
| 12 | <code>  test(`${driver}/${access}: 실제 DB 위 회원가입·로그인·CRUD`, async t =&gt; {</code> | db-matrix.mjs: 독립적인 검증 시나리오와 비동기 정리 범위를 정의한다. |
| 13 | <code>    const store = access === &#x27;orm&#x27; ? await openOrmStore(driver, urls[driver]) : await openStore({ driver, url: urls[driver] });</code> | db-matrix.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 14 | <code>    const app = await createApp({ store, config: environment({}), quiet: true });</code> | db-matrix.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 15 | <code>    await new Promise(r =&gt; app.server.listen(0, &#x27;127.0.0.1&#x27;, r)); t.after(() =&gt; app.close());</code> | db-matrix.mjs: 테스트 종료 시 서버·DB·MCP 연결을 정리한다. |
| 16 | <code>    const base = `http://127.0.0.1:${app.server.address().port}`; let token;</code> | db-matrix.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 17 | <code>    async function call(path, method = &#x27;GET&#x27;, data) {</code> | db-matrix.mjs의 이름 있는 동작과 인자 범위를 정의한다. |
| 18 | <code>      const response = await fetch(base + path, { method, headers: { &#x27;Content-Type&#x27;: &#x27;application/json&#x27;, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) });</code> | db-matrix.mjs: 명시한 URL·method·header·body로 HTTP 요청을 보낸다. |
| 19 | <code>      return { status: response.status, value: response.status === 204 ? null : await response.json() };</code> | db-matrix.mjs: 본문이 없는 성공 응답에서 JSON 파싱을 생략한다. |
| 20 | <code>    }</code> | db-matrix.mjs의 현재 블록 또는 선언을 닫는다. |
| 21 | <code>    const input = { email: `matrix-${driver}-${access}-${Date.now()}@example.com`, password: &#x27;password123&#x27;, nickname: &#x27;matrix&#x27; };</code> | db-matrix.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 22 | <code>    assert.equal((await call(&#x27;/api/auth/signup&#x27;, &#x27;POST&#x27;, input)).status, 201);</code> | db-matrix.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 23 | <code>    token = (await call(&#x27;/api/auth/login&#x27;, &#x27;POST&#x27;, input)).value.data.accessToken;</code> | db-matrix.mjs의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 24 | <code>    const created = await call(&#x27;/api/posts&#x27;, &#x27;POST&#x27;, { title: &#x27;DB 왕복&#x27;, body: &#x27;한글 보존&#x27;, tags: [&#x27;db&#x27;] }); assert.equal(created.status, 201);</code> | db-matrix.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 25 | <code>    const path = `/api/posts/${created.value.data.id}`;</code> | db-matrix.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 26 | <code>    assert.equal((await call(path)).value.data.body, &#x27;한글 보존&#x27;);</code> | db-matrix.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 27 | <code>    assert.equal((await call(path, &#x27;PATCH&#x27;, { title: &#x27;수정&#x27; })).value.data.title, &#x27;수정&#x27;);</code> | db-matrix.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 28 | <code>    assert.equal((await call(path, &#x27;DELETE&#x27;)).status, 204); assert.equal((await call(path)).status, 404);</code> | db-matrix.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 29 | <code>  });</code> | db-matrix.mjs의 현재 블록 또는 선언을 닫는다. |
| 30 | <code>}</code> | db-matrix.mjs의 현재 블록 또는 선언을 닫는다. |

## ④ 🔗 연동 포인트

프론트 PostCard와 PostForm은 DB 종류를 모른다. 연결 정보는 서버 전용이고 Docker 내부에서는 127.0.0.1 대신 postgres:5432, mariadb:3306, mongodb:27017 같은 서비스 이름을 사용한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| ECONNREFUSED | DB 준비 전 접속·잘못된 포트 | health·서비스 로그·호스트 포트 확인 |
| 인증 실패 | URL 비밀번호 특수문자·authSource | URL 인코딩과 Mongo authSource=admin 확인 |
| ORM 전환 뒤 빈 목록 | 별도 테이블 사용 | 백업·빈 DB 복원으로 명시적 이관 |

## ⑥ 직접 해보기

1. 같은 게시글 API 요청을 DB 3종에서 실행한다.
2. native에서 ORM으로 이관해 레코드 수와 관계를 확인한다.
3. 운영용 정규화 Post 테이블과 authorId 인덱스를 설계한다.

## ⑦ ☐ 체크리스트

- [ ] MariaDB·PostgreSQL·MongoDB 연결 설정을 분리했다.
- [ ] ORM·ODM 모델·키·인덱스·드라이버 차이를 설명했다.
- [ ] 6가지 실제 DB 접근 경로의 계약을 검증했다.

## ⑧ 다음 단계 연결 문장

Post API를 유지하면서 PostgreSQL·MariaDB·MongoDB 저장소를 교체한다를 마쳤다면 [study12.md](study12.md)에서 이어 간다.

공식 자료: [SolidJS 1.x 소스](https://github.com/solidjs/solid/tree/v1.9.20), [Solid Router](https://docs.solidjs.com/solid-router/getting-started/installation-and-setup), [Node SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html). 최신 문서와 설치 버전이 다를 수 있어 package-lock.json을 실행 기준으로 삼는다.
