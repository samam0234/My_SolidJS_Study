import { useNavigate, useParams, A } from '@solidjs/router';
import { createResource, Show } from 'solid-js';
import { api } from '../api';
import { user } from '../session';
import type { Post, PostInput } from '../types';
import PostForm from '../components/PostForm';
export default function Editor() {
  const params = useParams(); const navigate = useNavigate();
  const [post] = createResource(() => params.id, id => api<{ data: Post }>(`/api/posts/${id}`));
  async function save(input: PostInput) {
    const result = await api<{ data: Post }>(params.id ? `/api/posts/${params.id}` : '/api/posts', { method: params.id ? 'PATCH' : 'POST', body: JSON.stringify(input) });
    navigate(`/posts/${result.data.id}`);
  }
  return <section><h1>{params.id ? '글 수정' : '새 글 작성'}</h1><Show when={user()} fallback={<p><A href="/login">로그인</A> 후 작성할 수 있습니다.</p>}>
    <Show when={!params.id} fallback={<Show when={post()?.data} keyed>{data => <PostForm initial={data} save={save} />}</Show>}><PostForm save={save} /></Show>
  </Show></section>;
}
