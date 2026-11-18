import { useEffect, useRef, useState } from 'react';
import { engine, grader } from '../app/registry';
import type { TaskOutcome } from '../core/progress';
import { scoreAttempt } from '../core/progress';
import { taskById } from '../content/git/pack';
import type { RepoState } from '../engines/git';
import { Terminal, type TerminalLine } from './Terminal';

interface TaskScreenProps {
  taskId: string;
  onAttempt: (outcome: Omit<TaskOutcome, 'score'>) => void;
}

const intro: TerminalLine = { kind: 'info', text: 'Repositório em /repo. Digite um comando.' };

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

  return <TaskPlay task={task} onAttempt={onAttempt} />;
}

function TaskPlay({
  task,
  onAttempt,
}: {
  task: NonNullable<ReturnType<typeof taskById>>;
  onAttempt: (outcome: Omit<TaskOutcome, 'score'>) => void;
}) {
  const sessionRef = useRef<ReturnType<typeof engine.createSession> | null>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<TerminalLine[]>([intro]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [failures, setFailures] = useState(0);
  const [feedback, setFeedback] = useState<{ passed: boolean; failures: string[] } | null>(null);
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    sessionRef.current = engine.createSession(task.initialState);
    setLines([intro]);
    setHintsUsed(0);
    setFailures(0);
    setFeedback(null);
    setPassed(false);
  }, [task]);

  function restart() {
    sessionRef.current = engine.createSession(task.initialState);
    setLines([intro]);
    setFailures(0);
    setFeedback(null);
    setPassed(false);
  }

  function execute(command: string) {
    const session = sessionRef.current;
    if (!session) return;
    const result = session.execute(command);
    const next: TerminalLine[] = [{ kind: 'cmd', text: command }];
    if (result.stdout) next.push({ kind: 'out', text: result.stdout.replace(/\n$/, '') });
    if (result.stderr) next.push({ kind: 'err', text: result.stderr.replace(/\n$/, '') });
    setLines((current) => [...current, ...next]);
  }

  function verify() {
    const session = sessionRef.current;
    if (!session || passed) return;
    const result = grader.grade(session.getState() as RepoState, task.checks, session.history());
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
    feedbackRef.current?.scrollIntoView({ block: 'nearest' });
  }, [feedback]);

  const shownHints = task.hints.slice(0, hintsUsed);
  const attemptScore = feedback?.passed
    ? scoreAttempt({ solved: true, firstTry: failures === 0, hintsUsed })
    : null;

  return (
    <div className="screen task">
      <div className="task-side">
        <section className="lesson">
          <p className="back">
            <a href="#/">Voltar à trilha</a>
          </p>
          <h1>{task.title}</h1>
          <p className="scenario">{task.scenario}</p>
          {shownHints.length > 0 ? (
            <div className="hints">
              {shownHints.map((hint, index) => (
                <p key={`${index}-${hint}`}>
                  <strong>Dica {index + 1}.</strong> {hint}
                </p>
              ))}
            </div>
          ) : null}
          {feedback ? (
            <div
              ref={feedbackRef}
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
            {hintsUsed >= 3 ? 'Dicas encerradas' : `Dica ${hintsUsed + 1} de 3`}
          </button>
          <button className="btn" type="button" onClick={restart}>
            Reiniciar repositório
          </button>
          <button className="btn" type="button" onClick={verify} disabled={passed}>
            {passed ? 'Tarefa concluída' : 'Verificar tarefa'}
          </button>
        </div>
      </div>
      <div className="terminal-column">
        <Terminal lines={lines} onSubmit={execute} />
      </div>
    </div>
  );
}
