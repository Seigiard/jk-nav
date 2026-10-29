import { expect, test } from '@playwright/test';

import {
  activateTab,
  createTestWindow,
  extensionServiceWorker,
  installTabSwitchTrace,
  openExtensionContext,
  pageForUrl,
  queryActiveTabId,
  readTabSwitchTrace,
} from './extension-tabs';

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
    await expect.poll(() => queryActiveTabId(worker, testWindow.windowId)).toBe(firstTabId);
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
    await expect.poll(() => queryActiveTabId(worker, testWindow.windowId)).toBe(lastTabId);
  } finally {
    await context.close();
  }
});

test('a Tab switch stays in its current window', async ({ baseURL }) => {
  // #given
  const context = await openExtensionContext();
  try {
    const worker = await extensionServiceWorker(context);
    const currentUrls = [0, 1, 2].map((index) => `${baseURL}/tall-page.html?current-window=${index}`);
    const otherUrls = [0, 1].map((index) => `${baseURL}/tall-page.html?other-window=${index}`);
    const currentWindow = await createTestWindow(worker, currentUrls);
    const otherWindow = await createTestWindow(worker, otherUrls);
    const currentMiddleTabId = currentWindow.tabIds[1]!;
    const currentRightTabId = currentWindow.tabIds[2]!;
    const otherFirstTabId = otherWindow.tabIds[0]!;
    await activateTab(worker, otherFirstTabId);
    await activateTab(worker, currentMiddleTabId);
    const currentPage = await pageForUrl(context, currentUrls[1]!);

    // #when
    await currentPage.keyboard.press('Shift+K');

    // #then
    await expect.poll(async () => ({
      current: await queryActiveTabId(worker, currentWindow.windowId),
      other: await queryActiveTabId(worker, otherWindow.windowId),
    })).toEqual({ current: currentRightTabId, other: otherFirstTabId });
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
    await expect.poll(() => queryActiveTabId(worker, testWindow.windowId)).toBe(firstTabId);
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
      `${baseURL}/tall-page.html?typing-control=2`,
    ];
    const testWindow = await createTestWindow(worker, urls);
    const textTabId = testWindow.tabIds[1]!;
    const rightTabId = testWindow.tabIds[2]!;
    await activateTab(worker, textTabId);
    const textPage = await pageForUrl(context, urls[1]!);
    const textField = textPage.locator('#search');
    await textField.focus();
    await installTabSwitchTrace(worker);

    // #when
    await textPage.keyboard.press('Shift+J');
    await textPage.locator('#button').focus();
    await textPage.keyboard.press('Shift+K');

    // #then
    await expect.poll(async () => ({
      value: await textField.inputValue(),
      trace: await readTabSwitchTrace(worker),
      activeTabId: await queryActiveTabId(worker, testWindow.windowId),
    })).toEqual({
      value: 'J',
      trace: {
        messages: [{ type: 'tabSwitch', direction: 'right' }],
        requestedTabIds: [rightTabId],
      },
      activeTabId: rightTabId,
    });
  } finally {
    await context.close();
  }
});

for (const keyCase of [
  {
    syntheticCode: 'KeyJ',
    syntheticKey: 'J',
    trustedKey: 'Shift+K',
    trustedDirection: 'right',
    expectedTabIndex: 2,
  },
  {
    syntheticCode: 'KeyK',
    syntheticKey: 'K',
    trustedKey: 'Shift+J',
    trustedDirection: 'left',
    expectedTabIndex: 0,
  },
] as const) {
  test(`a synthetic Shift+${keyCase.syntheticKey} cannot switch tabs`, async ({ baseURL }) => {
    // #given
    const context = await openExtensionContext();
    try {
      const worker = await extensionServiceWorker(context);
      const urls = [0, 1, 2].map((index) => `${baseURL}/tall-page.html?untrusted-${keyCase.syntheticKey}=${index}`);
      const testWindow = await createTestWindow(worker, urls);
      const middleTabId = testWindow.tabIds[1]!;
      const expectedTabId = testWindow.tabIds[keyCase.expectedTabIndex]!;
      await activateTab(worker, middleTabId);
      const middlePage = await pageForUrl(context, urls[1]!);
      await installTabSwitchTrace(worker);

      // #when
      await middlePage.evaluate(({ code, key }) => {
        document.dispatchEvent(new KeyboardEvent('keydown', {
          bubbles: true,
          code,
          key,
          shiftKey: true,
        }));
      }, { code: keyCase.syntheticCode, key: keyCase.syntheticKey });
      await middlePage.keyboard.press(keyCase.trustedKey);

      // #then
      await expect.poll(async () => ({
        trace: await readTabSwitchTrace(worker),
        activeTabId: await queryActiveTabId(worker, testWindow.windowId),
      })).toEqual({
        trace: {
          messages: [{ type: 'tabSwitch', direction: keyCase.trustedDirection }],
          requestedTabIds: [expectedTabId],
        },
        activeTabId: expectedTabId,
      });
    } finally {
      await context.close();
    }
  });
}
