// Link-hint mode accepts every character in this sequence as input.
const HINT_CHARS = 'abcdehilmnopqrstuvwxyz12345678';
const MAX_HINT_CODES = HINT_CHARS.length * HINT_CHARS.length;

export type LinkHintResult =
  | { kind: 'narrow'; visible: number[] }
  | { kind: 'activate'; index: number }
  | { kind: 'cancel'; consumed: boolean };

export class LinkHintMode {
  private codes: string[] = [];
  private prefix = '';

  start(count: number): string[] {
    const codeCount = Math.min(Math.max(0, count), MAX_HINT_CODES);
    this.codes = [];
    this.prefix = '';

    for (let i = 0; i < HINT_CHARS.length && this.codes.length < codeCount; i += 1) {
      for (let j = 0; j < HINT_CHARS.length && this.codes.length < codeCount; j += 1) {
        this.codes.push(HINT_CHARS[i]! + HINT_CHARS[j]!);
      }
    }

    return this.codes;
  }

  input(character: string): LinkHintResult {
    const nextPrefix = this.prefix + character;
    const exactIndex = this.codes.indexOf(nextPrefix);

    if (exactIndex !== -1) {
      return { kind: 'activate', index: exactIndex };
    }

    const visible = this.codes.reduce<number[]>((indices, code, index) => {
      if (code.startsWith(nextPrefix)) {
        indices.push(index);
      }
      return indices;
    }, []);

    if (visible.length === 0) {
      return { kind: 'cancel', consumed: this.prefix !== '' };
    }

    this.prefix = nextPrefix;
    return { kind: 'narrow', visible };
  }
}

export function hintCharacter(code: string): string | null {
  if (/^Key[A-Z]$/.test(code)) {
    return code.slice(-1).toLowerCase();
  }

  if (/^Digit[0-9]$/.test(code)) {
    return code.slice(-1);
  }

  return null;
}
