// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TaskScreen } from './TaskScreen';

afterEach(() => cleanup());

describe('TaskScreen', () => {
  it('updates the graph as commands run and grades the repository', async () => {
    const user = userEvent.setup();
    const onAttempt = vi.fn();
    render(<TaskScreen taskId="iniciar-repositorio" onAttempt={onAttempt} />);

    expect(screen.getByText('Repositório ainda não iniciado.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Verificar tarefa' }));
    expect(screen.getByRole('heading', { name: 'Ainda não' })).toBeTruthy();
    expect(screen.getByText('O repositório ainda não foi iniciado.')).toBeTruthy();
    expect(onAttempt).toHaveBeenCalledWith(expect.objectContaining({ solved: false }));

    await user.click(screen.getByRole('button', { name: 'Dica: conceito' }));
    expect(screen.getByText(/git init cria a estrutura/)).toBeTruthy();

    const input = screen.getByLabelText('Comando');
    await user.type(input, 'git init');
    await user.click(screen.getByRole('button', { name: 'Executar' }));
    expect(screen.getByText('Branch main, nenhum commit.')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Verificar tarefa' }));
    expect(screen.getByRole('heading', { name: 'Tarefa concluída' })).toBeTruthy();
    expect(screen.getByText(/git init prepara a pasta/)).toBeTruthy();
    expect(onAttempt).toHaveBeenCalledWith(expect.objectContaining({ solved: true, hintsUsed: 1 }));
  });

  it('folds a scenario the panel would cut, and opens the rest on request', async () => {
    const user = userEvent.setup();
    const rect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
      if (this.classList.contains('scenario')) {
        return {
          x: 0,
          y: 0,
          top: 0,
          left: 0,
          right: 120,
          bottom: window.innerHeight + 80,
          width: 120,
          height: window.innerHeight + 80,
          toJSON() {
            return {};
          },
        };
      }
      return rect.call(this);
    };
    try {
      render(<TaskScreen taskId="ler-o-log" onAttempt={vi.fn()} />);
      const toggle = await screen.findByRole('button', { name: 'Mostrar o enunciado inteiro' });
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(screen.getByText(/grave essa mensagem, exatamente/)).toBeTruthy();
      await user.click(toggle);
      expect(
        screen.getByRole('button', { name: 'Recolher enunciado' }).getAttribute('aria-expanded'),
      ).toBe('true');
    } finally {
      HTMLElement.prototype.getBoundingClientRect = rect;
    }
  });

  it('says when the address is not a task', () => {
    render(<TaskScreen taskId="nao-existe" onAttempt={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Tarefa não encontrada' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Voltar à trilha' }).getAttribute('href')).toBe('#/');
  });
});
