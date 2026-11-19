import type { Lesson } from '../../../core/types';

export const level3Lessons = {
  'abrir-branch': {
    what: 'Uma branch é um nome apontando para um commit. git branch ajuste cria esse nome no commit atual e não troca você de lugar. HEAD continua em main. O próximo commit em main não entra em ajuste, e um commit feito depois de trocar para ajuste não entra em main.',
    why: 'Dá para guardar um ponto com nome antes de experimentar. Sem o nome, o experimento e o trabalho estável disputam a mesma ponta.',
    analogy:
      'Dois marcadores de livro na mesma página. Um se chama main, o outro ajuste. Você continua lendo com o marcador main. O outro espera nessa página.',
    inside:
      'O painel continua com o mesmo commit. O nome ajuste aparece junto de main nesse ponto. Não nasce linha nova, porque a tarefa não pede commit. A frase do painel segue com HEAD em main.',
    breakdown: [
      { token: 'git', meaning: 'O programa. A linha de Git começa com esta palavra.' },
      {
        token: 'branch',
        meaning: 'Sem opção e com um nome, cria uma branch. Não muda a branch atual.',
      },
      {
        token: 'ajuste',
        meaning: 'O nome novo. Pode ser qualquer palavra. Nesta tarefa o nome é este.',
      },
    ],
    example: {
      commands: ['git branch ajuste'],
      output: '',
      meaning:
        'O silêncio é o sucesso. git branch sem nome, se você quiser conferir, lista main com um asterisco e ajuste sem asterisco. O asterisco é a branch atual. Não faça commit.',
    },
    mistakes: [
      'git switch ajuste logo em seguida. A tarefa pede para permanecer em main.',
      'git branch sem o nome. Isso só lista. Não cria ajuste.',
      'Um commit "para criar a branch". A branch é um ponteiro. Ela não precisa de commit novo para existir.',
    ],
    basics: [
      {
        term: 'branch',
        meaning:
          'Um ponteiro com nome para um commit. A branch atual é a linha em que o próximo commit entra. main é a branch padrão desta trilha. Criar outra não copia os arquivos: os dois nomes podem apontar para o mesmo commit.',
      },
    ],
  },
  'anotar-branches': {
    what: 'git branch sem nome lista as branches. A atual sai com um asterisco na frente. A tarefa pede o nome da outra, o que não tem asterisco, gravado em branch.txt. Você continua em main.',
    why: 'O nome da outra linha não está no enunciado. No uso real você também consulta a lista em vez de decorar.',
    analogy:
      'Olhar os marcadores do livro e copiar, num papel, o nome do marcador que não está na página que você está lendo.',
    inside:
      'O painel já mostra os dois nomes, cada um no seu commit. branch.txt fica só na pasta. main continua sendo a branch do HEAD. A lista não cria nem apaga ponteiro.',
    breakdown: [
      {
        token: 'git branch',
        meaning: 'Sem argumento, lista. O asterisco marca a branch atual.',
      },
      {
        token: 'echo nome > branch.txt',
        meaning:
          'Grava o outro nome, o que você leu, com uma quebra de linha. Troque a palavra nome pelo que a lista mostrou. O exemplo não entrega esse nome.',
      },
    ],
    example: {
      commands: ['git branch'],
      output: ['* main', '  zona'].join('\n'),
      meaning:
        'O asterisco está em main, então main é a atual. zona, neste exemplo, é um nome qualquer. A lista sai em ordem alfabética. Na tarefa, copie o nome que não tem asterisco para branch.txt. Não troque de branch.',
    },
    mistakes: [
      'Gravar main, o nome com asterisco. A tarefa pede a outra branch.',
      'git switch para a outra só para ver o nome. Dá para ler na lista, e a tarefa pede que você fique em main.',
      'Commitar branch.txt. O arquivo fica na pasta. O histórico não ganha commit por causa dele.',
    ],
    basics: [],
  },
  'apagar-branch-antiga': {
    what: 'git branch -d apaga o ponteiro de uma branch. Não apaga um commit que outra branch ainda alcança. -d recusa se a branch atual não contém aquele commit. -D apaga mesmo assim. A branch atual não pode ser apagada por este comando.',
    why: 'Um nome velho atrapalha a lista. Apagar o nome não reescreve main quando o commit de rascunho já está na história de main.',
    analogy:
      'Tirar um marcador de uma página que o outro marcador também alcança, mais adiante. A página continua no livro. Só sai a etiqueta.',
    inside:
      'O nome rascunho sai do painel. Os commits continuam, porque main ainda aponta para a ponta que passa por eles. HEAD segue em main, no commit reajuste. Não nasce commit.',
    breakdown: [
      { token: 'git branch', meaning: 'O comando dos ponteiros.' },
      {
        token: '-d',
        meaning: 'Delete, apagar. Um traço e a letra. Recusa uma branch que main ainda não contém.',
      },
      { token: 'rascunho', meaning: 'O nome que sai. main não está neste argumento.' },
    ],
    example: {
      commands: ['git branch -d rascunho'],
      output: 'Deleted branch rascunho (was identificador).',
      meaning:
        'A frase confirma o nome apagado e os sete caracteres do commit para o qual ele apontava. Os commits seguem em main. -D seria a forma que apaga mesmo sem esse alcance. Aqui -d basta, porque o commit de rascunho já está em main.',
    },
    mistakes: [
      'git branch -d main. Você está em main. A branch atual não sai por este caminho, e a tarefa não pede isso.',
      '-D por reflexo. Funciona, e esconde a diferença: -d é a trava que evita apagar trabalho que main não tem.',
      'git reset para "apagar a branch". Reset move a branch atual. Não remove o outro nome.',
    ],
    basics: [],
  },
  'entrar-na-branch': {
    what: 'git switch promocao aponta HEAD para uma branch que já existe e copia os arquivos daquele commit para a pasta. git checkout promocao faz o mesmo nesta trilha. main continua no commit em que estava. Você não cria commit.',
    why: 'A branch promocao já tem aviso.txt. Para trabalhar nela, a pasta precisa acompanhar o commit dela, não o de main.',
    analogy:
      'Trocar o marcador com que você está lendo. A mesa de arquivos passa a ser a daquela página. O outro marcador fica onde estava.',
    inside:
      'No painel, HEAD sai de main e vai para o ponto de promocao. O nome main continua no commit antigo. aviso.txt aparece na pasta porque está nesse commit. A frase do painel passa a dizer a branch promocao.',
    breakdown: [
      {
        token: 'git switch',
        meaning: 'Troca a branch atual e atualiza a pasta para o commit dela.',
      },
      {
        token: 'promocao',
        meaning: 'O nome que já existe. Não leva -c, porque a branch não será criada agora.',
      },
      {
        token: 'git checkout',
        meaning: 'Nesta trilha, git checkout promocao chega no mesmo lugar que switch.',
      },
    ],
    example: {
      commands: ['git switch promocao'],
      output: "Switched to branch 'promocao'",
      meaning:
        'A frase confirma a branch atual. A pasta passa a ter os arquivos do commit de promocao, entre eles aviso.txt. main não anda.',
    },
    mistakes: [
      'git branch promocao. Isso criaria um nome, ou reclamaria que ele já existe. Não entra na branch.',
      'Um commit em main antes de trocar. A tarefa não pede commit, e o arquivo da promoção já está na outra ponta.',
      'Apagar main. As duas branches continuam. Só muda qual delas é a atual.',
    ],
    basics: [
      {
        term: 'switch',
        meaning:
          'Trocar a branch atual. HEAD e a pasta passam a acompanhar o commit dessa branch. git checkout, com o nome de uma branch, faz o mesmo aqui. Um arquivo igual nas duas pode ir com uma edição local. Um arquivo diferente, com edição local, faz a troca parar.',
      },
    ],
  },
  'commit-na-branch': {
    what: 'git switch -c porcao cria a branch e já entra nela. git checkout -b porcao faz o mesmo. O commit que você gravar em seguida fica em porcao. main continua no commit anterior, sem porcao.txt.',
    why: 'Criar e entrar são dois pedidos. -c junta os dois para o próximo snapshot não cair em main por esquecimento.',
    analogy:
      'Pôr um marcador novo na página atual e já passar a ler com ele. A foto seguinte fica nesse marcador. O marcador main não anda.',
    inside:
      'O painel ganha uma linha nova na coluna de porcao, com HEAD. main fica no commit de baixo, sem porcao.txt. As duas colunas se separam nesse ponto.',
    breakdown: [
      { token: 'git switch', meaning: 'Troca de branch.' },
      {
        token: '-c',
        meaning:
          'Create, criar. A branch nasce e você já entra nela. -b é a letra equivalente no checkout.',
      },
      { token: 'porcao', meaning: 'O nome novo e, ao mesmo tempo, a branch atual.' },
      {
        token: 'echo "meia" > porcao.txt',
        meaning: 'Cria o arquivo na pasta. Ainda falta o add para um arquivo novo.',
      },
      {
        token: 'git commit -m "..."',
        meaning: 'Depois do add, grava. A mensagem precisa conter a palavra porcao.',
      },
    ],
    example: {
      commands: [
        'git switch -c porcao',
        'echo "meia" > porcao.txt',
        'git add porcao.txt',
        'git commit -m "abre porcao"',
      ],
      output: [
        "Switched to a new branch 'porcao'",
        '[porcao identificador] abre porcao',
        ' 1 file changed, 1 insertion(+)',
        ' create mode 100644 porcao.txt',
      ].join('\n'),
      meaning:
        'A primeira frase confirma que você já está em porcao. O commit cita essa branch, não main. main segue sem porcao.txt. git checkout -b porcao no lugar da primeira linha chega no mesmo lugar.',
    },
    mistakes: [
      'git branch porcao sem entrar nela, e commitar em main. porcao.txt iria para main, e a tarefa proíbe isso.',
      'Esquecer o git add. Arquivo novo não entra no commit sozinho.',
      'Uma mensagem sem a palavra porcao.',
    ],
    basics: [],
  },
  'voltar-para-main': {
    what: 'Um commit fica na branch atual. Você edita cardapio.txt, grava um commit em promocao e só então volta com git switch main. A pasta acompanha o commit de main, que ainda tem cafe 8. O preço novo fica só em promocao.',
    why: 'Trocar de branch troca o commit que a pasta mostra. Se a volta acontecesse antes do commit, a edição teria de caber em main, ou o switch pararia.',
    analogy:
      'Escrever um bilhete na página do marcador promocao, fotografar, e só então voltar o marcador main. A mesa passa a mostrar a página de main, sem o bilhete.',
    inside:
      'O painel mostra o commit novo só na coluna de promocao, com a mensagem que contém promocao. HEAD e main ficam no commit abre. cardapio.txt na pasta volta a cafe 8.',
    breakdown: [
      {
        token: 'echo "cafe 7" > cardapio.txt',
        meaning: 'Muda a pasta. O arquivo já é acompanhado.',
      },
      {
        token: 'git commit -am "..."',
        meaning:
          '-a prepara a edição do arquivo já acompanhado e -m grava. A mensagem precisa conter promocao. git add e git commit -m também servem.',
      },
      {
        token: 'git switch main',
        meaning:
          'Volta HEAD e a pasta para o commit de main. promocao fica onde o commit novo está.',
      },
    ],
    example: {
      commands: [
        'echo "cafe 7" > cardapio.txt',
        'git commit -am "promocao do dia"',
        'git switch main',
      ],
      output: [
        '[promocao identificador] promocao do dia',
        ' 1 file changed, 1 insertion(+), 1 deletion(-)',
        "Switched to branch 'main'",
      ].join('\n'),
      meaning:
        'O commit cita a branch promocao. Depois do switch, a pasta de main tem cafe 8 de novo. O cafe 7 continua no commit de promocao, não em main.',
    },
    mistakes: [
      'Voltar para main antes de commitar. A edição está num arquivo que difere entre as branches, e o switch pode recusar, ou a mudança nem chega a ficar em promocao.',
      'Commitar sem estar em promocao. A tarefa começa nessa branch. Um commit em main deixaria o preço novo na linha errada.',
      'Esquecer o switch final. O verificador olha a pasta de main, com cafe 8.',
    ],
    basics: [],
  },
  'avancar-main': {
    what: 'git merge promocao, estando em main, incorpora a outra branch. Quando main é ancestral de promocao, e main não tem commit próprio nesse intervalo, o merge é fast-forward: só move o ponteiro de main até o commit que já existe. Não nasce um commit com dois pais.',
    why: 'A promoção já está commitada na outra linha, numa sequência que continua a de main. Não há duas edições paralelas para juntar. Andar o ponteiro basta.',
    analogy:
      'O marcador main estava duas páginas atrás do marcador promocao, na mesma sequência. Você empurra o marcador main até a página de lá. Não escreve uma página nova.',
    inside:
      'No painel, main e promocao passam a nomear o mesmo commit, o da promoção. HEAD vai junto, porque você está em main. A linha não ganha um ponto com dois pais. cardapio.txt fica em cafe 7.',
    breakdown: [
      {
        token: 'git merge',
        meaning: 'Incorpora outra branch na branch atual. Você precisa estar em main.',
      },
      {
        token: 'promocao',
        meaning: 'A branch que será incorporada. Não é a atual.',
      },
    ],
    example: {
      commands: ['git merge promocao'],
      output: 'Updating identificador..identificador\nFast-forward',
      meaning:
        'Fast-forward é o nome desse avanço sem commit novo. Updating cita o commit de onde main saiu e o commit aonde ela chegou. Os dois identificadores são sete caracteres. Abaixo pode vir a contagem de linhas. Se nascesse um commit de merge, a tarefa não aceitaria: main não pode ganhar um ponto com dois pais aqui.',
    },
    mistakes: [
      'Estar em promocao e dar git merge main. O ponteiro que anda é o da branch atual. A tarefa quer main na ponta da promoção.',
      'Um commit manual em main copiando o arquivo. O histórico ganharia um commit novo, e a tarefa pede só o avanço do ponteiro.',
      'git rebase. Não é o comando deste nível, e o resultado pedido é o merge em fast-forward.',
    ],
    basics: [
      {
        term: 'merge',
        meaning:
          'Juntar outra branch na branch atual. Se a atual só está atrás, o Git avança o ponteiro e chama isso de fast-forward. Se as duas divergiram, nasce um commit com dois pais, ou um conflito quando a mesma parte do arquivo mudou dos dois lados.',
      },
    ],
  },
  'juntar-arquivos': {
    what: 'main e promocao divergiram a partir do mesmo commit. main tem horario.txt. promocao tem aviso.txt. Ninguém editou o mesmo trecho. git merge promocao, em main, cria um commit com dois pais e junta as duas árvores. Os dois arquivos cabem no resultado.',
    why: 'Fast-forward não serve quando cada linha andou para um lado. O commit de merge é o ponto que declara: daqui para a frente, main contém as duas histórias.',
    analogy:
      'Dois cadernos que copiaram a mesma página e depois cada um ganhou um anexo diferente. A página nova grampeia os dois anexos e aponta para as duas versões.',
    inside:
      'O painel mostra um commit novo no topo de main, com duas linhas de pai: a ponta antiga de main e a ponta de promocao. HEAD está nesse commit. horario.txt e aviso.txt estão no snapshot. O primeiro pai é o commit que já estava em main.',
    breakdown: [
      { token: 'git merge', meaning: 'Junta a branch nomeada na branch atual.' },
      {
        token: 'promocao',
        meaning: 'A branch que entra. main já é a atual e não aparece na linha.',
      },
    ],
    example: {
      commands: ['git merge promocao'],
      output: "Merge made by the 'ort' strategy.\n create mode 100644 aviso.txt",
      meaning:
        "A primeira frase diz que o merge criou um commit. A mensagem desse commit fica Merge branch 'promocao', visível no painel e no git log. O commit tem dois pais, e as duas colunas se encontram nele. horario.txt veio de main. aviso.txt veio de promocao, por isso a linha create mode. Não há marcador de conflito, porque os arquivos novos não disputam a mesma linha.",
    },
    mistakes: [
      'Copiar aviso.txt à mão e commitar em main sem merge. O arquivo pode aparecer, e o commit não teria dois pais. A história de promocao ficaria de fora.',
      'git merge main estando em promocao. Quem anda é a branch atual. A tarefa quer o resultado em main.',
      'Esperar um fast-forward. As branches divergiram, então o ponteiro sozinho não alcança os dois lados.',
    ],
    basics: [],
  },
  'resolver-conflito': {
    what: 'As duas branches mudaram a mesma linha de cardapio.txt. O merge para e escreve marcadores no arquivo: <<<<<<< HEAD, ======= e >>>>>>> promocao. Entre o primeiro e o ======= está o texto de main. Entre o ======= e o >>>>>>> está o texto da outra branch. Você edita até sobrar só o texto escolhido, git add marca a resolução e git commit fecha o merge.',
    why: 'O Git não escolhe um preço por você quando os dois lados escreveram na mesma linha. O marcador é o pedido de uma decisão. Commitar com os marcadores ainda no arquivo gravaria o conflito como se fosse o cardápio.',
    analogy:
      'Dois cozinheiros reescreveram o mesmo item do quadro. Alguém deixa os dois textos no quadro, entre riscos, até você apagar os riscos e deixar as duas linhas na ordem pedida.',
    inside:
      'Enquanto o merge está aberto, o painel avisa o conflito e o nome do arquivo, na cor de erro. Depois do commit, HEAD é um commit com dois pais. cardapio.txt tem cafe 9 na primeira linha e cafe 7 na segunda, sem os marcadores. A frase de conflito sai do painel.',
    breakdown: [
      {
        token: 'git merge promocao',
        meaning: 'Começa o merge. Para no conflito e marca cardapio.txt.',
      },
      {
        token: '<<<<<<< ======= >>>>>>>',
        meaning: 'Marcadores, não fazem parte do cardápio. Tudo isso sai do arquivo.',
      },
      {
        token: 'echo "cafe 9\\ncafe 7" > cardapio.txt',
        meaning:
          'Regrava o arquivo com a linha de main primeiro e a da outra branch depois. Cada uma termina em quebra de linha.',
      },
      {
        token: 'git add cardapio.txt',
        meaning: 'Marca o conflito como resolvido. Sem este add, o commit do merge é recusado.',
      },
      {
        token: 'git commit',
        meaning:
          'Fecha o merge. A mensagem pode ser a sua, com -m. O commit fica com dois pais mesmo sem você citar os pais na linha.',
      },
    ],
    example: {
      commands: [
        'git merge promocao',
        'echo "cafe 9\\ncafe 7" > cardapio.txt',
        'git add cardapio.txt',
        'git commit -m "une o cardapio"',
      ],
      output: [
        'CONFLICT (content): Merge conflict in cardapio.txt',
        'Automatic merge failed; fix conflicts and then commit the result.',
      ].join('\n'),
      meaning:
        'A primeira frase avisa o arquivo em conflito. A segunda diz que o merge automático parou. O código de saída fica diferente de zero, e mesmo assim o merge está aberto: é a hora de editar. O arquivo contém os marcadores. Depois do add e do commit, esses marcadores não podem sobrar. A ordem é cafe 9, que estava em main, e cafe 7, que estava em promocao.',
    },
    mistakes: [
      'git commit com os marcadores ainda no arquivo. O merge continua aberto, ou o texto gravado não é o cardápio pedido.',
      'Escolher só um preço. A tarefa quer as duas linhas, main primeiro.',
      'git merge --abort. Isso desistiria do merge. A tarefa pede o commit resolvido.',
    ],
    basics: [
      {
        term: 'conflito',
        meaning:
          'O merge parou porque os dois lados mudaram a mesma parte de um arquivo. O arquivo fica com marcadores. Você escreve o texto final, git add tira o arquivo da lista de conflitos e git commit grava o merge.',
      },
    ],
  },
  'abortar-merge': {
    what: 'git merge lote começa a união. O conflito aparece porque estoque.txt mudou dos dois lados. git merge --abort devolve a branch, o stage e a pasta ao commit de antes do merge. Só vale com um merge em andamento. main termina onde estava, sem commit novo.',
    why: 'O lote é o conjunto errado. Resolver e commitar gravaria esse lote em main. Abortar é desistir antes de gravar.',
    analogy:
      'Você começou a grampear o anexo errado, viu que era o lote velho, e solta o grampo. O caderno volta à página em que estava.',
    inside:
      'Durante o conflito, o painel mostra o merge aberto e o arquivo. Depois do --abort, o aviso some. HEAD segue em "estoque atual". estoque.txt na pasta volta a "12 unidades". Não há commit de merge.',
    breakdown: [
      {
        token: 'git merge lote',
        meaning: 'Começa. A tarefa exige este começo, mesmo sabendo que ele vai parar no conflito.',
      },
      {
        token: '--abort',
        meaning:
          'Interrompe o merge aberto e restaura branch, stage e pasta. Não leva nome de branch.',
      },
    ],
    example: {
      commands: ['git merge lote', 'git merge --abort'],
      output: [
        'CONFLICT (content): Merge conflict in estoque.txt',
        'Automatic merge failed; fix conflicts and then commit the result.',
      ].join('\n'),
      meaning:
        'Isso é a saída do git merge lote. failed, aqui, quer dizer que o merge parou no conflito e ficou aberto. git merge --abort não imprime nada quando consegue. estoque.txt volta ao texto de main, 12 unidades. Não resolva o arquivo: a tarefa quer a desistência, não o lote gravado.',
    },
    mistakes: [
      'Só --abort, sem ter começado o merge. Não há merge aberto, e o comando recusa.',
      'Resolver estoque.txt e commitar. O lote errado entraria em main.',
      'git reset --hard no lugar do abort. Pode parecer limpo, e a tarefa pede os dois comandos: começar o merge de lote e abortar.',
    ],
    basics: [],
  },
} satisfies Record<string, Lesson>;
