import { createApp } from './app.mjs';
const app = await createApp();
app.server.listen(Number(process.env.PORT || 3000), process.env.HOST || '127.0.0.1', () => console.log('Solid Study API 준비 완료'));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await app.close(); process.exit(0); });
