import type { RepoState } from '../engines/git';

export const GRAPH_ROW_HEIGHT = 44;

const COL_WIDTH = 18;
const RAIL_PAD = 10;
const NODE_RADIUS = 5;

export interface GraphCommitInput {
  oid: string;
  parents: readonly string[];
  message: string;
  timestamp: number;
}

export interface GraphBranchInput {
  name: string;
  tip: string | null;
}

export interface GraphConflict {
  kind: 'merge' | 'revert';
  branch: string;
  incomingName: string;
  paths: readonly string[];
}

export interface GraphInput {
  initialized: boolean;
  head: string | null;
  /** Null when HEAD is not on a branch. */
  headBranch: string | null;
  branches: readonly GraphBranchInput[];
  commits: readonly GraphCommitInput[];
  conflict: GraphConflict | null;
}

export interface GraphRefView {
  name: string;
  current: boolean;
}

export interface GraphNodeView {
  oid: string;
  column: number;
  x: number;
  y: number;
  short: string;
  message: string;
  head: boolean;
  unborn: boolean;
  refs: GraphRefView[];
  parentShorts: string[];
}

export interface GraphEdgeView {
  from: string;
  to: string;
  fromColumn: number;
  toColumn: number;
  d: string;
}

export interface GraphView {
  kind: 'empty' | 'unborn' | 'commits';
  summary: string;
  width: number;
  height: number;
  rowHeight: number;
  nodes: GraphNodeView[];
  edges: GraphEdgeView[];
  pendingBranches: string[];
  conflict: GraphConflict | null;
}

export function conflictText(conflict: GraphConflict): string {
  const lead =
    conflict.kind === 'revert'
      ? `Revert em andamento de ${conflict.incomingName}.`
      : `Merge em andamento: ${conflict.incomingName} em ${conflict.branch}.`;
  if (conflict.paths.length === 0) return lead;
  return `${lead} Conflito em ${conflict.paths.join(', ')}.`;
}

// HEAD is detached when it is not the tip of the current branch. This engine has no detach command.
export function toGraphInput(state: RepoState): GraphInput {
  const tip = Object.prototype.hasOwnProperty.call(state.branches, state.branch)
    ? state.branches[state.branch]
    : undefined;
  const detached = state.head !== null && tip !== state.head;
  const branches = Object.entries(state.branches).map(([name, branchTip]) => ({
    name,
    tip: branchTip,
  }));
  const pending = state.merge;
  return {
    initialized: state.initialized,
    head: state.head,
    headBranch: detached ? null : state.branch,
    branches,
    commits: Object.values(state.commits).map((commit) => ({
      oid: commit.oid,
      parents: commit.parents,
      message: commit.message,
      timestamp: commit.timestamp,
    })),
    conflict: pending
      ? {
          kind: pending.kind,
          branch: pending.branch,
          incomingName: pending.incomingName,
          paths: pending.unmerged.map((mark) => mark.path),
        }
      : null,
  };
}

