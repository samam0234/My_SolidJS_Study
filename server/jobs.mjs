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
