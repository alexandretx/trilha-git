import type { Task } from '../../core/types';
import type { GitCheck } from '../../engines/git/grade';
import type { GitInitialState } from '../../engines/git/repo';
import { level3Lessons } from './lessons/level3';

export type GitTask = Task<GitInitialState, GitCheck>;

const cafe8 = 'cafe 8\n';
const cafe9 = 'cafe 9\n';
const cafe7 = 'cafe 7\n';

const conflict: GitInitialState = {
  commits: [
    { id: 'base', message: 'base', files: { 'cardapio.txt': cafe8 } },
    {
      id: 'main1',
      message: 'reajuste',
      files: { 'cardapio.txt': cafe9 },
      parents: ['base'],
    },
    {
      id: 'pro',
      message: 'promocao',
      files: { 'cardapio.txt': cafe7 },
      parents: ['base'],
    },
  ],
  branches: { main: 'main1', promocao: 'pro' },
};

export const level3Tasks: readonly GitTask[] = [
  {
    id: 'abrir-branch',
    lesson: level3Lessons['abrir-branch'],
    conceptId: 'branch',
    title: 'Criar a branch ajuste',
    scenario: 'Crie a branch ajuste a partir do commit atual e permaneça em main. Não faça commit.',
    hints: [
      'git branch nome cria uma branch nova no commit atual. HEAD continua onde está.',
      'git branch ajuste cria a branch sem trocar de branch.',
      'Rode git branch ajuste.',
    ],
    explanation:
      'ajuste e main apontam para o mesmo commit. O próximo commit em main não entra em ajuste, e um commit feito depois de trocar para ajuste não entra em main.',
    initialState: {
      commits: [{ message: 'abre', files: { 'cardapio.txt': cafe8 } }],
    },
    checks: [
      {
        op: 'branchExists',
        name: 'ajuste',
        fail: 'A branch ajuste não existe. Uma branch é um nome apontando para um commit. Criar o nome não troca a linha em que você está e não pede commit.',
      },
      {
        op: 'branch',
        name: 'main',
        fail: 'A branch atual deixou de ser main. O próximo commit entra na linha em que você está. O painel mostra o nome dessa linha junto do ponto preenchido.',
      },
      {
        op: 'commitCount',
        count: 1,
        fail: 'Já existe um commit a mais. Esta tarefa não grava snapshot. O painel não deve ganhar outra linha.',
      },
      {
        op: 'branchTipMessage',
        name: 'ajuste',
        text: 'abre',
        fail: 'ajuste não aponta para o commit atual.',
      },
      { op: 'clean', fail: 'A pasta ficou diferente do commit.' },
    ],
  },
  {
    id: 'anotar-branches',
    lesson: level3Lessons['anotar-branches'],
    conceptId: 'branch',
    title: 'Anotar o nome da outra branch',
    scenario:
      'Há uma branch além de main. O nome dela não está neste texto. Use git branch, grave esse nome em branch.txt com uma quebra de linha e fique em main.',
    hints: [
      'git branch lista as branches. A atual aparece com um asterisco.',
      'git branch mostra os nomes. echo grava o outro nome em branch.txt.',
      'A outra branch se chama promocao. Rode git branch e echo promocao > branch.txt.',
    ],
    explanation:
      'A lista vem dos ponteiros, não dos commits. branch.txt está só na pasta. main continua sendo a branch atual.',
    initialState: {
      commits: [
        { id: 'base', message: 'abre', files: { 'cardapio.txt': cafe8 } },
        {
          id: 'pro',
          message: 'promocao',
          files: { 'cardapio.txt': cafe8, 'aviso.txt': 'meia\n' },
          parents: ['base'],
        },
      ],
      branches: { main: 'base', promocao: 'pro' },
    },
    checks: [
      { op: 'ran', prefix: ['git', 'branch'], fail: 'Rode git branch para ler os nomes.' },
      {
        op: 'worktree',
        path: 'branch.txt',
        content: 'promocao\n',
        fail: 'branch.txt precisa ter o nome da outra branch, com uma quebra de linha.',
      },
      {
        op: 'branch',
        name: 'main',
        fail: 'A branch atual deixou de ser main. O próximo commit entra na linha em que você está. O painel mostra o nome dessa linha junto do ponto preenchido.',
      },
      { op: 'branchExists', name: 'promocao', fail: 'A outra branch foi apagada.' },
    ],
  },
  {
    id: 'apagar-branch-antiga',
    lesson: level3Lessons['apagar-branch-antiga'],
    conceptId: 'branch',
    title: 'Apagar a branch rascunho',
    scenario:
      'A branch rascunho aponta para um commit que já está em main. Apague rascunho. Fique em main, sem commit novo.',
    hints: [
      'git branch -d apaga uma branch cujo commit já está na branch atual. A branch atual não sai.',
      'git branch -d rascunho apaga esse ponteiro.',
      'Rode git branch -d rascunho.',
    ],
    explanation:
      'O ponteiro rascunho saiu. Os commits continuam em main, porque apagar a branch não apaga um commit que outra branch ainda alcança. -d recusa uma branch que main ainda não contém. -D apaga mesmo assim.',
    initialState: {
      commits: [
        { id: 'a', message: 'abre', files: { 'cardapio.txt': cafe8 } },
        { id: 'b', message: 'reajuste', files: { 'cardapio.txt': cafe9 }, parents: ['a'] },
      ],
      branches: { main: 'b', rascunho: 'a' },
    },
    checks: [
      { op: 'branchMissing', name: 'rascunho', fail: 'A branch rascunho ainda existe.' },
      {
        op: 'branch',
        name: 'main',
        fail: 'A branch atual deixou de ser main. O próximo commit entra na linha em que você está. O painel mostra o nome dessa linha junto do ponto preenchido.',
      },
      { op: 'commitCount', count: 2, fail: 'O histórico de main mudou.' },
      {
        op: 'headMessageIncludes',
        text: 'reajuste',
        fail: 'main não está mais no commit reajuste.',
      },
    ],
  },
  {
    id: 'entrar-na-branch',
    lesson: level3Lessons['entrar-na-branch'],
    conceptId: 'switch',
    title: 'Entrar na branch promocao',
    scenario:
      'A branch promocao já existe e tem aviso.txt. Passe a usá-la. Não crie commit. aviso.txt fica na pasta.',
    hints: [
      'git switch nome, e também git checkout nome, apontam HEAD para uma branch que já existe e copiam os arquivos dela para a pasta.',
      'git switch promocao troca para essa branch.',
      'Rode git switch promocao.',
    ],
    explanation:
      'HEAD agora é promocao. aviso.txt veio do commit dessa branch. main continua no commit em que estava. Um arquivo igual nas duas branches pode ir junto com uma edição local. Um arquivo diferente, com edição local, faz o switch parar.',
    initialState: {
      commits: [
        { id: 'base', message: 'abre', files: { 'cardapio.txt': cafe8 } },
        {
          id: 'pro',
          message: 'promocao',
          files: { 'cardapio.txt': cafe7, 'aviso.txt': 'meia\n' },
          parents: ['base'],
        },
      ],
      branches: { main: 'base', promocao: 'pro' },
    },
    checks: [
      {
        op: 'branch',
        name: 'promocao',
        fail: 'A branch atual não é promocao. Trocar de branch move o HEAD e copia os arquivos daquele commit para a pasta. O painel passa a nomear promocao no ponto preenchido.',
      },
      {
        op: 'worktree',
        path: 'aviso.txt',
        content: 'meia\n',
        fail: 'aviso.txt não está na pasta.',
      },
      {
        op: 'headFile',
        path: 'aviso.txt',
        content: 'meia\n',
        fail: 'O commit atual não tem aviso.txt.',
      },
      {
        op: 'headFile',
        path: 'cardapio.txt',
        content: cafe7,
        fail: 'cardapio.txt não é o da branch promocao.',
      },
      { op: 'clean', fail: 'A pasta ficou diferente do commit da branch.' },
    ],
  },
  {
    id: 'commit-na-branch',
    lesson: level3Lessons['commit-na-branch'],
    conceptId: 'switch',
    title: 'Commitar na branch porcao',
    scenario:
      'Crie a branch porcao, passe a usá-la e grave nela um commit com porcao.txt. O texto do arquivo é "meia" e uma quebra de linha. A mensagem contém porcao. main fica sem porcao.txt.',
    hints: [
      'git switch -c nome cria a branch e já entra nela. git checkout -b nome faz o mesmo. O commit seguinte fica nessa branch.',
      'git switch -c porcao, depois o arquivo, git add e git commit -m "mensagem".',
      'Rode git switch -c porcao, echo meia > porcao.txt, git add porcao.txt e git commit -m "abre porcao".',
    ],
    explanation:
      'porcao aponta para o commit novo. main continua no commit anterior, sem porcao.txt. git checkout -b porcao chega no mesmo lugar que git switch -c porcao.',
    initialState: {
      commits: [{ message: 'abre', files: { 'cardapio.txt': cafe8 } }],
    },
    checks: [
      { op: 'branch', name: 'porcao', fail: 'A branch atual não é porcao.' },
      { op: 'branchExists', name: 'porcao', fail: 'A branch porcao não existe.' },
      { op: 'branchExists', name: 'main', fail: 'A branch main sumiu.' },
      {
        op: 'headFile',
        path: 'porcao.txt',
        content: 'meia\n',
        fail: 'porcao.txt não está no commit com o texto "meia".',
      },
      {
        op: 'headMessageIncludes',
        text: 'porcao',
        fail: 'A mensagem do commit precisa conter "porcao".',
      },
      {
        op: 'branchTipFile',
        name: 'main',
        path: 'cardapio.txt',
        content: cafe8,
        fail: 'main não está mais no cardápio original.',
      },
      {
        op: 'branchTipLacks',
        name: 'main',
        path: 'porcao.txt',
        fail: 'porcao.txt entrou em main.',
      },
      { op: 'clean', fail: 'A pasta da branch porcao não corresponde ao commit.' },
    ],
  },
  {
    id: 'voltar-para-main',
    lesson: level3Lessons['voltar-para-main'],
    conceptId: 'switch',
    title: 'Voltar para main sem a alteração',
    scenario:
      'A branch atual é promocao, no mesmo commit que main. Mude cardapio.txt para "cafe 7" com quebra de linha, grave um commit cuja mensagem contenha promocao e volte para main. Em main, cardapio.txt continua "cafe 8".',
    hints: [
      'Um commit fica na branch atual. git switch main volta o HEAD e a pasta para o commit de main.',
      'echo "cafe 7" > cardapio.txt, git add, git commit -m "mensagem", git switch main.',
      'Rode echo "cafe 7" > cardapio.txt, git commit -am "promocao" e git switch main.',
    ],
    explanation:
      'O commit do preço novo está só em promocao. main ainda tem cafe 8, na pasta e no histórico. Trocar de branch troca o commit que a pasta acompanha.',
    initialState: {
      commits: [{ id: 'base', message: 'abre', files: { 'cardapio.txt': cafe8 } }],
      branches: { main: 'base', promocao: 'base' },
      branch: 'promocao',
    },
    checks: [
      { op: 'branch', name: 'main', fail: 'A branch atual não é main.' },
      {
        op: 'headFile',
        path: 'cardapio.txt',
        content: cafe8,
        fail: 'main ficou com o preço da promoção.',
      },
      {
        op: 'worktree',
        path: 'cardapio.txt',
        content: cafe8,
        fail: 'A pasta de main não voltou para cafe 8.',
      },
      {
        op: 'headMessageIncludes',
        text: 'abre',
        fail: 'main não está mais no commit abre.',
      },
      {
        op: 'branchTipFile',
        name: 'promocao',
        path: 'cardapio.txt',
        content: cafe7,
        fail: 'promocao não ficou com cafe 7.',
      },
      {
        op: 'branchTipMessage',
        name: 'promocao',
        text: 'promocao',
        fail: 'A mensagem do commit em promocao precisa conter "promocao".',
      },
      { op: 'clean', fail: 'A pasta de main não está limpa.' },
    ],
  },
  {
    id: 'avancar-main',
    lesson: level3Lessons['avancar-main'],
    conceptId: 'merge',
    title: 'Avançar main até promocao',
    scenario:
      'promocao está à frente de main e main não tem commit próprio nesse intervalo. Incorpore promocao em main. main passa a apontar para o commit de promocao, sem um commit de merge.',
    hints: [
      'git merge faz fast-forward quando a branch atual é ancestral da outra: só move o ponteiro, sem commit novo.',
      'git merge promocao, estando em main.',
      'Rode git merge promocao.',
    ],
    explanation:
      'main andou até o commit que já existia em promocao. O histórico ganhou esse commit na linha de main e não ganhou um commit com dois pais. As duas branches ficam no mesmo ponto.',
    initialState: {
      commits: [
        { id: 'a', message: 'abre', files: { 'cardapio.txt': cafe8 } },
        {
          id: 'b',
          message: 'preco da promocao',
          files: { 'cardapio.txt': cafe7 },
          parents: ['a'],
        },
      ],
      branches: { main: 'a', promocao: 'b' },
    },
    checks: [
      {
        op: 'branch',
        name: 'main',
        fail: 'A branch atual deixou de ser main. O próximo commit entra na linha em que você está. O painel mostra o nome dessa linha junto do ponto preenchido.',
      },
      { op: 'headParentCount', count: 1, fail: 'main ganhou um commit de merge.' },
      {
        op: 'headMessageIncludes',
        text: 'promocao',
        fail: 'main não chegou no commit da promoção.',
      },
      {
        op: 'headFile',
        path: 'cardapio.txt',
        content: cafe7,
        fail: 'cardapio.txt não está em cafe 7.',
      },
      {
        op: 'branchTipMessage',
        name: 'promocao',
        text: 'promocao',
        fail: 'A branch promocao mudou de commit.',
      },
      { op: 'clean', fail: 'A pasta não corresponde ao commit.' },
      {
        op: 'merging',
        value: false,
        fail: 'O merge ficou aberto. Ainda há conflito sem resolver, ou falta o commit que fecha a união. O painel continua avisando o merge.',
      },
    ],
  },
  {
    id: 'juntar-arquivos',
    lesson: level3Lessons['juntar-arquivos'],
    conceptId: 'merge',
    title: 'Unir arquivos das duas branches',
    scenario:
      'main e promocao divergiram a partir do mesmo commit. main tem horario.txt. promocao tem aviso.txt. Una promocao em main. O resultado tem os dois arquivos, num commit com dois pais.',
    hints: [
      'Quando as branches divergem e mexem em arquivos diferentes, git merge cria um commit com dois pais e junta as duas árvores.',
      'git merge promocao, estando em main.',
      'Rode git merge promocao.',
    ],
    explanation:
      'O commit de merge aponta para o antigo main e para promocao. horario.txt e aviso.txt cabem juntos porque ninguém editou o mesmo trecho. O primeiro pai é o commit que já estava em main. git log também lista o commit que veio de promocao.',
    initialState: {
      commits: [
        { id: 'base', message: 'base', files: { 'cardapio.txt': cafe8 } },
        {
          id: 'main1',
          message: 'horario',
          files: { 'cardapio.txt': cafe8, 'horario.txt': '8h\n' },
          parents: ['base'],
        },
        {
          id: 'pro',
          message: 'aviso da casa',
          files: { 'cardapio.txt': cafe8, 'aviso.txt': 'meia\n' },
          parents: ['base'],
        },
      ],
      branches: { main: 'main1', promocao: 'pro' },
    },
    checks: [
      {
        op: 'branch',
        name: 'main',
        fail: 'A branch atual deixou de ser main. O próximo commit entra na linha em que você está. O painel mostra o nome dessa linha junto do ponto preenchido.',
      },
      {
        op: 'headParentCount',
        count: 2,
        fail: 'Falta um commit de merge com dois pais. As branches divergiram, então avançar o ponteiro não junta os dois lados. O commit novo aponta para as duas pontas.',
      },
      {
        op: 'headFile',
        path: 'horario.txt',
        content: '8h\n',
        fail: 'horario.txt não está no commit.',
      },
      {
        op: 'headFile',
        path: 'aviso.txt',
        content: 'meia\n',
        fail: 'aviso.txt não entrou no commit.',
      },
      {
        op: 'headFile',
        path: 'cardapio.txt',
        content: cafe8,
        fail: 'cardapio.txt mudou no merge.',
      },
      {
        op: 'reachableIncludes',
        text: 'aviso da casa',
        fail: 'O commit de promocao ficou fora do histórico.',
      },
      { op: 'clean', fail: 'A pasta não corresponde ao merge.' },
      {
        op: 'merging',
        value: false,
        fail: 'O merge ficou aberto. Ainda há conflito sem resolver, ou falta o commit que fecha a união. O painel continua avisando o merge.',
      },
    ],
  },
  {
    id: 'resolver-conflito',
    lesson: level3Lessons['resolver-conflito'],
    conceptId: 'merge',
    title: 'Resolver o conflito do cardápio',
    scenario:
      'main e promocao mudaram a mesma linha de cardapio.txt. Una promocao em main. O arquivo final tem duas linhas, a de main primeiro e a da outra branch depois: "cafe 9" e "cafe 7", cada uma com quebra de linha. Grave o commit de merge. O arquivo não fica com marcadores de conflito.',
    hints: [
      'No conflito, o arquivo ganha marcadores <<<<<<<, ======= e >>>>>>>. Edite o arquivo até sobrar só o texto desejado, git add marca a resolução e git commit fecha o merge.',
      'git merge promocao, depois echo "cafe 9\\ncafe 7" > cardapio.txt, git add cardapio.txt e git commit.',
      'Rode git merge promocao, echo "cafe 9\\ncafe 7" > cardapio.txt, git add cardapio.txt e git commit -m "une o cardapio".',
    ],
    explanation:
      'As duas branches escreveram preços diferentes na mesma linha, então o merge para e marca o arquivo. git add tira o arquivo da lista de conflitos. O commit tem dois pais e o texto escolhido, sem os marcadores.',
    initialState: conflict,
    checks: [
      {
        op: 'branch',
        name: 'main',
        fail: 'A branch atual deixou de ser main. O próximo commit entra na linha em que você está. O painel mostra o nome dessa linha junto do ponto preenchido.',
      },
      { op: 'headParentCount', count: 2, fail: 'Falta o commit de merge.' },
      {
        op: 'headFile',
        path: 'cardapio.txt',
        content: 'cafe 9\ncafe 7\n',
        fail: 'cardapio.txt não ficou com cafe 9 e cafe 7, nessa ordem.',
      },
      {
        op: 'worktree',
        path: 'cardapio.txt',
        content: 'cafe 9\ncafe 7\n',
        fail: 'A pasta não tem o cardápio resolvido.',
      },
      { op: 'clean', fail: 'Ainda há diferença entre a pasta e o commit.' },
      {
        op: 'merging',
        value: false,
        fail: 'O merge ainda está aberto. Ou os marcadores continuam no arquivo e falta o commit, ou a desistência não devolveu branch, stage e pasta ao commit anterior.',
      },
    ],
  },
  {
    id: 'abortar-merge',
    lesson: level3Lessons['abortar-merge'],
    conceptId: 'merge',
    title: 'Interromper o merge do lote',
    scenario:
      'A branch lote ia ser unida em main, mas esse lote é o conjunto errado. Comece o merge. Quando o conflito aparecer, interrompa com git merge --abort. main termina no commit em que estava, sem merge em andamento, e estoque.txt continua com o texto de main.',
    hints: [
      'git merge --abort devolve a branch, o stage e a pasta ao commit de antes do merge. Só vale com um merge em andamento.',
      'git merge lote começa. git merge --abort interrompe.',
      'Rode git merge lote e git merge --abort.',
    ],
    explanation:
      'O conflito ficou para trás. estoque.txt voltou a "12 unidades" e main não ganhou commit. --abort usa o commit que era HEAD quando o merge começou. Resolver o arquivo e commitar gravaria o lote mesmo assim.',
    initialState: {
      commits: [
        { id: 'base', message: 'base', files: { 'estoque.txt': '10 unidades\n' } },
        {
          id: 'main1',
          message: 'estoque atual',
          files: { 'estoque.txt': '12 unidades\n' },
          parents: ['base'],
        },
        {
          id: 'lote',
          message: 'lote velho',
          files: { 'estoque.txt': '4 unidades\n' },
          parents: ['base'],
        },
      ],
      branches: { main: 'main1', lote: 'lote' },
    },
    checks: [
      {
        op: 'ran',
        prefix: ['git', 'merge', 'lote'],
        fail: 'Comece o merge da branch lote.',
      },
      {
        op: 'ran',
        prefix: ['git', 'merge', '--abort'],
        fail: 'Interrompa o merge com git merge --abort.',
      },
      {
        op: 'merging',
        value: false,
        fail: 'O merge ainda está aberto. Ou os marcadores continuam no arquivo e falta o commit, ou a desistência não devolveu branch, stage e pasta ao commit anterior.',
      },
      {
        op: 'branch',
        name: 'main',
        fail: 'A branch atual deixou de ser main. O próximo commit entra na linha em que você está. O painel mostra o nome dessa linha junto do ponto preenchido.',
      },
      {
        op: 'headMessageIncludes',
        text: 'estoque atual',
        fail: 'main não terminou no commit em que estava.',
      },
      {
        op: 'headFile',
        path: 'estoque.txt',
        content: '12 unidades\n',
        fail: 'estoque.txt não voltou ao texto de main.',
      },
      { op: 'commitCount', count: 2, fail: 'main ganhou um commit nesse merge.' },
      { op: 'clean', fail: 'A pasta não voltou ao commit de main.' },
    ],
  },
];
