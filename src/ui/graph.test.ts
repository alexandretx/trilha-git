import { describe, expect, it } from 'vitest';
import { level3Tasks } from '../content/git/level3';
import { GitSession } from '../engines/git';
import { conflictText, layoutGraph, toGraphInput, type GraphInput } from './graph';

const clock = { now: () => Date.UTC(2026, 10, 18, 15, 0, 0) };

function columnOf(input: GraphInput, oid: string): number | undefined {
  return layoutGraph(input).nodes.find((node) => node.oid === oid)?.column;
}

describe('commit graph', () => {
  it('stays empty until git init, then shows the unborn branch', () => {
    const session = new GitSession({}, clock);
    expect(layoutGraph(toGraphInput(session.getState())).kind).toBe('empty');
    session.execute('git init');
    const view = layoutGraph(toGraphInput(session.getState()));
    expect(view.kind).toBe('unborn');
    expect(view.summary).toBe('Branch main, nenhum commit.');
    expect(view.nodes[0]?.refs).toEqual([{ name: 'main', current: true }]);
    expect(view.nodes[0]?.unborn).toBe(true);
  });

  it('draws a straight line as commits land on main', () => {
    const session = new GitSession({}, clock);
    session.execute('git init');
    session.execute('echo oi > a.txt');
    session.execute('git add a.txt');
    session.execute('git commit -m "primeiro"');
    const first = layoutGraph(toGraphInput(session.getState()));
    expect(first.kind).toBe('commits');
    expect(first.nodes).toHaveLength(1);
    expect(first.nodes[0]?.head).toBe(true);
    expect(first.nodes[0]?.refs.some((ref) => ref.name === 'main' && ref.current)).toBe(true);
    expect(first.nodes[0]?.column).toBe(0);

    session.execute('echo oi > b.txt');
    session.execute('git add b.txt');
    session.execute('git commit -m "segundo"');
    const next = layoutGraph(toGraphInput(session.getState()));
    expect(next.nodes).toHaveLength(2);
    expect(next.nodes.every((node) => node.column === 0)).toBe(true);
    expect(next.edges).toHaveLength(1);
    expect(next.edges[0]?.fromColumn).toBe(0);
    expect(next.edges[0]?.toColumn).toBe(0);
    expect(next.nodes[0]?.head).toBe(true);
    expect(next.nodes[1]?.head).toBe(false);
  });

  it('keeps the current branch in the first column and parks the other one', () => {
    const input: GraphInput = {
      initialized: true,
      head: 'B',
      headBranch: 'main',
      branches: [
        { name: 'main', tip: 'B' },
        { name: 'feature', tip: 'C' },
      ],
      commits: [
        { oid: 'A', parents: [], message: 'raiz', timestamp: 1 },
        { oid: 'B', parents: ['A'], message: 'segue main', timestamp: 2 },
        { oid: 'C', parents: ['A'], message: 'abre feature', timestamp: 4 },
      ],
      conflict: null,
    };
    const view = layoutGraph(input);
    expect(columnOf(input, 'B')).toBe(0);
    expect(columnOf(input, 'A')).toBe(0);
    expect(columnOf(input, 'C')).toBe(1);
    expect(view.nodes.find((node) => node.oid === 'B')?.refs).toEqual([
      { name: 'main', current: true },
    ]);
    expect(view.nodes.find((node) => node.oid === 'C')?.refs).toEqual([
      { name: 'feature', current: false },
    ]);
    const bend = view.edges.find((edge) => edge.from === 'C');
    expect(bend?.fromColumn).toBe(1);
    expect(bend?.toColumn).toBe(0);
  });

  it('joins a merge into the first parent column', () => {
    const input: GraphInput = {
      initialized: true,
      head: 'D',
      headBranch: 'main',
      branches: [
        { name: 'main', tip: 'D' },
        { name: 'feature', tip: 'B' },
      ],
      commits: [
        { oid: 'A', parents: [], message: 'raiz', timestamp: 1 },
        { oid: 'B', parents: ['A'], message: 'feature', timestamp: 2 },
        { oid: 'C', parents: ['A'], message: 'main segue', timestamp: 3 },
        { oid: 'D', parents: ['C', 'B'], message: 'merge', timestamp: 4 },
      ],
      conflict: null,
    };
    const view = layoutGraph(input);
    expect(view.nodes.map((node) => [node.oid, node.column])).toEqual([
      ['D', 0],
      ['C', 0],
      ['B', 1],
      ['A', 0],
    ]);
    const join = view.edges.find((edge) => edge.from === 'D' && edge.to === 'B');
    expect(join?.fromColumn).toBe(0);
    expect(join?.toColumn).toBe(1);
    expect(view.nodes[0]?.head).toBe(true);
    expect(view.nodes[0]?.parentShorts).toEqual(['C', 'B']);
    expect(view.summary).toContain('Branch main');
    expect(view.summary).toContain('HEAD em D');
  });

  it('reads a branches map and a detached HEAD without crashing on a missing parent', () => {
    const session = new GitSession(
      { commits: [{ message: 'raiz', files: { 'a.txt': 'a\n' } }] },
      clock,
    );
    const state = session.getState();
    const head = state.head;
    if (!head) throw new Error('expected a commit');
    const view = layoutGraph(
      toGraphInput({
        ...state,
        head: 'solto',
        branches: { main: head, experimento: null },
        commits: {
          ...state.commits,
          solto: {
            oid: 'solto',
            tree: 't',
            parents: ['nao-existe'],
            message: 'orfao',
            author: 'Estudante <estudante@trilha.local>',
            timestamp: 1,
            files: {},
          },
        },
      }),
    );
    expect(view.summary).toContain('HEAD fora da branch');
    expect(view.pendingBranches).toEqual(['experimento']);
    expect(view.nodes.find((node) => node.oid === 'solto')?.parentShorts).toEqual([]);
    expect(view.nodes.find((node) => node.oid === 'solto')?.head).toBe(true);
    expect(view.edges.some((edge) => edge.to === 'nao-existe')).toBe(false);
    const main = view.nodes.find((node) => node.refs.some((ref) => ref.name === 'main'));
    expect(main?.refs).toEqual([{ name: 'main', current: false }]);
    expect(view.conflict).toBeNull();
  });

  it('draws a real merge of two branches and names an open conflict', () => {
    const join = level3Tasks.find((task) => task.id === 'juntar-arquivos');
    const clash = level3Tasks.find((task) => task.id === 'resolver-conflito');
    if (!join || !clash) throw new Error('tarefas de merge ausentes');

    const merged = new GitSession(join.initialState, clock);
    const diverged = layoutGraph(toGraphInput(merged.getState()));
    expect(diverged.nodes.some((node) => node.column === 1)).toBe(true);
    expect(diverged.nodes.some((node) => node.refs.some((ref) => ref.name === 'promocao'))).toBe(
      true,
    );
    merged.execute('git merge promocao');
    const after = layoutGraph(toGraphInput(merged.getState()));
    const head = after.nodes.find((node) => node.head);
    expect(head?.parentShorts).toHaveLength(2);
    expect(head?.refs).toEqual([{ name: 'main', current: true }]);
    expect(after.edges.filter((edge) => edge.from === head?.oid)).toHaveLength(2);
    expect(after.conflict).toBeNull();

    const conflicted = new GitSession(clash.initialState, clock);
    conflicted.execute('git merge promocao');
    const conflict = layoutGraph(toGraphInput(conflicted.getState())).conflict;
    expect(conflict?.kind).toBe('merge');
    expect(conflict?.incomingName).toBe('promocao');
    expect(conflict?.paths).toContain('cardapio.txt');
    expect(conflict ? conflictText(conflict) : '').toBe(
      'Merge em andamento: promocao em main. Conflito em cardapio.txt.',
    );
  });
});
