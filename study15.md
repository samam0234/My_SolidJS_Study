# study15 · SolidJS 성능·캐시·비동기·작업 큐

> 기준: [SolidJS 노션 원문](https://app.notion.com/p/40bd7dec5e2e813080f8d54cf5968ad5) · [게시판 API v1](https://app.notion.com/p/3d6d7dec5e2e8139adbfd36dd506c65e) · 문서 기준일 2026-11-20 (Asia/Seoul).

## ① 목표 한 줄

측정 후 캐시·지연 로딩·백그라운드 분석을 적용한다.

## ② 📖 이론

캐시는 동일한 질문의 최근 답을 잠시 보관하는 메모다. 응답 캐시 키에는 검색·페이지·정렬 조건이 포함되어야 한다. 이 실습의 공개 목록 캐시는 TTL 5초·최대 100개이며 글·댓글 변경 때 비운다. 개인 문서와 인증 응답은 공유 캐시에 넣지 않는다.

비동기는 대기 시간을 다른 작업과 겹칠 수 있게 하지만 CPU 계산을 자동으로 다른 코어에 옮기지 않는다. 문서 통계는 Worker thread에서 계산하고 DB jobs 상태로 queued/running/complete/failed를 남긴다. 재시작 때 running을 queued로 되돌린다. 현재 워커는 단일 서버 실습용이며 여러 인스턴스 운영에는 원자적 claim·재시도·분산 큐가 필요하다.

지연 로딩은 상세·문서·UI 실험실 코드를 최초 목록 번들에서 분리한다. 측정은 p50·p95·응답 크기·요청 수를 함께 보고 동일한 데이터·워밍업 조건으로 비교한다. API가 빠르더라도 긴 메인 스레드 작업이나 큰 UI 번들이 화면을 느리게 할 수 있다.

## ③ 🛠️ 실기 · 전체 코드와 줄별 설명

이 저장소는 완성 코드와 학습 노트를 함께 제공한다. 아래 파일을 지정 경로에서 읽고 실행한다. 이 단계에서 새로 다루는 파일은 생략 없이 수록하며, import되는 공통 파일은 README와 앞선 단계의 전체 코드를 따른다. 학습 진행 상황은 체크박스에 직접 기록한다.

1. 목록을 같은 query로 두 번 요청해 X-Cache MISS→HIT을 확인한다. 글·댓글을 바꾼 직후 다시 MISS여야 한다.
2. measure.mjs로 50개 샘플의 p50/p95/max를 수집한다. 첫 요청과 캐시된 요청을 구별하고 결과를 기록한다.
3. /documents에서 백그라운드 분석을 예약하고 202의 job id로 상태를 조회한다. 소유자 외 조회는 403이다.
4. 개발자도구 Performance·Network에서 CPU 시간·레이아웃·번들 로드를 확인한다. 큰 데이터로 측정 전후를 기록한다.
5. TTL만 늘려 신선도 문제를 숨기지 않는다. DB 조회 최적화가 필요하면 정규화·필터 인덱스·서버 페이지네이션부터 적용한다.

실행 명령은 저장소 루트의 PowerShell 기준이다. 서버를 유지하는 명령 다음의 작업은 별도 터미널에서 실행한다.

```powershell
node scripts/measure.mjs
npm test
npm run build
```

### scripts/measure.mjs 전체 코드

[scripts/measure.mjs](scripts/measure.mjs)

```javascript
const base = process.env.API_BASE || 'http://127.0.0.1:3000';
const durations = [];
for (let i = 0; i < 50; i++) {
  const start = performance.now(); const response = await fetch(`${base}/api/posts?limit=10`);
  if (!response.ok) throw new Error(`측정 실패 ${response.status}`);
  await response.arrayBuffer(); durations.push(performance.now() - start);
}
durations.sort((a, b) => a - b);
console.log(JSON.stringify({ samples: durations.length, p50ms: durations[24], p95ms: durations[47], maxMs: durations[49] }, null, 2));
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>const base = process.env.API_BASE &#124;&#124; &#x27;http://127.0.0.1:3000&#x27;;</code> | measure.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 2 | <code>const durations = [];</code> | measure.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 3 | <code>for (let i = 0; i &lt; 50; i++) {</code> | measure.mjs의 각 항목·프레임·작업을 순서대로 처리한다. |
| 4 | <code>  const start = performance.now(); const response = await fetch(`${base}/api/posts?limit=10`);</code> | measure.mjs: 명시한 URL·method·header·body로 HTTP 요청을 보낸다. |
| 5 | <code>  if (!response.ok) throw new Error(`측정 실패 ${response.status}`);</code> | measure.mjs: HTTP 성공 여부를 확인하고 오류 응답을 별도로 처리한다. |
| 6 | <code>  await response.arrayBuffer(); durations.push(performance.now() - start);</code> | measure.mjs의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 7 | <code>}</code> | measure.mjs의 현재 블록 또는 선언을 닫는다. |
| 8 | <code>durations.sort((a, b) =&gt; a - b);</code> | measure.mjs의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 9 | <code>console.log(JSON.stringify({ samples: durations.length, p50ms: durations[24], p95ms: durations[47], maxMs: durations[49] }, null, 2));</code> | measure.mjs: 객체를 네트워크·저장용 JSON 문자열로 직렬화한다. |

### server/jobs.mjs 전체 코드

[server/jobs.mjs](server/jobs.mjs)

```javascript
import { Worker } from 'node:worker_threads';
export function analyzeText(content) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./text-worker.mjs', import.meta.url), { workerData: content });
    const timer = setTimeout(() => { worker.terminate(); reject(new Error('작업 시간 초과')); }, 10000);
    worker.once('message', result => { clearTimeout(timer); resolve(result); });
    worker.once('error', error => { clearTimeout(timer); reject(error); });
    worker.once('exit', code => { if (code !== 0) { clearTimeout(timer); reject(new Error('작업 종료')); } });
  });
}
export function jobRunner(repo) {
  let running = false; let active = Promise.resolve();
  const tick = async () => {
    if (running) return; running = true;
    try {
      const job = (await repo.all('jobs')).find(j => j.state === 'queued');
      if (!job) return;
      await repo.serial(() => repo.put('jobs', { ...job, state: 'running' }));
      try {
        const doc = await repo.get('documents', job.documentId); const result = await analyzeText(doc.content);
        await repo.serial(() => repo.put('jobs', { ...job, state: 'complete', result }));
      } catch { await repo.serial(() => repo.put('jobs', { ...job, state: 'failed', error: '문서 분석 실패' })); }
    } finally { running = false; }
  };
  const timer = setInterval(() => { if (!running) active = tick().catch(() => {}); }, 250); timer.unref();
  return { stop: async () => { clearInterval(timer); await active; }, recover: async () => {
    for (const job of await repo.all('jobs')) if (job.state === 'running') await repo.put('jobs', { ...job, state: 'queued' });
  } };
}
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>import { Worker } from &#x27;node:worker_threads&#x27;;</code> | node:worker_threads에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 2 | <code>export function analyzeText(content) {</code> | 영속 작업 상태와 Worker 실행의 이름 있는 동작과 인자 범위를 정의한다. |
| 3 | <code>  return new Promise((resolve, reject) =&gt; {</code> | 영속 작업 상태와 Worker 실행의 현재 처리 결과를 호출자에게 돌려준다. |
| 4 | <code>    const worker = new Worker(new URL(&#x27;./text-worker.mjs&#x27;, import.meta.url), { workerData: content });</code> | 영속 작업 상태와 Worker 실행: 고정 base에 경로·쿼리를 연결하거나 URL 부분을 안전하게 해석한다. |
| 5 | <code>    const timer = setTimeout(() =&gt; { worker.terminate(); reject(new Error(&#x27;작업 시간 초과&#x27;)); }, 10000);</code> | 영속 작업 상태와 Worker 실행: 시간 상한 또는 재연결 대기 후 작업을 예약한다. |
| 6 | <code>    worker.once(&#x27;message&#x27;, result =&gt; { clearTimeout(timer); resolve(result); });</code> | 영속 작업 상태와 Worker 실행: 더 이상 필요하지 않은 예약 타이머를 제거한다. |
| 7 | <code>    worker.once(&#x27;error&#x27;, error =&gt; { clearTimeout(timer); reject(error); });</code> | 영속 작업 상태와 Worker 실행: 더 이상 필요하지 않은 예약 타이머를 제거한다. |
| 8 | <code>    worker.once(&#x27;exit&#x27;, code =&gt; { if (code !== 0) { clearTimeout(timer); reject(new Error(&#x27;작업 종료&#x27;)); } });</code> | 영속 작업 상태와 Worker 실행: 더 이상 필요하지 않은 예약 타이머를 제거한다. |
| 9 | <code>  });</code> | 영속 작업 상태와 Worker 실행의 현재 블록 또는 선언을 닫는다. |
| 10 | <code>}</code> | 영속 작업 상태와 Worker 실행의 현재 블록 또는 선언을 닫는다. |
| 11 | <code>export function jobRunner(repo) {</code> | 영속 작업 상태와 Worker 실행의 이름 있는 동작과 인자 범위를 정의한다. |
| 12 | <code>  let running = false; let active = Promise.resolve();</code> | 영속 작업 상태와 Worker 실행에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 13 | <code>  const tick = async () =&gt; {</code> | 영속 작업 상태와 Worker 실행에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 14 | <code>    if (running) return; running = true;</code> | 영속 작업 상태와 Worker 실행에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 15 | <code>    try {</code> | 영속 작업 상태와 Worker 실행의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 16 | <code>      const job = (await repo.all(&#x27;jobs&#x27;)).find(j =&gt; j.state === &#x27;queued&#x27;);</code> | 영속 작업 상태와 Worker 실행: bucket의 레코드를 읽어 검증·필터·조회에 사용한다. |
| 17 | <code>      if (!job) return;</code> | 영속 작업 상태와 Worker 실행에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 18 | <code>      await repo.serial(() =&gt; repo.put(&#x27;jobs&#x27;, { ...job, state: &#x27;running&#x27; }));</code> | 영속 작업 상태와 Worker 실행: 단일 서버 프로세스에서 데이터 작업 순서를 보장한다. |
| 19 | <code>      try {</code> | 영속 작업 상태와 Worker 실행의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 20 | <code>        const doc = await repo.get(&#x27;documents&#x27;, job.documentId); const result = await analyzeText(doc.content);</code> | 영속 작업 상태와 Worker 실행: id에 해당하는 저장 레코드를 조회한다. |
| 21 | <code>        await repo.serial(() =&gt; repo.put(&#x27;jobs&#x27;, { ...job, state: &#x27;complete&#x27;, result }));</code> | 영속 작업 상태와 Worker 실행: 단일 서버 프로세스에서 데이터 작업 순서를 보장한다. |
| 22 | <code>      } catch { await repo.serial(() =&gt; repo.put(&#x27;jobs&#x27;, { ...job, state: &#x27;failed&#x27;, error: &#x27;문서 분석 실패&#x27; })); }</code> | 영속 작업 상태와 Worker 실행: 단일 서버 프로세스에서 데이터 작업 순서를 보장한다. |
| 23 | <code>    } finally { running = false; }</code> | 영속 작업 상태와 Worker 실행의 성공·실패와 관계없이 잠금과 자원을 정리한다. |
| 24 | <code>  };</code> | 영속 작업 상태와 Worker 실행의 현재 블록 또는 선언을 닫는다. |
| 25 | <code>  const timer = setInterval(() =&gt; { if (!running) active = tick().catch(() =&gt; {}); }, 250); timer.unref();</code> | 영속 작업 상태와 Worker 실행: 주기적으로 작업 큐 또는 연결 생존 상태를 점검한다. |
| 26 | <code>  return { stop: async () =&gt; { clearInterval(timer); await active; }, recover: async () =&gt; {</code> | 영속 작업 상태와 Worker 실행의 현재 처리 결과를 호출자에게 돌려준다. |
| 27 | <code>    for (const job of await repo.all(&#x27;jobs&#x27;)) if (job.state === &#x27;running&#x27;) await repo.put(&#x27;jobs&#x27;, { ...job, state: &#x27;queued&#x27; });</code> | 영속 작업 상태와 Worker 실행: 기존 id의 레코드를 새 값으로 저장한다. |
| 28 | <code>  } };</code> | 영속 작업 상태와 Worker 실행의 현재 구문·화면·설정 블록을 닫거나 다음 분기로 연결한다. |
| 29 | <code>}</code> | 영속 작업 상태와 Worker 실행의 현재 블록 또는 선언을 닫는다. |

### server/text-worker.mjs 전체 코드

[server/text-worker.mjs](server/text-worker.mjs)

```javascript
import { parentPort, workerData } from 'node:worker_threads';
parentPort.postMessage({ characters: workerData.length, words: workerData.trim().split(/\s+/u).length, lines: workerData.split('\n').length });
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>import { parentPort, workerData } from &#x27;node:worker_threads&#x27;;</code> | node:worker_threads에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 2 | <code>parentPort.postMessage({ characters: workerData.length, words: workerData.trim().split(/\s+/u).length, lines: workerData.split(&#x27;\n&#x27;).length });</code> | text-worker.mjs의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |

## ④ 🔗 연동 포인트

서버 목록 캐시는 공개 API에만 적용하고 POST/PATCH/DELETE에서 무효화한다. 영속 jobs와 로그를 study16 운영 도구로 관찰하고 study17 알림으로 완료 상태를 전달할 수 있다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| 수정해도 옛 제목 | 캐시 무효화 누락 | 모든 변경 경로에서 cache.clear |
| CPU 때 서버 멈춤 | 메인 스레드 계산 | Worker로 넘기고 입력 상한 적용 |
| 재시작 후 running 고정 | 복구 규칙 없음 | 진행 상태 재큐잉과 멱등 작업 |

## ⑥ 직접 해보기

1. 캐시 TTL을 바꾸고 p95와 신선도 영향을 기록한다.
2. 완료 작업과 실패 작업을 각각 조회한다.
3. 문서가 없는 작업의 실패 상태를 테스트한다.

## ⑦ ☐ 체크리스트

- [ ] 캐시 키·TTL·상한·무효화를 확인했다.
- [ ] 비동기 I/O와 CPU Worker 차이를 설명했다.
- [ ] p50/p95·번들·백그라운드 상태를 측정했다.

## ⑧ 다음 단계 연결 문장

측정 후 캐시·지연 로딩·백그라운드 분석을 적용한다를 마쳤다면 [study16.md](study16.md)에서 이어 간다.

공식 자료: [SolidJS 1.x 소스](https://github.com/solidjs/solid/tree/v1.9.20), [Solid Router](https://docs.solidjs.com/solid-router/getting-started/installation-and-setup), [Node SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html). 최신 문서와 설치 버전이 다를 수 있어 package-lock.json을 실행 기준으로 삼는다.
