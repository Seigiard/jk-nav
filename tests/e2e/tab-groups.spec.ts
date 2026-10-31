import { expect, test, type Worker } from '@playwright/test';

import {
  activateTab,
  createTestWindow,
  extensionServiceWorker,
  openExtensionContext,
  pageForUrl,
  queryActiveTabId,
  type ChromeTab,
} from './extension-tabs';

interface ChromeExtensionApi {
  runtime: {
    lastError?: { message?: string };
  };
  tabGroups?: {
    update(groupId: number, options: { collapsed: boolean }, callback: () => void): void;
  };
  tabs: {
    group(options: { tabIds: number[] }, callback: (groupId: number) => void): void;
  };
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
    await worker.evaluate(() => {
      interface HandlingState {
        messageReceived: boolean;
        handlerCompleted: boolean;
        tabUpdateStarted: boolean;
      }

      interface InstrumentedChromeApi {
        runtime: {
          onMessage: {
            addListener(listener: (message: unknown) => void): void;
          };
        };
        tabGroups?: {
          query(options: { windowId: number; collapsed: boolean }): Promise<Array<{ id: number }>>;
        };
        tabs: {
          update(tabId: number, options: { active: boolean }): Promise<ChromeTab>;
        };
      }

      const workerGlobal = globalThis as typeof globalThis & {
        chrome: InstrumentedChromeApi;
        tabSwitchHandlingState?: HandlingState;
      };
      const chromeApi = workerGlobal.chrome;
      const tabGroupsApi = chromeApi.tabGroups;
      if (!tabGroupsApi) {
        throw new Error('chrome.tabGroups is undefined');
      }

      const handlingState: HandlingState = {
        messageReceived: false,
        handlerCompleted: false,
        tabUpdateStarted: false,
      };
      workerGlobal.tabSwitchHandlingState = handlingState;
      chromeApi.runtime.onMessage.addListener((message) => {
        if (
          typeof message === 'object' &&
          message !== null &&
          'type' in message &&
          message.type === 'tabSwitch'
        ) {
          handlingState.messageReceived = true;
        }
      });

      const queryCollapsedGroups = tabGroupsApi.query.bind(tabGroupsApi);
      tabGroupsApi.query = async (options) => {
        const groups = await queryCollapsedGroups(options);
        queueMicrotask(() => {
          queueMicrotask(() => {
            if (!handlingState.tabUpdateStarted) {
              handlingState.handlerCompleted = true;
            }
          });
        });
        return groups;
      };

      const updateTab = chromeApi.tabs.update.bind(chromeApi.tabs);
      chromeApi.tabs.update = async (tabId, options) => {
        if (handlingState.messageReceived) {
          handlingState.tabUpdateStarted = true;
        }
        const tab = await updateTab(tabId, options);
        queueMicrotask(() => {
          queueMicrotask(() => {
            if (handlingState.messageReceived) {
              handlingState.handlerCompleted = true;
            }
          });
        });
        return tab;
      };
    });

    // #when
    await activePage.keyboard.press('Shift+K');

    // #then
    await expect
      .poll(() => worker.evaluate(() => {
        const handlingState = (globalThis as typeof globalThis & {
          tabSwitchHandlingState?: { messageReceived: boolean; handlerCompleted: boolean };
        }).tabSwitchHandlingState;
        return {
          messageReceived: handlingState?.messageReceived,
          handlerCompleted: handlingState?.handlerCompleted,
        };
      }))
      .toEqual({ messageReceived: true, handlerCompleted: true });
    expect(await queryActiveTabId(worker, testWindow.windowId)).toBe(activeTabId);
  } finally {
    await context.close();
  }
});
