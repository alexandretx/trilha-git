// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Terminal } from './Terminal';

afterEach(() => cleanup());

describe('Terminal', () => {
  it('prints command output as text', () => {
    const payload = '<img src=x onerror="alert(1)"><script>alert(1)</script>';
    const { container } = render(
      <Terminal
        lines={[
          { kind: 'cmd', text: payload },
          { kind: 'out', text: payload },
        ]}
        onSubmit={() => undefined}
      />,
    );
    const log = screen.getByRole('log');
    expect(log.textContent).toContain(payload);
    expect(log.querySelector('script, img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(log.innerHTML).toContain('&lt;script&gt;');
  });

  it('inserts tokens, completes with Tab, and recalls history', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <Terminal
        lines={[{ kind: 'info', text: 'Repositório em /repo. Digite um comando.' }]}
        onSubmit={onSubmit}
      />,
    );
    const input = screen.getByLabelText('Comando') as HTMLInputElement;

    await user.click(screen.getByRole('button', { name: 'Inserir git' }));
    expect(input.value).toBe('git ');
    await user.click(screen.getByRole('button', { name: 'Inserir commit -m com aspas' }));
    expect(input.value).toBe('git commit -m ""');
    expect(input.value[input.selectionStart ?? 0]).toBe('"');
    expect(input.value[(input.selectionStart ?? 1) - 1]).toBe('"');

    await user.clear(input);
    await user.type(input, 'git sta');
    await user.click(screen.getByRole('button', { name: 'Tab: completar comando' }));
    expect(input.value).toBe('git status');

    await user.click(screen.getByRole('button', { name: 'Executar' }));
    expect(onSubmit).toHaveBeenCalledWith('git status');
    expect(input.value).toBe('');

    await user.type(input, '{ArrowUp}');
    expect(input.value).toBe('git status');
    await user.click(screen.getByRole('button', { name: 'Comando anterior' }));
    expect(input.value).toBe('git status');
  });
});
