export type TabDirection = 'left' | 'right';

export interface TabSwitchMessage {
  type: 'tabSwitch';
  direction: TabDirection;
}

export interface StripTab {
  id?: number;
  index?: number;
  active: boolean;
  hidden?: boolean;
  groupId?: number;
}

export function createTabSwitchMessage(direction: TabDirection): TabSwitchMessage {
  return { type: 'tabSwitch', direction };
}

export function isTabSwitchMessage(message: unknown): message is TabSwitchMessage {
  if (typeof message !== 'object' || message === null) {
    return false;
  }

  const candidate = message as { type?: unknown; direction?: unknown };
  return (
    candidate.type === 'tabSwitch' &&
    (candidate.direction === 'left' || candidate.direction === 'right')
  );
}

export function selectTabSwitchTarget(
  tabs: readonly StripTab[],
  collapsedGroupIds: ReadonlySet<number>,
  direction: TabDirection,
): number | null {
  const orderedTabs = tabs
    .filter((tab) => tab.id !== undefined && tab.index !== undefined)
    .sort((left, right) => left.index! - right.index!);

  if (orderedTabs.length < 2) {
    return null;
  }

  const activeIndex = orderedTabs.findIndex((tab) => tab.active);
  if (activeIndex === -1) {
    return null;
  }

  const offset = direction === 'left' ? -1 : 1;

  for (let step = 1; step < orderedTabs.length; step += 1) {
    const targetIndex = (activeIndex + offset * step + orderedTabs.length) % orderedTabs.length;
    const target = orderedTabs[targetIndex];

    if (
      target !== undefined &&
      !target.hidden &&
      (target.groupId === undefined || !collapsedGroupIds.has(target.groupId))
    ) {
      return target.id!;
    }
  }

  return null;
}
