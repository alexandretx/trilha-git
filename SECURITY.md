# Segurança

Trilha Git é um site estático. Não há conta, servidor nem banco. O que a Vercel publica é o `dist` do Vite.

## Terminal

O comando digitado é texto. O React coloca esse texto no histórico do terminal. O código não usa `innerHTML` nem `eval`. O motor aceita um shell pequeno (`echo`, `touch`, `cat`, `ls`, `pwd`, `mkdir`, `rm`) e os comandos Git desta trilha. Caminho absoluto, `..` e `~` são recusados. Uma linha com mais de 8000 caracteres é recusada. Um arquivo do repositório simulado com mais de 100000 caracteres é recusado. Nada disso lê o disco da máquina nem abre uma conexão.

## Progresso

A chave no `localStorage` é `trilha-git.progress.v1`. O documento tem `version`, `outcomes` e `reviews`. A versão deste build é 1. Um documento sem `version`, mas com os dois mapas, é lido como versão 1 e gravado de novo nesse formato. Uma versão maior que a deste build não é lida e não é sobrescrita, para um build mais novo ainda encontrar o arquivo. JSON inválido, documento acima de 200000 caracteres ou formato que não é o da versão 1 faz a trilha abrir do zero e avisar. Um item que não bate com o formato é ignorado. Os outros ficam.

Esse arquivo não autentica ninguém. Quem tem o navegador pode editar o `localStorage` e mudar a nota. A validação existe para a tela não quebrar.

## Cabeçalhos

`vercel.json` define os cabeçalhos do host. A CSP é de mesma origem. `worker-src 'self'` deixa o service worker registrar. `style-src-attr 'unsafe-inline'` existe porque o gráfico de commits marca largura e altura num atributo `style`. Não há script inline. `frame-ancestors 'none'` e `X-Frame-Options: DENY` impedem enquadrar a página. HSTS fica em dois anos, com subdomínios, sem pedido de inclusão na lista de preload. Arquivos com hash em `/assets/` e o `workbox-*.js` gerado ficam em cache longo. `index.html`, `sw.js`, `registerSW.js`, `theme-init.js` e o manifest usam `no-cache`.

A navegação é por hash (`#/tarefa/...`). O arquivo não tem rewrite de SPA.

O `vite preview` aplica os mesmos cabeçalhos de segurança, para o teste de ponta a ponta abrir o app com a CSP ligada. Cache-Control desses caminhos vale no host, não no preview.

## Dependências

`npm run audit:prod` olha só o que vai para o navegador. O CI falha se essa auditoria achar severidade moderate ou pior. Na inclusão deste arquivo, essa auditoria não apontou aviso. O `npm audit` completo ainda aponta avisos em ferramentas de desenvolvimento (Vite, Vitest, ESLint e `workbox-build`). O conserto que o npm oferece troca a versão maior dessas ferramentas. Elas não entram no pacote do navegador, e essa troca não foi feita.

## O que isto não é

Não há certificação, login nem revisão paga. O Git desta trilha não é o Git instalado na máquina.

## Como avisar

Use o aviso privado do GitHub neste repositório: Security, Report a vulnerability. Não descreva um problema explorável numa issue aberta.
