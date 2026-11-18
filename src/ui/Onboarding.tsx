import { useEffect } from 'react';

interface OnboardingProps {
  onDone: () => void;
}

export function Onboarding({ onDone }: OnboardingProps) {
  useEffect(() => {
    const previous = document.title;
    document.title = 'Como praticar · Trilha Git';
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <div className="screen">
      <h1>Como praticar</h1>
      <p>
        Cada tarefa descreve uma situação. Você digita o comando no terminal. O repositório em
        memória responde, e o gráfico mostra os commits, a branch e o HEAD.
      </p>
      <p>
        Verificar olha o estado final. Mais de um caminho vale. As dicas vêm nesta ordem: conceito,
        sintaxe e a resposta. Dica e erro baixam o domínio.
      </p>
      <p>
        O progresso fica neste navegador. Na primeira abertura o app guarda os arquivos. Depois, a
        prática segue sem rede.
      </p>
      <button className="btn primary" type="button" onClick={onDone}>
        Ir para a trilha
      </button>
    </div>
  );
}
