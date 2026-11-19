const notes: readonly { test: (text: string) => boolean; note: string }[] = [
  {
    test: (text) => text.includes('não conheço o comando'),
    note: 'Esse nome não é um comando daqui. As linhas começam com git, echo, cat, ls, pwd, mkdir, touch ou rm.',
  },
  {
    test: (text) => text.includes('not a git repository'),
    note: 'Esta pasta ainda não é um repositório. git init cria o Git nela. Sem isso, os outros comandos git não têm onde guardar nada.',
  },
  {
    test: (text) => text.includes('falta a mensagem'),
    note: 'O commit precisa de uma mensagem na mesma linha. -m quer dizer mensagem, e o texto fica entre aspas.',
  },
  {
    test: (text) => text.includes('nothing to commit, working tree clean'),
    note: 'Não há mudança nova. A pasta, a área de stage e o último commit estão iguais, então não existe o que gravar.',
  },
  {
    test: (text) => text.includes('no changes added to commit'),
    note: 'A pasta mudou, mas a área de stage ainda não. git commit só grava o que está no stage. git add copia o arquivo para lá.',
  },
  {
    test: (text) => text.includes('nothing added to commit but untracked'),
    note: 'O arquivo está na pasta e o Git ainda não o acompanha. Ele só entra no próximo commit depois de git add.',
  },
  {
    test: (text) => text.includes('did not match any files') || text.includes('pathspec'),
    note: 'O Git não encontrou esse nome na pasta. Confira a grafia e a extensão, como .txt.',
  },
  {
    test: (text) => text.includes('nothing specified, nothing added'),
    note: 'git add precisa saber o quê. Escreva o nome do arquivo, ou um ponto para preparar a pasta inteira.',
  },
  {
    test: (text) => text.includes('does not have any commits yet'),
    note: 'Ainda não existe commit nesta branch. git log só lista o histórico depois do primeiro git commit.',
  },
  {
    test: (text) => text.includes('is not a git command'),
    note: 'O Git não reconhece essa palavra depois de git. O subcomando vem em seguida, como init, status, add ou commit.',
  },
  {
    test: (text) => text.includes('caminho fora do repositório'),
    note: 'O caminho ficou fora de /repo. Esta trilha não aceita .. nem caminho absoluto.',
  },
  {
    test: (text) =>
      text.includes('there is no merge to abort') || text.includes('there is no merge in progress'),
    note: 'Não há um merge aberto. --abort só desfaz um merge que já começou e ainda não foi commitado.',
  },
  {
    test: (text) => text.includes('already exists'),
    note: 'Já existe uma branch com esse nome. Criar de novo não troca a branch atual.',
  },
  {
    test: (text) =>
      text.includes('not a valid object name') ||
      text.includes('unknown revision') ||
      text.includes('bad revision') ||
      text.includes('bad object'),
    note: 'Esse nome não aponta para um commit nem para uma branch daqui. Confira a grafia.',
  },
  {
    test: (text) => text.includes('unresolved conflict'),
    note: 'Ainda há conflito. O arquivo precisa ficar sem os marcadores <<<<<<<, ======= e >>>>>>>, e git add marca essa resolução.',
  },
  {
    test: (text) =>
      text.includes('opção desconhecida') ||
      text.includes('unknown option') ||
      text.includes('opção não aceita'),
    note: 'Essa opção não vale neste comando, ou esta trilha ainda não a aceita.',
  },
];

/** A plain reason for a simulator error, or null when the line is already clear. */
export function explainCommandError(stderr: string): string | null {
  const text = stderr.toLowerCase();
  return notes.find((item) => item.test(text))?.note ?? null;
}
