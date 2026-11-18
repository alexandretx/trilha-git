# Trilha Git

Aplicação para praticar Git no navegador. Você digita comandos num terminal simulado. Um repositório em memória reage. A tarefa é corrigida pelo estado final desse repositório, então mais de um caminho vale.

O projeto é de Alexandre Teixeira ([alexandretx](https://github.com/alexandretx)), de Salvador. A interface está em português. Os identificadores e as mensagens de commit estão em inglês. A saída dos comandos `git` fica em inglês, como no Git de verdade. Os avisos do próprio app ficam em português.

Não é o Git de verdade e não usa WASM. Nada aqui mexe no sistema de arquivos da máquina.

## Como funciona

Cada tarefa descreve uma situação e um estado de chegada. `git add notas.txt` e `git add .` passam do mesmo jeito se o index terminar igual. `status` e `log` não mudam o repositório, então essas tarefas também pedem que o comando tenha sido usado, sem cobrar a linha inteira.

Depois de cada tarefa aparece uma explicação curta. Há três dicas: conceito, sintaxe e resposta. Acertar de primeira, sem dica, pesa mais. Dica e erro pesam menos. O nível seguinte abre com cerca de 80% de domínio do nível atual. O que ficou fraco volta numa fila de revisão.

O progresso fica no `localStorage` deste navegador. Dá para praticar offline depois que o app foi aberto uma vez.

## Arquitetura

O conteúdo não mora no componente. Um assunto é um pacote de dados mais um motor.

```
src/core/          contratos, domínio, fila de revisão, ProgressStore
src/engines/git/   repositório em memória e o shell mínimo das tarefas
src/content/git/   nível Básico: estado inicial, verificações, dicas
src/ui/            trilha, tarefa e terminal
```

Os contratos estão em `src/core/types.ts`: `Engine`, `EngineSession`, `ContentPack`, `Task`, `Grader`, `ProgressStore`. O pacote declara um `engineId`. O app liga os dois no registro (`src/app/registry.ts`).

O motor Git guarda working tree, index, commits com SHA-1 no formato de objeto do Git, branches e HEAD. Nesta fase os comandos são `init`, `status`, `add`, `commit` e `log`, mais `echo` (com `>` e `>>`), `touch`, `cat`, `ls`, `pwd`, `mkdir` e `rm`. A branch inicial é `main`. O autor dos commits é `Estudante <estudante@trilha.local>`, no fuso `-0300`.

`ProgressStore` é assíncrono de propósito. A implementação de hoje é `localStorage`. Uma troca por IndexedDB ou por sincronização depois não precisa reescrever a tela.

A direção visual está em `DESIGN.md`. As regras para quem for mexer no repositório estão em `AGENTS.md`.

## Como rodar

Requer Node 20.19 ou mais novo.

```bash
npm install
npm run dev
```

Outros scripts:

| Script              | O que faz                                       |
| ------------------- | ----------------------------------------------- |
| `npm test`          | Vitest: motor, domínio e as soluções do nível 1 |
| `npm run lint`      | ESLint                                          |
| `npm run typecheck` | `tsc --noEmit`                                  |
| `npm run build`     | build de produção, com service worker           |
| `npm run preview`   | serve o build                                   |
| `npm run format`    | Prettier                                        |

O CI roda lint, formatação, typecheck, testes e build.

Para instalar no celular ou no computador, use o build (`npm run build && npm run preview`) e a opção de instalar do navegador. No `dev` o service worker não fica ligado.

## Como adicionar um pacote

1. Crie `src/content/<assunto>/` com níveis, tarefas, estado inicial, verificações, dicas e explicação.
2. Se o `engineId` for novo, crie `src/engines/<assunto>/` com um motor e um corretor, e registre os dois em `src/app/registry.ts`.
3. Cada tarefa nova leva um teste: uma solução válida passa, um repositório errado não passa.
4. A trilha lê o pacote pelo registro. A tela não importa o arquivo da tarefa direto.

Linux, Bash ou SQL entram como motor mais pacote. Não como um caso especial na interface.

## Fases

1. **Núcleo.** Ferramentas, motor Git até o básico, domínio, nível Básico jogável, PWA. É o estado deste repositório.
2. **Histórico.** `diff`, `restore`, `reset`, `revert`.
3. **Branches.** `branch`, `switch`, `merge`, conflitos.
4. **Remoto.** Remoto simulado: `clone`, `remote`, `fetch`, `pull`, `push`.
5. **Avançado.** `rebase`, `stash`, `cherry-pick`, `tag`, `reflog`, `bisect`.
6. **Conta.** Sincronizar o progresso atrás do `ProgressStore`. O app continua usável offline.
7. **Publicação.** Hospedar o PWA. Ainda não nesta fase.

Os níveis 2 a 5 aparecem na trilha com o nome e a regra de abertura. As tarefas deles ainda não existem.
