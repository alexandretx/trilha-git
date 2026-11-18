import { describe, expect, it } from 'vitest';
import { gradeGit } from '../../engines/git/grade';
import { GitSession } from '../../engines/git/session';
import { level1Tasks } from './level1';
import { level2Tasks } from './level2';
import { level3Tasks } from './level3';
import type { GitTask } from './level1';

interface Play {
  id: string;
  solution: string[];
  alternatives?: string[][];
  wrong: string[][];
}

const plays: Play[] = [
  {
    id: 'iniciar-repositorio',
    solution: ['git init'],
    alternatives: [['git init && git status']],
    wrong: [['echo oi > notas.txt']],
  },
  {
    id: 'ler-status',
    solution: ['echo ideia inicial > notas.txt', 'git status'],
    alternatives: [['echo "ideia inicial" > notas.txt && git status']],
    wrong: [['echo ideia inicial > notas.txt', 'git add notas.txt']],
  },
  {
    id: 'preparar-commit',
    solution: ['git add notas.txt'],
    alternatives: [['git add .']],
    wrong: [['git commit -m "notas"']],
  },
  {
    id: 'primeiro-commit',
    solution: ['git commit -m "adiciona notas"'],
    alternatives: [["git commit -m 'adiciona notas'"]],
    wrong: [['git commit -m "primeiro"']],
  },
  {
    id: 'segundo-commit',
    solution: ['echo Olá > leia-me.txt', 'git add leia-me.txt', 'git commit -m "cria leia-me"'],
    alternatives: [['echo "Olá" > leia-me.txt && git add . && git commit -m "cria leia-me"']],
    wrong: [['echo Olá > leia-me.txt', 'git add leia-me.txt']],
  },
  {
    id: 'ler-o-log',
    solution: ['git log --oneline', 'echo "adiciona notas" > resumo.txt'],
    alternatives: [['git log', 'echo adiciona notas > resumo.txt']],
    wrong: [['echo "adiciona notas" > resumo.txt']],
  },
  {
    id: 'escolher-arquivos',
    solution: ['git add app.txt teste.txt', 'git commit -m "sobe app"'],
    alternatives: [['git add app.txt', 'git add teste.txt', 'git commit -m "sobe o app"']],
    wrong: [['git add .', 'git commit -m "sobe app"']],
  },
  {
    id: 'atualizar-arquivo',
    solution: ['echo 0.2 > versao.txt', 'git commit -am "sobe versao"'],
    alternatives: [['echo 0.2 > versao.txt', 'git add versao.txt', 'git commit -m "sobe versao"']],
    wrong: [['echo 0.2 > versao.txt']],
  },
  {
    id: 'ver-diff',
    solution: ['git diff', 'echo 9 > preco.txt'],
    alternatives: [['git diff cardapio.txt', 'echo 9 > preco.txt']],
    wrong: [['git diff', 'git add cardapio.txt', 'git commit -m "sobe"', 'echo 9 > preco.txt']],
  },
  {
    id: 'ver-diff-stage',
    solution: ['git diff --staged', 'echo 10 > preco.txt'],
    alternatives: [['git diff --cached', 'echo 10 > preco.txt']],
    wrong: [['echo 10 > preco.txt']],
  },
  {
    id: 'ler-commit-antigo',
    solution: ['git show HEAD~1', 'echo 8 > antes.txt'],
    alternatives: [['git show HEAD^', 'echo 8 > antes.txt']],
    wrong: [['echo 8 > antes.txt']],
  },
  {
    id: 'descartar-edicao',
    solution: ['git restore cardapio.txt'],
    alternatives: [['git restore --worktree cardapio.txt'], ['git restore .']],
    wrong: [['git checkout -- cardapio.txt']],
  },
  {
    id: 'tirar-do-stage',
    solution: ['git restore --staged cardapio.txt'],
    alternatives: [['git restore --cached cardapio.txt'], ['git reset']],
    wrong: [['git restore cardapio.txt']],
  },
  {
    id: 'refazer-mensagem',
    solution: ['git reset --soft HEAD~1', 'git commit -m "abre o caixa"'],
    alternatives: [['git reset --mixed HEAD~1', 'git add .', 'git commit -m "abre o caixa"']],
    wrong: [['git commit --amend -m "abre o caixa"']],
  },
  {
    id: 'devolver-para-a-pasta',
    solution: ['git reset HEAD~1'],
    alternatives: [['git reset --mixed HEAD~1']],
    wrong: [['git reset --hard HEAD~1'], ['git reset --soft HEAD~1']],
  },
  {
    id: 'apagar-commit-local',
    solution: ['git reset --hard HEAD~1'],
    alternatives: [['git reset --hard HEAD^']],
    wrong: [['git reset --soft HEAD~1'], ['git reset HEAD~1']],
  },
  {
    id: 'desfazer-commit-publicado',
    solution: ['git revert HEAD'],
    alternatives: [['echo "cafe 8" > cardapio.txt', 'git commit -am "devolve o preco"']],
    wrong: [['git reset --hard HEAD~1']],
  },
  {
    id: 'abrir-branch',
    solution: ['git branch ajuste'],
    alternatives: [['git branch ajuste HEAD']],
    wrong: [['git switch -c ajuste']],
  },
  {
    id: 'anotar-branches',
    solution: ['git branch', 'echo promocao > branch.txt'],
    alternatives: [['git branch --list', 'echo promocao > branch.txt']],
    wrong: [['echo promocao > branch.txt']],
  },
  {
    id: 'apagar-branch-antiga',
    solution: ['git branch -d rascunho'],
    alternatives: [['git branch --delete rascunho'], ['git branch -D rascunho']],
    wrong: [['git branch -d main']],
  },
  {
    id: 'entrar-na-branch',
    solution: ['git switch promocao'],
    alternatives: [['git checkout promocao']],
    wrong: [['git branch promocao']],
  },
  {
    id: 'commit-na-branch',
    solution: [
      'git switch -c porcao',
      'echo meia > porcao.txt',
      'git add porcao.txt',
      'git commit -m "abre porcao"',
    ],
    alternatives: [
      [
        'git checkout -b porcao',
        'echo meia > porcao.txt',
        'git add porcao.txt',
        'git commit -m "porcao nova"',
      ],
    ],
    wrong: [['echo meia > porcao.txt', 'git add porcao.txt', 'git commit -m "abre porcao"']],
  },
  {
    id: 'voltar-para-main',
    solution: ['echo "cafe 7" > cardapio.txt', 'git commit -am "promocao"', 'git switch main'],
    alternatives: [
      ['echo "cafe 7" > cardapio.txt', 'git commit -am "promocao do dia"', 'git checkout main'],
    ],
    wrong: [['echo "cafe 7" > cardapio.txt', 'git commit -am "promocao"']],
  },
  {
    id: 'avancar-main',
    solution: ['git merge promocao'],
    alternatives: [['git merge promocao && git status']],
    wrong: [['git switch promocao']],
  },
  {
    id: 'juntar-arquivos',
    solution: ['git merge promocao'],
    alternatives: [['git merge promocao && git log --oneline']],
    wrong: [['git merge --abort']],
  },
  {
    id: 'resolver-conflito',
    solution: [
      'git merge promocao',
      'echo "cafe 9\\ncafe 7" > cardapio.txt',
      'git add cardapio.txt',
      'git commit -m "une o cardapio"',
    ],
    alternatives: [
      [
        'git merge promocao',
        'echo "cafe 9\\ncafe 7" > cardapio.txt',
        'git add cardapio.txt',
        'git merge --continue',
      ],
    ],
    wrong: [['git merge promocao']],
  },
  {
    id: 'abortar-merge',
    solution: ['git merge lote', 'git merge --abort'],
    alternatives: [['git merge lote ; git merge --abort']],
    wrong: [['git merge --abort'], ['git merge lote', 'git commit -m "fica o estoque"']],
  },
];

