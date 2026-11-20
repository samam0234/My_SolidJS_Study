import { A, useParams, useNavigate } from '@solidjs/router';
import { createResource, createSignal, For, Show } from 'solid-js';
import { api } from '../api';
import { user } from '../session';
import type { Post } from '../types';
type Comment = { id: number; body: string; author: { id: number; nickname: string } };
export default function Detail() {
  const params = useParams(); const navigate = useNavigate(); const [error, setError] = createSignal('');
  const [post] = createResource(() => params.id, id => api<{ data: Post }>(`/api/posts/${id}`));
  const [comments, { refetch }] = createResource(() => params.id, id => api<{ data: Comment[] }>(`/api/posts/${id}/comments`));
  const [comment, setComment] = createSignal(''); const [busy, setBusy] = createSignal(false);
  async function remove() { try { await api(`/api/posts/${params.id}`, { method: 'DELETE' }); navigate('/'); } catch (e) { setError((e as Error).message); } }
  async function addComment(e: SubmitEvent) {
    e.preventDefault(); if (busy()) return; setBusy(true); setError('');
    try { await api(`/api/posts/${params.id}/comments`, { method: 'POST', body: JSON.stringify({ body: comment() }) }); setComment(''); await refetch(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function removeComment(id: number) { try { await api(`/api/comments/${id}`, { method: 'DELETE' }); await refetch(); } catch (e) { setError((e as Error).message); } }
  return <section><A href="/">← 목록</A><Show when={post()?.data} keyed>{p => <article class="card detail"><p class="eyebrow">{p.author.nickname} · {new Date(p.createdAt).toLocaleString('ko-KR')}</p><h1>{p.title}</h1><p class="prose">{p.body}</p><Show when={user()?.id === p.author.id}><A href={`/posts/${p.id}/edit`}>수정</A> <button class="danger" onClick={remove}>삭제</button></Show></article>}</Show>
    <h2>댓글</h2><For each={comments()?.data}>{c => <p>{c.author.nickname}: {c.body} <Show when={c.author.id === user()?.id}><button class="subtle" onClick={() => removeComment(c.id)}>댓글 삭제</button></Show></p>}</For>
    <Show when={user()}><form onSubmit={addComment}><label>댓글<input required maxLength={2000} value={comment()} onInput={e => setComment(e.currentTarget.value)} /></label><button disabled={busy()}>댓글 등록</button></form></Show><Show when={error()}><p role="alert">{error()}</p></Show>
  </section>;
}
