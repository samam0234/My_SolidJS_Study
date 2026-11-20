import { A, useSearchParams } from '@solidjs/router';
import { createResource, For, Show, ErrorBoundary } from 'solid-js';
import { api } from '../api';
import type { Post, Meta } from '../types';
import PostCard from '../components/PostCard';
export default function Posts() {
  const [query, setQuery] = useSearchParams();
  const [posts] = createResource(() => new URLSearchParams({ q: String(query.q || ''), page: String(query.page || 1), sort: String(query.sort || '-createdAt') }).toString(),
    search => api<{ data: Post[]; meta: Meta }>(`/api/posts?${search}`));
  return <section>
    <div class="section-title"><div><p class="eyebrow">BUILD WITH SIGNALS</p><h1>학습 게시판</h1></div><A class="button" href="/posts/new">새 글 작성</A></div>
    <form class="search" onSubmit={e => { e.preventDefault(); const form = new FormData(e.currentTarget); setQuery({ q: String(form.get('q') || ''), page: 1 }); }}>
      <label>검색<input name="q" value={String(query.q || '')} placeholder="제목 또는 본문" /></label><button>검색</button>
      <label>정렬<select value={String(query.sort || '-createdAt')} onChange={e => setQuery({ sort: e.currentTarget.value, page: 1 })}><option value="-createdAt">최신순</option><option value="createdAt">오래된순</option><option value="-commentCount">댓글순</option></select></label>
    </form>
    <ErrorBoundary fallback={(e, reset) => <p role="alert">{String(e.message)} <button onClick={reset}>다시 시도</button></p>}>
      <Show when={!posts.loading} fallback={<p role="status">불러오는 중…</p>}>
        <Show when={posts()?.data.length} fallback={<p>첫 번째 학습 기록을 남겨 보세요.</p>}><div class="grid"><For each={posts()?.data}>{post => <PostCard post={post} />}</For></div></Show>
        <nav class="pagination" aria-label="페이지"><button disabled={Number(query.page || 1) <= 1} onClick={() => setQuery({ page: Number(query.page || 1) - 1 })}>이전</button><span>{posts()?.meta.page} / {posts()?.meta.totalPages || 1}</span><button disabled={(posts()?.meta.page || 1) >= (posts()?.meta.totalPages || 1)} onClick={() => setQuery({ page: Number(query.page || 1) + 1 })}>다음</button></nav>
      </Show>
    </ErrorBoundary>
  </section>;
}