export function layoutGraph(input: GraphInput): GraphView {
  if (!input.initialized) {
    return blank('empty', 'Repositório ainda não iniciado.');
  }

  const commits = uniqueCommits(input.commits);
  const pendingBranches = input.branches
    .filter((branch) => branch.tip === null)
    .map((branch) => branch.name);

  if (commits.length === 0) {
    const name = input.headBranch ?? pendingBranches[0] ?? 'main';
    const node = placeUnborn(name, input.headBranch === name || input.headBranch === null);
    return {
      kind: 'unborn',
      summary: `Branch ${name}, nenhum commit.`,
      width: railWidth(1),
      height: GRAPH_ROW_HEIGHT,
      rowHeight: GRAPH_ROW_HEIGHT,
      nodes: [node],
      edges: [],
      pendingBranches: pendingBranches.filter((branch) => branch !== name),
      conflict: input.conflict,
    };
  }

  const ordered = orderCommits(commits, input.head);
  const columns = assignColumns(ordered);
  const width = railWidth(maxColumn(columns) + 1);
  const rowOf = new Map(ordered.map((commit, index) => [commit.oid, index]));
  const nodes = ordered.map((commit, index) => {
    const column = columns.get(commit.oid) ?? 0;
    const parents = knownParents(commit, columns);
    return {
      oid: commit.oid,
      column,
      x: centerX(column),
      y: centerY(index),
      short: commit.oid.slice(0, 7),
      message: subject(commit.message),
      head: commit.oid === input.head,
      unborn: false,
      refs: refsAt(commit.oid, input),
      parentShorts: parents.map((parent) => parent.slice(0, 7)),
    };
  });
  const edges = ordered.flatMap((commit) => {
    const fromColumn = columns.get(commit.oid);
    const fromRow = rowOf.get(commit.oid);
    if (fromColumn === undefined || fromRow === undefined) return [];
    return knownParents(commit, columns).flatMap((parent) => {
      const toColumn = columns.get(parent);
      const toRow = rowOf.get(parent);
      if (toColumn === undefined || toRow === undefined) return [];
      return [
        {
          from: commit.oid,
          to: parent,
          fromColumn,
          toColumn,
          d: edgePath(centerX(fromColumn), centerY(fromRow), centerX(toColumn), centerY(toRow)),
        },
      ];
    });
  });

  const headNode = nodes.find((node) => node.head);
  return {
    kind: 'commits',
    summary: commitSummary(nodes.length, input, headNode?.short ?? null),
    width,
    height: nodes.length * GRAPH_ROW_HEIGHT,
    rowHeight: GRAPH_ROW_HEIGHT,
    nodes,
    edges,
    pendingBranches,
    conflict: input.conflict,
  };
}

function blank(kind: GraphView['kind'], summary: string): GraphView {
  return {
    kind,
    summary,
    width: 0,
    height: 0,
    rowHeight: GRAPH_ROW_HEIGHT,
    nodes: [],
    edges: [],
    pendingBranches: [],
    conflict: null,
  };
}

function placeUnborn(name: string, current: boolean): GraphNodeView {
  return {
    oid: '',
    column: 0,
    x: centerX(0),
    y: centerY(0),
    short: '',
    message: 'Nenhum commit ainda.',
    head: false,
    unborn: true,
    refs: [{ name, current }],
    parentShorts: [],
  };
}

function commitSummary(count: number, input: GraphInput, short: string | null): string {
  const noun = count === 1 ? 'commit' : 'commits';
  if (!short) return `${count} ${noun}.`;
  if (input.headBranch) return `${count} ${noun}. Branch ${input.headBranch}, HEAD em ${short}.`;
  return `${count} ${noun}. HEAD fora da branch, em ${short}.`;
}

function subject(message: string): string {
  const line = message.split('\n')[0]?.trim() ?? '';
  return line || '(sem mensagem)';
}

function uniqueCommits(commits: readonly GraphCommitInput[]): GraphCommitInput[] {
  const seen = new Set<string>();
  const list: GraphCommitInput[] = [];
  for (const commit of commits) {
    if (seen.has(commit.oid)) continue;
    seen.add(commit.oid);
    list.push(commit);
  }
  return list;
}

function knownParents(commit: GraphCommitInput, columns: Map<string, number>): string[] {
  const seen = new Set<string>();
  const parents: string[] = [];
  for (const parent of commit.parents) {
    if (seen.has(parent) || !columns.has(parent)) continue;
    seen.add(parent);
    parents.push(parent);
  }
  return parents;
}

function refsAt(oid: string, input: GraphInput): GraphRefView[] {
  return input.branches
    .filter((branch) => branch.tip === oid)
    .map((branch) => ({ name: branch.name, current: branch.name === input.headBranch }))
    .sort((left, right) => {
      if (left.current !== right.current) return left.current ? -1 : 1;
      return left.name < right.name ? -1 : left.name > right.name ? 1 : 0;
    });
}

