import type { Task } from '../../core/types';
import type { GitCheck } from '../../engines/git/grade';
import type { GitInitialState } from '../../engines/git/repo';

export type GitTask = Task<GitInitialState, GitCheck>;

const cafe8 = 'cafe 8\n';
const cafe9 = 'cafe 9\n';
const cafe10 = 'cafe 10\n';
const cafe0 = 'cafe 0\n';

export const level2Tasks: readonly GitTask[] = [
  {
    id: 'ver-diff',
    conceptId: 'diff',
    title: 'Ver a alteração na pasta',
    scenario:
      'cardapio.txt mudou na pasta e ainda não foi para o stage. O preço novo não está neste texto. Use git diff, grave só o número novo em preco.txt, com uma quebra de linha no final. Não faça commit. cardapio.txt continua com a alteração fora do stage.',
    hints: [
      'git diff sem flag compara a pasta com o stage. Uma linha nova aparece com +.',
      'git diff mostra a alteração. echo 9 > preco.txt grava o número.',
      'Rode git diff e echo 9 > preco.txt.',
    ],
    explanation:
      'A pasta tem cafe 9 e o stage ainda tem cafe 8. git diff lista essa diferença e não grava nada. preco.txt ficou só na pasta, fora do histórico.',
    initialState: {
      commits: [{ message: 'cardapio', files: { 'cardapio.txt': cafe8 } }],
      worktree: { 'cardapio.txt': cafe9 },
    },
    checks: [
      { op: 'ran', prefix: ['git', 'diff'], fail: 'Rode git diff para ler a alteração.' },
      {
        op: 'worktree',
        path: 'preco.txt',
        content: '9\n',
        fail: 'preco.txt precisa ter o preço novo, com uma quebra de linha.',
      },
      {
        op: 'worktree',
        path: 'cardapio.txt',
        content: cafe9,
        fail: 'cardapio.txt perdeu a alteração da pasta.',
      },
      {
        op: 'staged',
        path: 'cardapio.txt',
        content: cafe8,
        fail: 'O stage de cardapio.txt mudou. Ele devia continuar no preço antigo.',
      },
      { op: 'commitCount', count: 1, fail: 'Não crie outro commit nesta tarefa.' },
    ],
  },
  {
    id: 'ver-diff-stage',
    conceptId: 'diff',
    title: 'Ver o preço que está no stage',
    scenario:
      'O stage de cardapio.txt não é o mesmo texto da pasta. Descubra o preço que está no stage e grave só o número em preco.txt, com uma quebra de linha. Não mude o stage, a pasta nem o histórico.',
    hints: [
      'git diff sem flag ignora o que já está no stage. git diff --staged compara o stage com o último commit.',
      'git diff --staged mostra a linha com +. echo 10 > preco.txt grava o número.',
      'Rode git diff --staged e echo 10 > preco.txt.',
    ],
    explanation:
      'O stage guarda cafe 10. A pasta ainda tem cafe 8, então git diff sem flag mostra o caminho contrário. --staged, e o sinônimo --cached, leem o que entraria no próximo commit.',
    initialState: {
      commits: [{ message: 'cardapio', files: { 'cardapio.txt': cafe8 } }],
      index: { 'cardapio.txt': cafe10 },
    },
    checks: [
      { op: 'ran', prefix: ['git', 'diff'], fail: 'Rode git diff para ler o stage.' },
      {
        op: 'worktree',
        path: 'preco.txt',
        content: '10\n',
        fail: 'preco.txt precisa ter o preço que está no stage.',
      },
      {
        op: 'staged',
        path: 'cardapio.txt',
        content: cafe10,
        fail: 'O stage de cardapio.txt foi alterado.',
      },
      {
        op: 'worktree',
        path: 'cardapio.txt',
        content: cafe8,
        fail: 'O texto de cardapio.txt na pasta mudou.',
      },
      { op: 'commitCount', count: 1, fail: 'Não crie outro commit nesta tarefa.' },
    ],
  },
  {
    id: 'ler-commit-antigo',
    conceptId: 'show',
    title: 'Ler o preço antigo',
    scenario:
      'O commit mais recente mudou cardapio.txt. O preço do commit anterior não está neste texto. Use git show para lê-lo e grave só o número em antes.txt, com uma quebra de linha. O histórico fica como está.',
    hints: [
      'git show HEAD~1 mostra o commit anterior, com a mensagem e o diff dos arquivos.',
      'git show HEAD~1. O preço antigo entra em antes.txt com echo.',
      'Rode git show HEAD~1 e echo 8 > antes.txt.',
    ],
    explanation:
      'HEAD~1 é o pai do commit atual. git show imprime esse commit e o diff contra o pai dele. antes.txt ficou na pasta: o log não mudou.',
    initialState: {
      commits: [
        { message: 'abertura', files: { 'cardapio.txt': cafe8 } },
        { message: 'reajuste', files: { 'cardapio.txt': cafe9 } },
      ],
    },
    checks: [
      { op: 'ran', prefix: ['git', 'show'], fail: 'Rode git show para ler o commit anterior.' },
      {
        op: 'worktree',
        path: 'antes.txt',
        content: '8\n',
        fail: 'antes.txt precisa ter o preço do commit anterior.',
      },
      {
        op: 'headFile',
        path: 'cardapio.txt',
        content: cafe9,
        fail: 'O commit mais recente não devia mudar.',
      },
      { op: 'commitCount', count: 2, fail: 'O histórico devia continuar com dois commits.' },
      {
        op: 'headMessageIncludes',
        text: 'reajuste',
        fail: 'O HEAD deixou de ser o commit reajuste.',
      },
    ],
  },
  {
    id: 'descartar-edicao',
    conceptId: 'restore',
    title: 'Descartar a edição da pasta',
    scenario:
      'cardapio.txt foi editado na pasta por engano. O stage e o último commit ainda têm a versão certa. Descarte a alteração da pasta. Não crie commit.',
    hints: [
      'git restore copia o stage de volta para a pasta. A edição que não foi para o stage some.',
      'git restore cardapio.txt descarta a alteração desse arquivo.',
      'Rode git restore cardapio.txt.',
    ],
    explanation:
      'A pasta voltou ao texto do stage, que já era o texto do último commit. git status fica limpo. O histórico não ganhou commit porque nada foi gravado nele.',
    initialState: {
      commits: [{ message: 'cardapio', files: { 'cardapio.txt': cafe8 } }],
      worktree: { 'cardapio.txt': cafe0 },
    },
    checks: [
      {
        op: 'worktree',
        path: 'cardapio.txt',
        content: cafe8,
        fail: 'cardapio.txt na pasta ainda não voltou ao texto do commit.',
      },
      {
        op: 'staged',
        path: 'cardapio.txt',
        content: cafe8,
        fail: 'O stage de cardapio.txt mudou.',
      },
      { op: 'commitCount', count: 1, fail: 'Não crie outro commit nesta tarefa.' },
      { op: 'clean', fail: 'Ainda há diferença entre a pasta, o stage e o commit.' },
    ],
  },
  {
    id: 'tirar-do-stage',
    conceptId: 'restore',
    title: 'Tirar o arquivo do stage',
    scenario:
      'cardapio.txt está no stage, e essa alteração ainda não deve entrar no próximo commit. Tire o arquivo do stage e mantenha a edição na pasta. Não crie commit.',
    hints: [
      'git restore --staged copia o último commit de volta para o stage. A pasta não entra nessa cópia.',
      'git restore --staged cardapio.txt tira o arquivo do stage.',
      'Rode git restore --staged cardapio.txt.',
    ],
    explanation:
      'O stage voltou ao commit e a pasta continua com cafe 9. O próximo commit não levaria essa alteração sem um novo git add. git reset sem --soft nem --hard também tira o arquivo do stage.',
    initialState: {
      commits: [{ message: 'cardapio', files: { 'cardapio.txt': cafe8 } }],
      worktree: { 'cardapio.txt': cafe9 },
      index: { 'cardapio.txt': cafe9 },
    },
    checks: [
      {
        op: 'staged',
        path: 'cardapio.txt',
        content: cafe8,
        fail: 'cardapio.txt continua no stage com o preço novo.',
      },
      {
        op: 'worktree',
        path: 'cardapio.txt',
        content: cafe9,
        fail: 'A edição sumiu da pasta.',
      },
      { op: 'commitCount', count: 1, fail: 'Não crie outro commit nesta tarefa.' },
    ],
  },
  {
    id: 'refazer-mensagem',
    conceptId: 'reset',
    title: 'Corrigir a mensagem do commit',
    scenario:
      'O último commit está só nesta máquina. A mensagem ficou "ops" e o conteúdo está certo: caixa.txt tem "aberto" e uma quebra de linha. Troque a mensagem por uma que contenha a palavra caixa. O commit "ops" deixa de ser o HEAD.',
    hints: [
      'git reset --soft HEAD~1 tira o último commit da branch e deixa o stage como ele estava. Um commit novo grava outra mensagem.',
      'git reset --soft HEAD~1 e depois git commit -m "mensagem".',
      'Rode git reset --soft HEAD~1 e git commit -m "abre o caixa".',
    ],
    explanation:
      'O commit novo aponta para o mesmo pai que "ops" apontava, com outra mensagem e o mesmo caixa.txt. --soft mantém o stage. --mixed também chega nesse resultado se o arquivo for adicionado de novo antes do commit.',
    initialState: {
      commits: [
        { message: 'abre o caixa', files: { 'cardapio.txt': cafe8 } },
        {
          message: 'ops',
          files: { 'cardapio.txt': cafe8, 'caixa.txt': 'aberto\n' },
        },
      ],
    },
    checks: [
      { op: 'commitCount', count: 2, fail: 'A branch precisa terminar com dois commits.' },
      {
        op: 'headMessageIncludes',
        text: 'caixa',
        fail: 'A mensagem do HEAD precisa conter "caixa".',
      },
      { op: 'historyLacks', text: 'ops', fail: 'O commit "ops" ainda é o HEAD.' },
      {
        op: 'headFile',
        path: 'caixa.txt',
        content: 'aberto\n',
        fail: 'caixa.txt não está no commit com o texto "aberto".',
      },
      {
        op: 'headFile',
        path: 'cardapio.txt',
        content: cafe8,
        fail: 'cardapio.txt mudou no caminho.',
      },
      { op: 'clean', fail: 'A pasta ainda não corresponde ao commit novo.' },
    ],
  },
  {
    id: 'devolver-para-a-pasta',
    conceptId: 'reset',
    title: 'Devolver o commit para a pasta',
    scenario:
      'O commit "cedo demais" foi feito só nesta máquina e saiu antes da hora. Desfaça esse commit e deixe rascunho.txt na pasta, fora do stage. Não crie outro commit.',
    hints: [
      'git reset HEAD~1, sem --soft e sem --hard, é o modo mixed: a branch volta um commit e o stage acompanha. A pasta fica com os arquivos.',
      'git reset HEAD~1 ou git reset --mixed HEAD~1.',
      'Rode git reset HEAD~1.',
    ],
    explanation:
      'HEAD voltou para "preco inicial". rascunho.txt continua na pasta e não está no stage, então o próximo commit não o levaria. --soft deixaria o arquivo no stage. --hard apagaria o arquivo da pasta.',
    initialState: {
      commits: [
        { message: 'preco inicial', files: { 'cardapio.txt': cafe8 } },
        {
          message: 'cedo demais',
          files: { 'cardapio.txt': cafe8, 'rascunho.txt': 'teste\n' },
        },
      ],
    },
    checks: [
      { op: 'commitCount', count: 1, fail: 'O commit "cedo demais" ainda está na branch.' },
      {
        op: 'historyIncludes',
        text: 'inicial',
        fail: 'O commit anterior saiu da branch junto.',
      },
      { op: 'historyLacks', text: 'cedo', fail: 'O commit "cedo demais" continua no histórico.' },
      {
        op: 'headFile',
        path: 'cardapio.txt',
        content: cafe8,
        fail: 'O commit atual não tem o cardápio original.',
      },
      { op: 'headLacks', path: 'rascunho.txt', fail: 'rascunho.txt ainda está no commit.' },
      {
        op: 'untracked',
        path: 'rascunho.txt',
        fail: 'rascunho.txt devia estar na pasta e fora do stage.',
      },
      {
        op: 'worktree',
        path: 'rascunho.txt',
        content: 'teste\n',
        fail: 'rascunho.txt não está com o texto "teste".',
      },
      { op: 'indexMatchesHead', fail: 'O stage não voltou para o commit anterior.' },
    ],
  },
  {
    id: 'apagar-commit-local',
    conceptId: 'reset',
    title: 'Apagar um commit local',
    scenario:
      'O commit "preco errado" existe só nesta máquina. Ele trocou cardapio.txt para um valor que não deve continuar nem na pasta. Descarte esse commit e a alteração. A pasta fica limpa, no preço do commit anterior.',
    hints: [
      'git reset --hard HEAD~1 move a branch, o stage e a pasta juntos para o commit anterior.',
      'git reset --hard HEAD~1 descarta o último commit.',
      'Rode git reset --hard HEAD~1.',
    ],
    explanation:
      'A branch aponta de novo para "preco inicial". O stage e a pasta têm cafe 8. O commit "preco errado" saiu do histórico dessa branch. Como ele não foi compartilhado, ninguém fica com um commit que a branch não tem mais.',
    initialState: {
      commits: [
        { message: 'preco inicial', files: { 'cardapio.txt': cafe8 } },
        { message: 'preco errado', files: { 'cardapio.txt': cafe0 } },
      ],
    },
    checks: [
      { op: 'commitCount', count: 1, fail: 'O commit errado ainda está na branch.' },
      {
        op: 'historyIncludes',
        text: 'inicial',
        fail: 'O commit anterior não está na branch.',
      },
      {
        op: 'historyLacks',
        text: 'errado',
        fail: 'O commit "preco errado" continua no histórico.',
      },
      {
        op: 'headFile',
        path: 'cardapio.txt',
        content: cafe8,
        fail: 'O commit atual não voltou para cafe 8.',
      },
      {
        op: 'worktree',
        path: 'cardapio.txt',
        content: cafe8,
        fail: 'A pasta ainda tem o preço errado.',
      },
      { op: 'clean', fail: 'A pasta, o stage e o commit ainda diferem.' },
    ],
  },
  {
    id: 'desfazer-commit-publicado',
    conceptId: 'revert',
    title: 'Desfazer um commit compartilhado',
    scenario:
      'O commit "promocao quebrada" já foi enviado para o remoto que a equipe usa. Outras pessoas podem tê-lo. Grave um commit novo que devolve cardapio.txt ao preço do commit anterior. "promocao quebrada" continua no histórico.',
    hints: [
      'git revert grava um commit novo com o inverso de outro commit. O commit antigo permanece no log.',
      'git revert HEAD desfaz o último commit.',
      'Rode git revert HEAD.',
    ],
    explanation:
      'O commit novo deixa cardapio.txt de novo em cafe 8 e aponta para "promocao quebrada". Quem já recebeu o commit quebrado consegue puxar a correção. reset --hard tiraria "promocao quebrada" da branch, e o remoto da equipe ficaria com um commit que a branch não tem mais.',
    initialState: {
      commits: [
        { message: 'preco de abertura', files: { 'cardapio.txt': cafe8 } },
        { message: 'promocao quebrada', files: { 'cardapio.txt': cafe0 } },
      ],
    },
    checks: [
      { op: 'commitCount', count: 3, fail: 'Falta o commit que desfaz a promoção.' },
      {
        op: 'historyIncludes',
        text: 'promocao quebrada',
        fail: 'O commit compartilhado saiu do histórico.',
      },
      {
        op: 'headFile',
        path: 'cardapio.txt',
        content: cafe8,
        fail: 'cardapio.txt ainda não voltou para cafe 8.',
      },
      { op: 'headParentCount', count: 1, fail: 'O commit novo precisa ter um pai.' },
      { op: 'clean', fail: 'A pasta ainda não corresponde ao commit novo.' },
    ],
  },
];
