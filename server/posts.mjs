import { fail, text } from './errors.mjs';
export function validatePost(input, partial = false) {
  const row = {};
  for (const [name, max] of [['title', 200], ['body', 20000]]) {
    if (!partial || name in input) row[name] = text(input[name], name, max);
  }
  if (!partial || 'tags' in input) {
    if (input.tags !== undefined && (!Array.isArray(input.tags) || input.tags.length > 10 || input.tags.some(t => typeof t !== 'string' || t.length > 30)))
      fail(400, 'VALIDATION_ERROR', '태그는 30자 이하로 최대 10개입니다.', { tags: ['태그 형식을 확인하세요.'] });
    row.tags = input.tags || [];
  }
  return row;
}
export async function postDto(repo, post) {
  const author = await repo.get('users', post.authorId);
  const { authorId, ...data } = post;
  return { ...data, author: { id: authorId, nickname: author?.nickname || '탈퇴 회원' }, commentCount: (await repo.all('comments')).filter(c => c.postId === post.id).length };
}
export async function listPosts(repo, query) {
  const page = Math.max(1, Math.trunc(Number(query.get('page')) || 1));
  const limit = Math.min(50, Math.max(1, Math.trunc(Number(query.get('limit')) || 10)));
  const q = (query.get('q') || '').slice(0, 200); const sort = query.get('sort') || '-createdAt';
  if (!['createdAt', '-createdAt', '-commentCount'].includes(sort)) fail(400, 'BAD_REQUEST', '지원하지 않는 정렬입니다.');
  const filtered = (await repo.all('posts')).filter(p => `${p.title} ${p.body}`.toLowerCase().includes(q.toLowerCase()));
  const rows = await Promise.all(filtered.map(p => postDto(repo, p)));
  rows.sort((a, b) => sort === '-commentCount' ? b.commentCount - a.commentCount || b.id - a.id : (sort === 'createdAt' ? 1 : -1) * (a.createdAt.localeCompare(b.createdAt) || a.id - b.id));
  return { data: rows.slice((page - 1) * limit, page * limit), meta: { page, limit, total: rows.length, totalPages: Math.ceil(rows.length / limit), q } };
}
