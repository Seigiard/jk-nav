import { describe, expect, it } from 'vitest';

import { resolveKey, type KeyAction, type KeyInput } from '../../utils/key-mapper';

const DEFAULT_INPUT: KeyInput = {
  code: 'Unidentified',
  shift: false,
  ctrl: false,
  alt: false,
  meta: false,
  isComposing: false,
  typing: false,
  linkHintMode: false,
  pendingG: false,
};

interface MappingCase {
  name: string;
  input: Partial<KeyInput>;
  expected: KeyAction;
}

const UPSTREAM_KEY_CASES: MappingCase[] = [
  { name: 'KeyJ scrolls down', input: { code: 'KeyJ' }, expected: { kind: 'scroll', direction: 1 } },
  { name: 'Shift+KeyJ has no action', input: { code: 'KeyJ', shift: true }, expected: { kind: 'none' } },
  { name: 'KeyK scrolls up', input: { code: 'KeyK' }, expected: { kind: 'scroll', direction: -1 } },
  { name: 'Shift+KeyK has no action', input: { code: 'KeyK', shift: true }, expected: { kind: 'none' } },
  { name: 'KeyG starts the g sequence', input: { code: 'KeyG' }, expected: { kind: 'pendingG' } },
  { name: 'Shift+KeyG goes to the bottom', input: { code: 'KeyG', shift: true }, expected: { kind: 'bottom' } },
  { name: 'KeyH has no action', input: { code: 'KeyH' }, expected: { kind: 'none' } },
  { name: 'Shift+KeyH goes back', input: { code: 'KeyH', shift: true }, expected: { kind: 'back' } },
  { name: 'KeyL has no action', input: { code: 'KeyL' }, expected: { kind: 'none' } },
  { name: 'Shift+KeyL goes forward', input: { code: 'KeyL', shift: true }, expected: { kind: 'forward' } },
  { name: 'KeyF enters Link-hint mode', input: { code: 'KeyF' }, expected: { kind: 'enterLinkHints' } },
  { name: 'Shift+KeyF has no action', input: { code: 'KeyF', shift: true }, expected: { kind: 'none' } },
];

describe('resolveKey', () => {
  it.each(UPSTREAM_KEY_CASES)('$name', ({ input, expected }) => {
    // #given
    const keyInput = { ...DEFAULT_INPUT, ...input };

    // #when
    const action = resolveKey(keyInput);

    // #then
    expect(action).toEqual(expected);
  });

  it.each([
    { name: 'KeyJ', code: 'KeyJ', direction: 1 },
    { name: 'KeyK', code: 'KeyK', direction: -1 },
  ])('maps the first $name keydown to one Scroll step', ({ code, direction }) => {
    // #given
    const input = { ...DEFAULT_INPUT, code, repeat: false };

    // #when
    const action = resolveKey(input);

    // #then
    expect(action).toEqual({ kind: 'scroll', direction });
  });

  it.each([
    { name: 'KeyJ', code: 'KeyJ', direction: 1 },
    { name: 'KeyK', code: 'KeyK', direction: -1 },
  ])('maps a repeated $name keydown to Continuous scroll', ({ code, direction }) => {
    // #given
    const input = { ...DEFAULT_INPUT, code, repeat: true };

    // #when
    const action = resolveKey(input);

    // #then
    expect(action).toEqual({ kind: 'continuousScroll', direction });
  });

  it('goes to the top when plain KeyG completes the g sequence', () => {
    // #given
    const input = { ...DEFAULT_INPUT, code: 'KeyG', pendingG: true };

    // #when
    const action = resolveKey(input);

    // #then
    expect(action).toEqual({ kind: 'top' });
  });

  it.each([
    { name: 'Ctrl', modifier: { ctrl: true } },
    { name: 'Alt', modifier: { alt: true } },
    { name: 'Meta', modifier: { meta: true } },
  ])('$name suppresses a mapped key', ({ modifier }) => {
    // #given
    const input = { ...DEFAULT_INPUT, code: 'KeyF', ...modifier };

    // #when
    const action = resolveKey(input);

    // #then
    expect(action).toEqual({ kind: 'none' });
  });

  it('suppresses a mapped key during IME composition', () => {
    // #given
    const input = { ...DEFAULT_INPUT, code: 'KeyJ', isComposing: true };

    // #when
    const action = resolveKey(input);

    // #then
    expect(action).toEqual({ kind: 'none' });
  });

  it('suppresses a mapped key while the user is Typing', () => {
    // #given
    const input = { ...DEFAULT_INPUT, code: 'KeyJ', typing: true };

    // #when
    const action = resolveKey(input);

    // #then
    expect(action).toEqual({ kind: 'none' });
  });

  it.each([
    { name: 'a letter', code: 'KeyA', expected: 'a' },
    { name: 'a digit', code: 'Digit0', expected: '0' },
  ])('maps $name by physical position in Link-hint mode', ({ code, expected }) => {
    // #given
    const input = { ...DEFAULT_INPUT, code, linkHintMode: true };

    // #when
    const action = resolveKey(input);

    // #then
    expect(action).toEqual({ kind: 'hintInput', char: expected });
  });

  it.each([
    { name: 'Escape', shift: false },
    { name: 'Shift+Escape', shift: true },
  ])('exits Link-hint mode on $name', ({ shift }) => {
    // #given
    const input = { ...DEFAULT_INPUT, code: 'Escape', shift, linkHintMode: true };

    // #when
    const action = resolveKey(input);

    // #then
    expect(action).toEqual({ kind: 'exitLinkHints' });
  });

  it('does not accept a shifted Hint code', () => {
    // #given
    const input = { ...DEFAULT_INPUT, code: 'KeyA', shift: true, linkHintMode: true };

    // #when
    const action = resolveKey(input);

    // #then
    expect(action).toEqual({ kind: 'none' });
  });
});
