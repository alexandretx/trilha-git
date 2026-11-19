import type { Lesson } from '../../../core/types';

const initOutput = 'Initialized empty Git repository in /repo/.git/';

const statusUntracked = [
  'On branch main',
  '',
  'No commits yet',
  '',
  'Untracked files:',
  '  (use "git add <file>..." to include in what will be committed)',
  '\tnotas.txt',
  '',
  'nothing added to commit but untracked files present (use "git add" to track)',
].join('\n');

const commitRoot = [
  '[main (root-commit) identificador] adiciona notas',
  ' 1 file changed, 1 insertion(+)',
  ' create mode 100644 notas.txt',
].join('\n');

export const level1Lessons = {
  'iniciar-repositorio': {
    what: 'Git é um histórico da pasta. Esta tarefa só abre esse histórico. O comando git init marca a pasta atual como repositório. Ele não grava arquivo e não cria o primeiro commit.',
    why: 'Os comandos seguintes precisam de um lugar para anotar branch, stage e commits. Sem o init, git status responde que a pasta não é um repositório, e não existe linha no painel.',
    analogy:
      'É pôr a capa num caderno em branco e escrever o nome nela. A capa existe. As fotos ainda não foram coladas.',
    inside:
      'O painel Repositório deixa a frase "Repositório ainda não iniciado." No lugar entra "Branch main, nenhum commit." e um círculo vazio com o nome main. Esse círculo ainda não é um commit. main é o nome da linha principal, a branch em que você está.',
    breakdown: [
      {
        token: 'git',
        meaning: 'O programa. Toda linha de Git começa com esta palavra, em minúsculas.',
      },
      {
        token: 'init',
        meaning: 'Iniciar. Cria o repositório na pasta atual. Não leva arquivo nem mensagem.',
      },
    ],
    example: {
      commands: ['git init'],
      output: initOutput,
      meaning:
        'A frase em inglês diz que um repositório vazio foi criado em /repo/.git/. A branch fica em main e o histórico continua sem commit.',
    },
    mistakes: [
      'Rodar git commit antes do init. Sem repositório, o Git não tem onde gravar o snapshot.',
      'Achar que git init já salvou os arquivos da pasta. Ele só prepara o caderno. A foto vem depois, com add e commit.',
      'Escrever Init ou git-init. A ordem é a palavra git, um espaço, e o subcomando init.',
    ],
    basics: [
      {
        term: 'terminal',
        meaning:
          'A caixa em que você escreve uma ordem por linha. Executar, ou Enter, manda a linha. A resposta aparece acima do campo. Aqui o terminal não mexe nos arquivos do seu computador: a pasta existe só na memória do navegador.',
      },
      {
        term: 'repositório',
        meaning:
          'A pasta em que o Git guarda o histórico. Nesta trilha ela se chama /repo. Antes do init, /repo é só uma pasta. Depois, o Git passa a acompanhar o que você gravar.',
      },
    ],
  },
  'ler-status': {
    what: 'git status compara três lugares e não muda nenhum deles: a pasta de trabalho, a área de stage e o último commit. Um arquivo novo aparece como untracked, palavra em inglês para "ainda não acompanhado".',
    why: 'Antes de gravar, você precisa ver o que o Git está enxergando. Arquivo novo, arquivo editado e arquivo já preparado saem em listas diferentes. Sem essa leitura, é fácil commitar a coisa errada ou achar que a pasta já foi salva.',
    analogy:
      'É o espelho da cozinha antes de fechar a marmita. Mostra o que está na bancada, o que já foi para a vasilha e o que saiu na entrega anterior. O espelho não cozinha.',
    inside:
      'O painel Repositório continua em "Branch main, nenhum commit." Criar notas.txt não desenha um commit. O arquivo fica só na pasta. O status lista notas.txt em Untracked files.',
    breakdown: [
      {
        token: 'echo',
        meaning:
          'Escreve o texto. Sozinho, ele só imprimiria. Com > , o texto vai para um arquivo.',
      },
      {
        token: '"ideia inicial"',
        meaning: 'O conteúdo do arquivo, entre aspas, para o espaço fazer parte do texto.',
      },
      {
        token: '>',
        meaning:
          'Manda a saída para um arquivo e substitui o que já estiver lá. >> acrescentaria no fim.',
      },
      { token: 'notas.txt', meaning: 'O nome do arquivo dentro de /repo.' },
      { token: 'git', meaning: 'O programa, de novo. Cada linha é um comando separado.' },
      {
        token: 'status',
        meaning: 'Mostra o estado. Não altera a pasta, o stage nem o histórico.',
      },
    ],
    example: {
      commands: ['echo "ideia inicial" > notas.txt', 'git status'],
      output: statusUntracked,
      meaning:
        'On branch main: você está na branch main. No commits yet: ainda não há commit. Untracked files lista notas.txt, o arquivo que o Git ainda não acompanha. A última frase diz que nada foi preparado para um commit.',
    },
    mistakes: [
      'Rodar git add nesta tarefa. O arquivo iria para o stage, e a tarefa pede que ele continue só na pasta.',
      'Escrever git status notas.txt. Nesta trilha o status não aceita caminho. A linha é só git status.',
      'Esquecer de criar o arquivo. O status fica limpo e não há texto para o verificador encontrar.',
    ],
    basics: [
      {
        term: 'diretório de trabalho',
        meaning:
          'A pasta com os arquivos que você está editando agora. Também se chama pasta de trabalho. É o que o echo grava. O Git compara essa pasta com o stage e com o último commit.',
      },
    ],
  },
  'preparar-commit': {
    what: 'git add copia a versão atual do arquivo, da pasta para a área de stage. O próximo commit só enxerga essa área. O arquivo continua na pasta. O add não apaga a cópia de lá.',
    why: 'Nem toda mudança da pasta deve entrar no mesmo commit. O stage é a escolha do que vai junto. Sem essa escolha, um commit ou não acontece, ou levaria tudo o que você não separou.',
    analogy:
      'Separar, em cima da mesa, as folhas que vão para o envelope. O que ficou na gaveta não viaja. A folha que você separou também continua na gaveta: o envelope leva uma cópia daquele momento.',
    inside:
      'O painel Repositório continua sem commit. O add não desenha um ponto. Se você rodar git status, notas.txt sai de Untracked files e aparece em Changes to be committed, a lista do que o próximo commit levaria.',
    breakdown: [
      { token: 'git', meaning: 'O programa. A linha de Git começa com esta palavra.' },
      {
        token: 'add',
        meaning: 'Preparar. Copia da pasta de trabalho para a área de stage.',
      },
      {
        token: 'notas.txt',
        meaning:
          'Qual arquivo. git add . usaria o ponto, que significa a pasta atual, e prepararia todo arquivo dela. Aqui só existe notas.txt, então os dois caminhos deixam o mesmo stage.',
      },
    ],
    example: {
      commands: ['git add notas.txt'],
      output: '',
      meaning:
        'git add não imprime nada quando encontra o arquivo. O silêncio, com o comando aceito, significa que o stage agora tem a mesma versão de notas.txt que está na pasta. Um nome errado faz o contrário: o Git avisa que não achou o arquivo.',
    },
    mistakes: [
      'Ir direto ao git commit. Sem o add, o stage não tem o arquivo novo, e o commit recusa ou não o guarda.',
      'Achar que git add já é o histórico. O painel só ganha um commit no git commit.',
      'Errar o nome, como nota.txt sem o s. O Git procura o nome exato, com a extensão.',
    ],
    basics: [
      {
        term: 'área de stage',
        meaning:
          'A lista do que entra no próximo commit. Também se chama stage ou index. Um arquivo na pasta não entra sozinho. git add coloca a versão atual nessa lista.',
      },
    ],
  },
  'primeiro-commit': {
    what: 'git commit grava um snapshot do que está na área de stage. A mensagem é a frase desse snapshot. O commit guarda conteúdo, autor, data e um identificador. Não é uma cópia solta do arquivo: é o conjunto daquele momento.',
    why: 'O histórico é a sequência desses snapshots. A mensagem é o que você lê daqui a uma semana no painel e no git log. Sem ela, o Git desta trilha não grava o commit.',
    analogy:
      'Tirar uma foto da mesa já arrumada e escrever no verso o que a foto mostra. A mesa pode mudar depois. A foto fica com a frase do verso.',
    inside:
      'O painel Repositório ganha a primeira linha de verdade: um identificador curto, a mensagem e a palavra HEAD no ponto preenchido. HEAD é o commit em que você está. Este é a raiz, porque não tem commit anterior. A branch main aponta para ele.',
    breakdown: [
      { token: 'git', meaning: 'O programa. A linha de Git começa com esta palavra.' },
      { token: 'commit', meaning: 'Gravar o snapshot do stage. Não lê a pasta direto.' },
      {
        token: '-m',
        meaning: 'Mensagem. Entrega o texto na mesma linha. O traço marca uma opção do comando.',
      },
      {
        token: '"adiciona notas"',
        meaning:
          'A mensagem, entre aspas, para o espaço não virar outro argumento. Nesta tarefa a frase precisa conter a palavra notas.',
      },
    ],
    example: {
      commands: ['git commit -m "adiciona notas"'],
      output: commitRoot,
      meaning:
        'Onde o exemplo diz identificador, o Git imprime sete caracteres. Eles mudam com o conteúdo e a data. root-commit significa que este é o primeiro. 1 file changed, 1 insertion(+) conta o arquivo e a linha nova. create mode 100644 notas.txt diz que notas.txt nasceu nesse snapshot. 100644 é o modo de arquivo comum do Git, não é um passo seu.',
    },
    mistakes: [
      'git commit sem -m e sem a frase. Nesta trilha falta a mensagem, e nada é gravado.',
      'Mudar o arquivo na pasta e commitar sem um novo git add. O commit grava o stage, que ainda teria a versão antiga.',
      'Uma mensagem sem a palavra notas. O snapshot existe, mas a tarefa pede essa palavra na frase.',
    ],
    basics: [
      {
        term: 'commit',
        meaning:
          'Um snapshot do que estava na área de stage, com mensagem, autor e identificador. Quando já existe um commit, o novo aponta para o anterior. O primeiro não tem pai: é a raiz do histórico.',
      },
      {
        term: 'HEAD',
        meaning:
          'O nome do lugar onde você está. No painel, é o ponto preenchido. Enquanto você está numa branch, HEAD e essa branch apontam para o mesmo commit.',
      },
    ],
  },
  'segundo-commit': {
    what: 'Um arquivo novo continua de fora até passar pelo stage. O segundo commit aponta para o primeiro e guarda a pasta inteira daquele momento, não só o arquivo novo. notas.txt segue no snapshot porque ainda estava no stage.',
    why: 'O histórico é uma corrente. Cada commit novo sabe qual veio antes. Se o arquivo antigo sumisse do snapshot, a pasta daquele momento ficaria incompleta.',
    analogy:
      'Uma segunda foto da mesa. A primeira foto continua no álbum. A segunda mostra a mesa inteira de novo, com o papel que já estava e o papel novo.',
    inside:
      'O painel ganha uma segunda linha, por cima da primeira. HEAD e main vão para o commit novo. A linha de baixo continua lá, com a mensagem antiga. O de cima é o filho. O de baixo é o pai.',
    breakdown: [
      {
        token: 'echo "Olá" > leia-me.txt',
        meaning: 'Cria leia-me.txt na pasta. O Git ainda não acompanha esse arquivo.',
      },
      {
        token: 'git add leia-me.txt',
        meaning: 'Copia leia-me.txt para o stage. notas.txt já estava lá e continua.',
      },
      { token: 'git commit', meaning: 'Grava um snapshot novo do stage inteiro.' },
      {
        token: '-m "cria leia-me"',
        meaning: 'A mensagem. A tarefa pede a palavra leia-me nessa frase.',
      },
    ],
    example: {
      commands: ['echo "Olá" > leia-me.txt', 'git add leia-me.txt', 'git commit -m "cria leia-me"'],
      output: [
        '[main identificador] cria leia-me',
        ' 1 file changed, 1 insertion(+)',
        ' create mode 100644 leia-me.txt',
      ].join('\n'),
      meaning:
        'Não aparece root-commit, porque já existe um pai. A contagem cita leia-me.txt, o arquivo que mudou em relação ao commit anterior. notas.txt não entra nessa contagem porque não mudou, e mesmo assim continua dentro do snapshot.',
    },
    mistakes: [
      'Commitar sem git add. leia-me.txt fica untracked e o commit não nasce, ou nasce sem ele.',
      'Apagar notas.txt do stage sem querer. O snapshot novo deixaria de ter esse arquivo.',
      'Uma mensagem sem a palavra leia-me. O arquivo pode estar certo e a tarefa ainda falha na frase.',
    ],
    basics: [],
  },
  'ler-o-log': {
    what: 'git log lista os commits do mais novo para o mais antigo. Ele não muda o histórico. A tarefa pede para ler a mensagem do commit mais antigo, a raiz, e copiar essa frase para um arquivo na pasta.',
    why: 'A mensagem do commit antigo não está no enunciado de propósito. No uso real você também não decora o histórico: você pergunta ao log.',
    analogy:
      'Folhear um álbum de trás para a frente, da foto de hoje até a primeira. Você copia a legenda da primeira foto para um papel. O álbum não muda.',
    inside:
      'O painel já mostra as duas linhas, a nova em cima e a antiga embaixo. git log imprime o mesmo histórico, com identificador, autor, data e mensagem. resumo.txt não vira commit. O painel não ganha uma terceira linha.',
    breakdown: [
      { token: 'git', meaning: 'O programa. A linha de Git começa com esta palavra.' },
      { token: 'log', meaning: 'Listar o histórico, do commit atual até a raiz.' },
      {
        token: '--oneline',
        meaning:
          'Opção que deixa cada commit em uma linha: sete caracteres do identificador e a primeira linha da mensagem. Os dois traços marcam uma opção com nome. Sem ela, o log sai completo.',
      },
      {
        token: 'echo "mensagem lida" > resumo.txt',
        meaning:
          'Grava num arquivo a frase que você leu. Troque o miolo pela mensagem antiga de verdade. Este exemplo usa um texto genérico para não entregar a resposta.',
      },
    ],
    example: {
      commands: ['git log --oneline'],
      output: ['identificador cria o leia-me', 'identificador abre a loja'].join('\n'),
      meaning:
        'A primeira linha é o commit mais novo. A última é o mais antigo, a raiz. No exemplo os textos são inventados para mostrar a ordem. Na tarefa, a última linha traz a mensagem que vai para resumo.txt, com uma quebra de linha no final. O identificador de cada linha são sete caracteres reais.',
    },
    mistakes: [
      'Copiar a mensagem do commit de cima. O log começa pelo mais novo. A tarefa pede o mais antigo, a última linha.',
      'Criar um commit com resumo.txt. A tarefa só quer o arquivo na pasta. O histórico deve continuar com os dois commits.',
      'Esquecer o git log. O verificador confere se você leu o histórico, não só se o arquivo apareceu.',
    ],
    basics: [],
  },
  'escolher-arquivos': {
    what: 'git add aceita a lista dos arquivos que entram no stage. O que ficar de fora continua untracked e não vai para o commit. O ponto, em git add ., prepara a pasta inteira, inclusive o rascunho.',
    why: 'Um commit pequeno é mais fácil de ler depois. Rascunho, senha e arquivo de teste local ficam na pasta sem entrar no histórico.',
    analogy:
      'Escolher duas folhas para o envelope e deixar o rascunho na gaveta. Varrer a mesa inteira para o envelope levaria o rascunho junto.',
    inside:
      'O commit novo, no painel, guarda app.txt e teste.txt. rascunho.txt não aparece nesse snapshot. Ele continua na pasta. git status ainda o lista em Untracked files.',
    breakdown: [
      { token: 'git add', meaning: 'Prepara só o que vier depois nesta linha.' },
      {
        token: 'app.txt teste.txt',
        meaning:
          'Dois nomes, separados por espaço. Os dois entram no stage. rascunho.txt não está na lista.',
      },
      {
        token: 'git commit -m "sobe app"',
        meaning:
          'Grava o stage. A mensagem precisa conter a palavra app. As aspas seguram a frase.',
      },
    ],
    example: {
      commands: ['git add app.txt teste.txt', 'git commit -m "sobe app"'],
      output: [
        '[main identificador] sobe app',
        ' 2 files changed, 2 insertions(+)',
        ' create mode 100644 app.txt',
        ' create mode 100644 teste.txt',
      ].join('\n'),
      meaning:
        'A contagem fala de dois arquivos. rascunho.txt não aparece nas linhas create mode. Ele ficou na pasta, fora do Git.',
    },
    mistakes: [
      'git add . nesta tarefa. O ponto inclui rascunho.txt, e o commit leva o arquivo que devia ficar de fora.',
      'Adicionar só um dos dois arquivos pedidos. O outro não entra no snapshot.',
      'Uma mensagem sem a palavra app. Os arquivos podem estar certos e a frase ainda falha.',
    ],
    basics: [],
  },
  'atualizar-arquivo': {
    what: 'Editar um arquivo que já está no Git muda a pasta, não o stage. O próximo commit só vê a edição depois de um novo git add. git commit -a, e a forma curta -am, prepara as edições de arquivos já acompanhados e já grava o commit. Arquivo novo, untracked, continua de fora.',
    why: 'O stage guarda a versão do último add, não a versão que você acabou de digitar. Sem um add novo, o commit repetiria o texto antigo.',
    analogy:
      'Você corrigiu uma folha que já estava no envelope. A correção está na mesa. O envelope ainda tem a cópia velha, até você trocar essa cópia.',
    inside:
      'O painel ganha um commit novo em cima do que guardava 0.1. HEAD vai para ele. A mensagem contém versao. No final, pasta, stage e HEAD têm 0.2, então o status diria working tree clean: árvore de trabalho limpa, nada pendente.',
    breakdown: [
      {
        token: 'echo "0.2" > versao.txt',
        meaning: 'Substitui o arquivo na pasta. O > apaga o 0.1 de lá. O stage ainda tem 0.1.',
      },
      {
        token: 'git add versao.txt',
        meaning: 'Atualiza o stage para 0.2. Sem este passo, o commit não vê a edição.',
      },
      {
        token: 'git commit -m "sobe versao"',
        meaning: 'Grava o stage. A mensagem precisa conter versao.',
      },
      {
        token: '-am',
        meaning:
          'Atalho de -a e -m juntos. -a prepara edições de arquivos já acompanhados e o -m entrega a mensagem. Não inclui arquivo novo.',
      },
    ],
    example: {
      commands: ['echo "0.2" > versao.txt', 'git add versao.txt', 'git commit -m "sobe versao"'],
      output: [
        '[main identificador] sobe versao',
        ' 1 file changed, 1 insertion(+), 1 deletion(-)',
      ].join('\n'),
      meaning:
        'Um arquivo mudou: uma linha saiu e outra entrou. Não há create mode, porque versao.txt já existia. git commit -am "sobe versao" chega no mesmo snapshot, porque o arquivo já era acompanhado.',
    },
    mistakes: [
      'Editar o arquivo e commitar sem add e sem -a. O Git responde que não há mudança preparada, e o snapshot continua em 0.1.',
      'Deixar a pasta em 0.2 e o commit em 0.1. A tarefa pede os dois iguais no final.',
      'Uma mensagem sem a palavra versao.',
    ],
    basics: [],
  },
} satisfies Record<string, Lesson>;
