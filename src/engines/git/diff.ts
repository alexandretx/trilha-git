import { hashBlob } from './objects';
import { isInside } from './paths';
import type { ConflictLabel } from './repo';

export interface TreeConflict {
  path: string;
  label: ConflictLabel;
  message: string;
  auto: boolean;
}

export interface TreeMerge {
  files: Record<string, string>;
  conflicts: TreeConflict[];
  automerged: string[];
}

interface LineFile {
  lines: string[];
  trailingNewline: boolean;
}

interface DiffOp {
  kind: 'equal' | 'delete' | 'insert';
  line: string;
}

interface LineEdit {
  lo: number;
  hi: number;
  lines: string[];
}

export function splitLines(content: string): LineFile {
  if (content === '') return { lines: [], trailingNewline: true };
  const trailingNewline = content.endsWith('\n');
  const lines = content.split('\n');
  if (trailingNewline) lines.pop();
  return { lines, trailingNewline };
}

function joinLines(lines: readonly string[], trailingNewline: boolean): string {
  if (lines.length === 0) return '';
  const body = lines.join('\n');
  return trailingNewline ? `${body}\n` : body;
}

function scoreAt(table: number[][], row: number, column: number): number {
  return table[row]?.[column] ?? 0;
}

function diffOps(before: readonly string[], after: readonly string[]): DiffOp[] {
  const rowCount = before.length;
  const columnCount = after.length;
  const table: number[][] = Array.from({ length: rowCount + 1 }, () =>
    Array<number>(columnCount + 1).fill(0),
  );
  for (let row = rowCount - 1; row >= 0; row -= 1) {
    for (let column = columnCount - 1; column >= 0; column -= 1) {
      const current = table[row];
      if (!current) continue;
      const leftLine = before[row];
      const rightLine = after[column];
      current[column] =
        leftLine === rightLine
          ? scoreAt(table, row + 1, column + 1) + 1
          : Math.max(scoreAt(table, row + 1, column), scoreAt(table, row, column + 1));
    }
  }

  const ops: DiffOp[] = [];
  let row = 0;
  let column = 0;
  while (row < rowCount && column < columnCount) {
    const leftLine = before[row];
    const rightLine = after[column];
    if (leftLine === rightLine) {
      ops.push({ kind: 'equal', line: leftLine ?? '' });
      row += 1;
      column += 1;
    } else if (scoreAt(table, row + 1, column) >= scoreAt(table, row, column + 1)) {
      ops.push({ kind: 'delete', line: leftLine ?? '' });
      row += 1;
    } else {
      ops.push({ kind: 'insert', line: rightLine ?? '' });
      column += 1;
    }
  }
  while (row < rowCount) {
    ops.push({ kind: 'delete', line: before[row] ?? '' });
    row += 1;
  }
  while (column < columnCount) {
    ops.push({ kind: 'insert', line: after[column] ?? '' });
    column += 1;
  }
  return ops;
}

function lineEdits(base: readonly string[], target: readonly string[]): LineEdit[] {
  const edits: LineEdit[] = [];
  let baseIndex = 0;
  let current: LineEdit | null = null;
  const flush = () => {
    if (!current) return;
    edits.push(current);
    current = null;
  };
  for (const op of diffOps(base, target)) {
    if (op.kind === 'equal') {
      flush();
      baseIndex += 1;
      continue;
    }
    if (!current) current = { lo: baseIndex, hi: baseIndex, lines: [] };
    if (op.kind === 'delete') {
      current.hi = baseIndex + 1;
      baseIndex += 1;
    } else current.lines.push(op.line);
  }
  flush();
  return edits;
}

function rangesOverlap(left: LineEdit, right: LineEdit): boolean {
  if (left.lo === left.hi && right.lo === right.hi) return left.lo === right.lo;
  if (left.lo === left.hi) return left.lo >= right.lo && left.lo < right.hi;
  if (right.lo === right.hi) return right.lo >= left.lo && right.lo < left.hi;
  return left.lo < right.hi && right.lo < left.hi;
}

function applyEdits(
  base: readonly string[],
  edits: readonly LineEdit[],
  start: number,
  end: number,
): string[] {
  const out: string[] = [];
  let cursor = start;
  for (const edit of edits) {
    if (edit.lo > cursor) out.push(...base.slice(cursor, edit.lo));
    out.push(...edit.lines);
    cursor = Math.max(cursor, edit.hi);
  }
  if (cursor < end) out.push(...base.slice(cursor, end));
  return out;
}

