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
        Cada tarefa abre numa lição. Ela diz o que o comando é, por que existe, e mostra um exemplo
        com a saída do terminal. O botão Entendi, vamos praticar abre o campo onde você digita.
      </p>
      <p>
        O repositório existe só na memória deste navegador. O painel Repositório desenha os commits:
        cada linha é um snapshot, e o ponto preenchido é onde você está.
      </p>
      <p>
        Verificar olha esse repositório, não a frase exata. Mais de um caminho vale. Se faltar algo,
        a mensagem diz o motivo. As dicas vêm depois, nesta ordem: conceito, sintaxe e a resposta.
        Dica e erro baixam o domínio.
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
