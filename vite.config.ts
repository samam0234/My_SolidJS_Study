import { defineConfig } from 'vitest/config';
import solid from 'vite-plugin-solid';
export default defineConfig({
  plugins: [solid()],
  server: { port: 5173, strictPort: true, proxy: { '/api': 'http://127.0.0.1:3000', '/health': 'http://127.0.0.1:3000', '/ws': { target: 'ws://127.0.0.1:3000', ws: true } } },
  test: { environment: 'jsdom', include: ['src/**/*.test.tsx'], setupFiles: ['src/test-setup.ts'] }
});
