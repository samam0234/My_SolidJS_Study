# study6 · SolidJS DB·API CRUD

> 기준: [SolidJS 노션 원문](https://app.notion.com/p/40bd7dec5e2e813080f8d54cf5968ad5) · [게시판 API v1](https://app.notion.com/p/3d6d7dec5e2e8139adbfd36dd506c65e) · 문서 기준일 2026-11-20 (Asia/Seoul).

## ① 목표 한 줄

공통 게시판 API v1을 SQLite 저장소와 연결한다.

## ② 📖 이론

SolidJS 브라우저 코드는 DB 비밀번호를 가질 수 없다. 화면은 API 계약만 알고 서버가 저장소를 호출한다. 이 저장소의 서버는 Node 표준 http와 sqlite 모듈을 사용한다. 다른 웹 프레임워크를 추가하지 않는다.

모델은 User, Post, Comment다. Post의 title/body/tags와 authorId를 저장하고 API 직렬화에서 author와 commentCount를 만든다. DTO는 저장 모델에서 공개 필드만 골라 보내는 포장 상자다. 시간은 ISO 8601 UTC, 필드명은 camelCase다.

학습용 records 테이블은 bucket,id,payload 복합 키를 갖는다. JSON payload 안에 모델을 보관하여 DB 교체를 단순화했다. 실제 대용량 서비스에서는 posts/users/comments를 독립 테이블로 정규화하고 FK·unique·인덱스·트랜잭션으로 무결성을 강화해야 한다. 현재 직렬화 잠금은 단일 프로세스까지만 보호한다.

## ③ 🛠️ 실기 · 전체 코드와 줄별 설명

이 저장소는 완성 코드와 학습 노트를 함께 제공한다. 아래 파일을 지정 경로에서 읽고 실행한다. 이 단계에서 새로 다루는 파일은 생략 없이 수록하며, import되는 공통 파일은 README와 앞선 단계의 전체 코드를 따른다. 학습 진행 상황은 체크박스에 직접 기록한다.

1. SQLITE_PATH를 data/study.sqlite로 설정한다. 최초 실행 시 디렉터리와 records 테이블이 생성된다.
2. createResource의 source가 검색 URL 문자열이므로 검색 조건 변경 때 fetcher가 실행된다. pending·error·empty·success를 구분한다.
3. 목록 GET /api/posts, 상세 GET /api/posts/{id}, 등록 POST, 수정 PATCH, 삭제 DELETE를 순서대로 실행한다. POST 응답 Location을 확인한다.
4. 목록 meta의 page/limit/total/totalPages/q, sort 허용 목록, limit 최대 50을 확인한다. 경로는 /api/v1/posts로 바꾸지 않는다. v1은 계약 버전이다.
5. API 공통 error.code/message/fields/requestId와 X-Request-Id를 연결한다. 서버 연결 정보는 .env, 프론트는 VITE_API_BASE만 읽는다.

실행 명령은 저장소 루트의 PowerShell 기준이다. 서버를 유지하는 명령 다음의 작업은 별도 터미널에서 실행한다.

```powershell
npm run dev
Invoke-RestMethod "http://127.0.0.1:3000/api/posts?page=1&limit=10&sort=-createdAt"
npm test
```

### src/api.ts 전체 코드

[src/api.ts](src/api.ts)

```typescript
import { config } from './config';
import { token, clearSession } from './session';
export class ApiError extends Error {
  constructor(public status: number, message: string, public fields: Record<string, string[]> = {}, public requestId = '') { super(message); }
}
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  if (token()) headers.set('Authorization', `Bearer ${token()}`);
  const response = await fetch(`${config.apiBase}${path}`, { ...init, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) clearSession();
    throw new ApiError(response.status, payload.error?.message || '요청에 실패했습니다.', payload.error?.fields, payload.error?.requestId);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}
export async function streamQuestion(documentId: number, question: string, onEvent: (event: { text?: string; sources?: unknown; stopReason?: string }) => void, signal: AbortSignal) {
  const response = await fetch(`${config.apiBase}/api/ai/chat/stream`, {
    method: 'POST', signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify({ documentId, question })
  });
  if (!response.ok) throw new ApiError(response.status, (await response.json()).error.message);
  if (!response.body) throw new Error('스트리밍 본문이 없습니다.');
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader(); let buffer = '';
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      buffer += value; const frames = buffer.split('\n\n'); buffer = frames.pop() || '';
      for (const frame of frames) {
        const data = frame.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
        if (!data) continue; if (data === '[DONE]') return;
        const event = JSON.parse(data); if (event.error) throw new Error(event.error.message); onEvent(event);
      }
    }
    throw new Error('완료 이벤트 없이 스트림이 종료되었습니다.');
  } finally { await reader.cancel(); reader.releaseLock(); }
}
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>import { config } from &#x27;./config&#x27;;</code> | ./config에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 2 | <code>import { token, clearSession } from &#x27;./session&#x27;;</code> | ./session에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 3 | <code>export class ApiError extends Error {</code> | 브라우저 API와 SSE 처리의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 4 | <code>  constructor(public status: number, message: string, public fields: Record&lt;string, string[]&gt; = {}, public requestId = &#x27;&#x27;) { super(message); }</code> | 브라우저 API와 SSE 처리: 요청 추적 ID를 생성하거나 응답·로그로 전달한다. |
| 5 | <code>}</code> | 브라우저 API와 SSE 처리의 현재 블록 또는 선언을 닫는다. |
| 6 | <code>export async function api&lt;T&gt;(path: string, init: RequestInit = {}): Promise&lt;T&gt; {</code> | 브라우저 API와 SSE 처리의 이름 있는 동작과 인자 범위를 정의한다. |
| 7 | <code>  const headers = new Headers(init.headers);</code> | 브라우저 API와 SSE 처리에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 8 | <code>  if (init.body) headers.set(&#x27;Content-Type&#x27;, &#x27;application/json&#x27;);</code> | 브라우저 API와 SSE 처리에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 9 | <code>  if (token()) headers.set(&#x27;Authorization&#x27;, `Bearer ${token()}`);</code> | 브라우저 API와 SSE 처리에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 10 | <code>  const response = await fetch(`${config.apiBase}${path}`, { ...init, headers });</code> | 브라우저 API와 SSE 처리: 명시한 URL·method·header·body로 HTTP 요청을 보낸다. |
| 11 | <code>  if (!response.ok) {</code> | 브라우저 API와 SSE 처리: HTTP 성공 여부를 확인하고 오류 응답을 별도로 처리한다. |
| 12 | <code>    const payload = await response.json().catch(() =&gt; ({}));</code> | 브라우저 API와 SSE 처리에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 13 | <code>    if (response.status === 401) clearSession();</code> | 브라우저 API와 SSE 처리에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 14 | <code>    throw new ApiError(response.status, payload.error?.message &#124;&#124; &#x27;요청에 실패했습니다.&#x27;, payload.error?.fields, payload.error?.requestId);</code> | 브라우저 API와 SSE 처리: 요청 추적 ID를 생성하거나 응답·로그로 전달한다. |
| 15 | <code>  }</code> | 브라우저 API와 SSE 처리의 현재 블록 또는 선언을 닫는다. |
| 16 | <code>  if (response.status === 204) return undefined as T;</code> | 브라우저 API와 SSE 처리: 본문이 없는 성공 응답에서 JSON 파싱을 생략한다. |
| 17 | <code>  return response.json();</code> | 브라우저 API와 SSE 처리의 현재 처리 결과를 호출자에게 돌려준다. |
| 18 | <code>}</code> | 브라우저 API와 SSE 처리의 현재 블록 또는 선언을 닫는다. |
| 19 | <code>export async function streamQuestion(documentId: number, question: string, onEvent: (event: { text?: string; sources?: unknown; stopReason?: string }) =&gt; void, signal: AbortSignal) {</code> | 브라우저 API와 SSE 처리의 이름 있는 동작과 인자 범위를 정의한다. |
| 20 | <code>  const response = await fetch(`${config.apiBase}/api/ai/chat/stream`, {</code> | 브라우저 API와 SSE 처리: 명시한 URL·method·header·body로 HTTP 요청을 보낸다. |
| 21 | <code>    method: &#x27;POST&#x27;, signal, headers: { &#x27;Content-Type&#x27;: &#x27;application/json&#x27;, Authorization: `Bearer ${token()}` }, body: JSON.stringify({ documentId, question })</code> | 브라우저 API와 SSE 처리: 객체를 네트워크·저장용 JSON 문자열로 직렬화한다. |
| 22 | <code>  });</code> | 브라우저 API와 SSE 처리의 현재 블록 또는 선언을 닫는다. |
| 23 | <code>  if (!response.ok) throw new ApiError(response.status, (await response.json()).error.message);</code> | 브라우저 API와 SSE 처리: HTTP 성공 여부를 확인하고 오류 응답을 별도로 처리한다. |
| 24 | <code>  if (!response.body) throw new Error(&#x27;스트리밍 본문이 없습니다.&#x27;);</code> | 브라우저 API와 SSE 처리에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 25 | <code>  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader(); let buffer = &#x27;&#x27;;</code> | 브라우저 API와 SSE 처리에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 26 | <code>  try {</code> | 브라우저 API와 SSE 처리의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 27 | <code>    while (true) {</code> | 브라우저 API와 SSE 처리의 각 항목·프레임·작업을 순서대로 처리한다. |
| 28 | <code>      const { value, done } = await reader.read(); if (done) break;</code> | 브라우저 API와 SSE 처리에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 29 | <code>      buffer += value; const frames = buffer.split(&#x27;\n\n&#x27;); buffer = frames.pop() &#124;&#124; &#x27;&#x27;;</code> | 브라우저 API와 SSE 처리의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 30 | <code>      for (const frame of frames) {</code> | 브라우저 API와 SSE 처리의 각 항목·프레임·작업을 순서대로 처리한다. |
| 31 | <code>        const data = frame.split(&#x27;\n&#x27;).filter(line =&gt; line.startsWith(&#x27;data:&#x27;)).map(line =&gt; line.slice(5).trimStart()).join(&#x27;\n&#x27;);</code> | 브라우저 API와 SSE 처리에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 32 | <code>        if (!data) continue; if (data === &#x27;[DONE]&#x27;) return;</code> | 브라우저 API와 SSE 처리에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 33 | <code>        const event = JSON.parse(data); if (event.error) throw new Error(event.error.message); onEvent(event);</code> | 브라우저 API와 SSE 처리: 문자열 JSON을 파싱한다. 미완성 프레임은 앞선 버퍼에서 보관한다. |
| 34 | <code>      }</code> | 브라우저 API와 SSE 처리의 현재 블록 또는 선언을 닫는다. |
| 35 | <code>    }</code> | 브라우저 API와 SSE 처리의 현재 블록 또는 선언을 닫는다. |
| 36 | <code>    throw new Error(&#x27;완료 이벤트 없이 스트림이 종료되었습니다.&#x27;);</code> | 브라우저 API와 SSE 처리의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 37 | <code>  } finally { await reader.cancel(); reader.releaseLock(); }</code> | 브라우저 API와 SSE 처리의 성공·실패와 관계없이 잠금과 자원을 정리한다. |
| 38 | <code>}</code> | 브라우저 API와 SSE 처리의 현재 블록 또는 선언을 닫는다. |

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

### server/posts.mjs 전체 코드

[server/posts.mjs](server/posts.mjs)

```javascript
import { fail, text } from './errors.mjs';
export function validatePost(input, partial = false) {
  const row = {};
  for (const [name, max] of [['title', 200], ['body', 20000]]) {
    if (!partial || name in input) row[name] = text(input[name], name, max);
  }
  if (!partial || 'tags' in input) {
    if (input.tags !== undefined && (!Array.isArray(input.tags) || input.tags.length > 10 || input.tags.some(t => typeof t !== 'string' || t.length > 30)))
      fail(400, 'VALIDATION_ERROR', '태그는 30자 이하로 최대 10개입니다.', { tags: ['태그 형식을 확인하세요.'] });
    row.tags = input.tags || [];
  }
  return row;
}
export async function postDto(repo, post) {
  const author = await repo.get('users', post.authorId);
  const { authorId, ...data } = post;
  return { ...data, author: { id: authorId, nickname: author?.nickname || '탈퇴 회원' }, commentCount: (await repo.all('comments')).filter(c => c.postId === post.id).length };
}
export async function listPosts(repo, query) {
  const page = Math.max(1, Math.trunc(Number(query.get('page')) || 1));
  const limit = Math.min(50, Math.max(1, Math.trunc(Number(query.get('limit')) || 10)));
  const q = (query.get('q') || '').slice(0, 200); const sort = query.get('sort') || '-createdAt';
  if (!['createdAt', '-createdAt', '-commentCount'].includes(sort)) fail(400, 'BAD_REQUEST', '지원하지 않는 정렬입니다.');
  const filtered = (await repo.all('posts')).filter(p => `${p.title} ${p.body}`.toLowerCase().includes(q.toLowerCase()));
  const rows = await Promise.all(filtered.map(p => postDto(repo, p)));
  rows.sort((a, b) => sort === '-commentCount' ? b.commentCount - a.commentCount || b.id - a.id : (sort === 'createdAt' ? 1 : -1) * (a.createdAt.localeCompare(b.createdAt) || a.id - b.id));
  return { data: rows.slice((page - 1) * limit, page * limit), meta: { page, limit, total: rows.length, totalPages: Math.ceil(rows.length / limit), q } };
}
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>import { fail, text } from &#x27;./errors.mjs&#x27;;</code> | ./errors.mjs에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 2 | <code>export function validatePost(input, partial = false) {</code> | 게시글 검증·DTO·목록 계약: title·body·tags가 공통 게시글 입력 규칙을 만족하는지 검사한다. |
| 3 | <code>  const row = {};</code> | 게시글 검증·DTO·목록 계약에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 4 | <code>  for (const [name, max] of [[&#x27;title&#x27;, 200], [&#x27;body&#x27;, 20000]]) {</code> | 게시글 검증·DTO·목록 계약의 각 항목·프레임·작업을 순서대로 처리한다. |
| 5 | <code>    if (!partial &#124;&#124; name in input) row[name] = text(input[name], name, max);</code> | 게시글 검증·DTO·목록 계약에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 6 | <code>  }</code> | 게시글 검증·DTO·목록 계약의 현재 블록 또는 선언을 닫는다. |
| 7 | <code>  if (!partial &#124;&#124; &#x27;tags&#x27; in input) {</code> | 게시글 검증·DTO·목록 계약에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 8 | <code>    if (input.tags !== undefined &amp;&amp; (!Array.isArray(input.tags) &#124;&#124; input.tags.length &gt; 10 &#124;&#124; input.tags.some(t =&gt; typeof t !== &#x27;string&#x27; &#124;&#124; t.length &gt; 30)))</code> | 게시글 검증·DTO·목록 계약에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 9 | <code>      fail(400, &#x27;VALIDATION_ERROR&#x27;, &#x27;태그는 30자 이하로 최대 10개입니다.&#x27;, { tags: [&#x27;태그 형식을 확인하세요.&#x27;] });</code> | 게시글 검증·DTO·목록 계약: 규칙 위반을 HTTP 상태·code·필드 오류로 중단한다. |
| 10 | <code>    row.tags = input.tags &#124;&#124; [];</code> | 게시글 검증·DTO·목록 계약의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 11 | <code>  }</code> | 게시글 검증·DTO·목록 계약의 현재 블록 또는 선언을 닫는다. |
| 12 | <code>  return row;</code> | 게시글 검증·DTO·목록 계약의 현재 처리 결과를 호출자에게 돌려준다. |
| 13 | <code>}</code> | 게시글 검증·DTO·목록 계약의 현재 블록 또는 선언을 닫는다. |
| 14 | <code>export async function postDto(repo, post) {</code> | 게시글 검증·DTO·목록 계약의 이름 있는 동작과 인자 범위를 정의한다. |
| 15 | <code>  const author = await repo.get(&#x27;users&#x27;, post.authorId);</code> | 게시글 검증·DTO·목록 계약: id에 해당하는 저장 레코드를 조회한다. |
| 16 | <code>  const { authorId, ...data } = post;</code> | 게시글 검증·DTO·목록 계약에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 17 | <code>  return { ...data, author: { id: authorId, nickname: author?.nickname &#124;&#124; &#x27;탈퇴 회원&#x27; }, commentCount: (await repo.all(&#x27;comments&#x27;)).filter(c =&gt; c.postId === post.id).length };</code> | 게시글 검증·DTO·목록 계약: bucket의 레코드를 읽어 검증·필터·조회에 사용한다. |
| 18 | <code>}</code> | 게시글 검증·DTO·목록 계약의 현재 블록 또는 선언을 닫는다. |
| 19 | <code>export async function listPosts(repo, query) {</code> | 게시글 검증·DTO·목록 계약의 이름 있는 동작과 인자 범위를 정의한다. |
| 20 | <code>  const page = Math.max(1, Math.trunc(Number(query.get(&#x27;page&#x27;)) &#124;&#124; 1));</code> | 게시글 검증·DTO·목록 계약에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 21 | <code>  const limit = Math.min(50, Math.max(1, Math.trunc(Number(query.get(&#x27;limit&#x27;)) &#124;&#124; 10)));</code> | 게시글 검증·DTO·목록 계약에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 22 | <code>  const q = (query.get(&#x27;q&#x27;) &#124;&#124; &#x27;&#x27;).slice(0, 200); const sort = query.get(&#x27;sort&#x27;) &#124;&#124; &#x27;-createdAt&#x27;;</code> | 게시글 검증·DTO·목록 계약에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 23 | <code>  if (![&#x27;createdAt&#x27;, &#x27;-createdAt&#x27;, &#x27;-commentCount&#x27;].includes(sort)) fail(400, &#x27;BAD_REQUEST&#x27;, &#x27;지원하지 않는 정렬입니다.&#x27;);</code> | 게시글 검증·DTO·목록 계약: 규칙 위반을 HTTP 상태·code·필드 오류로 중단한다. |
| 24 | <code>  const filtered = (await repo.all(&#x27;posts&#x27;)).filter(p =&gt; `${p.title} ${p.body}`.toLowerCase().includes(q.toLowerCase()));</code> | 게시글 검증·DTO·목록 계약: bucket의 레코드를 읽어 검증·필터·조회에 사용한다. |
| 25 | <code>  const rows = await Promise.all(filtered.map(p =&gt; postDto(repo, p)));</code> | 게시글 검증·DTO·목록 계약에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 26 | <code>  rows.sort((a, b) =&gt; sort === &#x27;-commentCount&#x27; ? b.commentCount - a.commentCount &#124;&#124; b.id - a.id : (sort === &#x27;createdAt&#x27; ? 1 : -1) * (a.createdAt.localeCompare(b.createdAt) &#124;&#124; a.id - b.id));</code> | 게시글 검증·DTO·목록 계약의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 27 | <code>  return { data: rows.slice((page - 1) * limit, page * limit), meta: { page, limit, total: rows.length, totalPages: Math.ceil(rows.length / limit), q } };</code> | 게시글 검증·DTO·목록 계약의 현재 처리 결과를 호출자에게 돌려준다. |
| 28 | <code>}</code> | 게시글 검증·DTO·목록 계약의 현재 블록 또는 선언을 닫는다. |

## ④ 🔗 연동 포인트

브라우저 createResource → api<T> → Node route → repository → SQLite → DTO → data/meta로 돌아온다. 서버의 기초 라우트 전체는 studymidpoint.md에 수록한다. 인증을 붙이는 study7에서도 공개 GET 계약은 유지한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| SQLite 열기 실패 | 경로·권한 문제 | 부모 폴더 권한과 SQLITE_PATH 확인 |
| 목록 undefined | data envelope 누락 | resource 값의 data를 읽는다 |
| 삭제 JSON 파싱 실패 | 204에서 json 호출 | 본문 없이 반환 |

## ⑥ 직접 해보기

1. 글 12개를 만들고 limit=5로 페이지 경계를 확인한다.
2. 한글·영문 대소문자 검색과 빈 목록 meta를 확인한다.
3. 서버를 재시작해 SQLite 데이터가 남는지 확인한다.

## ⑦ ☐ 체크리스트

노션 [FW] 학습 목표 원문 항목은 다음과 같이 보존한다. 괄호가 포함된 원문을 인용하되 다른 프레임워크 비교 실습은 수행하지 않는다.

- [ ] `createResource` 로 게시판 API 불러오기

- [ ] 공통 /api/posts v1과 data/meta/error 형식을 맞췄다.
- [ ] 목록·상세·등록·수정·삭제·댓글 계약을 실행했다.

## ⑧ 다음 단계 연결 문장

공통 게시판 API v1을 SQLite 저장소와 연결한다를 마쳤다면 [study7.md](study7.md)에서 이어 간다.

공식 자료: [SolidJS 1.x 소스](https://github.com/solidjs/solid/tree/v1.9.20), [Solid Router](https://docs.solidjs.com/solid-router/getting-started/installation-and-setup), [Node SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html). 최신 문서와 설치 버전이 다를 수 있어 package-lock.json을 실행 기준으로 삼는다.
