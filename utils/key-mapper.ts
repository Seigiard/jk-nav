import type { TabDirection } from './tab-target';

export interface KeyInput {
  code: string;
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  meta: boolean;
  isComposing: boolean;
  typing: boolean;
  linkHintMode: boolean;
  pendingG: boolean;
}

export type KeyAction =
  | { kind: 'none' }
  | { kind: 'scroll'; direction: 1 | -1 }
  | { kind: 'top' }
  | { kind: 'bottom' }
  | { kind: 'back' }
  | { kind: 'forward' }
  | { kind: 'pendingG' }
  | { kind: 'enterLinkHints' }
  | { kind: 'hintInput'; char: string }
  | { kind: 'exitLinkHints' }
  | { kind: 'tabSwitch'; direction: TabDirection };

const NONE: KeyAction = { kind: 'none' };

export const TAB_SWITCH_DIRECTIONS: Record<string, TabDirection> = {
  KeyJ: 'left',
  KeyK: 'right',
};

export function resolveKey(input: KeyInput): KeyAction {
  if (
    input.ctrl ||
    input.alt ||
    input.meta ||
    input.isComposing ||
    input.typing
  ) {
    return NONE;
  }

  if (input.linkHintMode) {
    if (input.code === 'Escape') {
      return { kind: 'exitLinkHints' };
    }

    if (!input.shift && /^Key[A-Z]$/.test(input.code)) {
      return { kind: 'hintInput', char: input.code.slice(-1).toLowerCase() };
    }

    if (!input.shift && /^Digit[0-9]$/.test(input.code)) {
      return { kind: 'hintInput', char: input.code.slice(-1) };
    }

    return NONE;
  }

  if (input.shift) {
    const tabDirection = TAB_SWITCH_DIRECTIONS[input.code];
    if (tabDirection !== undefined) {
      return { kind: 'tabSwitch', direction: tabDirection };
    }

    switch (input.code) {
      case 'KeyG':
        return { kind: 'bottom' };
      case 'KeyH':
        return { kind: 'back' };
      case 'KeyL':
        return { kind: 'forward' };
      default:
        return NONE;
    }
  }

  switch (input.code) {
    case 'KeyJ':
      return { kind: 'scroll', direction: 1 };
    case 'KeyK':
      return { kind: 'scroll', direction: -1 };
    case 'KeyG':
      return input.pendingG ? { kind: 'top' } : { kind: 'pendingG' };
    case 'KeyF':
      return { kind: 'enterLinkHints' };
    default:
      return NONE;
  }
}
