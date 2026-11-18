import type { RepoState } from '../engines/git';
import {
  conflictText,
  layoutGraph,
  toGraphInput,
  type GraphNodeView,
  type GraphView,
} from './graph';

interface CommitGraphProps {
  state: RepoState;
}

export function CommitGraph({ state }: CommitGraphProps) {
  const view = layoutGraph(toGraphInput(state));
  return (
    <section className="commit-graph" aria-labelledby="graph-heading">
      <h2 id="graph-heading">Repositório</h2>
      <p className="graph-summary">{view.summary}</p>
      {view.conflict ? (
        <p className="graph-conflict" role="status">
          {conflictText(view.conflict)}
        </p>
      ) : null}
      {view.nodes.length > 0 ? <GraphSheet view={view} /> : null}
      {view.pendingBranches.length > 0 ? (
        <p className="graph-pending">Sem commit: {view.pendingBranches.join(', ')}.</p>
      ) : null}
    </section>
  );
}

function GraphSheet({ view }: { view: GraphView }) {
  return (
    <div className="graph-scroll">
      <div className="graph-sheet" style={{ minWidth: view.width }}>
        <svg
          className="graph-rails"
          width={view.width}
          height={view.height}
          viewBox={`0 0 ${view.width} ${view.height}`}
          aria-hidden="true"
        >
          {view.edges.map((edge) => (
            <path key={`${edge.from}-${edge.to}`} d={edge.d} />
          ))}
          {view.nodes.map((node) => (
            <circle
              key={node.oid || 'unborn'}
              cx={node.x}
              cy={node.y}
              r={5}
              className={node.unborn ? 'is-unborn' : node.head ? 'is-head' : undefined}
            />
          ))}
        </svg>
        <ol className="graph-rows">
          {view.nodes.map((node) => (
            <li key={node.oid || 'unborn'}>
              <GraphRow node={node} view={view} />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function GraphRow({ node, view }: { node: GraphNodeView; view: GraphView }) {
  const relation =
    node.unborn || node.parentShorts.length === 0
      ? node.unborn
        ? ''
        : ' Raiz.'
      : node.parentShorts.length === 1
        ? ` Pai ${node.parentShorts[0]}.`
        : ` Pais ${node.parentShorts.join(' e ')}.`;
  return (
    <div className="graph-row" style={{ height: view.rowHeight, paddingLeft: view.width }}>
      {node.short ? <span className="graph-hash">{node.short}</span> : null}
      <span className="graph-message" title={node.message}>
        {node.message}
      </span>
      {node.refs.map((ref) => (
        <span key={ref.name} className={ref.current ? 'graph-ref is-current' : 'graph-ref'}>
          {ref.name}
        </span>
      ))}
      {node.head ? <span className="graph-ref is-current">HEAD</span> : null}
      {relation ? <span className="sr-only">{relation}</span> : null}
    </div>
  );
}
