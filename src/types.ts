export type User = { id: number; email: string; nickname: string };
export type Post = { id: number; title: string; body: string; tags: string[]; author: { id: number; nickname: string }; commentCount: number; createdAt: string; updatedAt: string };
export type PostInput = Pick<Post, 'title' | 'body' | 'tags'>;
export type Meta = { page: number; limit: number; total: number; totalPages: number; q: string };
export type Document = { id: number; filename: string; content: string; createdAt: string };
export type Source = { index: number; text: string; score: number };
export type Question = { id: number; question: string; answer: string; sources: Source[]; stopReason?: string };
