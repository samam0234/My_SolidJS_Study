import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch();
const base = process.env.WEB_BASE || 'http://localhost:3101';
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }); const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/labs`);
  try { await page.getByRole('heading', { name: '시그널 실험실' }).waitFor({ timeout: 5000 }); }
  catch (error) { console.log(JSON.stringify({ text: await page.locator('body').innerText(), errors })); throw error; }
  await mkdir('test-results', { recursive: true }); await page.screenshot({ path: 'test-results/desktop.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 }); await page.goto(`${base}/login`); await page.getByRole('heading', { name: '로그인' }).waitFor();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  if (overflow || errors.length) throw new Error(JSON.stringify({ overflow, errors }));
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
  console.log('데스크톱·모바일 화면 표시, 가로 넘침 없음, pageerror 0');
} finally { await browser.close(); }
