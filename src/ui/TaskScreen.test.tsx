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

    expect(screen.getByRole('heading', { name: 'O que é' })).toBeTruthy();
    expect(screen.queryByLabelText('Digite o comando')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Entendi, vamos praticar' }));
    expect(screen.getByText('Repositório ainda não iniciado.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Verificar tarefa' }));
    expect(screen.getByRole('heading', { name: 'Ainda não' })).toBeTruthy();
    expect(screen.getByText(/O repositório ainda não foi iniciado/)).toBeTruthy();
    expect(onAttempt).toHaveBeenCalledWith(expect.objectContaining({ solved: false }));

    await user.click(screen.getByRole('button', { name: 'Dica: conceito' }));
    expect(screen.getByText(/git init cria a estrutura/)).toBeTruthy();

    const input = screen.getByLabelText('Digite o comando');
    await user.type(input, 'git status');
    await user.click(screen.getByRole('button', { name: 'Executar' }));
    expect(screen.getByText(/git init cria o Git/)).toBeTruthy();

    await user.clear(input);
    await user.type(input, 'git init');
    await user.click(screen.getByRole('button', { name: 'Executar' }));
    expect(screen.getByText('Branch main, nenhum commit.')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Verificar tarefa' }));
    expect(screen.getByRole('heading', { name: 'Tarefa concluída' })).toBeTruthy();
    expect(screen.getByText(/git init prepara a pasta/)).toBeTruthy();
    expect(onAttempt).toHaveBeenCalledWith(expect.objectContaining({ solved: true, hintsUsed: 1 }));
  });

  it('keeps the full scenario in the scrolling lesson', () => {
    render(<TaskScreen taskId="ler-o-log" onAttempt={vi.fn()} />);
    expect(screen.getByText(/grave essa mensagem, exatamente/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Mostrar o enunciado inteiro' })).toBeNull();
  });

  it('says when the address is not a task', () => {
    render(<TaskScreen taskId="nao-existe" onAttempt={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Tarefa não encontrada' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Voltar à trilha' }).getAttribute('href')).toBe('#/');
  });
});
