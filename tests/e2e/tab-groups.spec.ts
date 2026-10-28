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
  runtime: {
    lastError?: { message?: string };
  };
  tabGroups?: {
    update(groupId: number, options: { collapsed: boolean }, callback: () => void): void;
  };
  tabs: {
    create(options: { windowId: number; url: string; active?: boolean }, callback: (tab: ChromeTab) => void): void;
    group(options: { tabIds: number[] }, callback: (groupId: number) => void): void;
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

async function collapseTabs(worker: Worker, tabIds: number[]): Promise<void> {
  await worker.evaluate(async (ids) => {
    const chromeApi = (globalThis as typeof globalThis & { chrome: ChromeExtensionApi }).chrome;
    const groupId = await new Promise<number>((resolve, reject) => {
      chromeApi.tabs.group({ tabIds: ids }, (createdGroupId) => {
        const message = chromeApi.runtime.lastError?.message;
        if (message) {
          reject(new Error(`chrome.tabs.group failed: ${message}`));
          return;
        }
        resolve(createdGroupId);
      });
    });

    if (!chromeApi.tabGroups) {
      throw new Error('chrome.tabGroups is undefined');
    }

    await new Promise<void>((resolve, reject) => {
      chromeApi.tabGroups?.update(groupId, { collapsed: true }, () => {
        const message = chromeApi.runtime.lastError?.message;
        if (message) {
          reject(new Error(`chrome.tabGroups.update failed: ${message}`));
          return;
        }
        resolve();
      });
    });
  }, tabIds);
}

async function activateTab(worker: Worker, tabId: number): Promise<void> {
  await worker.evaluate(async (id) => {
    const chromeApi = (globalThis as typeof globalThis & { chrome: ChromeExtensionApi }).chrome;
    await new Promise<ChromeTab>((resolve) => {
      chromeApi.tabs.update(id, { active: true }, resolve);
    });
  }, tabId);
}

async function queryActiveTabId(worker: Worker, windowId: number): Promise<number | null> {
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

test('Shift+K skips a collapsed group and activates the next visible tab', async ({ baseURL }) => {
  // #given
  const context = await openExtensionContext();
  try {
    const worker = await extensionServiceWorker(context);
    const urls = [0, 1, 2].map((index) => `${baseURL}/tall-page.html?collapsed-between=${index}`);
    const testWindow = await createTestWindow(worker, urls);
    const activeTabId = testWindow.tabIds[0]!;
    const collapsedTabId = testWindow.tabIds[1]!;
    const visibleTabId = testWindow.tabIds[2]!;
    await collapseTabs(worker, [collapsedTabId]);
    await activateTab(worker, activeTabId);
    const activePage = await pageForUrl(context, urls[0]!);

    // #when
    await activePage.keyboard.press('Shift+K');

    // #then
    await expect.poll(() => queryActiveTabId(worker, testWindow.windowId)).toBe(visibleTabId);
  } finally {
    await context.close();
  }
});

test('Shift+K keeps the active tab when every other tab is in a collapsed group', async ({ baseURL }) => {
  // #given
  const context = await openExtensionContext();
  try {
    const worker = await extensionServiceWorker(context);
    const urls = [0, 1, 2].map((index) => `${baseURL}/tall-page.html?only-visible=${index}`);
    const testWindow = await createTestWindow(worker, urls);
    const activeTabId = testWindow.tabIds[0]!;
    await collapseTabs(worker, [testWindow.tabIds[1]!, testWindow.tabIds[2]!]);
    await activateTab(worker, activeTabId);
    const activePage = await pageForUrl(context, urls[0]!);

    // #when
    await activePage.keyboard.press('Shift+K');

    // #then
    await expect.poll(() => queryActiveTabId(worker, testWindow.windowId)).toBe(activeTabId);
  } finally {
    await context.close();
  }
});
