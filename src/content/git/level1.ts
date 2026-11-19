import type { Task } from '../../core/types';
import type { GitCheck } from '../../engines/git/grade';
import type { GitInitialState } from '../../engines/git/repo';
import { level1Lessons } from './lessons/level1';

export type GitTask = Task<GitInitialState, GitCheck>;

const notas = 'ideia inicial\n';

export const level1Tasks: readonly GitTask[] = [
  {
    id: 'iniciar-repositorio',
    lesson: level1Lessons['iniciar-repositorio'],
    conceptId: 'init',
    title: 'Iniciar o repositório',
    scenario:
      'A pasta /repo existe e ainda não é um repositório Git. Inicie o Git nela. A branch fica em main e não há commit.',
    hints: [
      'git init cria a estrutura do repositório na pasta atual. Ele não grava um commit.',
      'O comando não leva arquivo nem mensagem: git init.',
      'Rode git init.',
    ],
    explanation:
      'git init prepara a pasta e aponta HEAD para main. git status, a partir daí, responde que ainda não existe commit. O primeiro snapshot só aparece quando você adiciona arquivos e commita.',
    initialState: {},
    checks: [
      {
        op: 'initialized',
        value: true,
        fail: 'O repositório ainda não foi iniciado. Sem isso a pasta não tem branch nem histórico, e o painel continua dizendo que o repositório não foi iniciado.',
      },
      {
        op: 'branch',
        name: 'main',
        fail: 'A branch atual não é main. Nesta trilha o começo fica em main, o nome da linha principal.',
      },
      {
        op: 'commitCount',
        count: 0,
        fail: 'Já existe um commit. Esta tarefa só pede para iniciar a pasta. O primeiro snapshot fica para depois.',
      },
    ],
  },
  {
    id: 'ler-status',
    lesson: level1Lessons['ler-status'],
    conceptId: 'status',
    title: 'Criar um arquivo e olhar o status',
    scenario:
      'O repositório já existe e não tem commits. Crie notas.txt com o texto "ideia inicial" e uma quebra de linha no final. Antes de concluir, rode git status. O arquivo deve continuar fora do stage.',
    hints: [
      'git status compara a pasta, o stage e o último commit. Um arquivo novo aparece como untracked.',
      'echo "ideia inicial" > notas.txt grava o arquivo. git status mostra o estado.',
      'Rode echo "ideia inicial" > notas.txt e depois git status.',
    ],
    explanation:
      'O texto foi para a pasta de trabalho. Como ninguém rodou git add, o status lista notas.txt em "Untracked files". O stage e o histórico continuam vazios.',
    initialState: { initialized: true },
    checks: [
      {
        op: 'worktree',
        path: 'notas.txt',
        content: notas,
        fail: 'notas.txt não está na pasta com o texto "ideia inicial" e uma quebra de linha. Esse arquivo é o diretório de trabalho, ainda não o histórico.',
      },
      {
        op: 'untracked',
        path: 'notas.txt',
        fail: 'notas.txt já foi para a área de stage. Esta tarefa quer o arquivo só na pasta, ainda não acompanhado pelo Git.',
      },
      {
        op: 'commitCount',
        count: 0,
        fail: 'Já existe um commit. Esta tarefa só pede o arquivo na pasta e uma leitura do estado.',
      },
      {
        op: 'ran',
        prefix: ['git', 'status'],
        fail: 'Falta uma leitura com git status. Esse comando não muda nada: ele mostra se o arquivo está na pasta, no stage ou no último commit.',
      },
    ],
  },
  {
    id: 'preparar-commit',
    lesson: level1Lessons['preparar-commit'],
    conceptId: 'add',
    title: 'Preparar o arquivo',
    scenario:
      'notas.txt está na pasta com o texto "ideia inicial". Coloque esse arquivo na área de stage. Não crie o commit.',
    hints: [
      'git add copia o arquivo da pasta para o index. O commit seguinte só enxerga o que está no index.',
      'git add notas.txt prepara um arquivo. git add . prepara todos os arquivos da pasta.',
      'Rode git add notas.txt.',
    ],
    explanation:
      'O index agora tem a mesma versão de notas.txt que está na pasta. git status mostra o arquivo em "Changes to be committed". Sem git commit, essa versão ainda não faz parte do histórico.',
    initialState: { initialized: true, worktree: { 'notas.txt': notas } },
    checks: [
      {
        op: 'staged',
        path: 'notas.txt',
        content: notas,
        fail: 'notas.txt ainda não está na área de stage com o texto pedido. O próximo commit só enxerga o stage, então preparar o arquivo é o que falta.',
      },
      {
        op: 'commitCount',
        count: 0,
        fail: 'Já existe um commit. Esta tarefa para no stage. Gravar o snapshot é a tarefa seguinte.',
      },
      {
        op: 'worktree',
        path: 'notas.txt',
        content: notas,
        fail: 'O texto de notas.txt na pasta mudou. O stage precisa da mesma versão que a tarefa deixou na pasta.',
      },
    ],
  },
  {
    id: 'primeiro-commit',
    lesson: level1Lessons['primeiro-commit'],
    conceptId: 'commit',
    title: 'Gravar o primeiro commit',
    scenario:
      'notas.txt já está no stage. Crie um commit cuja mensagem contenha a palavra notas. No final, a pasta fica limpa em relação a esse commit.',
    hints: [
      'git commit grava um snapshot do index. A flag -m entrega a mensagem sem abrir um editor.',
      'A forma é git commit -m "sua mensagem".',
      'Rode git commit -m "adiciona notas".',
    ],
    explanation:
      'Esse commit é a raiz do histórico: não tem pai. A mensagem fica no log, e o snapshot guarda o conteúdo de notas.txt. Um segundo commit só nasce se o index mudar de novo.',
    initialState: {
      initialized: true,
      worktree: { 'notas.txt': notas },
      index: { 'notas.txt': notas },
    },
    checks: [
      {
        op: 'commitCount',
        count: 1,
        fail: 'Ainda não existe commit. O stage guarda a escolha, e o histórico só ganha um ponto quando essa escolha é gravada.',
      },
      {
        op: 'headMessageIncludes',
        text: 'notas',
        fail: 'A mensagem do commit precisa conter a palavra notas. Essa frase é o que o painel e o git log mostram nesse ponto.',
      },
      {
        op: 'headFile',
        path: 'notas.txt',
        content: notas,
        fail: 'O commit não guardou notas.txt. O snapshot grava o que estava no stage, não um arquivo que ficou só na pasta.',
      },
      {
        op: 'clean',
        fail: 'A pasta, o stage e o commit ainda não estão iguais. Sobrou mudança sem gravar, ou o stage não bate com o snapshot.',
      },
    ],
  },
  {
    id: 'segundo-commit',
    lesson: level1Lessons['segundo-commit'],
    conceptId: 'commit',
    title: 'Um segundo arquivo',
    scenario:
      'Já existe um commit com notas.txt. Crie leia-me.txt com o texto "Olá" e uma quebra de linha, prepare o arquivo e grave outro commit. A mensagem desse commit precisa conter leia-me.',
    hints: [
      'Arquivo novo não entra no commit sozinho. Ele passa por git add, como o primeiro.',
      'echo "Olá" > leia-me.txt, depois git add leia-me.txt, depois git commit -m "mensagem".',
      'Rode echo "Olá" > leia-me.txt, git add leia-me.txt e git commit -m "cria leia-me".',
    ],
    explanation:
      'O segundo commit aponta para o primeiro e guarda os dois arquivos. notas.txt continuou no snapshot porque ainda estava no index. O log mostra o commit novo em cima do antigo.',
    initialState: {
      commits: [{ message: 'adiciona notas', files: { 'notas.txt': notas } }],
    },
    checks: [
      {
        op: 'commitCount',
        count: 2,
        fail: 'Ainda falta o segundo commit. Arquivo novo não entra sozinho: ele passa pelo stage e só então o snapshot nasce.',
      },
      {
        op: 'headMessageIncludes',
        text: 'leia-me',
        fail: 'A mensagem do commit novo precisa conter a palavra leia-me. É a frase que identifica esse ponto no painel.',
      },
      {
        op: 'headFile',
        path: 'leia-me.txt',
        content: 'Olá\n',
        fail: 'leia-me.txt não está no commit com o texto "Olá". O snapshot só guarda o que estava no stage.',
      },
      {
        op: 'headFile',
        path: 'notas.txt',
        content: notas,
        fail: 'notas.txt sumiu do commit mais recente. Um commit guarda a pasta daquele momento, inclusive o arquivo que não mudou.',
      },
      {
        op: 'clean',
        fail: 'A pasta ainda não corresponde ao último commit. Sobrou arquivo ou edição fora do snapshot.',
      },
    ],
  },
  {
    id: 'ler-o-log',
    lesson: level1Lessons['ler-o-log'],
    conceptId: 'log',
    title: 'Ler o histórico',
    scenario:
      'Há dois commits. A mensagem do mais antigo não está neste enunciado. Use git log para lê-la e grave essa mensagem, exatamente, em resumo.txt, com uma quebra de linha no final.',
    hints: [
      'git log lista do commit mais novo para o mais antigo. git log --oneline mostra o hash curto e a primeira linha da mensagem.',
      'Depois de ler, echo "mensagem" > resumo.txt grava o arquivo.',
      'A mensagem antiga é "adiciona notas". Rode git log e echo "adiciona notas" > resumo.txt.',
    ],
    explanation:
      'O commit de baixo é a raiz. A mensagem dele não muda quando um commit novo aparece por cima. resumo.txt está só na pasta: ele não entrou no histórico porque ninguém pediu um commit.',
    initialState: {
      commits: [
        { message: 'adiciona notas', files: { 'notas.txt': notas } },
        {
          message: 'cria leia-me',
          files: { 'notas.txt': notas, 'leia-me.txt': 'Olá\n' },
        },
      ],
    },
    checks: [
      {
        op: 'worktree',
        path: 'resumo.txt',
        content: 'adiciona notas\n',
        fail: 'resumo.txt precisa conter a mensagem do commit mais antigo, com uma quebra de linha. O log lista o mais novo primeiro. A raiz é a última linha.',
      },
      {
        op: 'rootMessageIncludes',
        text: 'adiciona notas',
        fail: 'A mensagem do primeiro commit foi alterada. Esta tarefa só lê o histórico. O commit antigo continua com a frase original.',
      },
      {
        op: 'ran',
        prefix: ['git', 'log'],
        fail: 'Falta uma leitura com git log. A mensagem antiga não está no enunciado: o histórico é quem mostra a frase.',
      },
    ],
  },
  {
    id: 'escolher-arquivos',
    lesson: level1Lessons['escolher-arquivos'],
    conceptId: 'add',
    title: 'Escolher o que entra',
    scenario:
      'A pasta tem app.txt, teste.txt e rascunho.txt. Faça um commit só com app.txt e teste.txt. rascunho.txt continua fora do Git. A mensagem do commit precisa conter app.',
    hints: [
      'git add recebe a lista de arquivos. O que ficar de fora continua não rastreado.',
      'git add app.txt teste.txt prepara os dois. git add . também levaria o rascunho.',
      'Rode git add app.txt teste.txt e git commit -m "sobe app".',
    ],
    explanation:
      'O commit guarda app.txt e teste.txt. rascunho.txt segue na pasta, e o status ainda o mostra como untracked. É assim que um arquivo local fica de fora do histórico.',
    initialState: {
      initialized: true,
      worktree: {
        'app.txt': 'ok\n',
        'teste.txt': 'ok\n',
        'rascunho.txt': 'nao\n',
      },
    },
    checks: [
      {
        op: 'headFile',
        path: 'app.txt',
        content: 'ok\n',
        fail: 'app.txt não está no commit. Só entra o que foi para o stage antes de gravar.',
      },
      {
        op: 'headFile',
        path: 'teste.txt',
        content: 'ok\n',
        fail: 'teste.txt não está no commit. Os dois arquivos pedidos precisam estar no stage juntos.',
      },
      {
        op: 'headLacks',
        path: 'rascunho.txt',
        fail: 'rascunho.txt entrou no commit. Preparar a pasta inteira leva o rascunho junto. A lista do add escolhe o que entra.',
      },
      {
        op: 'untracked',
        path: 'rascunho.txt',
        fail: 'rascunho.txt deveria continuar só na pasta, ainda não acompanhado pelo Git.',
      },
      {
        op: 'headMessageIncludes',
        text: 'app',
        fail: 'A mensagem do commit precisa conter a palavra app. É a frase desse ponto no painel.',
      },
      {
        op: 'indexMatchesHead',
        fail: 'O stage não corresponde ao commit. Depois de gravar, o stage fica igual ao snapshot.',
      },
      {
        op: 'worktreeMatchesIndex',
        fail: 'Algum arquivo já acompanhado ainda difere do stage. A pasta e o stage precisam concordar nos arquivos que o Git já segue.',
      },
    ],
  },
  {
    id: 'atualizar-arquivo',
    lesson: level1Lessons['atualizar-arquivo'],
    conceptId: 'commit',
    title: 'Alterar e commitar',
    scenario:
      'versao.txt já está commitado com o conteúdo "0.1". Mude para "0.2", com quebra de linha, prepare a alteração e grave um commit. A mensagem precisa conter versao. No final, a árvore de trabalho fica limpa.',
    hints: [
      'Editar um arquivo rastreado não entra no próximo commit até um novo git add. git commit -a inclui essa alteração de arquivo já rastreado.',
      'echo "0.2" > versao.txt substitui o conteúdo. Depois, git add versao.txt e git commit -m "mensagem".',
      'Rode echo "0.2" > versao.txt, git add versao.txt e git commit -m "sobe versao".',
    ],
    explanation:
      'O commit novo guarda 0.2 e aponta para o commit que guardava 0.1. git status termina em "working tree clean" porque a pasta, o stage e o HEAD têm o mesmo conteúdo.',
    initialState: {
      commits: [{ message: 'versao 0.1', files: { 'versao.txt': '0.1\n' } }],
    },
    checks: [
      {
        op: 'commitCount',
        count: 2,
        fail: 'Falta o commit com a versão nova. Editar a pasta não grava o histórico. O stage precisa da versão nova antes do snapshot.',
      },
      {
        op: 'headFile',
        path: 'versao.txt',
        content: '0.2\n',
        fail: 'O commit ainda tem o texto antigo de versao.txt. O snapshot grava o stage, que continua em 0.1 até um add novo.',
      },
      {
        op: 'headMessageIncludes',
        text: 'versao',
        fail: 'A mensagem do commit precisa conter a palavra versao.',
      },
      {
        op: 'clean',
        fail: 'A pasta, o stage e o commit ainda diferem. No final os três ficam com 0.2, e o status diria que a árvore de trabalho está limpa.',
      },
    ],
  },
];
