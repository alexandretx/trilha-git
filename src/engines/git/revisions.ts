import type { RepoState } from './repo';

export function shortOid(state: RepoState, oid: string): string {
  const ids = Object.keys(state.commits);
  let length = 7;
  while (length < oid.length) {
    const prefix = oid.slice(0, length);
    const matches = ids.filter((id) => id.startsWith(prefix));
    if (matches.length <= 1) return prefix;
    length += 1;
  }
  return oid;
}

export function isAncestor(state: RepoState, ancestor: string, descendant: string): boolean {
  if (ancestor === descendant) return false;
  const seen = new Set<string>();
  const stack = [descendant];
  while (stack.length > 0) {
    const oid = stack.pop();
    if (!oid || seen.has(oid)) continue;
    seen.add(oid);
    const commit = state.commits[oid];
    if (!commit) continue;
    for (const parent of commit.parents) {
      if (parent === ancestor) return true;
      stack.push(parent);
    }
  }
  return false;
}

export function isAncestorOrSelf(state: RepoState, ancestor: string, descendant: string): boolean {
  return ancestor === descendant || isAncestor(state, ancestor, descendant);
}

function reachable(state: RepoState, start: string): Set<string> {
  const seen = new Set<string>();
  const stack = [start];
  while (stack.length > 0) {
    const oid = stack.pop();
    if (!oid || seen.has(oid)) continue;
    seen.add(oid);
    const commit = state.commits[oid];
    if (!commit) continue;
    for (const parent of commit.parents) stack.push(parent);
  }
  return seen;
}

/** Closest common ancestor. Criss-cross histories pick the newer candidate. */
export function mergeBase(state: RepoState, left: string, right: string): string | null {
  const fromLeft = reachable(state, left);
  const fromRight = reachable(state, right);
  const common = [...fromLeft].filter((oid) => fromRight.has(oid));
  if (common.length === 0) return null;
  const best = common.filter(
    (oid) => !common.some((other) => other !== oid && isAncestor(state, oid, other)),
  );
  best.sort(
    (a, b) =>
      (state.commits[b]?.timestamp ?? 0) - (state.commits[a]?.timestamp ?? 0) || (a < b ? -1 : 1),
  );
  return best[0] ?? null;
}

export function validBranchName(name: string): boolean {
  if (!name || name === 'HEAD' || name === '@' || name.startsWith('-') || name.endsWith('/'))
    return false;
  if (name.endsWith('.') || name.includes('..') || name.includes('@{') || name.includes('//'))
    return false;
  if (name.includes('\\') || name.includes(' ') || name.includes('~') || name.includes('^'))
    return false;
  const parts = name.split('/');
  if (parts.some((part) => part === '' || part.startsWith('.') || part.endsWith('.lock')))
    return false;
  return /^[A-Za-z0-9._/-]+$/.test(name);
}

function walkParents(state: RepoState, start: string, suffix: string): string | null {
  let current: string | null = start;
  const pattern = /~(\d+)|\^(\d*)/g;
  let match = pattern.exec(suffix);
  while (match) {
    if (!current) return null;
    const distance = match[1];
    if (distance !== undefined) {
      const steps = Number(distance);
      for (let index = 0; index < steps; index += 1) {
        if (!current) return null;
        current = state.commits[current]?.parents[0] ?? null;
      }
    } else {
      const raw = match[2] ?? '';
      const which = raw === '' ? 1 : Number(raw);
      if (which !== 0) {
        current = state.commits[current]?.parents[which - 1] ?? null;
      }
    }
    match = pattern.exec(suffix);
  }
  return current;
}

export function resolveRevision(
  state: RepoState,
  expr: string,
): { oid: string } | { error: string } {
  const unknown = `fatal: ambiguous argument '${expr}': unknown revision or path not in the working tree.`;
  const parsed = /^(.*?)((?:~\d+|\^\d*)*)$/.exec(expr);
  const name = parsed?.[1] ?? '';
  const suffix = parsed?.[2] ?? '';
  if (!name) return { error: unknown };

  let start: string | null = null;
  if (name === 'HEAD' || name === '@') {
    start = state.head;
  } else if (Object.prototype.hasOwnProperty.call(state.branches, name)) {
    start = state.branches[name] ?? null;
  } else if (/^[0-9a-f]{4,40}$/.test(name)) {
    const matches = Object.keys(state.commits).filter((oid) => oid.startsWith(name));
    if (matches.length > 1) {
      return {
        error: `error: short object id ${name} is ambiguous\nfatal: bad revision '${expr}'`,
      };
    }
    start = matches[0] ?? null;
  }

  if (!start) return { error: unknown };
  const oid = walkParents(state, start, suffix);
  if (!oid || !state.commits[oid]) return { error: unknown };
  return { oid };
}

export function looksLikeRevision(state: RepoState, expr: string): boolean {
  if (expr === 'HEAD' || expr === '@' || expr.startsWith('HEAD~') || expr.startsWith('HEAD^'))
    return true;
  const parsed = /^(.*?)((?:~\d+|\^\d*)*)$/.exec(expr);
  const name = parsed?.[1] ?? expr;
  if (Object.prototype.hasOwnProperty.call(state.branches, name)) return true;
  if (/^[0-9a-f]{4,40}$/.test(name)) {
    return Object.keys(state.commits).some((oid) => oid.startsWith(name));
  }
  return false;
}
