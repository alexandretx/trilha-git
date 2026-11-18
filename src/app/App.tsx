import { useEffect, useMemo, useRef, useState } from 'react';
import {
  emptyProgress,
  recordOutcome,
  type ProgressSnapshot,
  type TaskOutcome,
} from '../core/progress';
import { browserProgressStore } from '../core/progress-store';
import { TaskScreen } from '../ui/TaskScreen';
import { TrailScreen } from '../ui/TrailScreen';
import { useTheme } from '../ui/theme';

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
  const store = useMemo(() => browserProgressStore(), []);
  const [route, setRoute] = useState<Route>(readRoute);
  const [progress, setProgress] = useState<ProgressSnapshot>(emptyProgress);
  const progressRef = useRef(progress);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
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

  return (
    <div className={route.name === 'task' ? 'shell is-task' : 'shell'}>
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
      <main>
        {!ready ? (
          <div className="screen">
            <p>Carregando progresso neste navegador.</p>
          </div>
        ) : route.name === 'task' ? (
          <TaskScreen taskId={route.taskId} onAttempt={onAttempt} />
        ) : (
          <TrailScreen progress={progress} loadError={loadError} />
        )}
      </main>
    </div>
  );
}
