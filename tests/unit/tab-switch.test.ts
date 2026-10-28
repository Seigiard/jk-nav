import { describe, expect, it } from 'vitest';

import { selectTabSwitchTarget, type StripTab } from '../../utils/tab-switch';

const MIDDLE_ACTIVE_TABS: StripTab[] = [
  { id: 303, index: 2, active: false },
  { id: 101, index: 0, active: false },
  { id: 202, index: 1, active: true },
];

describe('selectTabSwitchTarget', () => {
  it('selects the Left tab from the middle by tab-strip index', () => {
    // #given
    const tabs = MIDDLE_ACTIVE_TABS;

    // #when
    const target = selectTabSwitchTarget(tabs, new Set(), 'left');

    // #then
    expect(target).toBe(101);
  });

  it('selects the Right tab from the middle by tab-strip index', () => {
    // #given
    const tabs = MIDDLE_ACTIVE_TABS;

    // #when
    const target = selectTabSwitchTarget(tabs, new Set(), 'right');

    // #then
    expect(target).toBe(303);
  });

  it('wraps from the first tab to the last tab on Left', () => {
    // #given
    const tabs: StripTab[] = [
      { id: 101, index: 0, active: true },
      { id: 202, index: 1, active: false },
      { id: 303, index: 2, active: false },
    ];

    // #when
    const target = selectTabSwitchTarget(tabs, new Set(), 'left');

    // #then
    expect(target).toBe(303);
  });

  it('wraps from the last tab to the first tab on Right', () => {
    // #given
    const tabs: StripTab[] = [
      { id: 101, index: 0, active: false },
      { id: 202, index: 1, active: false },
      { id: 303, index: 2, active: true },
    ];

    // #when
    const target = selectTabSwitchTarget(tabs, new Set(), 'right');

    // #then
    expect(target).toBe(101);
  });

  it('skips a hidden tab when moving Right', () => {
    // #given
    const tabs: StripTab[] = [
      { id: 101, index: 0, active: true },
      { id: 202, index: 1, active: false, hidden: true },
      { id: 303, index: 2, active: false },
    ];

    // #when
    const target = selectTabSwitchTarget(tabs, new Set(), 'right');

    // #then
    expect(target).toBe(303);
  });

  it('skips a tab in a collapsed group and selects an ungrouped tab', () => {
    // #given
    const tabs: StripTab[] = [
      { id: 101, index: 0, active: true },
      { id: 202, index: 1, active: false, groupId: 5 },
      { id: 303, index: 2, active: false, groupId: -1 },
    ];

    // #when
    const target = selectTabSwitchTarget(tabs, new Set([5]), 'right');

    // #then
    expect(target).toBe(303);
  });

  it('selects a tab in a group that is not collapsed', () => {
    // #given
    const tabs: StripTab[] = [
      { id: 101, index: 0, active: true },
      { id: 202, index: 1, active: false, groupId: 9 },
      { id: 303, index: 2, active: false },
    ];

    // #when
    const target = selectTabSwitchTarget(tabs, new Set([5]), 'right');

    // #then
    expect(target).toBe(202);
  });

  it('wraps Right past hidden and collapsed tabs to the next candidate', () => {
    // #given
    const tabs: StripTab[] = [
      { id: 101, index: 0, active: false, hidden: true },
      { id: 202, index: 1, active: false },
      { id: 303, index: 2, active: true },
      { id: 404, index: 3, active: false, groupId: 5 },
    ];

    // #when
    const target = selectTabSwitchTarget(tabs, new Set([5]), 'right');

    // #then
    expect(target).toBe(202);
  });

  it('ignores tabs without an id or index when choosing a target', () => {
    // #given
    const tabs: StripTab[] = [
      { id: 101, index: 0, active: false },
      { index: 1, active: false },
      { id: 202, index: 2, active: true },
      { id: 303, active: false },
    ];

    // #when
    const target = selectTabSwitchTarget(tabs, new Set(), 'left');

    // #then
    expect(target).toBe(101);
  });

  it('returns no target for a window with one tab', () => {
    // #given
    const tabs: StripTab[] = [{ id: 101, index: 0, active: true }];

    // #when
    const target = selectTabSwitchTarget(tabs, new Set(), 'right');

    // #then
    expect(target).toBeNull();
  });

  it('returns no target when every other tab is skipped', () => {
    // #given
    const tabs: StripTab[] = [
      { id: 101, index: 0, active: true },
      { id: 202, index: 1, active: false, hidden: true },
      { id: 303, index: 2, active: false, groupId: 5 },
    ];

    // #when
    const target = selectTabSwitchTarget(tabs, new Set([5]), 'right');

    // #then
    expect(target).toBeNull();
  });

  it('returns no target when no tab is active', () => {
    // #given
    const tabs: StripTab[] = [
      { id: 101, index: 0, active: false },
      { id: 202, index: 1, active: false },
    ];

    // #when
    const target = selectTabSwitchTarget(tabs, new Set(), 'right');

    // #then
    expect(target).toBeNull();
  });
});