const tasks = new Map<string, GitTask>(
  [...level1Tasks, ...level2Tasks, ...level3Tasks].map((task) => [task.id, task]),
);

function finish(task: GitTask, lines: string[]) {
  const repo = new GitSession(task.initialState);
  for (const line of lines) repo.execute(line);
  return gradeGit(repo.getState(), task.checks, repo.history());
}

describe('níveis 1 a 3', () => {
  it('has one play for every task', () => {
    expect(plays.map((play) => play.id).sort()).toEqual([...tasks.keys()].sort());
    expect(new Set(plays.map((play) => play.id)).size).toBe(tasks.size);
  });

  it.each(plays.map((play) => [play.id, play] as const))(
    '%s accepts the reference solution and a wrong path fails',
    (id, play) => {
      const task = tasks.get(id);
      if (!task) throw new Error(id);

      const solved = finish(task, play.solution);
      expect(solved.failures, play.solution.join(' | ')).toEqual([]);
      expect(solved.passed).toBe(true);

      for (const lines of play.alternatives ?? []) {
        const result = finish(task, lines);
        expect(result.failures, lines.join(' | ')).toEqual([]);
        expect(result.passed).toBe(true);
      }

      expect(play.wrong.length).toBeGreaterThan(0);
      for (const lines of play.wrong) {
        const result = finish(task, lines);
        expect(result.passed, lines.join(' | ')).toBe(false);
        expect(result.failures.length).toBeGreaterThan(0);
        for (const failure of result.failures) {
          expect(failure.includes(task.hints[2])).toBe(false);
        }
      }
    },
  );
});
