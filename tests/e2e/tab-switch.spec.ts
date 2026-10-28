import { chromium, expect, test, type BrowserContext, type Page, type Worker } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const extensionPath = path.resolve(fileURLToPath(new URL('../../.output/chrome-mv3', import.meta.url)));

interface ChromeTab {
  id?: number;
}

interface ChromeWindow {
  id?: number;
  tabs?: ChromeTab[];
}

interface ChromeExtensionApi {
  tabs: {
    create(options: { windowId: number; url: string; active?: boolean }, callback: (tab: ChromeTab) => void): void;
    query(options: { windowId: number; active: boolean }, callback: (tabs: ChromeTab[]) => void): void;
    update(tabId: number, options: { active: boolean }, callback: (tab: ChromeTab) => void): void;
  };
  windows: {
    create(options: { url: string; focused: boolean }, callback: (window: ChromeWindow) => void): void;
  };
}

interface TestWindow {
  windowId: number;
  tabIds: number[];
}

async function openExtensionContext(): Promise<BrowserContext> {
  return chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });
}

async function extensionServiceWorker(context: BrowserContext): Promise<Worker> {
  return context.serviceWorkers()[0] ?? context.waitForEvent('serviceworker');
}

async function createTestWindow(worker: Worker, urls: string[]): Promise<TestWindow> {
  return worker.evaluate(async (fixtureUrls) => {
    const chromeApi = (globalThis as typeof globalThis & { chrome: ChromeExtensionApi }).chrome;
    const createdWindow = await new Promise<ChromeWindow>((resolve) => {
      chromeApi.windows.create({ url: fixtureUrls[0]!, focused: true }, resolve);
    });
    const windowId = createdWindow.id;
    const firstTabId = createdWindow.tabs?.[0]?.id;

    if (windowId === undefined || firstTabId === undefined) {
      throw new Error('Chromium did not return the created window and tab IDs');
    }

    const tabIds = [firstTabId];
    for (const url of fixtureUrls.slice(1)) {
      const tab = await new Promise<ChromeTab>((resolve) => {
        chromeApi.tabs.create({ windowId, url, active: false }, resolve);
      });
      if (tab.id === undefined) {
        throw new Error('Chromium did not return the created tab ID');
      }
      tabIds.push(tab.id);
    }

    return { windowId, tabIds };
  }, urls);
}

async function activateTab(worker: Worker, tabId: number): Promise<void> {
  await worker.evaluate(async (id) => {
    const chromeApi = (globalThis as typeof globalThis & { chrome: ChromeExtensionApi }).chrome;
    await new Promise<ChromeTab>((resolve) => {
      chromeApi.tabs.update(id, { active: true }, resolve);
    });
  }, tabId);
}

async function activeTabId(worker: Worker, windowId: number): Promise<number | null> {
  return worker.evaluate(async (id) => {
    const chromeApi = (globalThis as typeof globalThis & { chrome: ChromeExtensionApi }).chrome;
    const tabs = await new Promise<ChromeTab[]>((resolve) => {
      chromeApi.tabs.query({ windowId: id, active: true }, resolve);
    });
    return tabs[0]?.id ?? null;
  }, windowId);
}

async function pageForUrl(context: BrowserContext, url: string): Promise<Page> {
  await expect.poll(() => context.pages().some((page) => page.url() === url)).toBe(true);
  const page = context.pages().find((candidate) => candidate.url() === url);
  if (!page) {
    throw new Error(`Chromium did not expose the fixture page ${url}`);
  }
  await page.waitForLoadState();
  return page;
}

test('Shift+K on the last tab activates the first tab', async ({ baseURL }) => {
  // #given
  const context = await openExtensionContext();
  try {
    const worker = await extensionServiceWorker(context);
    const urls = [0, 1, 2].map((index) => `${baseURL}/tall-page.html?right-wrap=${index}`);
    const testWindow = await createTestWindow(worker, urls);
    const firstTabId = testWindow.tabIds[0]!;
    const lastTabId = testWindow.tabIds[2]!;
    await activateTab(worker, lastTabId);
    const lastPage = await pageForUrl(context, urls[2]!);

    // #when
    await lastPage.keyboard.press('Shift+K');

    // #then
    await expect.poll(() => activeTabId(worker, testWindow.windowId)).toBe(firstTabId);
  } finally {
    await context.close();
  }
});