function sameLines(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((line, index) => line === right[index]);
}

function mergeLineLists(
  base: readonly string[],
  ours: readonly LineEdit[],
  theirs: readonly LineEdit[],
  ourLabel: string,
  theirLabel: string,
): { lines: string[]; conflict: boolean } {
  const result: string[] = [];
  let index = 0;
  let leftAt = 0;
  let rightAt = 0;
  let conflict = false;

  const take = (edit: LineEdit) => {
    result.push(...base.slice(index, edit.lo), ...edit.lines);
    index = edit.hi;
  };

  while (leftAt < ours.length && rightAt < theirs.length) {
    const left = ours[leftAt];
    const right = theirs[rightAt];
    if (!left || !right) break;
    if (!rangesOverlap(left, right)) {
      if (left.lo < right.lo || (left.lo === right.lo && left.hi <= right.hi)) {
        take(left);
        leftAt += 1;
      } else {
        take(right);
        rightAt += 1;
      }
      continue;
    }

    const start = Math.min(left.lo, right.lo);
    let end = Math.max(left.hi, right.hi);
    let leftEnd = leftAt + 1;
    let rightEnd = rightAt + 1;
    let grew = true;
    while (grew) {
      grew = false;
      while (leftEnd < ours.length && (ours[leftEnd]?.lo ?? end) < end) {
        end = Math.max(end, ours[leftEnd]?.hi ?? end);
        leftEnd += 1;
        grew = true;
      }
      while (rightEnd < theirs.length && (theirs[rightEnd]?.lo ?? end) < end) {
        end = Math.max(end, theirs[rightEnd]?.hi ?? end);
        rightEnd += 1;
        grew = true;
      }
    }

    result.push(...base.slice(index, start));
    const ourLines = applyEdits(base, ours.slice(leftAt, leftEnd), start, end);
    const theirLines = applyEdits(base, theirs.slice(rightAt, rightEnd), start, end);
    if (sameLines(ourLines, theirLines)) result.push(...ourLines);
    else {
      conflict = true;
      result.push(
        `<<<<<<< ${ourLabel}`,
        ...ourLines,
        '=======',
        ...theirLines,
        `>>>>>>> ${theirLabel}`,
      );
    }
    index = end;
    leftAt = leftEnd;
    rightAt = rightEnd;
  }

  while (leftAt < ours.length) {
    const edit = ours[leftAt];
    if (edit) take(edit);
    leftAt += 1;
  }
  while (rightAt < theirs.length) {
    const edit = theirs[rightAt];
    if (edit) take(edit);
    rightAt += 1;
  }
  result.push(...base.slice(index));
  return { lines: result, conflict };
}

export function mergeFileText(
  base: string,
  ours: string,
  theirs: string,
  ourLabel = 'HEAD',
  theirLabel = 'theirs',
): { content: string; conflict: boolean } {
  const baseFile = splitLines(base);
  const merged = mergeLineLists(
    baseFile.lines,
    lineEdits(baseFile.lines, splitLines(ours).lines),
    lineEdits(baseFile.lines, splitLines(theirs).lines),
    ourLabel,
    theirLabel,
  );
  const trailing =
    (base === '' || base.endsWith('\n')) &&
    (ours === '' || ours.endsWith('\n')) &&
    (theirs === '' || theirs.endsWith('\n'));
  return { content: joinLines(merged.lines, trailing), conflict: merged.conflict };
}

function conflictMessage(path: string, label: ConflictLabel, theirName: string): string {
  if (label === 'deleted by them') {
    return `CONFLICT (modify/delete): ${path} deleted in ${theirName} and modified in HEAD. Version HEAD of ${path} left in tree.`;
  }
  if (label === 'deleted by us') {
    return `CONFLICT (modify/delete): ${path} deleted in HEAD and modified in ${theirName}. Version ${theirName} of ${path} left in tree.`;
  }
  const kind = label === 'both added' ? 'add/add' : 'content';
  return `CONFLICT (${kind}): Merge conflict in ${path}`;
}

