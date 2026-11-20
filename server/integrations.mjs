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
