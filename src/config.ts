export const config = Object.freeze({
  apiBase: (import.meta.env.VITE_API_BASE || '').replace(/\/$/, ''),
  mode: import.meta.env.MODE
});
