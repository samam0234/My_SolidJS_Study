import { createSignal, Show } from 'solid-js';
import { api } from '../api';
import { user } from '../session';
export default function Services() {
  const [result, setResult] = createSignal(''); const [link, setLink] = createSignal(''); const [busy, setBusy] = createSignal(false);
  const key = crypto.randomUUID();
  async function run(service: 'mail' | 'checkout') {
    if (busy()) return; setBusy(true); setResult(''); setLink('');
    try {
      const value = await api<{ data: { provider: string; url?: string } }>(`/api/services/${service}`, { method: 'POST', headers: { 'Idempotency-Key': key } });
      setResult(JSON.stringify(value.data));
      if (value.data.url) { const target = new URL(value.data.url, location.origin); if (['http:', 'https:'].includes(target.protocol)) setLink(target.href); }
    } catch (e) { setResult((e as Error).message); } finally { setBusy(false); }
  }
  return <section><p class="eyebrow">BOUNDARIES & INTEGRATIONS</p><h1>외부 서비스 실습</h1><p>기본 mock 모드에서는 실제 결제와 메일 발송이 발생하지 않습니다. Checkout에서 돌아온 URL만으로 결제 완료로 표시하지 않습니다.</p><Show when={user()} fallback={<p>로그인 후 사용할 수 있습니다.</p>}><button disabled={busy()} onClick={() => run('checkout')}>Checkout 생성</button> <button disabled={busy()} onClick={() => run('mail')}>본인에게 알림 요청</button></Show><p role="status">{result()}</p><Show when={link()}><a href={link()} rel="noreferrer">생성된 Checkout 열기</a></Show></section>;
}
