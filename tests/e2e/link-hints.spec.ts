import { expect, test } from '@playwright/test';

import { openExtensionContext, waitForContentScriptReady } from './extension-tabs';

test('shows only 900 non-empty Link hints for more than 900 visible targets', async () => {
  // #given
  const context = await openExtensionContext();
  const page = await context.newPage();
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  try {
    await page.goto('/many-targets.html');
    await waitForContentScriptReady(page);
    const targetCounts = await page.locator('a').evaluateAll((targets) => ({
      total: targets.length,
      visible: targets.filter((target) => {
        const rect = target.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth;
      }).length,
    }));
    expect(targetCounts).toEqual({ total: 901, visible: 901 });

    // #when
    await page.keyboard.press('f');
    await page.keyboard.press('8');

    // #then
    const codes = await page.locator('.vimnav-link-hint').allTextContents();
    expect({
      count: codes.length,
      invalidCodes: codes.filter((code) => code.length !== 2),
      pageErrors,
    }).toEqual({ count: 900, invalidCodes: [], pageErrors: [] });
  } finally {
    await context.close();
  }
});
