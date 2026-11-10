import { defineConfig, devices } from '@playwright/test'

/** Smoke-Test gegen den Produktions-Build. Externe Dienste werden im Test nachgebildet. */
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  use: { ...devices['Pixel 7'], baseURL: 'http://localhost:4173', serviceWorkers: 'block' },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
