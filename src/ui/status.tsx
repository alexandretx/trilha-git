import { useEffect, useState } from 'react';

const INSTALL_KEY = 'trilha-git.install.dismissed';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function installDismissed(): boolean {
  try {
    return localStorage.getItem(INSTALL_KEY) === '1';
  } catch {
    return false;
  }
}

function rememberInstallDismissed(): void {
  try {
    localStorage.setItem(INSTALL_KEY, '1');
  } catch {
    // State already hides the offer for this visit.
  }
}

function runningStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

function iosBrowser(): boolean {
  const agent = navigator.userAgent;
  return (
    /iphone|ipad|ipod/i.test(agent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const markOnline = () => setOnline(true);
    const markOffline = () => setOnline(false);
    window.addEventListener('online', markOnline);
    window.addEventListener('offline', markOffline);
    return () => {
      window.removeEventListener('online', markOnline);
      window.removeEventListener('offline', markOffline);
    };
  }, []);
  return online;
}

export function OfflineNote() {
  const online = useOnline();
  if (online) return null;
  return (
    <p className="notice" role="status">
      Sem conexão. Dá para continuar com o que este navegador já abriu.
    </p>
  );
}

export function InstallOffer() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(installDismissed);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (runningStandalone()) {
      setHidden(true);
      return;
    }
    setIos(iosBrowser());
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (hidden || (!prompt && !ios)) return null;

  function dismiss() {
    rememberInstallDismissed();
    setHidden(true);
  }

  async function install() {
    if (!prompt) return;
    const current = prompt;
    setPrompt(null);
    try {
      await current.prompt();
      const choice = await current.userChoice;
      if (choice.outcome === 'dismissed') rememberInstallDismissed();
    } catch {
      // The browser refused the sheet. The offer can return on a later visit.
    }
    setHidden(true);
  }

  return (
    <div className="install-offer">
      <p>
        {prompt
          ? 'O app pode ficar na tela de início deste aparelho.'
          : 'No Safari, use Compartilhar e depois Adicionar à Tela de Início.'}
      </p>
      <div className="install-actions">
        {prompt ? (
          <button className="btn" type="button" onClick={() => void install()}>
            Instalar neste aparelho
          </button>
        ) : null}
        <button className="btn" type="button" onClick={dismiss}>
          {prompt ? 'Agora não' : 'Entendi'}
        </button>
      </div>
    </div>
  );
}
