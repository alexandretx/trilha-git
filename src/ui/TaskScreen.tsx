import { useEffect, useRef, useState } from 'react';
import { engine, grader } from '../app/tools';
import type { TaskOutcome } from '../core/progress';
import { scoreAttempt } from '../core/progress';
import { taskById } from '../content/git/pack';
import type { RepoState } from '../engines/git';
import { CommitGraph } from './CommitGraph';
import { explainCommandError } from './command-explain';
import { LessonView } from './LessonView';
import { Scenario } from './Scenario';
import { OfflineNote } from './status';
import { Terminal, type TerminalLine } from './Terminal';

interface TaskScreenProps {
  taskId: string;
  onAttempt: (outcome: Omit<TaskOutcome, 'score'>) => void;
}

const intro: TerminalLine = {
  kind: 'info',
  text: 'O terminal está em /repo. Digite um comando e aperte Executar.',
};
const hintTiers = ['Conceito', 'Sintaxe', 'Resposta'] as const;
const hintButtons = ['Dica: conceito', 'Dica: sintaxe', 'Dica: resposta'] as const;

function revealInScroller(scroller: HTMLElement, target: HTMLElement) {
  const scrollerRect = scroller.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const head = scroller.querySelector('.lesson-head');
  const headHeight =
    head instanceof HTMLElement && getComputedStyle(head).position === 'sticky'
      ? head.getBoundingClientRect().height
      : 0;
  const padding = 8;
  const topLimit = scrollerRect.top + headHeight + padding;
  const bottomLimit = scrollerRect.bottom - padding;
  if (bottomLimit - topLimit <= 0) return;
  if (targetRect.top >= topLimit && targetRect.bottom <= bottomLimit) return;
  scroller.scrollTop += targetRect.top - topLimit;
}

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
  const lessonRef = useRef<HTMLElement>(null);
  const [repo, setRepo] = useState<RepoState>(() => session.getState());
  const [lines, setLines] = useState<TerminalLine[]>([intro]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [failures, setFailures] = useState(0);
  const [feedback, setFeedback] = useState<{ passed: boolean; failures: string[] } | null>(null);
  const [passed, setPassed] = useState(false);
  const [phase, setPhase] = useState<'learn' | 'practice'>('learn');
  const [lessonOpen, setLessonOpen] = useState(false);

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
    if (result.stderr) {
      const error = result.stderr.replace(/\n$/, '');
      next.push({ kind: 'err', text: error });
      const why = explainCommandError(error);
      if (why) next.push({ kind: 'info', text: why });
    }
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
    const node = feedbackRef.current;
    const lesson = lessonRef.current;
    if (node && lesson) revealInScroller(lesson, node);
    node?.focus({ preventScroll: true });
  }, [feedback]);

  useEffect(() => {
    if (hintsUsed === 0) return;
    const lesson = lessonRef.current;
    const hint = lesson?.querySelector<HTMLElement>(`[data-hint="${hintsUsed - 1}"]`);
    if (!lesson || !hint) return;
    revealInScroller(lesson, hint);
  }, [hintsUsed]);

  const shownHints = task.hints.slice(0, hintsUsed);
  const attemptScore = feedback?.passed
    ? scoreAttempt({ solved: true, firstTry: failures === 0, hintsUsed })
    : null;
  const practicing = phase === 'practice';
  const showLesson = !practicing || lessonOpen;

  return (
    <div className={practicing ? 'screen task is-practicing' : 'screen task is-learning'}>
      <OfflineNote />
      <div className="task-side">
        <section ref={lessonRef} className="lesson" tabIndex={0} aria-label="Lição da tarefa">
          <div className="lesson-head">
            <div className="lesson-tools">
              <p className="back">
                <a href="#/">Voltar à trilha</a>
              </p>
              <p className="steps">
                <span
                  className={practicing ? undefined : 'is-current'}
                  aria-current={practicing ? undefined : 'step'}
                >
                  1. Aprenda
                </span>
                <span aria-hidden="true"> · </span>
                <span
                  className={practicing ? 'is-current' : undefined}
                  aria-current={practicing ? 'step' : undefined}
                >
                  2. Pratique
                </span>
              </p>
            </div>
            <h1>{task.title}</h1>
          </div>
          {practicing ? (
            <p className="reopen">
              <button
                className="btn"
                type="button"
                aria-pressed={lessonOpen}
                onClick={() => setLessonOpen((open) => !open)}
              >
                {lessonOpen ? 'Recolher a lição' : 'Rever a lição'}
              </button>
            </p>
          ) : null}
          {showLesson ? <LessonView lesson={task.lesson} /> : null}
          <h2>O que esta tarefa pede</h2>
          <Scenario text={task.scenario} />
          {practicing ? (
            <p className="practice-note">
              Verificar olha o repositório, não a frase exata. Se faltar algo, a mensagem diz o
              motivo.
            </p>
          ) : (
            <p className="practice-note">
              Quando a lição fizer sentido, o botão abaixo abre o terminal. Dá para reler isto
              depois.
            </p>
          )}
          {practicing ? (
            <div className="hints" aria-live="polite">
              {shownHints.map((hint, index) => (
                <p key={`${index}-${hint}`} data-hint={index}>
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
                  <p>O repositório ficou como a tarefa pediu.</p>
                  <p>{task.explanation}</p>
                  <p>
                    Esta tentativa ficou com domínio de {Math.round((attemptScore ?? 0) * 100)}%.
                    Dica, e um Verificar errado antes de acertar, baixam esse número.
                  </p>
                  <p>
                    <a href="#/">Voltar à trilha</a>
                  </p>
                </>
              ) : (
                <>
                  <p>
                    O verificador olha o estado do repositório. A lista diz o que ainda não está lá,
                    e por quê.
                  </p>
                  <ul>
                    {feedback.failures.map((failure) => (
                      <li key={failure}>{failure}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ) : null}
        </section>
        <div className="actions">
          {practicing ? (
            <>
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
              <button className="btn primary" type="button" onClick={verify} disabled={passed}>
                {passed ? 'Tarefa concluída' : 'Verificar tarefa'}
              </button>
            </>
          ) : (
            <button className="btn primary" type="button" onClick={() => setPhase('practice')}>
              Entendi, vamos praticar
            </button>
          )}
        </div>
      </div>
      {practicing ? (
        <div className="workbench">
          <CommitGraph state={repo} />
          <Terminal lines={lines} onSubmit={execute} autoFocus />
        </div>
      ) : null}
    </div>
  );
}
