export interface TokenShortcut {
  id: string;
  label: string;
  text: string;
  /** Caret position inside `text`. Omit to land after the insert. */
  cursor?: number;
  description: string;
}

export const TOKEN_SHORTCUTS: readonly TokenShortcut[] = [
  { id: 'git', label: 'git', text: 'git ', description: 'Inserir git' },
  { id: 'add', label: 'add', text: 'add ', description: 'Inserir add' },
  {
    id: 'commit',
    label: 'commit -m',
    text: 'commit -m ""',
    cursor: 11,
    description: 'Inserir commit -m com aspas',
  },
  { id: 'quote', label: '"', text: '"', description: 'Inserir aspas' },
];

export const COMPLETIONS: readonly string[] = [
  'git init',
  'git status',
  'git add ',
  'git add .',
  'git commit -m ""',
  'git log',
  'git log --oneline',
  'echo ',
  'touch ',
  'cat ',
  'ls',
  'pwd',
  'mkdir ',
  'rm ',
];

export interface Edit {
  value: string;
  cursor: number;
}

export function insertToken(
  value: string,
  start: number,
  end: number,
  text: string,
  cursorInText?: number,
): Edit {
  const safeStart = clamp(start, 0, value.length);
  const safeEnd = clamp(end, safeStart, value.length);
  const before = value.slice(0, safeStart);
  const after = value.slice(safeEnd);
  const spaced = text !== '"' && before.length > 0 && !/\s$/.test(before);
  const chunk = spaced ? ` ${text}` : text;
  const offset = cursorInText === undefined ? chunk.length : cursorInText + (spaced ? 1 : 0);
  return { value: before + chunk + after, cursor: before.length + offset };
}

export function completeCommand(value: string): Edit | null {
  if (value.trim() === '') return null;
  const matches = COMPLETIONS.filter((item) => item.startsWith(value) && item !== value);
  if (matches.length === 0) return null;
  const next = matches.length === 1 ? (matches[0] ?? value) : commonPrefix(matches);
  if (next.length <= value.length) return null;
  const cursor = next.endsWith('""') && !value.endsWith('""') ? next.length - 1 : next.length;
  return { value: next, cursor };
}

export function recallHistory(
  past: readonly string[],
  cursor: number,
  direction: 'older' | 'newer',
  draft: string,
): { cursor: number; value: string } {
  if (past.length === 0) return { cursor: -1, value: draft };
  if (direction === 'older') {
    const next = cursor === -1 ? past.length - 1 : Math.max(0, cursor - 1);
    return { cursor: next, value: past[next] ?? draft };
  }
  if (cursor < 0 || cursor + 1 >= past.length) return { cursor: -1, value: draft };
  const next = cursor + 1;
  return { cursor: next, value: past[next] ?? draft };
}

function commonPrefix(values: readonly string[]): string {
  let prefix = values[0] ?? '';
  for (const value of values.slice(1)) {
    let index = 0;
    const limit = Math.min(prefix.length, value.length);
    while (index < limit && prefix[index] === value[index]) index += 1;
    prefix = prefix.slice(0, index);
  }
  return prefix;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return max;
  return Math.min(max, Math.max(min, value));
}
