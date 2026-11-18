# Contribuir

A interface e este arquivo estão em português. Identificadores e mensagens de commit ficam em inglês. Não use travessão longo no texto que a pessoa lê.

## Verificação

Node 20.19 ou mais novo.

```bash
npm install
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
npm run e2e
```

`npm run e2e` gera o build e abre o Playwright no Chromium, num viewport de celular e num de desktop. O CI também roda `npm run audit:prod`.

## Pacote novo

1. Crie `src/content/<assunto>/` com níveis, tarefas, estado inicial, verificações, dicas e explicação.
2. Se o `engineId` for novo, crie `src/engines/<assunto>/` com um motor e um corretor, e registre os dois em `src/app/registry.ts`.
3. Cada tarefa nova leva um teste: uma solução válida passa, um repositório errado não passa. As tarefas de Git dos níveis 1 a 3 também entram em `src/content/git/playthrough.test.ts`.
4. A trilha lê o pacote pelo registro. A tela não importa o arquivo da tarefa direto.

Linux, Bash ou SQL entram como motor mais pacote. Não como um caso especial na interface.

Não publique o site a partir de um pull request.
