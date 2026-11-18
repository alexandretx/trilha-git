import { useEffect, useRef, useState } from 'react';
import { engine, grader } from '../app/registry';
import type { TaskOutcome } from '../core/progress';
import { scoreAttempt } from '../core/progress';
import { taskById } from '../content/git/pack';
import type { RepoState } from '../engines/git';
import { CommitGraph } from './CommitGraph';
import { Scenario } from './Scenario';
import { OfflineNote } from './status';
import { Terminal, type TerminalLine } from './Terminal';

interface TaskScreenProps {
  taskId: string;
  onAttempt: (outcome: Omit<TaskOutcome, 'score'>) => void;
}

const intro: TerminalLine = { kind: 'info', text: 'Repositório em /repo. Digite um comando.' };
const hintTiers = ['Conceito', 'Sintaxe', 'Resposta'] as const;
const hintButtons = ['Dica: conceito', 'Dica: sintaxe', 'Dica: resposta'] as const;

export function TaskScreen({ taskId, onAttempt }: TaskScreenProps) {
  const task = taskById(taskId);
  if (!task) {
    return (
      <div className="screen task">
        <section className="lesson">
          <p>
            <a href="#/">Voltar à trilha</a>
          </p>
          <h1>Tarefa não encontrada</h1>
          <p>Esse endereço não corresponde a uma tarefa da trilha.</p>
        </section>
      </div>
    );
  }

  return <TaskPlay key={task.id} task={task} onAttempt={onAttempt} />;
}

function TaskPlay({
  task,
  onAttempt,
}: {
  task: NonNullable<ReturnType<typeof taskById>>;
  onAttempt: (outcome: Omit<TaskOutcome, 'score'>) => void;
}) {
  const [session, setSession] = useState(() => engine.createSession(task.initialState));
  const feedbackRef = useRef<HTMLDivElement>(null);
  const [repo, setRepo] = useState<RepoState>(() => session.getState());
  const [lines, setLines] = useState<TerminalLine[]>([intro]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [failures, setFailures] = useState(0);
  const [feedback, setFeedback] = useState<{ passed: boolean; failures: string[] } | null>(null);
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    const previous = document.title;
    document.title = `${task.title} · Trilha Git`;
    return () => {
      document.title = previous;
    };
  }, [task.title]);

  function restart() {
    const next = engine.createSession(task.initialState);
    setSession(next);
    setRepo(next.getState());
    setLines([intro]);
    setFailures(0);
    setFeedback(null);
    setPassed(false);
  }

  function execute(command: string) {
    const result = session.execute(command);
    setRepo(session.getState());
    const next: TerminalLine[] = [{ kind: 'cmd', text: command }];
    if (result.stdout) next.push({ kind: 'out', text: result.stdout.replace(/\n$/, '') });
    if (result.stderr) next.push({ kind: 'err', text: result.stderr.replace(/\n$/, '') });
    setLines((current) => [...current, ...next]);
  }

  function verify() {
    if (passed) return;
    const result = grader.grade(session.getState(), task.checks, session.history());
    const attempts = failures + 1;
    setFeedback(result);
    if (!result.passed) {
      setFailures(attempts);
      onAttempt({
        taskId: task.id,
        conceptId: task.conceptId,
        solved: false,
        attempts,
        hintsUsed,
        firstTry: false,
        at: Date.now(),
      });
      return;
    }
    setPassed(true);
    onAttempt({
      taskId: task.id,
      conceptId: task.conceptId,
      solved: true,
      attempts,
      hintsUsed,
      firstTry: failures === 0,
      at: Date.now(),
    });
  }

  useEffect(() => {
    if (!feedback) return;
    feedbackRef.current?.focus();
  }, [feedback]);

  const shownHints = task.hints.slice(0, hintsUsed);
  const attemptScore = feedback?.passed
    ? scoreAttempt({ solved: true, firstTry: failures === 0, hintsUsed })
    : null;

  return (
    <div className="screen task">
      <OfflineNote />
      <div className="task-side">
        <section className="lesson">
          <p className="back">
            <a href="#/">Voltar à trilha</a>
          </p>
          <h1>{task.title}</h1>
          <Scenario text={task.scenario} />
          {shownHints.length > 0 ? (
            <div className="hints">
              {shownHints.map((hint, index) => (
                <p key={`${index}-${hint}`}>
                  <strong>{hintTiers[index]}.</strong> {hint}
                </p>
              ))}
            </div>
          ) : null}
          {feedback ? (
            <div
              ref={feedbackRef}
              tabIndex={-1}
              className={feedback.passed ? 'feedback ok' : 'feedback fail'}
              role="status"
            >
              <h2>{feedback.passed ? 'Tarefa concluída' : 'Ainda não'}</h2>
              {feedback.passed ? (
                <>
                  <p>{task.explanation}</p>
                  <p>
                    Esta tentativa ficou com domínio de {Math.round((attemptScore ?? 0) * 100)}%.
                  </p>
                  <p>
                    <a href="#/">Voltar à trilha</a>
                  </p>
                </>
              ) : (
                <ul>
                  {feedback.failures.map((failure) => (
                    <li key={failure}>{failure}</li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </section>
        <div className="actions">
          <button
            className="btn"
            type="button"
            onClick={() => setHintsUsed((count) => Math.min(3, count + 1))}
            disabled={hintsUsed >= 3}
          >
            {hintButtons[hintsUsed] ?? 'Dicas encerradas'}
          </button>
          <button className="btn" type="button" onClick={restart}>
            Reiniciar repositório
          </button>
          <button className="btn" type="button" onClick={verify} disabled={passed}>
            {passed ? 'Tarefa concluída' : 'Verificar tarefa'}
          </button>
        </div>
      </div>
      <div className="workbench">
        <CommitGraph state={repo} />
        <Terminal lines={lines} onSubmit={execute} />
      </div>
    </div>
  );
}
