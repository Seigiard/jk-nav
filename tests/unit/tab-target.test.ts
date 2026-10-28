import { describe, expect, it } from 'vitest';

import { selectTabTarget, type TabInfo } from '../../utils/tab-target';

const MIDDLE_ACTIVE_TABS: TabInfo[] = [
  { id: 303, index: 2, active: false },
  { id: 101, index: 0, active: false },
  { id: 202, index: 1, active: true },
];

describe('selectTabTarget', () => {
  it('selects the Left tab from the middle', () => {
    // #given
    const tabs = MIDDLE_ACTIVE_TABS;

    // #when
    const target = selectTabTarget(tabs, 'left');

    // #then
    expect(target).toBe(101);
  });

  it('selects the Right tab from the middle', () => {
    // #given
    const tabs = MIDDLE_ACTIVE_TABS;

    // #when
    const target = selectTabTarget(tabs, 'right');

    // #then
    expect(target).toBe(303);
  });

  it('wraps from the first tab to the last tab on Left', () => {
    // #given
    const tabs: TabInfo[] = [
      { id: 101, index: 0, active: true },
      { id: 202, index: 1, active: false },
      { id: 303, index: 2, active: false },
    ];

    // #when
    const target = selectTabTarget(tabs, 'left');

    // #then
    expect(target).toBe(303);
  });

  it('wraps from the last tab to the first tab on Right', () => {
    // #given
    const tabs: TabInfo[] = [
      { id: 101, index: 0, active: false },
      { id: 202, index: 1, active: false },
      { id: 303, index: 2, active: true },
    ];

    // #when
    const target = selectTabTarget(tabs, 'right');

    // #then
    expect(target).toBe(101);
  });

  it('returns no target for a window with one tab', () => {
    // #given
    const tabs: TabInfo[] = [{ id: 101, index: 0, active: true }];

    // #when
    const target = selectTabTarget(tabs, 'right');

    // #then
    expect(target).toBeNull();
  });

  it('skips a hidden tab when moving Right', () => {
    // #given
    const tabs: TabInfo[] = [
      { id: 101, index: 0, active: true },
      { id: 202, index: 1, active: false, hidden: true },
      { id: 303, index: 2, active: false },
    ];

    // #when
    const target = selectTabTarget(tabs, 'right');

    // #then
    expect(target).toBe(303);
  });

  it('skips a tab in a collapsed group when moving Right', () => {
    // #given
    const tabs: TabInfo[] = [
      { id: 101, index: 0, active: true },
      { id: 202, index: 1, active: false, inCollapsedGroup: true },
      { id: 303, index: 2, active: false },
    ];

    // #when
    const target = selectTabTarget(tabs, 'right');

    // #then
    expect(target).toBe(303);
  });

  it('wraps Right past skipped tabs to the next visible tab', () => {
    // #given
    const tabs: TabInfo[] = [
      { id: 101, index: 0, active: false, hidden: true },
      { id: 202, index: 1, active: false },
      { id: 303, index: 2, active: true },
      { id: 404, index: 3, active: false, inCollapsedGroup: true },
    ];

    // #when
    const target = selectTabTarget(tabs, 'right');

    // #then
    expect(target).toBe(202);
  });

  it('returns no target when every other tab is skipped', () => {
    // #given
    const tabs: TabInfo[] = [
      { id: 101, index: 0, active: true },
      { id: 202, index: 1, active: false, hidden: true },
      { id: 303, index: 2, active: false, inCollapsedGroup: true },
    ];

    // #when
    const target = selectTabTarget(tabs, 'right');

    // #then
    expect(target).toBeNull();
  });
});
