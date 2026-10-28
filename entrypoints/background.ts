import { selectTabTarget, type TabDirection, type TabInfo } from '../utils/tab-target';

interface TabSwitchMessage {
  type: 'tabSwitch';
  direction: TabDirection;
}

function isTabSwitchMessage(message: unknown): message is TabSwitchMessage {
  if (typeof message !== 'object' || message === null) {
    return false;
  }

  const candidate = message as { type?: unknown; direction?: unknown };
  return (
    candidate.type === 'tabSwitch' &&
    (candidate.direction === 'left' || candidate.direction === 'right')
  );
}

async function activateTabInDirection(direction: TabDirection, windowId: number): Promise<void> {
  const tabs = await browser.tabs.query({ windowId });
  const collapsedGroupIds = new Set<number>();

  if (browser.tabGroups?.query !== undefined) {
    try {
      const collapsedGroups = await browser.tabGroups.query({ windowId, collapsed: true });
      for (const group of collapsedGroups) {
        collapsedGroupIds.add(group.id);
      }
    } catch {
      // Older browsers may expose no usable tabGroups implementation.
    }
  }

  const tabInfo: TabInfo[] = tabs.flatMap((tab) => {
    if (tab.id === undefined || tab.index === undefined) {
      return [];
    }

    const tabWithHidden = tab as typeof tab & { hidden?: boolean };

    return [
      {
        id: tab.id,
        index: tab.index,
        active: tab.active,
        hidden: tabWithHidden.hidden,
        inCollapsedGroup: tab.groupId !== undefined && collapsedGroupIds.has(tab.groupId),
      },
    ];
  });
  const targetId = selectTabTarget(tabInfo, direction);

  if (targetId !== null) {
    await browser.tabs.update(targetId, { active: true });
  }
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: unknown, sender) => {
    if (!isTabSwitchMessage(message)) {
      return;
    }

    const windowId = sender.tab?.windowId;
    if (windowId === undefined) {
      return;
    }

    void activateTabInDirection(message.direction, windowId).catch(() => undefined);
  });
});
