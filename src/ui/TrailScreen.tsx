import type { ProgressSnapshot } from '../core/progress';
import { dueReviewIds, levelMastery, levelUnlocked } from '../core/progress';
import { pack } from '../app/registry';
import type { GitTask } from '../content/git/level1';

interface TrailScreenProps {
  progress: ProgressSnapshot;
  loadError: string | null;
}

export function TrailScreen({ progress, loadError }: TrailScreenProps) {
  const now = Date.now();
  const due = new Set(dueReviewIds(progress, now));
  const lead = pack.levels.find((level) => level.tasks.length > 0);
  let previous: number | null = null;
  const count = lead?.tasks.length ?? 0;

  return (
    <div className="screen trail">
      <h1>{lead?.title ?? pack.title}</h1>
      <p className="lede">
        {count} {count === 1 ? 'tarefa' : 'tarefas'}: {lead?.summary} Vale qualquer sequência que
        deixe o repositório no estado pedido.
      </p>
      {loadError ? <p className="notice">{loadError}</p> : null}

      {pack.levels.map((level) => {
        const mastery = level.tasks.length > 0 ? levelMastery(level.tasks, progress.outcomes) : 0;
        const open = levelUnlocked(previous);
        previous = level.tasks.length > 0 ? mastery : 0;
        if (!open) {
          return (
            <section key={level.id} className="level-block locked">
              <h2>{level.title}</h2>
              <p>{level.summary} Abre com 80% de domínio do nível anterior.</p>
            </section>
          );
        }
        if (level.tasks.length === 0) {
          return (
            <section key={level.id} className="level-block">
              <h2>{level.title}</h2>
              <p>{level.summary} As tarefas deste nível ainda não foram escritas.</p>
            </section>
          );
        }
        const solved = level.tasks.filter((task) => progress.outcomes[task.id]?.solved).length;
        const percent = Math.round(mastery * 100);
        const reviewTasks = level.tasks.filter((task) => due.has(task.id));
        return (
          <section key={level.id} className="level-block">
            <p className="mastery-label">
              Domínio do nível: <strong>{percent}%</strong>
            </p>
            <progress value={mastery} max={1} aria-label={`Domínio do nível ${level.title}`} />
            <p className="mastery-note">
              {solved === 0
                ? 'Nenhuma tarefa concluída ainda.'
                : `${solved} de ${level.tasks.length} tarefas concluídas.`}
            </p>
            {reviewTasks.length > 0 ? (
              <>
                <h2>Revisão</h2>
                <p className="mastery-note">
                  Estas voltaram porque a última tentativa usou dica, errou antes de acertar, ou não
                  foi concluída.
                </p>
                <TaskList tasks={reviewTasks} progress={progress} due={due} />
              </>
            ) : null}
            <h2 className="list-heading">Tarefas</h2>
            <TaskList tasks={level.tasks} progress={progress} due={due} />
          </section>
        );
      })}
      <p className="save-note">Progresso salvo neste navegador.</p>
    </div>
  );
}

function TaskList({
  tasks,
  progress,
  due,
}: {
  tasks: readonly GitTask[];
  progress: ProgressSnapshot;
  due: Set<string>;
}) {
  return (
    <ol className="task-list">
      {tasks.map((task, index) => {
        const outcome = progress.outcomes[task.id];
        const status = due.has(task.id) ? 'para revisar' : outcome?.solved ? 'concluída' : 'aberta';
        return (
          <li key={task.id}>
            <a
              className={outcome?.solved ? 'task-row is-done' : 'task-row'}
              href={`#/tarefa/${task.id}`}
            >
              <span className="task-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="task-copy">
                <span className="task-title">{task.title}</span>
                <span className="task-meta">
                  {task.conceptId} · {status}
                </span>
              </span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}
