import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testMatch: process.env.BASIC_E2E === '1' ? '**/basic.spec.ts' : '**/board.spec.ts', workers: 1, use: { baseURL: 'http://127.0.0.1:3100', headless: true },
  webServer: { command: process.env.BASIC_E2E === '1' ? 'npm run start:basic' : 'npm start', url: 'http://127.0.0.1:3100/health', reuseExistingServer: false, env: { PORT: '3100', HOST: '127.0.0.1', PUBLIC_ORIGIN: 'http://127.0.0.1:3100', CORS_ORIGIN: 'http://127.0.0.1:3100', SQLITE_PATH: ':memory:', AI_PROVIDER: 'mock', INTEGRATIONS_MODE: 'mock' } }
});
