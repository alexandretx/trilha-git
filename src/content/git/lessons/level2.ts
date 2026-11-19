import type { Lesson } from '../../../core/types';

const diffSample = [
  'diff --git a/notas.txt b/notas.txt',
  'index identificador..identificador 100644',
  '--- a/notas.txt',
  '+++ b/notas.txt',
  '@@ -1 +1 @@',
  '-um',
  '+dois',
].join('\n');

export const level2Lessons = {
  'ver-diff': {
    what: 'git diff, sem opção, compara a pasta de trabalho com a área de stage. Ele não grava nada. Uma linha que saiu começa com -. Uma linha que entrou começa com +. O preço novo da tarefa não está neste texto: você lê o + no diff.',
    why: 'O status diz que algo mudou. O diff diz o quê, linha por linha. Sem ele, você commitaria uma alteração que não leu.',
    analogy:
      'É a errata entre o rascunho da mesa e a cópia que já está no envelope. O sinal de menos é o que saiu. O sinal de mais é o que entrou.',
    inside:
      'O painel Repositório não ganha commit. cardapio.txt continua editado na pasta e o stage continua no texto antigo. preco.txt, o arquivo que você cria com o número lido, fica só na pasta, fora do histórico.',
    breakdown: [
      { token: 'git', meaning: 'O programa. A linha de Git começa com esta palavra.' },
      {
        token: 'diff',
        meaning: 'Mostra a diferença. Sem caminho e sem opção, compara a pasta com o stage.',
      },
      {
        token: '-',
        meaning:
          'No resultado, uma linha removida em relação ao stage. Não é uma opção do comando.',
      },
      {
        token: '+',
        meaning:
          'No resultado, uma linha que está na pasta e não está no stage. O número novo da tarefa está numa linha assim.',
      },
    ],
    example: {
      commands: ['git diff'],
      output: diffSample,
      meaning:
        'O exemplo troca um por dois num arquivo qualquer, para mostrar o formato. --- é o lado antigo, o stage. +++ é a pasta. A linha index traz dois identificadores curtos. Na tarefa, a linha com + de cardapio.txt tem o preço que vai para preco.txt, só o número e uma quebra de linha. Não faça commit.',
    },
    mistakes: [
      'git add antes de ler. O diff sem opção compara a pasta com o stage. Se os dois ficarem iguais, a diferença some da saída.',
      'Gravar a linha inteira, com a palavra cafe, em vez de só o número novo.',
      'Criar um commit. A tarefa termina com a alteração ainda fora do stage.',
    ],
    basics: [
      {
        term: 'diff',
        meaning:
          'A diferença entre duas versões do mesmo arquivo. Não é um commit e não altera a pasta. Serve para ler o que mudou antes de gravar ou descartar.',
      },
    ],
  },
  'ver-diff-stage': {
    what: 'git diff sem opção ignora o que já está igual entre a pasta e o stage, e também não mostra o stage contra o último commit. git diff --staged compara o stage com o último commit. É o que entraria se você commitasse agora. --cached é o mesmo pedido.',
    why: 'Dá para preparar uma versão e continuar editando a pasta. Sem --staged, você lê a mesa e acha que está lendo o envelope.',
    analogy:
      'O envelope já está fechado com um preço, e a mesa tem outro. --staged abre o envelope. O diff sem opção só olha a mesa contra o envelope, no sentido contrário.',
    inside:
      'O painel não muda. O stage de cardapio.txt continua no preço preparado, a pasta continua no preço do commit, e preco.txt nasce só na pasta com o número que você leu no stage.',
    breakdown: [
      { token: 'git diff', meaning: 'Pede a diferença.' },
      {
        token: '--staged',
        meaning:
          'Opção: compare o stage com o último commit, não a pasta com o stage. Os dois traços marcam o nome da opção.',
      },
      {
        token: '--cached',
        meaning: 'Sinônimo de --staged. Cached é outro nome antigo do stage.',
      },
    ],
    example: {
      commands: ['git diff --staged'],
      output: diffSample,
      meaning:
        'O formato é o mesmo. Com --staged, o lado - é o último commit e o lado + é o stage. Na tarefa, leia o número da linha + de cardapio.txt e grave só esse número em preco.txt. Não mude o stage, a pasta de cardapio.txt nem o histórico. O exemplo acima usa notas.txt de propósito.',
    },
    mistakes: [
      'git diff sem --staged. Nesta tarefa a pasta e o commit coincidem, e a diferença que importa está no stage. A saída sem a opção mostra o caminho contrário, ou fica vazia se a pasta igualar o stage.',
      'git add ou git restore no meio. A tarefa pede para ler, não para mudar cardapio.txt.',
      'Gravar o preço da pasta em vez do preço do stage.',
    ],
    basics: [],
  },
  'ler-commit-antigo': {
    what: 'git show imprime um commit: identificador, autor, data, mensagem e o diff contra o pai dele. HEAD é o commit atual. HEAD~1 é o pai, um passo atrás. A tarefa pede o preço que esse commit antigo guardava.',
    why: 'O painel mostra a mensagem, não o arquivo daquele momento. show é a leitura do snapshot sem tirar você do commit atual.',
    analogy:
      'Abrir uma foto antiga do álbum e ler o que estava na mesa naquele dia. Você não volta a morar naquele dia. Só anota um número num papel de agora.',
    inside:
      'O painel fica com os dois commits, HEAD no mais novo. antes.txt nasce na pasta e não vira commit. A branch não anda.',
    breakdown: [
      { token: 'git show', meaning: 'Mostra um commit. Sem nome, mostra o HEAD.' },
      {
        token: 'HEAD',
        meaning: 'O commit em que você está. No painel, o ponto preenchido.',
      },
      {
        token: '~1',
        meaning:
          'Um passo para trás, pelo primeiro pai. HEAD~1 é o commit anterior. ~2 seria o anterior do anterior.',
      },
    ],
    example: {
      commands: ['git show HEAD~1'],
      output: [
        'commit identificador',
        'Author: Estudante <estudante@trilha.local>',
        'Date:   data e fuso -0300',
        '',
        '    mensagem antiga',
        '',
        'diff --git a/notas.txt b/notas.txt',
        '--- a/notas.txt',
        '+++ b/notas.txt',
        '@@ -1 +1 @@',
        '-antes',
        '+depois',
      ].join('\n'),
      meaning:
        'A mensagem indentada é a do commit que você pediu. O diff abaixo compara esse commit com o pai dele. Na tarefa, leia o preço de cardapio.txt nesse commit anterior e grave só o número em antes.txt. O exemplo usa notas.txt para não entregar o número.',
    },
    mistakes: [
      'git show sem HEAD~1. Isso mostra o commit atual, o preço novo, não o anterior.',
      'git reset para "voltar" e ler. A tarefa quer o histórico no lugar. show só lê.',
      'Gravar a mensagem, ou a linha inteira do arquivo, em vez de só o número.',
    ],
    basics: [
      {
        term: 'HEAD~1',
        meaning:
          'O pai do commit atual. HEAD é onde você está. O til conta passos para trás na corrente. ~1 é um passo. Não move a branch. Só nomeia o commit antigo numa leitura.',
      },
    ],
  },
  'descartar-edicao': {
    what: 'git restore, sem --staged, copia a área de stage de volta para a pasta. A edição que estava só na pasta some. O stage e o último commit ficam como estavam. Não nasce commit.',
    why: 'Uma experiência que não deu certo não precisa virar histórico. Restaurar a pasta é desistir dessa edição, não desfazer um commit.',
    analogy:
      'Amassar o rascunho da mesa e pegar de novo a cópia que já estava no envelope. O envelope não abre.',
    inside:
      'O painel continua com o mesmo commit e o mesmo HEAD. cardapio.txt na pasta volta ao texto do stage. No final, pasta, stage e commit coincidem, e o status fica limpo.',
    breakdown: [
      { token: 'git', meaning: 'O programa. A linha de Git começa com esta palavra.' },
      {
        token: 'restore',
        meaning: 'Restaurar. Sem --staged, o destino é a pasta e a origem é o stage.',
      },
      {
        token: 'cardapio.txt',
        meaning: 'Só este arquivo volta. Outro arquivo da pasta não entra no comando.',
      },
    ],
    example: {
      commands: ['git restore cardapio.txt'],
      output: '',
      meaning:
        'O comando não imprime nada quando consegue. A pasta de cardapio.txt fica igual ao stage. git status, se você quiser conferir, deixa de listar o arquivo.',
    },
    mistakes: [
      'git restore --staged. Essa opção mexe no stage, não descarta a edição da pasta.',
      'git checkout de um commit antigo, ou git reset, para apagar uma edição que nem foi commitada. É mais do que a tarefa pede.',
      'Criar um commit com o texto errado em vez de descartar.',
    ],
    basics: [
      {
        term: 'restore',
        meaning:
          'Copiar uma versão conhecida por cima de outra. Sem opção, a versão conhecida é o stage e o destino é a pasta. Com --staged, a versão conhecida é o último commit e o destino é o stage.',
      },
    ],
  },
  'tirar-do-stage': {
    what: 'git restore --staged copia o último commit de volta para o stage. A pasta não entra nessa cópia. A edição continua na mesa. Ela deixa de estar preparada para o próximo commit.',
    why: 'Dá para ter colocado um arquivo no stage cedo demais. Tirar do stage não apaga o trabalho da pasta. Só tira o arquivo da lista do próximo commit.',
    analogy:
      'Tirar a folha do envelope e deixar ela na mesa. A folha continua escrita. O envelope volta a ter a cópia do último envio.',
    inside:
      'O painel não ganha commit e HEAD não anda. O stage de cardapio.txt volta ao texto do commit. A pasta continua com a edição. git status passa a mostrar a mudança como não preparada.',
    breakdown: [
      { token: 'git restore', meaning: 'Restaurar uma versão conhecida.' },
      {
        token: '--staged',
        meaning: 'O destino é o stage, não a pasta. A origem é o commit do HEAD.',
      },
      { token: 'cardapio.txt', meaning: 'O arquivo que sai da lista do próximo commit.' },
    ],
    example: {
      commands: ['git restore --staged cardapio.txt'],
      output: '',
      meaning:
        'De novo o silêncio é o sucesso. A pasta segue editada. O stage fica igual ao último commit. git reset sem --soft e sem --hard também tira o arquivo do stage. A tarefa aceita o resultado, não a frase exata.',
    },
    mistakes: [
      'git restore sem --staged. Isso jogaria a edição fora da pasta, e a tarefa quer a edição viva.',
      'git commit. O arquivo está no stage de propósito, e commitá-lo grava o que ainda não devia entrar.',
      'Apagar o arquivo. A edição precisa continuar na pasta, fora do stage.',
    ],
    basics: [],
  },
  'refazer-mensagem': {
    what: 'git reset --soft HEAD~1 tira o último commit da branch e deixa o stage como esse commit deixou. A pasta também fica. Um git commit novo grava outra mensagem no lugar. O commit antigo deixa de ser o HEAD.',
    why: 'A mensagem ficou errada e o conteúdo está certo. Como o commit ainda só existe nesta máquina, dá para substituir o ponto em vez de empilhar uma correção em cima.',
    analogy:
      'Destacar a última foto do álbum, manter as folhas na mesa já separadas, e tirar outra foto com outra frase no verso. Quem nunca recebeu a foto antiga não fica com as duas.',
    inside:
      'No painel, a linha "ops" sai do topo. HEAD volta um passo e, depois do commit novo, aponta para uma linha cuja mensagem contém caixa. O pai é o mesmo commit de antes. caixa.txt continua no snapshot.',
    breakdown: [
      { token: 'git reset', meaning: 'Move o ponteiro da branch atual.' },
      {
        token: '--soft',
        meaning: 'Só move a branch. Stage e pasta ficam com o conteúdo do commit que saiu.',
      },
      {
        token: 'HEAD~1',
        meaning: 'O destino: um commit atrás. A branch passa a apontar para o pai.',
      },
      {
        token: 'git commit -m "..."',
        meaning:
          'Grava de novo, com uma mensagem que contém a palavra caixa. As aspas são suas. A frase do exemplo não é obrigatória.',
      },
    ],
    example: {
      commands: ['git reset --soft HEAD~1', 'git commit -m "abre o caixa"'],
      output: ['[main identificador] abre o caixa', ' 1 file changed, 1 insertion(+)'].join('\n'),
      meaning:
        'O reset em si não precisa imprimir o histórico novo. O commit seguinte cria o ponto com a mensagem nova. --mixed também chega nesse resultado se você der git add de novo antes do commit. --hard apagaria caixa.txt da pasta, e a tarefa precisa do arquivo.',
    },
    mistakes: [
      'git commit --amend não é o caminho desta trilha. O jeito pedido é voltar o ponteiro com --soft e gravar outro commit.',
      'Usar --hard. O conteúdo sairia da pasta junto com a mensagem.',
      'Deixar "ops" como HEAD. Uma mensagem nova por cima, sem tirar o commit, não substitui a frase errada no topo.',
    ],
    basics: [
      {
        term: 'reset --soft',
        meaning:
          'Move a branch para outro commit e deixa o stage e a pasta como estavam. O commit que deixou de ser o topo sai da linha da branch. O conteúdo preparado continua pronto para um commit novo.',
      },
    ],
  },
  'devolver-para-a-pasta': {
    what: 'git reset HEAD~1, sem --soft e sem --hard, é o modo mixed, o padrão. A branch volta um commit. O stage acompanha esse commit. A pasta fica com os arquivos, inclusive o que só existia no commit desfeito. Esse arquivo passa a ser untracked.',
    why: 'O commit saiu cedo, e o rascunho ainda serve na mesa. Você não quer a foto no álbum, e também não quer rasgar o papel.',
    analogy:
      'Tirar a última foto do álbum e esvaziar o envelope até a foto anterior. As folhas continuam na mesa, fora do envelope.',
    inside:
      'O painel perde a linha "cedo demais". HEAD volta para "preco inicial". rascunho.txt não está nesse commit. Ele continua na pasta, fora do stage. O stage bate com o HEAD.',
    breakdown: [
      { token: 'git reset', meaning: 'Move a branch atual.' },
      {
        token: 'HEAD~1',
        meaning: 'Um commit para trás. Sem --soft e sem --hard, o stage também volta. A pasta não.',
      },
      {
        token: '--mixed',
        meaning: 'O nome do modo padrão. Escrever ou omitir dá no mesmo resultado.',
      },
    ],
    example: {
      commands: ['git reset HEAD~1'],
      output: '',
      meaning:
        'A branch e o stage apontam para o commit anterior. rascunho.txt segue na pasta. git status o lista como untracked. Não crie outro commit.',
    },
    mistakes: [
      '--soft deixaria rascunho.txt no stage. A tarefa quer o arquivo fora do stage.',
      '--hard apagaria rascunho.txt da pasta. O texto "teste" precisa continuar lá.',
      'Commitar de novo em seguida. A tarefa para com um commit a menos na branch.',
    ],
    basics: [
      {
        term: 'reset mixed',
        meaning:
          'O reset padrão. A branch e o stage voltam para o commit pedido. A pasta de trabalho fica como estava, então um arquivo que só existia no commit desfeito continua na mesa, sem estar preparado.',
      },
    ],
  },
  'apagar-commit-local': {
    what: 'git reset --hard HEAD~1 move a branch, o stage e a pasta juntos para o commit anterior. A alteração do commit descartado sai dos três lugares. Use isso quando o commit e o texto estão errados e ainda não foram compartilhados.',
    why: 'Mixed deixaria o preço errado na pasta. Soft deixaria o preço errado preparado. Hard é o único dos três que também limpa a mesa.',
    analogy:
      'Arrancar a última foto e, junto, jogar fora a folha errada que estava na mesa e no envelope. A mesa volta a ser a da foto anterior.',
    inside:
      'A linha "preco errado" sai do painel. HEAD, o stage e cardapio.txt na pasta voltam a cafe 8, o texto de "preco inicial". O status fica limpo.',
    breakdown: [
      { token: 'git reset', meaning: 'Move a branch.' },
      {
        token: '--hard',
        meaning: 'Também substitui o stage e a pasta pela versão do commit de destino.',
      },
      { token: 'HEAD~1', meaning: 'O destino é o commit anterior. O topo atual sai da branch.' },
    ],
    example: {
      commands: ['git reset --hard HEAD~1'],
      output: 'HEAD is now at identificador preco inicial',
      meaning:
        'A frase diz para qual commit a branch foi. identificador são sete caracteres. A pasta fica igual a esse commit. Não use --hard num commit que outras pessoas já receberam: a branch delas ainda teria o ponto que a sua deixou de ter.',
    },
    mistakes: [
      'git restore sozinho. Ele não tira o commit da branch. O preço errado continuaria no histórico.',
      '--soft ou o reset padrão. A pasta ficaria com o preço errado, e a tarefa pede cafe 8 nos três lugares.',
      'Apagar o commit anterior junto. HEAD~1 para no pai. HEAD~2 iria longe demais.',
    ],
    basics: [
      {
        term: 'reset --hard',
        meaning:
          'Move a branch, o stage e a pasta para o mesmo commit. Edição não commitada na pasta também se perde. Serve para descartar um commit local que não deve sobrar nem na mesa.',
      },
    ],
  },
  'desfazer-commit-publicado': {
    what: 'git revert grava um commit novo com o inverso de outro commit. O commit antigo permanece no log. A tarefa pede isso porque "promocao quebrada" já foi enviado. Outras pessoas podem tê-lo. Apagar o ponto da branch deixaria o remoto com um commit que a sua main não tem mais.',
    why: 'Reset reescreve a ponta da branch. Revert soma uma correção. Quem já puxou o commit quebrado consegue puxar a correção sem reescrever a história compartilhada.',
    analogy:
      'Em vez de rasgar uma página que já foi fotocopiada para a equipe, você escreve uma página nova: "desconsiderar o preço da página anterior". As duas páginas ficam no caderno.',
    inside:
      'O painel ganha um terceiro commit, em cima de "promocao quebrada". Esse commit antigo continua visível. HEAD vai para o novo. cardapio.txt no snapshot novo volta ao preço do commit anterior. O commit novo tem um pai, não dois.',
    breakdown: [
      {
        token: 'git revert',
        meaning: 'Cria um commit que desfaz as mudanças de outro. Não apaga o outro.',
      },
      {
        token: 'HEAD',
        meaning: 'Qual commit desfazer. Aqui é o último. Dá para passar outro nome, como HEAD~1.',
      },
    ],
    example: {
      commands: ['git revert HEAD'],
      output: [
        '[main identificador] Revert "promocao quebrada"',
        ' 1 file changed, 1 insertion(+), 1 deletion(-)',
      ].join('\n'),
      meaning:
        'A mensagem padrão começa com Revert e cita o commit desfeito. O arquivo volta ao texto do pai daquele commit. A contagem mostra uma linha saindo e a anterior voltando. Não use reset --hard aqui: "promocao quebrada" precisa continuar no histórico.',
    },
    mistakes: [
      'git reset --hard HEAD~1. O commit compartilhado sai da branch. A tarefa exige que ele continue no log.',
      'Editar o arquivo e commitar sem o revert. Pode até acertar o texto, e o hábito que a tarefa treina é o revert.',
      'git revert sem um commit. O comando precisa saber qual snapshot inverter. HEAD nomeia o último.',
    ],
    basics: [
      {
        term: 'revert',
        meaning:
          'Um commit novo que aplica o contrário de um commit existente. O commit antigo fica no histórico. É o desfazer seguro quando outras pessoas já podem ter o commit.',
      },
    ],
  },
} satisfies Record<string, Lesson>;
