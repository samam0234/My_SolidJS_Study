import { A } from '@solidjs/router';
import { For } from 'solid-js';
import type { Post } from '../types';
export default function PostCard(props: { post: Post }) {
  return <article class="card">
    <p class="eyebrow">#{props.post.id} · {props.post.author.nickname}</p>
    <h2><A href={`/posts/${props.post.id}`}>{props.post.title}</A></h2>
    <p>{props.post.body.slice(0, 140)}</p>
    <footer><span>댓글 {props.post.commentCount}</span><For each={props.post.tags}>{tag => <span class="tag">{tag}</span>}</For></footer>
  </article>;
}
