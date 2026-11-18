import { describe, expect, it } from 'vitest';
import { GitSession } from '../engines/git';
import { layoutGraph, toGraphInput, type GraphInput } from './graph';

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
        detached: true,
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
    expect(view.edges.some((edge) => edge.to === 'nao-existe')).toBe(false);
    const main = view.nodes.find((node) => node.refs.some((ref) => ref.name === 'main'));
    expect(main?.refs).toEqual([{ name: 'main', current: false }]);
  });
});
