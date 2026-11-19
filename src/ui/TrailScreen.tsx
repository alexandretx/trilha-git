import type { ProgressSnapshot } from '../core/progress';
import { conceptMastery, dueReviewIds, levelMastery, levelUnlocked } from '../core/progress';
import { pack } from '../app/registry';
import type { GitTask } from '../content/git/level1';
import { InstallOffer, OfflineNote } from './status';

interface TrailScreenProps {
  progress: ProgressSnapshot;
  loadError: string | null;
  onShowIntro: () => void;
}

export function TrailScreen({ progress, loadError, onShowIntro }: TrailScreenProps) {
  const now = Date.now();
  const due = new Set(dueReviewIds(progress, now));
  const lead = pack.levels.find((level) => level.tasks.length > 0);
  let previous: number | null = null;
  const count = lead?.tasks.length ?? 0;

  return (
    <div className="screen trail">
      <OfflineNote />
      <h1 id="nivel-atual">{lead?.title ?? pack.title}</h1>
      <p className="lede">
        {lead?.summary} São {count} {count === 1 ? 'tarefa' : 'tarefas'}. Em cada uma você lê a
        lição e só depois digita. Verificar olha o repositório, não a frase exata.
      </p>
      <button className="btn" type="button" onClick={onShowIntro}>
        Como funciona
      </button>
      <InstallOffer />
      {loadError ? (
        <p className="notice" role="status">
          {loadError}
        </p>
      ) : null}

      {pack.levels.map((level) => {
        const mastery = level.tasks.length > 0 ? levelMastery(level.tasks, progress.outcomes) : 0;
        const open = levelUnlocked(previous);
        previous = level.tasks.length > 0 ? mastery : 0;
        if (!open) {
          return (
            <section key={level.id} className="level-block is-locked">
              <h2>{level.title}</h2>
              <p>
                <span className="lock-state">Fechado.</span> {level.summary} Abre com 80% de domínio
                do nível anterior.
              </p>
            </section>
          );
        }
        if (level.tasks.length === 0) {
          return (
            <section key={level.id} className="level-block">
              <h2>{level.title}</h2>
              <p>
                <span className="lock-state">Aberto.</span> {level.summary} As tarefas deste nível
                ainda não foram escritas.
              </p>
            </section>
          );
        }
        const solved = level.tasks.filter((task) => progress.outcomes[task.id]?.solved).length;
        const percent = Math.round(mastery * 100);
        const reviewTasks = level.tasks.filter((task) => due.has(task.id));
        const labelledBy = level.id === lead?.id ? 'nivel-atual' : undefined;
        return (
          <section
            key={level.id}
            className="level-block"
            aria-labelledby={labelledBy ?? `nivel-${level.id}`}
          >
            {labelledBy ? null : <h2 id={`nivel-${level.id}`}>{level.title}</h2>}
            <p className="mastery-label">
              Domínio do nível: <strong>{percent}%</strong>
            </p>
            <progress
              value={mastery}
              max={1}
              aria-label={`Domínio do nível ${level.title}, ${percent}%`}
            />
            <p className="mastery-note">
              {solved === 0
                ? 'Nenhuma tarefa concluída ainda.'
                : `${solved} de ${level.tasks.length} tarefas concluídas.`}{' '}
              O domínio é a média das tarefas. Com 80%, o próximo nível abre.
            </p>
            <h2>Por comando</h2>
            <p className="mastery-note">Cada barra é o quanto você já acertou esse comando.</p>
            <ConceptList tasks={level.tasks} outcomes={progress.outcomes} />
            {reviewTasks.length > 0 ? (
              <>
                <h2>Revisão</h2>
                <p className="mastery-note">
                  Estas tarefas estão na hora de refazer. A última nota ficou abaixo de 95%.
                </p>
                <TaskList tasks={reviewTasks} all={level.tasks} progress={progress} due={due} />
              </>
            ) : null}
            <h2 className="list-heading">Tarefas</h2>
            <TaskList
              tasks={level.tasks}
              all={level.tasks}
              progress={progress}
              due={due}
              markNext
            />
          </section>
        );
      })}
      <p className="save-note">Progresso salvo neste navegador.</p>
    </div>
  );
}

function conceptLabel(id: string): string {
  return `git ${id}`;
}

function ConceptList({
  tasks,
  outcomes,
}: {
  tasks: readonly GitTask[];
  outcomes: ProgressSnapshot['outcomes'];
}) {
  const ids: string[] = [];
  for (const task of tasks) {
    if (!ids.includes(task.conceptId)) ids.push(task.conceptId);
  }
  return (
    <ul className="concepts">
      {ids.map((id) => {
        const mastery = conceptMastery(id, tasks, outcomes);
        const percent = Math.round(mastery * 100);
        return (
          <li key={id}>
            <span className="concept-name">{conceptLabel(id)}</span>
            <span className="concept-percent" aria-hidden="true">
              {percent}%
            </span>
            <progress
              value={mastery}
              max={1}
              aria-label={`Domínio de ${conceptLabel(id)}, ${percent}%`}
            />
          </li>
        );
      })}
    </ul>
  );
}

function TaskList({
  tasks,
  all,
  progress,
  due,
  markNext = false,
}: {
  tasks: readonly GitTask[];
  all: readonly GitTask[];
  progress: ProgressSnapshot;
  due: Set<string>;
  markNext?: boolean;
}) {
  const nextId = markNext ? all.find((task) => !progress.outcomes[task.id]?.solved)?.id : undefined;
  return (
    <ol className="task-list">
      {tasks.map((task) => {
        const outcome = progress.outcomes[task.id];
        const status = due.has(task.id) ? 'para revisar' : outcome?.solved ? 'concluída' : 'aberta';
        const score =
          outcome && outcome.score > 0 ? ` · domínio ${Math.round(outcome.score * 100)}%` : '';
        const index = all.findIndex((item) => item.id === task.id) + 1;
        const className = [
          'task-row',
          outcome?.solved ? 'is-done' : '',
          task.id === nextId ? 'is-next' : '',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <li key={task.id}>
            <a className={className} href={`#/tarefa/${task.id}`}>
              <span className="task-index">{String(index).padStart(2, '0')}</span>
              <span className="task-copy">
                <span className="task-title">{task.title}</span>
                <span className="task-meta">
                  {status}
                  {score}
                </span>
              </span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}