export function mergeTrees(
  base: Record<string, string>,
  ours: Record<string, string>,
  theirs: Record<string, string>,
  theirLabel: string,
): TreeMerge {
  const files: Record<string, string> = {};
  const conflicts: TreeConflict[] = [];
  const automerged: string[] = [];
  const paths = [
    ...new Set([...Object.keys(base), ...Object.keys(ours), ...Object.keys(theirs)]),
  ].sort();

  for (const path of paths) {
    const baseHas = path in base;
    const oursHas = path in ours;
    const theirsHas = path in theirs;
    const baseText = base[path];
    const oursText = ours[path];
    const theirsText = theirs[path];
    if (oursHas === theirsHas && oursText === theirsText) {
      if (oursText !== undefined) files[path] = oursText;
      continue;
    }
    if (baseHas === oursHas && baseText === oursText) {
      if (theirsText !== undefined) files[path] = theirsText;
      continue;
    }
    if (baseHas === theirsHas && baseText === theirsText) {
      if (oursText !== undefined) files[path] = oursText;
      continue;
    }
    if (oursText === undefined || theirsText === undefined) {
      const label: ConflictLabel = oursText === undefined ? 'deleted by us' : 'deleted by them';
      const kept = oursText ?? theirsText;
      if (kept !== undefined) files[path] = kept;
      conflicts.push({
        path,
        label,
        message: conflictMessage(path, label, theirLabel),
        auto: false,
      });
      continue;
    }

    automerged.push(path);
    const merged = mergeFileText(baseText ?? '', oursText, theirsText, 'HEAD', theirLabel);
    files[path] = merged.content;
    if (merged.conflict) {
      const label: ConflictLabel = baseHas ? 'both modified' : 'both added';
      conflicts.push({
        path,
        label,
        message: conflictMessage(path, label, theirLabel),
        auto: true,
      });
    }
  }

  return { files, conflicts, automerged };
}

function blobId(content: string | undefined): string {
  if (content === undefined) return '0000000';
  return hashBlob(content).oid.slice(0, 7);
}

function formatRange(start: number, count: number): string {
  if (count === 1) return String(start);
  return `${start},${count}`;
}

function lineHasNewline(file: LineFile, index: number): boolean {
  if (file.lines.length === 0) return true;
  if (index < file.lines.length - 1) return true;
  return file.trailingNewline;
}

interface DiffRow {
  kind: 'equal' | 'delete' | 'insert';
  text: string;
  oldIndex: number;
  newIndex: number;
}

function diffRows(before: LineFile, after: LineFile): DiffRow[] {
  let ops = diffOps(before.lines, after.lines);
  const changed = ops.some((op) => op.kind !== 'equal');
  if (
    !changed &&
    before.trailingNewline !== after.trailingNewline &&
    before.lines.length > 0 &&
    before.lines.length === after.lines.length
  ) {
    const last = before.lines.length - 1;
    ops = ops.flatMap((op, index) => {
      if (index !== last || op.kind !== 'equal') return [op];
      return [
        { kind: 'delete' as const, line: op.line },
        { kind: 'insert' as const, line: op.line },
      ];
    });
  }

  const rows: DiffRow[] = [];
  let oldIndex = 0;
  let newIndex = 0;
  for (const op of ops) {
    if (op.kind === 'equal') {
      rows.push({ kind: 'equal', text: op.line, oldIndex, newIndex });
      oldIndex += 1;
      newIndex += 1;
    } else if (op.kind === 'delete') {
      rows.push({ kind: 'delete', text: op.line, oldIndex, newIndex });
      oldIndex += 1;
    } else {
      rows.push({ kind: 'insert', text: op.line, oldIndex, newIndex });
      newIndex += 1;
    }
  }
  return rows;
}

function renderRow(prefix: string, text: string, newline: boolean): string {
  if (newline) return `${prefix}${text}\n`;
  return `${prefix}${text}\n\\ No newline at end of file\n`;
}

