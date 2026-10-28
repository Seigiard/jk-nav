export interface TabInfo {
  id: number;
  index: number;
  active: boolean;
  hidden?: boolean;
  inCollapsedGroup?: boolean;
}

export type TabDirection = 'left' | 'right';

export function selectTabTarget(tabs: TabInfo[], direction: TabDirection): number | null {
  if (tabs.length < 2) {
    return null;
  }

  const orderedTabs = [...tabs].sort((left, right) => left.index - right.index);
  const activeIndex = orderedTabs.findIndex((tab) => tab.active);

  if (activeIndex === -1) {
    return null;
  }

  const offset = direction === 'left' ? -1 : 1;

  for (let step = 1; step < orderedTabs.length; step += 1) {
    const targetIndex = (activeIndex + offset * step + orderedTabs.length) % orderedTabs.length;
    const target = orderedTabs[targetIndex];

    if (target !== undefined && !target.hidden && !target.inCollapsedGroup) {
      return target.id;
    }
  }

  return null;
}
