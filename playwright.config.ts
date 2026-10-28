import { defineConfig, devices } from '@playwright/test';

// Parallel worktrees each set their own port, so no run serves another checkout's fixtures.
const port = Number(process.env.E2E_PORT ?? 4173);

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `python3 -m http.server ${port} --directory tests/fixtures`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
