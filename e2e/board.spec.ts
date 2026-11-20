import { test, expect } from '@playwright/test';
test('가입부터 CRUD·문서 AI·404까지 실제 화면 흐름', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/login'); await page.getByRole('button', { name: '회원가입으로' }).click();
  await page.getByLabel('이메일').fill('browser@example.com'); await page.getByLabel('비밀번호').fill('password123'); await page.getByLabel('닉네임').fill('브라우저'); await page.getByRole('button', { name: '가입 후 로그인' }).click();
  await expect(page.getByRole('heading', { name: '학습 게시판' })).toBeVisible(); await page.getByRole('link', { name: '새 글 작성' }).click();
  await page.getByLabel('제목', { exact: true }).fill('브라우저 학습'); await page.getByLabel('본문', { exact: true }).fill('<script>alert("xss")</script> 시그널 학습'); await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('heading', { name: '브라우저 학습' })).toBeVisible(); await expect(page.getByText('<script>alert("xss")</script> 시그널 학습')).toBeVisible();
  await page.getByLabel('댓글', { exact: true }).fill('댓글 확인'); await page.getByRole('button', { name: '댓글 등록' }).click(); await expect(page.getByText('브라우저: 댓글 확인')).toBeVisible();
  await page.getByRole('link', { name: '수정', exact: true }).click(); await page.getByLabel('제목', { exact: true }).fill('수정한 글'); await page.getByRole('button', { name: '저장', exact: true }).click(); await expect(page.getByRole('heading', { name: '수정한 글' })).toBeVisible();
  await page.getByRole('link', { name: '문서 AI' }).click(); await page.getByLabel('문서 업로드').setInputFiles({ name: 'signals.md', mimeType: 'text/markdown', buffer: Buffer.from('시그널은 읽는 위치를 추적한다. 문서 요약 테스트다.') });
  await expect(page.getByRole('button', { name: '근거로 답하기' })).toBeVisible(); await page.getByLabel('질문', { exact: true }).fill('시그널 설명'); await page.getByRole('button', { name: '근거로 답하기' }).click(); await expect(page.getByText('문서에서 찾은 근거입니다. (발췌 1)').first()).toBeVisible();
  await page.getByRole('link', { name: '실험실' }).click(); await page.getByRole('button', { name: '설정 열기' }).click(); await expect(page.getByRole('dialog')).toBeVisible(); await page.getByLabel('표시 이름').fill('새 이름'); await page.getByRole('button', { name: '설정 저장' }).click(); await page.getByRole('button', { name: '닫기', exact: true }).click(); await expect(page.getByText('현재 이름: 새 이름')).toBeVisible();
  await page.getByRole('link', { name: '게시판', exact: true }).click(); await page.getByRole('link', { name: '수정한 글' }).click(); await page.getByRole('button', { name: '삭제', exact: true }).click(); await expect(page.getByRole('heading', { name: '학습 게시판' })).toBeVisible();
  await page.goto('/missing'); await expect(page.getByRole('heading', { name: '404 · 페이지가 없습니다.' })).toBeVisible(); expect(errors).toEqual([]);
});
