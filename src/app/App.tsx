import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  emptyProgress,
  recordOutcome,
  type ProgressSnapshot,
  type TaskOutcome,
} from '../core/progress';
import { browserProgressStore } from '../core/progress-store';
import { Onboarding } from '../ui/Onboarding';
import { introSeen, rememberIntro } from '../ui/intro';
import { TaskScreen } from '../ui/TaskScreen';
import { TrailScreen } from '../ui/TrailScreen';
import { useTheme } from '../ui/theme';
import { useViewportHeight } from '../ui/viewport';

type Route = { name: 'trail' } | { name: 'task'; taskId: string };

function readRoute(): Route {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  const match = /^\/tarefa\/([a-z0-9-]+)$/.exec(hash);
  const taskId = match?.[1];
  if (taskId) return { name: 'task', taskId };
  return { name: 'trail' };
}

export function App() {
  const { theme, toggle } = useTheme();
  useViewportHeight();
  const store = useMemo(() => browserProgressStore(), []);
  const [route, setRoute] = useState<Route>(readRoute);
  const [progress, setProgress] = useState<ProgressSnapshot>(emptyProgress);
  const progressRef = useRef(progress);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(() => !introSeen());
  progressRef.current = progress;

  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    let cancel = false;
    store
      .load()
      .then((loaded) => {
        if (cancel) return;
        setProgress(loaded ?? emptyProgress());
        setReady(true);
      })
      .catch(() => {
        if (cancel) return;
        setProgress(emptyProgress());
        setLoadError('Não consegui ler o progresso salvo. Começando de novo neste navegador.');
        setReady(true);
      });
    return () => {
      cancel = true;
    };
  }, [store]);

  function onAttempt(input: Omit<TaskOutcome, 'score'>) {
    const current = progressRef.current;
    const existing = current.outcomes[input.taskId];
    if (!input.solved && existing?.solved) return;
    const next = recordOutcome(current, input);
    progressRef.current = next;
    setProgress(next);
    store.save(next).catch(() => {
      setLoadError(
        'Não consegui salvar o progresso neste navegador. Dá para praticar mesmo assim.',
      );
    });
  }

  function closeIntro() {
    rememberIntro();
    setShowIntro(false);
  }

  let body: ReactNode;
  if (!ready) {
    body = (
      <div className="screen">
        <p role="status">Carregando progresso neste navegador.</p>
      </div>
    );
  } else if (route.name === 'task') {
    body = <TaskScreen taskId={route.taskId} onAttempt={onAttempt} />;
  } else if (showIntro) {
    body = <Onboarding onDone={closeIntro} />;
  } else {
    body = (
      <TrailScreen
        progress={progress}
        loadError={loadError}
        onShowIntro={() => setShowIntro(true)}
      />
    );
  }

  return (
    <div className={route.name === 'task' && ready ? 'shell is-task' : 'shell'}>
      <a className="skip-link" href="#conteudo">
        Ir para o conteúdo
      </a>
      <header className="top">
        <p className="wordmark">
          <a href="#/">Trilha Git</a>
        </p>
        <button
          className="btn theme-toggle"
          type="button"
          aria-pressed={theme === 'dark'}
          onClick={toggle}
        >
          {theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
        </button>
      </header>
      <main id="conteudo" tabIndex={-1}>
        {body}
      </main>
    </div>
  );
}
