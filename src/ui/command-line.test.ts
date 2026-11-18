import { describe, expect, it } from 'vitest';
import { completeCommand, insertToken, recallHistory } from './command-line';

describe('command line edits', () => {
  it('inserts tokens at the caret and spaces words', () => {
    const git = insertToken('', 0, 0, 'git ');
    expect(git).toEqual({ value: 'git ', cursor: 4 });
    const add = insertToken(git.value, git.cursor, git.cursor, 'add ');
    expect(add.value).toBe('git add ');
    const quoted = insertToken('git commit -m ', 14, 14, '""', 1);
    expect(quoted.value).toBe('git commit -m ""');
    expect(quoted.cursor).toBe(15);
    const mid = insertToken('git status', 4, 4, 'add ');
    expect(mid.value).toBe('git add status');
  });

  it('puts commit -m between the quotes', () => {
    const edit = insertToken('git ', 4, 4, 'commit -m ""', 11);
    expect(edit.value).toBe('git commit -m ""');
    expect(edit.value[edit.cursor]).toBe('"');
    expect(edit.value[edit.cursor - 1]).toBe('"');
  });

  it('completes a unique prefix and stops when several commands still match', () => {
    expect(completeCommand('')).toBeNull();
    expect(completeCommand('git sta')).toEqual({ value: 'git status', cursor: 10 });
    expect(completeCommand('git add')).toEqual({ value: 'git add ', cursor: 8 });
    expect(completeCommand('git add ')).toEqual({ value: 'git add .', cursor: 9 });
    expect(completeCommand('git ')).toBeNull();
    const message = completeCommand('git commit -m');
    expect(message?.value).toBe('git commit -m ""');
    expect(message?.cursor).toBe((message?.value.length ?? 1) - 1);
  });

  it('walks history and returns to the draft', () => {
    const past = ['git init', 'git status'];
    const older = recallHistory(past, -1, 'older', 'git log');
    expect(older).toEqual({ cursor: 1, value: 'git status' });
    const further = recallHistory(past, older.cursor, 'older', 'git log');
    expect(further).toEqual({ cursor: 0, value: 'git init' });
    const held = recallHistory(past, further.cursor, 'older', 'git log');
    expect(held.cursor).toBe(0);
    const back = recallHistory(past, further.cursor, 'newer', 'git log');
    expect(back).toEqual({ cursor: 1, value: 'git status' });
    const draft = recallHistory(past, back.cursor, 'newer', 'git log');
    expect(draft).toEqual({ cursor: -1, value: 'git log' });
  });
});
