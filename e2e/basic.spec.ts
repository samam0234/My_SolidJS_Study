import { test, expect } from '@playwright/test';
test('기초 빌드 로그인·CRUD (BASIC_E2E=1일 때만)', async ({ page }) => {
  test.skip(process.env.BASIC_E2E !== '1', '전용 기초 빌드에서 실행');
  await page.goto('/login'); await page.getByRole('button', { name: '회원가입으로' }).click();
  await page.getByLabel('이메일').fill('basic@example.com'); await page.getByLabel('비밀번호').fill('password123'); await page.getByLabel('닉네임').fill('기초'); await page.getByRole('button', { name: '가입 후 로그인' }).click();
  await page.getByRole('link', { name: '새 글 작성' }).click(); await page.getByLabel('제목', { exact: true }).fill('기초 글'); await page.getByLabel('본문', { exact: true }).fill('기초 범위 실습'); await page.getByRole('button', { name: '저장', exact: true }).click(); await expect(page.getByRole('heading', { name: '기초 글' })).toBeVisible();
  await expect(page.getByRole('link', { name: '문서 AI' })).toHaveCount(0); await page.getByRole('button', { name: '삭제', exact: true }).click(); await expect(page.getByRole('heading', { name: '학습 게시판' })).toBeVisible();
});