function orderCommits(
  commits: readonly GraphCommitInput[],
  head: string | null,
): GraphCommitInput[] {
  const byId = new Map(commits.map((commit) => [commit.oid, commit]));
  const children = new Map<string, string[]>();
  for (const commit of commits) {
    for (const parent of commit.parents) {
      if (!byId.has(parent)) continue;
      const list = children.get(parent);
      if (list) list.push(commit.oid);
      else children.set(parent, [commit.oid]);
    }
  }
  const spine = firstParentSpine(head, byId);
  const remaining = new Set(byId.keys());
  const placed = new Set<string>();
  const ordered: GraphCommitInput[] = [];
  while (remaining.size > 0) {
    const ready = [...remaining].filter((oid) =>
      (children.get(oid) ?? []).every((child) => placed.has(child)),
    );
    const pool = ready.length > 0 ? ready : [...remaining];
    pool.sort((left, right) => compareReady(left, right, spine, byId));
    const nextId = pool[0];
    if (!nextId) break;
    remaining.delete(nextId);
    placed.add(nextId);
    const commit = byId.get(nextId);
    if (commit) ordered.push(commit);
  }
  return ordered;
}

function compareReady(
  left: string,
  right: string,
  spine: Set<string>,
  byId: Map<string, GraphCommitInput>,
): number {
  const spineOrder = (spine.has(left) ? 0 : 1) - (spine.has(right) ? 0 : 1);
  if (spineOrder !== 0) return spineOrder;
  const time = (byId.get(right)?.timestamp ?? 0) - (byId.get(left)?.timestamp ?? 0);
  if (time !== 0) return time;
  return left < right ? -1 : left > right ? 1 : 0;
}

function firstParentSpine(head: string | null, byId: Map<string, GraphCommitInput>): Set<string> {
  const spine = new Set<string>();
  let oid = head;
  while (oid && byId.has(oid) && !spine.has(oid)) {
    spine.add(oid);
    oid = byId.get(oid)?.parents[0] ?? null;
  }
  return spine;
}

function assignColumns(ordered: readonly GraphCommitInput[]): Map<string, number> {
  const known = new Set(ordered.map((commit) => commit.oid));
  const lanes: (string | null)[] = [];
  const columns = new Map<string, number>();
  for (const commit of ordered) {
    const hits: number[] = [];
    lanes.forEach((oid, index) => {
      if (oid === commit.oid) hits.push(index);
    });
    let column = hits[0];
    if (column === undefined) {
      const free = lanes.indexOf(null);
      column = free === -1 ? lanes.length : free;
      if (column === lanes.length) lanes.push(null);
    }
    for (const hit of hits) lanes[hit] = null;
    columns.set(commit.oid, column);

    const parents = [...new Set(commit.parents.filter((parent) => known.has(parent)))];
    const first = parents[0];
    if (first && !lanes.includes(first)) lanes[column] = first;
    for (const parent of parents.slice(1)) {
      if (lanes.includes(parent)) continue;
      const target = lanes.findIndex((oid, index) => oid === null && index !== column);
      if (target === -1) lanes.push(parent);
      else lanes[target] = parent;
    }
  }
  return columns;
}

function maxColumn(columns: Map<string, number>): number {
  let max = 0;
  for (const column of columns.values()) max = Math.max(max, column);
  return max;
}

function railWidth(columns: number): number {
  return RAIL_PAD * 2 + Math.max(1, columns) * COL_WIDTH;
}

function centerX(column: number): number {
  return RAIL_PAD + column * COL_WIDTH + COL_WIDTH / 2;
}

function centerY(row: number): number {
  return row * GRAPH_ROW_HEIGHT + GRAPH_ROW_HEIGHT / 2;
}

function edgePath(x1: number, y1: number, x2: number, y2: number): string {
  const start = y1 + NODE_RADIUS;
  const end = y2 - NODE_RADIUS;
  if (Math.abs(x1 - x2) < 0.5) return `M ${x1} ${start} L ${x1} ${end}`;
  const turn = Math.min(y1 + GRAPH_ROW_HEIGHT / 2, end);
  return `M ${x1} ${start} L ${x1} ${turn} L ${x2} ${turn} L ${x2} ${end}`;
}