function unifiedBody(beforeText: string, afterText: string): string {
  const before = splitLines(beforeText);
  const after = splitLines(afterText);
  const rows = diffRows(before, after);
  const changedAt = rows.flatMap((row, index) => (row.kind === 'equal' ? [] : [index]));
  if (changedAt.length === 0) return '';

  const context = 3;
  const ranges: { start: number; end: number }[] = [];
  for (const index of changedAt) {
    const start = Math.max(0, index - context);
    const end = Math.min(rows.length, index + context + 1);
    const last = ranges[ranges.length - 1];
    if (last && start <= last.end) last.end = Math.max(last.end, end);
    else ranges.push({ start, end });
  }

  let body = '';
  for (const range of ranges) {
    const slice = rows.slice(range.start, range.end);
    let oldCount = 0;
    let newCount = 0;
    for (const row of slice) {
      if (row.kind !== 'insert') oldCount += 1;
      if (row.kind !== 'delete') newCount += 1;
    }
    const firstOld = slice.find((row) => row.kind !== 'insert');
    const firstNew = slice.find((row) => row.kind !== 'delete');
    const oldStart = oldCount === 0 ? 0 : (firstOld?.oldIndex ?? 0) + 1;
    const newStart = newCount === 0 ? 0 : (firstNew?.newIndex ?? 0) + 1;
    body += `@@ -${formatRange(oldStart, oldCount)} +${formatRange(newStart, newCount)} @@\n`;
    for (const row of slice) {
      const prefix = row.kind === 'equal' ? ' ' : row.kind === 'delete' ? '-' : '+';
      const newline =
        row.kind === 'delete'
          ? lineHasNewline(before, row.oldIndex)
          : lineHasNewline(after, row.newIndex);
      body += renderRow(prefix, row.text, newline);
    }
  }
  return body;
}

export function formatFileDiff(
  path: string,
  before: string | undefined,
  after: string | undefined,
): string {
  if (before === after) return '';
  const header = [`diff --git a/${path} b/${path}`];
  if (before === undefined) header.push('new file mode 100644');
  else if (after === undefined) header.push('deleted file mode 100644');
  const mode = before !== undefined && after !== undefined ? ' 100644' : '';
  header.push(`index ${blobId(before)}..${blobId(after)}${mode}`);
  header.push(before === undefined ? '--- /dev/null' : `--- a/${path}`);
  header.push(after === undefined ? '+++ /dev/null' : `+++ b/${path}`);
  const binary = (before ?? '').includes('\0') || (after ?? '').includes('\0');
  const body = binary
    ? `Binary files a/${path} and b/${path} differ\n`
    : unifiedBody(before ?? '', after ?? '');
  return `${header.join('\n')}\n${body}`;
}

export function formatTreeDiff(
  before: Record<string, string>,
  after: Record<string, string>,
  paths: readonly string[],
): string {
  let text = '';
  for (const path of paths) {
    text += formatFileDiff(path, before[path], after[path]);
  }
  return text;
}

export function selectPaths(
  before: Record<string, string>,
  after: Record<string, string>,
  specs: readonly string[],
): string[] {
  const paths = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  if (specs.length === 0) return paths;
  return paths.filter((path) =>
    specs.some((spec) => spec === '.' || path === spec || isInside(path, spec)),
  );
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function changeSize(
  before: string | undefined,
  after: string | undefined,
): {
  insertions: number;
  deletions: number;
} {
  const ops = diffOps(splitLines(before ?? '').lines, splitLines(after ?? '').lines);
  return {
    insertions: ops.filter((op) => op.kind === 'insert').length,
    deletions: ops.filter((op) => op.kind === 'delete').length,
  };
}

export function formatDiffStat(
  before: Record<string, string>,
  after: Record<string, string>,
): string {
  const paths = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((path) => before[path] !== after[path])
    .sort();
  if (paths.length === 0) return '';
  let insertions = 0;
  let deletions = 0;
  const rows: string[] = [];
  const notes: string[] = [];
  for (const path of paths) {
    const change = changeSize(before[path], after[path]);
    insertions += change.insertions;
    deletions += change.deletions;
    const total = change.insertions + change.deletions;
    const width = Math.min(Math.max(total, 1), 20);
    const plus =
      total === 0
        ? 0
        : Math.min(
            width,
            Math.max(
              change.insertions === 0 ? 0 : 1,
              Math.round((change.insertions / total) * width),
            ),
          );
    const minus = total === 0 ? 0 : width - plus;
    const graph = `${'+'.repeat(plus)}${'-'.repeat(minus)}`;
    rows.push(` ${path} | ${total}${graph ? ` ${graph}` : ''}`);
    if (before[path] === undefined) notes.push(` create mode 100644 ${path}`);
    else if (after[path] === undefined) notes.push(` delete mode 100644 ${path}`);
  }
  const summary = [plural(paths.length, 'file changed', 'files changed')];
  if (insertions > 0) summary.push(plural(insertions, 'insertion(+)', 'insertions(+)'));
  if (deletions > 0) summary.push(plural(deletions, 'deletion(-)', 'deletions(-)'));
  if (insertions === 0 && deletions === 0) summary.push('0 insertions(+)', '0 deletions(-)');
  return [...rows, ` ${summary.join(', ')}`, ...notes].join('\n');
}
