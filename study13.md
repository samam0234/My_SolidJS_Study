# study13 · SolidJS 결제·메일·업로드·OAuth

> 기준: [SolidJS 노션 원문](https://app.notion.com/p/40bd7dec5e2e813080f8d54cf5968ad5) · [게시판 API v1](https://app.notion.com/p/3d6d7dec5e2e8139adbfd36dd506c65e) · 문서 기준일 2026-11-20 (Asia/Seoul).

## ① 목표 한 줄

서버 경계를 통해 외부 서비스에 연결하고 mock과 실제 호출을 명확히 구분한다.

## ② 📖 이론

외부 서비스 키는 서버가 보관한다. 브라우저가 상품 가격·메일 수신자·OAuth 비밀을 임의로 결정하지 못하도록 서버 정책으로 제한한다. 요청이 외부 공급자를 거쳐 돌아오는 택배 과정처럼 지연·중복·실패가 정상적인 가능성이다.

결제는 서버에 고정한 Stripe Price로 Checkout URL만 생성한다. Idempotency-Key로 같은 요청을 식별하고 success URL로 돌아왔다고 결제가 확정되었다고 표시하지 않는다. 실제 상품 지급은 서명 검증된 webhook과 DB 주문 상태가 있어야 하며 이 학습 예제는 상품 지급을 하지 않는다.

메일은 Resend로 로그인 사용자 본인의 주소에만 고정된 알림을 보낸다. OAuth는 state를 서버 해시와 httpOnly SameSite 쿠키에 묶어 검증하고, 공급자의 사용자 id로 계정을 연결한다. 이메일이 같다는 이유로 자동 계정 병합하지 않는다. 프론트에는 공급자 토큰 대신 만료 60초의 일회용 교환 코드를 전달한다.

파일은 UTF-8 TXT·MD 500KB로 제한해 원문을 DB에 저장한다. 파일명을 경로로 쓰지 않으므로 경로 탈출을 피한다. 문서 접근은 소유자 검사 후 허용한다. 대용량 객체 저장소를 도입할 때는 private bucket과 짧은 서명 URL, MIME·확장자·스캔 정책을 추가한다.

## ③ 🛠️ 실기 · 전체 코드와 줄별 설명

이 저장소는 완성 코드와 학습 노트를 함께 제공한다. 아래 파일을 지정 경로에서 읽고 실행한다. 이 단계에서 새로 다루는 파일은 생략 없이 수록하며, import되는 공통 파일은 README와 앞선 단계의 전체 코드를 따른다. 학습 진행 상황은 체크박스에 직접 기록한다.

1. 기본 INTEGRATIONS_MODE=mock으로 /services와 소셜 로그인 흐름을 실행한다. 응답 provider=mock을 확인한다.
2. live를 선택할 경우 서버 .env에 Stripe test key/price id, Resend 키/검증된 발신 주소, GitHub OAuth id/secret을 설정한다. 실제 메일 발송·결제는 계정과 테스트 범위가 준비된 사람이 수행한다.
3. OAuth callback URL을 PUBLIC_ORIGIN/api/oauth/callback으로 등록한다. state 일치·만료·재사용 거절과 exchange code 일회성을 확인한다.
4. /documents에서 TXT·MD 업로드, 크기·UTF-8 검증, 다른 계정 접근 거절을 확인한다.
5. HTTP 어댑터 테스트는 fetcher를 가짜로 주입해 실제 외부 요청 없이 호출 형식을 검사한다. live 거래가 검증되었다고 기록하지 않는다.

실행 명령은 저장소 루트의 PowerShell 기준이다. 서버를 유지하는 명령 다음의 작업은 별도 터미널에서 실행한다.

```powershell
npm test
# .env INTEGRATIONS_MODE=mock 기본 유지
npm run dev
```

### server/integrations.mjs 전체 코드

[server/integrations.mjs](server/integrations.mjs)

```javascript
import { randomBytes } from 'node:crypto';
import { fail, text } from './errors.mjs';
import { digest } from './auth.mjs';
export async function checkout(config, user, idempotencyKey, fetcher = fetch) {
  if (config.mode === 'mock') return { provider: 'mock', url: `${config.origin}/services?checkout=mock`, paid: false };
  if (!config.stripeKey || !config.priceId) fail(503, 'INTEGRATION_UNAVAILABLE', 'Stripe 서버 설정이 필요합니다.');
  const response = await fetcher('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST', signal: AbortSignal.timeout(15000), headers: { Authorization: `Bearer ${config.stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': `${user.id}-${idempotencyKey}` },
    body: new URLSearchParams({ mode: 'payment', 'line_items[0][price]': config.priceId, 'line_items[0][quantity]': '1', client_reference_id: String(user.id), success_url: `${config.origin}/services?checkout=returned`, cancel_url: `${config.origin}/services?checkout=canceled` })
  });
  if (!response.ok) fail(502, 'INTEGRATION_UNAVAILABLE', '결제 연결에 실패했습니다.');
  const session = await response.json(); return { provider: 'stripe', url: session.url, sessionId: session.id, paid: false };
}
export async function mail(config, user, fetcher = fetch) {
  if (config.mode === 'mock') return { provider: 'mock', accepted: true };
  if (!config.mailKey || !config.mailFrom) fail(503, 'INTEGRATION_UNAVAILABLE', '메일 서버 설정이 필요합니다.');
  const response = await fetcher('https://api.resend.com/emails', {
    method: 'POST', signal: AbortSignal.timeout(15000), headers: { Authorization: `Bearer ${config.mailKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: config.mailFrom, to: [user.email], subject: 'Solid Study 알림', text: '요청하신 학습 알림입니다.' })
  });
  if (!response.ok) fail(502, 'INTEGRATION_UNAVAILABLE', '메일 연결에 실패했습니다.');
  return { provider: 'resend', accepted: true, id: (await response.json()).id };
}
export async function oauthStart(repo, config) {
  if (config.mode !== 'mock' && !config.githubId) fail(503, 'INTEGRATION_UNAVAILABLE', 'OAuth 앱 설정이 필요합니다.');
  const state = randomBytes(32).toString('base64url');
  await repo.insert('oauthStates', { hash: digest(state), expiresAt: Date.now() + 300000 });
  const params = new URLSearchParams({ client_id: config.githubId || 'mock', state, redirect_uri: `${config.origin}/api/oauth/callback`, scope: 'read:user' });
  return { state, url: config.mode === 'mock' ? `${config.origin}/api/oauth/callback?code=mock&state=${state}` : `https://github.com/login/oauth/authorize?${params}` };
}
export async function oauthIdentity(config, code, fetcher = fetch) {
  text(code, 'code', 500);
  if (config.mode === 'mock') return { id: 'mock-user', login: 'mock-oauth' };
  const response = await fetcher('https://github.com/login/oauth/access_token', {
    method: 'POST', signal: AbortSignal.timeout(15000), headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: config.githubId, client_secret: config.githubSecret, code, redirect_uri: `${config.origin}/api/oauth/callback` })
  });
  const token = await response.json();
  if (!response.ok || !token.access_token) fail(401, 'INVALID_CREDENTIALS', 'OAuth 코드가 유효하지 않습니다.');
  const profile = await fetcher('https://api.github.com/user', { headers: { Authorization: `Bearer ${token.access_token}`, Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(15000) });
  if (!profile.ok) fail(502, 'INTEGRATION_UNAVAILABLE', '소셜 프로필을 읽지 못했습니다.');
  return profile.json();
}
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>import { randomBytes } from &#x27;node:crypto&#x27;;</code> | node:crypto에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 2 | <code>import { fail, text } from &#x27;./errors.mjs&#x27;;</code> | ./errors.mjs에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 3 | <code>import { digest } from &#x27;./auth.mjs&#x27;;</code> | ./auth.mjs에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 4 | <code>export async function checkout(config, user, idempotencyKey, fetcher = fetch) {</code> | 외부 서비스 경계의 이름 있는 동작과 인자 범위를 정의한다. |
| 5 | <code>  if (config.mode === &#x27;mock&#x27;) return { provider: &#x27;mock&#x27;, url: `${config.origin}/services?checkout=mock`, paid: false };</code> | 외부 서비스 경계에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 6 | <code>  if (!config.stripeKey &#124;&#124; !config.priceId) fail(503, &#x27;INTEGRATION_UNAVAILABLE&#x27;, &#x27;Stripe 서버 설정이 필요합니다.&#x27;);</code> | 외부 서비스 경계: 규칙 위반을 HTTP 상태·code·필드 오류로 중단한다. |
| 7 | <code>  const response = await fetcher(&#x27;https://api.stripe.com/v1/checkout/sessions&#x27;, {</code> | 외부 서비스 경계: 주입된 HTTP 함수로 요청한다. 테스트에서는 실제 외부 연결을 대체한다. |
| 8 | <code>    method: &#x27;POST&#x27;, signal: AbortSignal.timeout(15000), headers: { Authorization: `Bearer ${config.stripeKey}`, &#x27;Content-Type&#x27;: &#x27;application/x-www-form-urlencoded&#x27;, &#x27;Idempotency-Key&#x27;: `${user.id}-${idempotencyKey}` },</code> | 외부 서비스 경계의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 9 | <code>    body: new URLSearchParams({ mode: &#x27;payment&#x27;, &#x27;line_items[0][price]&#x27;: config.priceId, &#x27;line_items[0][quantity]&#x27;: &#x27;1&#x27;, client_reference_id: String(user.id), success_url: `${config.origin}/services?checkout=returned`, cancel_url: `${config.origin}/services?checkout=canceled` })</code> | 외부 서비스 경계: 고정 base에 경로·쿼리를 연결하거나 URL 부분을 안전하게 해석한다. |
| 10 | <code>  });</code> | 외부 서비스 경계의 현재 블록 또는 선언을 닫는다. |
| 11 | <code>  if (!response.ok) fail(502, &#x27;INTEGRATION_UNAVAILABLE&#x27;, &#x27;결제 연결에 실패했습니다.&#x27;);</code> | 외부 서비스 경계: HTTP 성공 여부를 확인하고 오류 응답을 별도로 처리한다. |
| 12 | <code>  const session = await response.json(); return { provider: &#x27;stripe&#x27;, url: session.url, sessionId: session.id, paid: false };</code> | 외부 서비스 경계에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 13 | <code>}</code> | 외부 서비스 경계의 현재 블록 또는 선언을 닫는다. |
| 14 | <code>export async function mail(config, user, fetcher = fetch) {</code> | 외부 서비스 경계의 이름 있는 동작과 인자 범위를 정의한다. |
| 15 | <code>  if (config.mode === &#x27;mock&#x27;) return { provider: &#x27;mock&#x27;, accepted: true };</code> | 외부 서비스 경계에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 16 | <code>  if (!config.mailKey &#124;&#124; !config.mailFrom) fail(503, &#x27;INTEGRATION_UNAVAILABLE&#x27;, &#x27;메일 서버 설정이 필요합니다.&#x27;);</code> | 외부 서비스 경계: 규칙 위반을 HTTP 상태·code·필드 오류로 중단한다. |
| 17 | <code>  const response = await fetcher(&#x27;https://api.resend.com/emails&#x27;, {</code> | 외부 서비스 경계: 주입된 HTTP 함수로 요청한다. 테스트에서는 실제 외부 연결을 대체한다. |
| 18 | <code>    method: &#x27;POST&#x27;, signal: AbortSignal.timeout(15000), headers: { Authorization: `Bearer ${config.mailKey}`, &#x27;Content-Type&#x27;: &#x27;application/json&#x27; },</code> | 외부 서비스 경계의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 19 | <code>    body: JSON.stringify({ from: config.mailFrom, to: [user.email], subject: &#x27;Solid Study 알림&#x27;, text: &#x27;요청하신 학습 알림입니다.&#x27; })</code> | 외부 서비스 경계: 객체를 네트워크·저장용 JSON 문자열로 직렬화한다. |
| 20 | <code>  });</code> | 외부 서비스 경계의 현재 블록 또는 선언을 닫는다. |
| 21 | <code>  if (!response.ok) fail(502, &#x27;INTEGRATION_UNAVAILABLE&#x27;, &#x27;메일 연결에 실패했습니다.&#x27;);</code> | 외부 서비스 경계: HTTP 성공 여부를 확인하고 오류 응답을 별도로 처리한다. |
| 22 | <code>  return { provider: &#x27;resend&#x27;, accepted: true, id: (await response.json()).id };</code> | 외부 서비스 경계의 현재 처리 결과를 호출자에게 돌려준다. |
| 23 | <code>}</code> | 외부 서비스 경계의 현재 블록 또는 선언을 닫는다. |
| 24 | <code>export async function oauthStart(repo, config) {</code> | 외부 서비스 경계의 이름 있는 동작과 인자 범위를 정의한다. |
| 25 | <code>  if (config.mode !== &#x27;mock&#x27; &amp;&amp; !config.githubId) fail(503, &#x27;INTEGRATION_UNAVAILABLE&#x27;, &#x27;OAuth 앱 설정이 필요합니다.&#x27;);</code> | 외부 서비스 경계: 규칙 위반을 HTTP 상태·code·필드 오류로 중단한다. |
| 26 | <code>  const state = randomBytes(32).toString(&#x27;base64url&#x27;);</code> | 외부 서비스 경계: 예측하기 어려운 세션·OAuth 값을 생성한다. |
| 27 | <code>  await repo.insert(&#x27;oauthStates&#x27;, { hash: digest(state), expiresAt: Date.now() + 300000 });</code> | 외부 서비스 경계: 도메인 레코드에 숫자 id를 부여하여 저장한다. |
| 28 | <code>  const params = new URLSearchParams({ client_id: config.githubId &#124;&#124; &#x27;mock&#x27;, state, redirect_uri: `${config.origin}/api/oauth/callback`, scope: &#x27;read:user&#x27; });</code> | 외부 서비스 경계: 고정 base에 경로·쿼리를 연결하거나 URL 부분을 안전하게 해석한다. |
| 29 | <code>  return { state, url: config.mode === &#x27;mock&#x27; ? `${config.origin}/api/oauth/callback?code=mock&amp;state=${state}` : `https://github.com/login/oauth/authorize?${params}` };</code> | 외부 서비스 경계의 현재 처리 결과를 호출자에게 돌려준다. |
| 30 | <code>}</code> | 외부 서비스 경계의 현재 블록 또는 선언을 닫는다. |
| 31 | <code>export async function oauthIdentity(config, code, fetcher = fetch) {</code> | 외부 서비스 경계의 이름 있는 동작과 인자 범위를 정의한다. |
| 32 | <code>  text(code, &#x27;code&#x27;, 500);</code> | 외부 서비스 경계의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 33 | <code>  if (config.mode === &#x27;mock&#x27;) return { id: &#x27;mock-user&#x27;, login: &#x27;mock-oauth&#x27; };</code> | 외부 서비스 경계에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 34 | <code>  const response = await fetcher(&#x27;https://github.com/login/oauth/access_token&#x27;, {</code> | 외부 서비스 경계: 주입된 HTTP 함수로 요청한다. 테스트에서는 실제 외부 연결을 대체한다. |
| 35 | <code>    method: &#x27;POST&#x27;, signal: AbortSignal.timeout(15000), headers: { Accept: &#x27;application/json&#x27;, &#x27;Content-Type&#x27;: &#x27;application/json&#x27; },</code> | 외부 서비스 경계의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 36 | <code>    body: JSON.stringify({ client_id: config.githubId, client_secret: config.githubSecret, code, redirect_uri: `${config.origin}/api/oauth/callback` })</code> | 외부 서비스 경계: 객체를 네트워크·저장용 JSON 문자열로 직렬화한다. |
| 37 | <code>  });</code> | 외부 서비스 경계의 현재 블록 또는 선언을 닫는다. |
| 38 | <code>  const token = await response.json();</code> | 외부 서비스 경계에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 39 | <code>  if (!response.ok &#124;&#124; !token.access_token) fail(401, &#x27;INVALID_CREDENTIALS&#x27;, &#x27;OAuth 코드가 유효하지 않습니다.&#x27;);</code> | 외부 서비스 경계: HTTP 성공 여부를 확인하고 오류 응답을 별도로 처리한다. |
| 40 | <code>  const profile = await fetcher(&#x27;https://api.github.com/user&#x27;, { headers: { Authorization: `Bearer ${token.access_token}`, Accept: &#x27;application/vnd.github+json&#x27; }, signal: AbortSignal.timeout(15000) });</code> | 외부 서비스 경계: 주입된 HTTP 함수로 요청한다. 테스트에서는 실제 외부 연결을 대체한다. |
| 41 | <code>  if (!profile.ok) fail(502, &#x27;INTEGRATION_UNAVAILABLE&#x27;, &#x27;소셜 프로필을 읽지 못했습니다.&#x27;);</code> | 외부 서비스 경계: 규칙 위반을 HTTP 상태·code·필드 오류로 중단한다. |
| 42 | <code>  return profile.json();</code> | 외부 서비스 경계의 현재 처리 결과를 호출자에게 돌려준다. |
| 43 | <code>}</code> | 외부 서비스 경계의 현재 블록 또는 선언을 닫는다. |

### src/pages/Services.tsx 전체 코드

[src/pages/Services.tsx](src/pages/Services.tsx)

```tsx
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
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>import { createSignal, Show } from &#x27;solid-js&#x27;;</code> | solid-js에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 2 | <code>import { api } from &#x27;../api&#x27;;</code> | ../api에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 3 | <code>import { user } from &#x27;../session&#x27;;</code> | ../session에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 4 | <code>export default function Services() {</code> | Services.tsx의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 5 | <code>  const [result, setResult] = createSignal(&#x27;&#x27;); const [link, setLink] = createSignal(&#x27;&#x27;); const [busy, setBusy] = createSignal(false);</code> | Services.tsx: 변경될 값을 accessor·setter 쌍으로 만들고 이후 JSX·함수에서 읽게 한다. |
| 6 | <code>  const key = crypto.randomUUID();</code> | Services.tsx에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 7 | <code>  async function run(service: &#x27;mail&#x27; &#124; &#x27;checkout&#x27;) {</code> | Services.tsx의 이름 있는 동작과 인자 범위를 정의한다. |
| 8 | <code>    if (busy()) return; setBusy(true); setResult(&#x27;&#x27;); setLink(&#x27;&#x27;);</code> | Services.tsx에서 조건에 따라 처리 경로를 선택하거나 조기 종료한다. |
| 9 | <code>    try {</code> | Services.tsx의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 10 | <code>      const value = await api&lt;{ data: { provider: string; url?: string } }&gt;(`/api/services/${service}`, { method: &#x27;POST&#x27;, headers: { &#x27;Idempotency-Key&#x27;: key } });</code> | Services.tsx에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 11 | <code>      setResult(JSON.stringify(value.data));</code> | Services.tsx: 객체를 네트워크·저장용 JSON 문자열로 직렬화한다. |
| 12 | <code>      if (value.data.url) { const target = new URL(value.data.url, location.origin); if ([&#x27;http:&#x27;, &#x27;https:&#x27;].includes(target.protocol)) setLink(target.href); }</code> | Services.tsx: 고정 base에 경로·쿼리를 연결하거나 URL 부분을 안전하게 해석한다. |
| 13 | <code>    } catch (e) { setResult((e as Error).message); } finally { setBusy(false); }</code> | Services.tsx의 실패를 잡아 오류 안내·복구·상태 갱신으로 전환한다. |
| 14 | <code>  }</code> | Services.tsx의 현재 블록 또는 선언을 닫는다. |
| 15 | <code>  return &lt;section&gt;&lt;p class=&quot;eyebrow&quot;&gt;BOUNDARIES &amp; INTEGRATIONS&lt;/p&gt;&lt;h1&gt;외부 서비스 실습&lt;/h1&gt;&lt;p&gt;기본 mock 모드에서는 실제 결제와 메일 발송이 발생하지 않습니다. Checkout에서 돌아온 URL만으로 결제 완료로 표시하지 않습니다.&lt;/p&gt;&lt;Show when={user()} fallback={&lt;p&gt;로그인 후 사용할 수 있습니다.&lt;/p&gt;}&gt;&lt;button disabled={busy()} onClick={() =&gt; run(&#x27;checkout&#x27;)}&gt;Checkout 생성&lt;/button&gt; &lt;button disabled={busy()} onClick={() =&gt; run(&#x27;mail&#x27;)}&gt;본인에게 알림 요청&lt;/button&gt;&lt;/Show&gt;&lt;p role=&quot;status&quot;&gt;{result()}&lt;/p&gt;&lt;Show when={link()}&gt;&lt;a href={link()} rel=&quot;noreferrer&quot;&gt;생성된 Checkout 열기&lt;/a&gt;&lt;/Show&gt;&lt;/section&gt;;</code> | Services.tsx: 조건 accessor에 따라 본문 또는 fallback 화면을 선택한다. |
| 16 | <code>}</code> | Services.tsx의 현재 블록 또는 선언을 닫는다. |

### tests/integrations.test.mjs 전체 코드

[tests/integrations.test.mjs](tests/integrations.test.mjs)

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './helpers.mjs';
import { checkout, mail, oauthIdentity } from '../server/integrations.mjs';
import { modelStream, retrieve, sseFrames } from '../server/ai.mjs';
import { WebSocket } from 'ws';
test('외부 서비스 HTTP 어댑터를 가짜 fetch로 검증', async () => {
  const calls = []; const fetcher = async (url, init) => { calls.push({ url, init }); return Response.json(url.includes('stripe') ? { id: 'cs_test', url: 'https://checkout.stripe.com/test' } : url.endsWith('/user') ? { id: 1, login: 'test' } : url.includes('access_token') ? { access_token: 'provider-secret' } : { id: 'mail-test' }); };
  const config = { mode: 'live', origin: 'https://study.example', stripeKey: 'test-key', priceId: 'price_test', mailKey: 'mail-key', mailFrom: 'sender@example.com', githubId: 'id', githubSecret: 'secret' };
  assert.equal((await checkout(config, { id: 1 }, 'fixed', fetcher)).paid, false); assert.equal(calls[0].init.headers['Idempotency-Key'], '1-fixed');
  assert.equal((await mail(config, { email: 'me@example.com' }, fetcher)).accepted, true); assert.deepEqual(JSON.parse(calls[1].init.body).to, ['me@example.com']);
  assert.equal((await oauthIdentity(config, 'code', fetcher)).login, 'test');
});
test('OAuth mock state·일회용 교환·재사용 거절', async t => {
  const { base, request } = await fixture(t);
  const start = await fetch(`${base}/api/oauth/start`, { redirect: 'manual' }); const cookie = start.headers.get('set-cookie').split(';')[0];
  const target = new URL(start.headers.get('location')); const callback = await fetch(base + target.pathname + target.search, { redirect: 'manual', headers: { Cookie: cookie } });
  assert.equal(callback.status, 302); const code = new URL(callback.headers.get('location')).searchParams.get('code');
  const exchange = await request('/api/oauth/exchange', { method: 'POST', body: { code } }); assert.equal(exchange.status, 200); assert.ok(exchange.value.data.accessToken);
  assert.equal((await request('/api/oauth/exchange', { method: 'POST', body: { code } })).status, 401);
  assert.equal((await fetch(base + target.pathname + target.search, { headers: { Cookie: cookie } })).status, 400);
});
test('mock 결제·메일 응답과 사용자 한도', async t => {
  const { request, account } = await fixture(t); const { accessToken: token } = await account();
  const checkout = await request('/api/services/checkout', { method: 'POST', token, headers: { 'Idempotency-Key': 'once' } }); assert.equal(checkout.value.data.provider, 'mock'); assert.equal(checkout.value.data.paid, false);
  for (let i = 0; i < 3; i++) assert.equal((await request('/api/services/mail', { method: 'POST', token })).status, 200);
  assert.equal((await request('/api/services/mail', { method: 'POST', token })).status, 429);
});
test('SSE를 패킷 중간에서 나눠도 복원하고 Anthropic 사용량을 읽는다', async () => {
  const raw = 'event: message_start\ndata: {"type":"message_start","message":{"usage":{"input_tokens":12}}}\n\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"한글"}}\n\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":3}}\n\n';
  const bytes = new TextEncoder().encode(raw); const body = new ReadableStream({ start(c) { for (let i = 0; i < bytes.length; i += 7) c.enqueue(bytes.slice(i, i + 7)); c.close(); } });
  const result = [];
  for await (const event of modelStream({ provider: 'anthropic', model: 'configured-model', key: 'server-only', prompt: 'hello', fetcher: async () => new Response(body) })) result.push(event);
  assert.equal(result[0].text, '한글'); assert.deepEqual(result[1].usage, { inputTokens: 12, outputTokens: 3 });
});
test('RAG는 질문과 겹치는 발췌만 반환한다', () => {
  assert.equal(retrieve('시그널은 상태입니다.', '시그널').length, 1); assert.deepEqual(retrieve('시그널', 'unrelated'), []);
});
test('WebSocket 공개 변경 알림', async t => {
  const { base, request, account, config } = await fixture(t); const { accessToken: token } = await account();
  const ws = new WebSocket(base.replace('http', 'ws') + '/ws', { origin: config.origin }); t.after(() => ws.terminate());
  await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
  const event = new Promise((resolve, reject) => { const timeout = setTimeout(() => reject(new Error('알림 시간 초과')), 2000); ws.once('message', message => { clearTimeout(timeout); resolve(JSON.parse(message.toString())); }); });
  await request('/api/posts', { method: 'POST', token, body: { title: '실시간', body: '변경 알림' } });
  assert.equal((await event).type, 'posts.changed');
});
```

줄 번호는 바로 위 코드의 첫 줄을 1로 센다. 빈 줄도 포함하여 실제 파일과 일치한다.

| 줄 | 해당 코드 | 설명 |
| --- | --- | --- |
| 1 | <code>import test from &#x27;node:test&#x27;;</code> | node:test에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 2 | <code>import assert from &#x27;node:assert/strict&#x27;;</code> | node:assert/strict에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 3 | <code>import { fixture } from &#x27;./helpers.mjs&#x27;;</code> | ./helpers.mjs에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 4 | <code>import { checkout, mail, oauthIdentity } from &#x27;../server/integrations.mjs&#x27;;</code> | ../server/integrations.mjs에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 5 | <code>import { modelStream, retrieve, sseFrames } from &#x27;../server/ai.mjs&#x27;;</code> | ../server/ai.mjs에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 6 | <code>import { WebSocket } from &#x27;ws&#x27;;</code> | ws에서 이 파일의 실행에 필요한 기능·타입을 가져온다. |
| 7 | <code>test(&#x27;외부 서비스 HTTP 어댑터를 가짜 fetch로 검증&#x27;, async () =&gt; {</code> | integrations.test.mjs: 독립적인 검증 시나리오와 비동기 정리 범위를 정의한다. |
| 8 | <code>  const calls = []; const fetcher = async (url, init) =&gt; { calls.push({ url, init }); return Response.json(url.includes(&#x27;stripe&#x27;) ? { id: &#x27;cs_test&#x27;, url: &#x27;https://checkout.stripe.com/test&#x27; } : url.endsWith(&#x27;/user&#x27;) ? { id: 1, login: &#x27;test&#x27; } : url.includes(&#x27;access_token&#x27;) ? { access_token: &#x27;provider-secret&#x27; } : { id: &#x27;mail-test&#x27; }); };</code> | integrations.test.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 9 | <code>  const config = { mode: &#x27;live&#x27;, origin: &#x27;https://study.example&#x27;, stripeKey: &#x27;test-key&#x27;, priceId: &#x27;price_test&#x27;, mailKey: &#x27;mail-key&#x27;, mailFrom: &#x27;sender@example.com&#x27;, githubId: &#x27;id&#x27;, githubSecret: &#x27;secret&#x27; };</code> | integrations.test.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 10 | <code>  assert.equal((await checkout(config, { id: 1 }, &#x27;fixed&#x27;, fetcher)).paid, false); assert.equal(calls[0].init.headers[&#x27;Idempotency-Key&#x27;], &#x27;1-fixed&#x27;);</code> | integrations.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 11 | <code>  assert.equal((await mail(config, { email: &#x27;me@example.com&#x27; }, fetcher)).accepted, true); assert.deepEqual(JSON.parse(calls[1].init.body).to, [&#x27;me@example.com&#x27;]);</code> | integrations.test.mjs: 문자열 JSON을 파싱한다. 미완성 프레임은 앞선 버퍼에서 보관한다. |
| 12 | <code>  assert.equal((await oauthIdentity(config, &#x27;code&#x27;, fetcher)).login, &#x27;test&#x27;);</code> | integrations.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 13 | <code>});</code> | integrations.test.mjs의 현재 블록 또는 선언을 닫는다. |
| 14 | <code>test(&#x27;OAuth mock state·일회용 교환·재사용 거절&#x27;, async t =&gt; {</code> | integrations.test.mjs: 독립적인 검증 시나리오와 비동기 정리 범위를 정의한다. |
| 15 | <code>  const { base, request } = await fixture(t);</code> | integrations.test.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 16 | <code>  const start = await fetch(`${base}/api/oauth/start`, { redirect: &#x27;manual&#x27; }); const cookie = start.headers.get(&#x27;set-cookie&#x27;).split(&#x27;;&#x27;)[0];</code> | integrations.test.mjs: 명시한 URL·method·header·body로 HTTP 요청을 보낸다. |
| 17 | <code>  const target = new URL(start.headers.get(&#x27;location&#x27;)); const callback = await fetch(base + target.pathname + target.search, { redirect: &#x27;manual&#x27;, headers: { Cookie: cookie } });</code> | integrations.test.mjs: 명시한 URL·method·header·body로 HTTP 요청을 보낸다. |
| 18 | <code>  assert.equal(callback.status, 302); const code = new URL(callback.headers.get(&#x27;location&#x27;)).searchParams.get(&#x27;code&#x27;);</code> | integrations.test.mjs: 고정 base에 경로·쿼리를 연결하거나 URL 부분을 안전하게 해석한다. |
| 19 | <code>  const exchange = await request(&#x27;/api/oauth/exchange&#x27;, { method: &#x27;POST&#x27;, body: { code } }); assert.equal(exchange.status, 200); assert.ok(exchange.value.data.accessToken);</code> | integrations.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 20 | <code>  assert.equal((await request(&#x27;/api/oauth/exchange&#x27;, { method: &#x27;POST&#x27;, body: { code } })).status, 401);</code> | integrations.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 21 | <code>  assert.equal((await fetch(base + target.pathname + target.search, { headers: { Cookie: cookie } })).status, 400);</code> | integrations.test.mjs: 명시한 URL·method·header·body로 HTTP 요청을 보낸다. |
| 22 | <code>});</code> | integrations.test.mjs의 현재 블록 또는 선언을 닫는다. |
| 23 | <code>test(&#x27;mock 결제·메일 응답과 사용자 한도&#x27;, async t =&gt; {</code> | integrations.test.mjs: 독립적인 검증 시나리오와 비동기 정리 범위를 정의한다. |
| 24 | <code>  const { request, account } = await fixture(t); const { accessToken: token } = await account();</code> | integrations.test.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 25 | <code>  const checkout = await request(&#x27;/api/services/checkout&#x27;, { method: &#x27;POST&#x27;, token, headers: { &#x27;Idempotency-Key&#x27;: &#x27;once&#x27; } }); assert.equal(checkout.value.data.provider, &#x27;mock&#x27;); assert.equal(checkout.value.data.paid, false);</code> | integrations.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 26 | <code>  for (let i = 0; i &lt; 3; i++) assert.equal((await request(&#x27;/api/services/mail&#x27;, { method: &#x27;POST&#x27;, token })).status, 200);</code> | integrations.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 27 | <code>  assert.equal((await request(&#x27;/api/services/mail&#x27;, { method: &#x27;POST&#x27;, token })).status, 429);</code> | integrations.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 28 | <code>});</code> | integrations.test.mjs의 현재 블록 또는 선언을 닫는다. |
| 29 | <code>test(&#x27;SSE를 패킷 중간에서 나눠도 복원하고 Anthropic 사용량을 읽는다&#x27;, async () =&gt; {</code> | integrations.test.mjs: 독립적인 검증 시나리오와 비동기 정리 범위를 정의한다. |
| 30 | <code>  const raw = &#x27;event: message_start\ndata: {&quot;type&quot;:&quot;message_start&quot;,&quot;message&quot;:{&quot;usage&quot;:{&quot;input_tokens&quot;:12}}}\n\ndata: {&quot;type&quot;:&quot;content_block_delta&quot;,&quot;delta&quot;:{&quot;type&quot;:&quot;text_delta&quot;,&quot;text&quot;:&quot;한글&quot;}}\n\ndata: {&quot;type&quot;:&quot;message_delta&quot;,&quot;delta&quot;:{&quot;stop_reason&quot;:&quot;end_turn&quot;},&quot;usage&quot;:{&quot;output_tokens&quot;:3}}\n\n&#x27;;</code> | integrations.test.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 31 | <code>  const bytes = new TextEncoder().encode(raw); const body = new ReadableStream({ start(c) { for (let i = 0; i &lt; bytes.length; i += 7) c.enqueue(bytes.slice(i, i + 7)); c.close(); } });</code> | integrations.test.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 32 | <code>  const result = [];</code> | integrations.test.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 33 | <code>  for await (const event of modelStream({ provider: &#x27;anthropic&#x27;, model: &#x27;configured-model&#x27;, key: &#x27;server-only&#x27;, prompt: &#x27;hello&#x27;, fetcher: async () =&gt; new Response(body) })) result.push(event);</code> | integrations.test.mjs의 각 항목·프레임·작업을 순서대로 처리한다. |
| 34 | <code>  assert.equal(result[0].text, &#x27;한글&#x27;); assert.deepEqual(result[1].usage, { inputTokens: 12, outputTokens: 3 });</code> | integrations.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 35 | <code>});</code> | integrations.test.mjs의 현재 블록 또는 선언을 닫는다. |
| 36 | <code>test(&#x27;RAG는 질문과 겹치는 발췌만 반환한다&#x27;, () =&gt; {</code> | integrations.test.mjs: 독립적인 검증 시나리오와 비동기 정리 범위를 정의한다. |
| 37 | <code>  assert.equal(retrieve(&#x27;시그널은 상태입니다.&#x27;, &#x27;시그널&#x27;).length, 1); assert.deepEqual(retrieve(&#x27;시그널&#x27;, &#x27;unrelated&#x27;), []);</code> | integrations.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 38 | <code>});</code> | integrations.test.mjs의 현재 블록 또는 선언을 닫는다. |
| 39 | <code>test(&#x27;WebSocket 공개 변경 알림&#x27;, async t =&gt; {</code> | integrations.test.mjs: 독립적인 검증 시나리오와 비동기 정리 범위를 정의한다. |
| 40 | <code>  const { base, request, account, config } = await fixture(t); const { accessToken: token } = await account();</code> | integrations.test.mjs에서 다음 처리에 사용할 값·함수·상태 참조를 준비한다. |
| 41 | <code>  const ws = new WebSocket(base.replace(&#x27;http&#x27;, &#x27;ws&#x27;) + &#x27;/ws&#x27;, { origin: config.origin }); t.after(() =&gt; ws.terminate());</code> | integrations.test.mjs: 테스트 종료 시 서버·DB·MCP 연결을 정리한다. |
| 42 | <code>  await new Promise((resolve, reject) =&gt; { ws.once(&#x27;open&#x27;, resolve); ws.once(&#x27;error&#x27;, reject); });</code> | integrations.test.mjs의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 43 | <code>  const event = new Promise((resolve, reject) =&gt; { const timeout = setTimeout(() =&gt; reject(new Error(&#x27;알림 시간 초과&#x27;)), 2000); ws.once(&#x27;message&#x27;, message =&gt; { clearTimeout(timeout); resolve(JSON.parse(message.toString())); }); });</code> | integrations.test.mjs: 시간 상한 또는 재연결 대기 후 작업을 예약한다. |
| 44 | <code>  await request(&#x27;/api/posts&#x27;, { method: &#x27;POST&#x27;, token, body: { title: &#x27;실시간&#x27;, body: &#x27;변경 알림&#x27; } });</code> | integrations.test.mjs의 앞서 선언한 데이터·객체·출력 구조에 이 줄의 값을 연결한다. |
| 45 | <code>  assert.equal((await event).type, &#x27;posts.changed&#x27;);</code> | integrations.test.mjs: 실제 결과와 기대 계약을 비교하여 회귀를 검출한다. |
| 46 | <code>});</code> | integrations.test.mjs의 현재 블록 또는 선언을 닫는다. |

## ④ 🔗 연동 포인트

같은 Bearer 인증으로 외부 API 요청을 보호한다. 문서 업로드는 study18의 근거 검색 입력으로 이어지고 결제·메일 호출 실패는 공통 오류 envelope로 UI에 표시한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| OAuth state 실패 | 쿠키 Origin·callback 불일치·재사용 | 같은 Origin으로 start부터 다시 시작 |
| 메일 거절 | 발신 도메인 미검증 | 공급자 설정과 MAIL_FROM 확인 |
| 결제 완료 오판 | 성공 리다이렉트만 신뢰 | 서명 webhook 전에는 paid=false 유지 |

## ⑥ 직접 해보기

1. mock OAuth의 state를 바꾸어 거절되는지 확인한다.
2. 가짜 fetch에서 502와 타임아웃을 만들어 UI 오류를 확인한다.
3. 업로드 경계 500KB와 허용하지 않는 확장자를 시험한다.

## ⑦ ☐ 체크리스트

- [ ] 결제·메일 키를 서버에서만 읽는다.
- [ ] 업로드 형식·크기·소유자를 검증한다.
- [ ] OAuth state·코드 교환·재사용 차단을 확인했다.
- [ ] mock 검사와 실제 서비스 거래 검증을 구분한다.

## ⑧ 다음 단계 연결 문장

서버 경계를 통해 외부 서비스에 연결하고 mock과 실제 호출을 명확히 구분한다를 마쳤다면 [study14.md](study14.md)에서 이어 간다.

공식 자료: [SolidJS 1.x 소스](https://github.com/solidjs/solid/tree/v1.9.20), [Solid Router](https://docs.solidjs.com/solid-router/getting-started/installation-and-setup), [Node SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html). 최신 문서와 설치 버전이 다를 수 있어 package-lock.json을 실행 기준으로 삼는다.
