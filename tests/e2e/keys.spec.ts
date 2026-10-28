import { chromium, expect, test, type BrowserContext, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const extensionPath = path.resolve(fileURLToPath(new URL('../../.output/chrome-mv3', import.meta.url)));

interface SyntheticKey {
  key: string;
  code: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  isComposing?: boolean;
}

interface ExtensionPage {
  context: BrowserContext;
  page: Page;
}

async function openExtensionPage(fixturePath: string): Promise<ExtensionPage> {
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });
  const page = await context.newPage();
  await page.goto(fixturePath);
  return { context, page };
}

async function tapSyntheticKey(page: Page, key: SyntheticKey): Promise<void> {
  await page.evaluate((keyInit) => {
    document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...keyInit }));
    document.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, ...keyInit }));
  }, key);
}

async function dispatchSyntheticKey(page: Page, type: 'keydown' | 'keyup', key: SyntheticKey): Promise<void> {
  await page.evaluate(({ eventType, keyInit }) => {
    document.dispatchEvent(new KeyboardEvent(eventType, { bubbles: true, cancelable: true, ...keyInit }));
  }, { eventType: type, keyInit: key });
}

test('plain physical KeyJ scrolls exactly once', async () => {
  // #given
  const { context, page } = await openExtensionPage('/tall-page.html');

  try {
    // #when
    await tapSyntheticKey(page, { key: 'j', code: 'KeyJ' });

    // #then
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(60);
  } finally {
    await context.close();
  }
});

test('Russian-layout KeyJ scrolls down by physical position', async () => {
  // #given
  const { context, page } = await openExtensionPage('/tall-page.html');

  try {
    // #when
    await tapSyntheticKey(page, { key: 'о', code: 'KeyJ' });

    // #then
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(60);
  } finally {
    await context.close();
  }
});

test('Caps-Lock-style KeyJ without Shift scrolls down', async () => {
  // #given
  const { context, page } = await openExtensionPage('/tall-page.html');

  try {
    // #when
    await tapSyntheticKey(page, { key: 'J', code: 'KeyJ', shiftKey: false });

    // #then
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(60);
  } finally {
    await context.close();
  }
});

test('Caps-Lock-style KeyG KeyG goes to the top', async () => {
  // #given
  const { context, page } = await openExtensionPage('/tall-page.html');

  try {
    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.waitForFunction(() => window.scrollY === 1000);

    // #when
    await tapSyntheticKey(page, { key: 'G', code: 'KeyG', shiftKey: false });
    await tapSyntheticKey(page, { key: 'G', code: 'KeyG', shiftKey: false });

    // #then
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  } finally {
    await context.close();
  }
});

test('plain KeyF displays the fixture Link hint', async () => {
  // #given
  const { context, page } = await openExtensionPage('/hint-page.html');

  try {
    // #when
    await tapSyntheticKey(page, { key: 'f', code: 'KeyF' });

    // #then
    await expect(page.locator('.vimnav-link-hint')).toHaveCount(1);
  } finally {
    await context.close();
  }
});

test('Ctrl+F does not display Link hints', async () => {
  // #given
  const { context, page } = await openExtensionPage('/hint-page.html');

  try {
    // #when
    await tapSyntheticKey(page, { key: 'f', code: 'KeyF', ctrlKey: true });

    // #then
    await expect(page.locator('.vimnav-link-hint')).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test('IME composition does not scroll on KeyJ', async () => {
  // #given
  const { context, page } = await openExtensionPage('/tall-page.html');

  try {
    // #when
    await tapSyntheticKey(page, { key: 'j', code: 'KeyJ', isComposing: true });

    // #then
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  } finally {
    await context.close();
  }
});

test('Latin Hint code activates the fixture element', async () => {
  // #given
  const { context, page } = await openExtensionPage('/hint-page.html');

  try {
    await tapSyntheticKey(page, { key: 'f', code: 'KeyF' });

    // #when
    await tapSyntheticKey(page, { key: 'a', code: 'KeyA' });
    await tapSyntheticKey(page, { key: 'a', code: 'KeyA' });

    // #then
    await expect(page).toHaveURL(/\/hint-page\.html#activated$/);
  } finally {
    await context.close();
  }
});

test('Russian-layout Hint code activates its element by physical position', async () => {
  // #given
  const { context, page } = await openExtensionPage('/hint-page.html');

  try {
    await tapSyntheticKey(page, { key: 'f', code: 'KeyF' });

    // #when
    await tapSyntheticKey(page, { key: 'ф', code: 'KeyA' });
    await tapSyntheticKey(page, { key: 'ф', code: 'KeyA' });

    // #then
    await expect(page).toHaveURL(/\/hint-page\.html#activated$/);
  } finally {
    await context.close();
  }
});

test('Russian-layout KeyJ keyup stops continuous scrolling by physical position', async () => {
  // #given
  const { context, page } = await openExtensionPage('/tall-page.html');

  try {
    await page.keyboard.down('j');
    await page.keyboard.down('j');
    await page.waitForFunction(() => window.scrollY >= 120);
    const positionAfterRepeat = await page.evaluate(() => window.scrollY);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(positionAfterRepeat);

    // #when
    await dispatchSyntheticKey(page, 'keyup', { key: 'о', code: 'KeyJ' });
    const positionAtRelease = await page.evaluate(() => window.scrollY);
    await page.waitForTimeout(60);
    const positionAfterRelease = await page.evaluate(() => window.scrollY);
    await dispatchSyntheticKey(page, 'keyup', { key: 'j', code: 'KeyJ' });

    // #then
    expect(positionAfterRelease).toBe(positionAtRelease);
  } finally {
    await context.close();
  }
});
