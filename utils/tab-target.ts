export interface TabInfo {
  id: number;
  index: number;
  active: boolean;
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
  const targetIndex = (activeIndex + offset + orderedTabs.length) % orderedTabs.length;

  return orderedTabs[targetIndex]?.id ?? null;
}