test('Shift+J on the first tab activates the last tab', async ({ baseURL }) => {
  // #given
  const context = await openExtensionContext();
  try {
    const worker = await extensionServiceWorker(context);
    const urls = [0, 1, 2].map((index) => `${baseURL}/tall-page.html?left-wrap=${index}`);
    const testWindow = await createTestWindow(worker, urls);
    const firstTabId = testWindow.tabIds[0]!;
    const lastTabId = testWindow.tabIds[2]!;
    await activateTab(worker, firstTabId);
    const firstPage = await pageForUrl(context, urls[0]!);

    // #when
    await firstPage.keyboard.press('Shift+J');

    // #then
    await expect.poll(() => activeTabId(worker, testWindow.windowId)).toBe(lastTabId);
  } finally {
    await context.close();
  }
});

test('a Tab switch stays in its current window', async ({ baseURL }) => {
  // #given
  const context = await openExtensionContext();
  try {
    const worker = await extensionServiceWorker(context);
    const currentUrls = [0, 1].map((index) => `${baseURL}/tall-page.html?current-window=${index}`);
    const otherUrls = [0, 1].map((index) => `${baseURL}/tall-page.html?other-window=${index}`);
    const currentWindow = await createTestWindow(worker, currentUrls);
    const otherWindow = await createTestWindow(worker, otherUrls);
    const currentFirstTabId = currentWindow.tabIds[0]!;
    const currentLastTabId = currentWindow.tabIds[1]!;
    const otherLastTabId = otherWindow.tabIds[1]!;
    await activateTab(worker, otherLastTabId);
    await activateTab(worker, currentLastTabId);
    const currentPage = await pageForUrl(context, currentUrls[1]!);

    // #when
    await currentPage.keyboard.press('Shift+K');

    // #then
    await expect.poll(async () => ({
      current: await activeTabId(worker, currentWindow.windowId),
      other: await activeTabId(worker, otherWindow.windowId),
    })).toEqual({ current: currentFirstTabId, other: otherLastTabId });
  } finally {
    await context.close();
  }
});

test('Shift+J switches tabs when the text field is not focused', async ({ baseURL }) => {
  // #given
  const context = await openExtensionContext();
  try {
    const worker = await extensionServiceWorker(context);
    const urls = [
      `${baseURL}/tall-page.html?typing-enabled-control=0`,
      `${baseURL}/form-controls.html?typing-enabled-control=1`,
    ];
    const testWindow = await createTestWindow(worker, urls);
    const firstTabId = testWindow.tabIds[0]!;
    const formTabId = testWindow.tabIds[1]!;
    await activateTab(worker, formTabId);
    const formPage = await pageForUrl(context, urls[1]!);
    await formPage.locator('#button').focus();

    // #when
    await formPage.keyboard.press('Shift+J');

    // #then
    await expect.poll(() => activeTabId(worker, testWindow.windowId)).toBe(firstTabId);
  } finally {
    await context.close();
  }
});

test('Shift+J typed in a text field inserts J without switching tabs', async ({ baseURL }) => {
  // #given
  const context = await openExtensionContext();
  try {
    const worker = await extensionServiceWorker(context);
    const urls = [
      `${baseURL}/tall-page.html?typing-control=0`,
      `${baseURL}/form-controls.html?typing-control=1`,
    ];
    const testWindow = await createTestWindow(worker, urls);
    const textTabId = testWindow.tabIds[1]!;
    await activateTab(worker, textTabId);
    const textPage = await pageForUrl(context, urls[1]!);
    const textField = textPage.locator('#search');
    await textField.focus();

    // #when
    await textPage.keyboard.press('Shift+J');

    // #then
    await expect.poll(async () => ({
      value: await textField.inputValue(),
      activeTabId: await activeTabId(worker, testWindow.windowId),
    })).toEqual({ value: 'J', activeTabId: textTabId });
  } finally {
    await context.close();
  }
});
