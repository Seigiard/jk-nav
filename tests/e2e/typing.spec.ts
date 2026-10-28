import { chromium, expect, test, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const extensionPath = path.resolve(fileURLToPath(new URL('../../.output/chrome-mv3', import.meta.url)));

async function withFormPage(run: (page: Page) => Promise<void>): Promise<void> {
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
    await page.goto('/form-controls.html');
    await run(page);
  } finally {
    await context.close();
  }
}

test('j scrolls after clicking a button', async () => {
  await withFormPage(async (page) => {
    // #given
    await page.locator('#button').click();

    // #when
    await page.keyboard.press('j');

    // #then
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 1000 }).toBeGreaterThanOrEqual(60);
  });
});

for (const control of [
  { name: 'checkbox', selector: '#checkbox' },
  { name: 'radio button', selector: '#radio' },
] as const) {
  test(`j scrolls after clicking a ${control.name}`, async () => {
    await withFormPage(async (page) => {
      // #given
      await page.locator(control.selector).click();

      // #when
      await page.keyboard.press('j');

      // #then
      await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 1000 }).toBeGreaterThanOrEqual(60);
    });
  });
}

test('j scrolls with a slider focused', async () => {
  await withFormPage(async (page) => {
    // #given
    await page.locator('#range').focus();

    // #when
    await page.keyboard.press('j');

    // #then
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 1000 }).toBeGreaterThanOrEqual(60);
  });
});

test('typing navigation keys in a search field changes only its value', async () => {
  await withFormPage(async (page) => {
    // #given
    const search = page.locator('#search');
    await search.focus();

    // #when
    await page.keyboard.type('jkJKf');

    // #then
    expect({
      value: await search.inputValue(),
      scrollY: await page.evaluate(() => window.scrollY),
      linkHints: await page.locator('.vimnav-link-hint').count(),
    }).toEqual({ value: 'jkJKf', scrollY: 0, linkHints: 0 });
  });
});

test('navigation keys stay silent with a number field focused', async () => {
  await withFormPage(async (page) => {
    // #given
    await page.locator('#number').focus();

    // #when
    await page.keyboard.type('jf');

    // #then
    expect({
      scrollY: await page.evaluate(() => window.scrollY),
      linkHints: await page.locator('.vimnav-link-hint').count(),
    }).toEqual({ scrollY: 0, linkHints: 0 });
  });
});

test('navigation keys stay silent with a date field focused', async () => {
  await withFormPage(async (page) => {
    // #given
    await page.locator('#date').focus();

    // #when
    await page.keyboard.type('jf');

    // #then
    expect({
      scrollY: await page.evaluate(() => window.scrollY),
      linkHints: await page.locator('.vimnav-link-hint').count(),
    }).toEqual({ scrollY: 0, linkHints: 0 });
  });
});

test('typing navigation keys in a text area changes only its value', async () => {
  await withFormPage(async (page) => {
    // #given
    const textarea = page.locator('#textarea');
    await textarea.focus();

    // #when
    await page.keyboard.type('jkJKf');

    // #then
    expect({
      value: await textarea.inputValue(),
      scrollY: await page.evaluate(() => window.scrollY),
      linkHints: await page.locator('.vimnav-link-hint').count(),
    }).toEqual({ value: 'jkJKf', scrollY: 0, linkHints: 0 });
  });
});

test('typing navigation keys in editable content changes only its text', async () => {
  await withFormPage(async (page) => {
    // #given
    const editable = page.locator('#editable');
    await editable.focus();

    // #when
    await page.keyboard.type('jkJKf');

    // #then
    expect({
      text: await editable.textContent(),
      scrollY: await page.evaluate(() => window.scrollY),
      linkHints: await page.locator('.vimnav-link-hint').count(),
    }).toEqual({ text: 'jkJKf', scrollY: 0, linkHints: 0 });
  });
});

test('typing navigation keys in an open shadow root text field changes only its value', async () => {
  await withFormPage(async (page) => {
    // #given
    const shadowInput = page.locator('shadow-text-field input');
    await shadowInput.focus();

    // #when
    await page.keyboard.type('jkJKf');

    // #then
    expect({
      value: await shadowInput.inputValue(),
      scrollY: await page.evaluate(() => window.scrollY),
      linkHints: await page.locator('.vimnav-link-hint').count(),
    }).toEqual({ value: 'jkJKf', scrollY: 0, linkHints: 0 });
  });
});

test('a focused drop-down keeps type-to-select and does not scroll', async () => {
  await withFormPage(async (page) => {
    // #given
    const select = page.locator('#select');
    await select.focus();

    // #when
    await page.keyboard.press('j');

    // #then
    expect({
      value: await select.inputValue(),
      scrollY: await page.evaluate(() => window.scrollY),
    }).toEqual({ value: 'javascript', scrollY: 0 });
  });
});
