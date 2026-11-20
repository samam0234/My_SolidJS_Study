import { render, screen, fireEvent } from '@solidjs/testing-library';
import { expect, test, vi } from 'vitest';
import Signals from './Signals';
import PostForm from '../components/PostForm';
test('시그널 변경 시 생성 번호를 유지하고 memo·Show가 갱신된다', () => {
  render(() => <Signals />); const instance = screen.getByText(/컴포넌트 생성 번호/).textContent;
  for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: '증가' }));
  expect(screen.getByText(/원본 3 \/ 파생 6/)).toBeInTheDocument(); expect(screen.getByText(/컴포넌트 생성 번호/).textContent).toBe(instance); expect(screen.getByText('조건이 충족되었습니다.')).toBeInTheDocument();
});
test('localStorage 초안을 입력과 묶는다', () => {
  render(() => <Signals />); fireEvent.input(screen.getByLabelText('새로고침 후 남는 메모'), { target: { value: '초안' } }); expect(localStorage.getItem('solid-study-note')).toBe('초안');
});
test('저장 처리 중 중복 제출을 막는다', async () => {
  let finish!: () => void; const save = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
  render(() => <PostForm save={save} />); fireEvent.input(screen.getByLabelText('제목'), { target: { value: '제목' } }); fireEvent.input(screen.getByLabelText('본문'), { target: { value: '본문' } });
  const button = screen.getByRole('button', { name: '저장' }); fireEvent.click(button); fireEvent.click(button); expect(save).toHaveBeenCalledTimes(1); expect(button).toBeDisabled(); finish();
});
