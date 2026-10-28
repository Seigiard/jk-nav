import { chromium, expect, test, type BrowserContext, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const extensionPath = path.resolve(fileURLToPath(new URL('../../.output/chrome-mv3', import.meta.url)));

interface ExtensionPage {
  context: BrowserContext;
  page: Page;
}

type ScrollKey = 'j' | 'k';

const RELEASE_CASES = [
  { name: 'plain KeyJ', key: 'j', code: 'KeyJ', keyValue: 'j', shiftKey: false },
  { name: 'shifted KeyJ', key: 'j', code: 'KeyJ', keyValue: 'J', shiftKey: true },
  { name: 'plain KeyK', key: 'k', code: 'KeyK', keyValue: 'k', shiftKey: false },
  { name: 'shifted KeyK', key: 'k', code: 'KeyK', keyValue: 'K', shiftKey: true },
] as const;

async function openExtensionPage(): Promise<ExtensionPage> {
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });
  const page = await context.newPage();
  await page.goto('/tall-page.html');
  await page.locator('#vimnav-styles').waitFor({ state: 'attached' });
  return { context, page };
}

async function startContinuousScroll(page: Page, key: ScrollKey = 'j'): Promise<void> {
  const initialPosition = key === 'j' ? 0 : 600;
  await page.evaluate((position) => window.scrollTo(0, position), initialPosition);
  await page.waitForFunction((position) => window.scrollY === position, initialPosition);
  await page.keyboard.down(key);
  await page.keyboard.down(key);
  await page.waitForFunction(({ direction, position }) => (
    direction === 'j' ? window.scrollY >= position + 120 : window.scrollY <= position - 120
  ), { direction: key, position: initialPosition });
  const positionAfterRepeat = await page.evaluate(() => window.scrollY);
  if (key === 'j') {
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(positionAfterRepeat);
  } else {
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(positionAfterRepeat);
  }
}

test('one KeyJ tap scrolls down exactly one step and then stays still', async () => {
  // #given
  const { context, page } = await openExtensionPage();

  try {
    // #when
    await page.keyboard.down('j');
    await page.waitForTimeout(50);
    await page.keyboard.up('j');
    const positionAtRelease = await page.evaluate(() => window.scrollY);
    await page.waitForTimeout(50);
    const positionAfterRelease = await page.evaluate(() => window.scrollY);

    // #then
    expect({ positionAtRelease, positionAfterRelease }).toEqual({
      positionAtRelease: 60,
      positionAfterRelease: 60,
    });
  } finally {
    await context.close();
  }
});

test('one KeyK tap scrolls up exactly one step', async () => {
  // #given
  const { context, page } = await openExtensionPage();

  try {
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForFunction(() => window.scrollY === 300);

    // #when
    await page.keyboard.down('k');
    await page.waitForTimeout(50);
    await page.keyboard.up('k');

    // #then
    expect(await page.evaluate(() => window.scrollY)).toBe(240);
  } finally {
    await context.close();
  }
});

test('a repeated KeyJ keydown starts Continuous scroll', async () => {
  // #given
  const { context, page } = await openExtensionPage();

  try {
    await page.keyboard.down('j');

    // #when
    await page.keyboard.down('j');
    await page.waitForFunction(() => window.scrollY >= 120);
    const positionAfterRepeat = await page.evaluate(() => window.scrollY);

    // #then
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(positionAfterRepeat);
  } finally {
    await context.close();
  }
});

for (const keyCase of RELEASE_CASES) {
  test(`${keyCase.name} keyup stops Continuous scroll`, async () => {
    // #given
    const { context, page } = await openExtensionPage();

    try {
      await startContinuousScroll(page, keyCase.key);

      // #when
      await page.evaluate(({ code, keyValue, shiftKey }) => {
        document.dispatchEvent(new KeyboardEvent('keyup', {
          bubbles: true,
          code,
          key: keyValue,
          shiftKey,
        }));
      }, keyCase);
      const positionAtRelease = await page.evaluate(() => window.scrollY);
      await page.waitForTimeout(50);

      // #then
      expect(await page.evaluate(() => window.scrollY)).toBe(positionAtRelease);
    } finally {
      await context.close();
    }
  });
}

test('window blur stops Continuous scroll', async () => {
  // #given
  const { context, page } = await openExtensionPage();

  try {
    await startContinuousScroll(page);

    // #when
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    const positionAtBlur = await page.evaluate(() => window.scrollY);
    await page.waitForTimeout(50);

    // #then
    expect(await page.evaluate(() => window.scrollY)).toBe(positionAtBlur);
  } finally {
    await context.close();
  }
});
