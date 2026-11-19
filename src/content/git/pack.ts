import type { ContentPack } from '../../core/types';
import { level1Tasks, type GitTask } from './level1';
import { level2Tasks } from './level2';
import { level3Tasks } from './level3';

export const gitPack: ContentPack<GitTask> = {
  id: 'git',
  engineId: 'git',
  title: 'Git',
  description:
    'Um repositório simulado. O verificador olha o estado final, não a frase exata do comando.',
  levels: [
    {
      id: 'basico',
      title: 'Básico',
      summary:
        'Iniciar o repositório, ver o estado, preparar arquivos, gravar commits e ler o histórico.',
      tasks: level1Tasks,
    },
    {
      id: 'historico',
      title: 'Histórico',
      summary:
        'Ver o que mudou, ler um commit antigo, descartar uma edição, voltar um commit e desfazer um commit compartilhado.',
      tasks: level2Tasks,
    },
    {
      id: 'branches',
      title: 'Branches',
      summary: 'Criar ramos, trocar de ramo, juntar ramos e resolver um conflito.',
      tasks: level3Tasks,
    },
    {
      id: 'remoto',
      title: 'Remoto',
      summary: 'Copiar um repositório, ligar um servidor e trazer ou enviar commits.',
      tasks: [],
    },
    {
      id: 'avancado',
      title: 'Avançado',
      summary:
        'Reorganizar commits, guardar trabalho temporário, copiar um commit, marcar uma versão e achar qual commit quebrou algo.',
      tasks: [],
    },
  ],
};

export function taskById(id: string): GitTask | undefined {
  for (const level of gitPack.levels) {
    const task = level.tasks.find((item) => item.id === id);
    if (task) return task;
  }
  return undefined;
}
