import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const extensionPath = path.resolve(fileURLToPath(new URL('../../.output/chrome-mv3', import.meta.url)));

test('j scrolls a fixture page with the production extension loaded', async () => {
  // #given
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  try {
    const page = await context.newPage();
    await page.goto('/tall-page.html');
    // #when
    await page.keyboard.press('j');

    // #then
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(60);
  } finally {
    await context.close();
  }
});
