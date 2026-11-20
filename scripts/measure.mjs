const base = process.env.API_BASE || 'http://127.0.0.1:3000';
const durations = [];
for (let i = 0; i < 50; i++) {
  const start = performance.now(); const response = await fetch(`${base}/api/posts?limit=10`);
  if (!response.ok) throw new Error(`측정 실패 ${response.status}`);
  await response.arrayBuffer(); durations.push(performance.now() - start);
}
durations.sort((a, b) => a - b);
console.log(JSON.stringify({ samples: durations.length, p50ms: durations[24], p95ms: durations[47], maxMs: durations[49] }, null, 2));
