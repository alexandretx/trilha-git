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
      summary: 'init, status, add, commit e log.',
      tasks: level1Tasks,
    },
    {
      id: 'historico',
      title: 'Histórico',
      summary: 'diff, show, restore, reset e revert.',
      tasks: level2Tasks,
    },
    {
      id: 'branches',
      title: 'Branches',
      summary: 'branch, switch, checkout, merge e conflitos.',
      tasks: level3Tasks,
    },
    {
      id: 'remoto',
      title: 'Remoto',
      summary: 'clone, remote, fetch, pull e push num remoto simulado.',
      tasks: [],
    },
    {
      id: 'avancado',
      title: 'Avançado',
      summary: 'rebase, stash, cherry-pick, tag, reflog e bisect.',
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
