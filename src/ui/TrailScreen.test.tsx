// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { emptyProgress, recordOutcome, type ProgressSnapshot } from '../core/progress';
import { level1Tasks } from '../content/git/level1';
import { TrailScreen } from './TrailScreen';

beforeEach(() => {
  localStorage.clear();
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
      onchange: null,
    }) as MediaQueryList;
});

afterEach(() => cleanup());

describe('TrailScreen', () => {
  it('shows command mastery, the next task, and locked levels without links', () => {
    render(
      <TrailScreen progress={emptyProgress()} loadError={null} onShowIntro={() => undefined} />,
    );
    expect(screen.getByRole('heading', { name: 'Básico' })).toBeTruthy();
    expect(screen.getByText('Nenhuma tarefa concluída ainda.')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Domínio de init, 0%' })).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Domínio de commit, 0%' })).toBeTruthy();
    const next = document.querySelector('.task-row.is-next');
    expect(next?.textContent).toContain('Iniciar o repositório');

    const historico = screen.getByRole('heading', { name: 'Histórico' }).closest('section');
    expect(historico?.textContent).toContain('Fechado.');
    expect(historico?.querySelector('a')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Revisão' })).toBeNull();
  });

  it('opens Histórico after Básico and keeps Branches closed', () => {
    let progress = emptyProgress();
    for (const task of level1Tasks) {
      progress = recordOutcome(progress, {
        taskId: task.id,
        conceptId: task.conceptId,
        solved: true,
        attempts: 1,
        hintsUsed: 0,
        firstTry: true,
        at: 1_000,
      });
    }
    render(<TrailScreen progress={progress} loadError={null} onShowIntro={() => undefined} />);
    const historico = screen.getByRole('heading', { name: 'Histórico' }).closest('section');
    const branches = screen.getByRole('heading', { name: 'Branches' }).closest('section');
    expect(historico?.querySelector('a')).toBeTruthy();
    expect(historico?.textContent).not.toContain('Fechado.');
    expect(branches?.textContent).toContain('Fechado.');
    expect(screen.getByRole('progressbar', { name: 'Domínio de init, 100%' })).toBeTruthy();
  });

  it('lists a due review above the task index', () => {
    const progress: ProgressSnapshot = {
      version: 1,
      outcomes: {
        'iniciar-repositorio': {
          taskId: 'iniciar-repositorio',
          conceptId: 'init',
          solved: true,
          attempts: 2,
          hintsUsed: 1,
          firstTry: false,
          score: 0.6,
          at: 1,
        },
      },
      reviews: {
        'iniciar-repositorio': {
          taskId: 'iniciar-repositorio',
          dueAt: 1,
          intervalDays: 1,
          streak: 0,
        },
      },
    };
    render(<TrailScreen progress={progress} loadError={null} onShowIntro={() => undefined} />);
    expect(screen.getByRole('heading', { name: 'Revisão' })).toBeTruthy();
    expect(screen.getAllByRole('link', { name: /Iniciar o repositório/ }).length).toBe(2);
    expect(screen.getAllByText(/para revisar/).length).toBeGreaterThan(0);
  });
});
