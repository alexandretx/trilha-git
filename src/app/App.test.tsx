// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { InstallOffer, OfflineNote } from '../ui/status';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.dataset.theme = 'light';
  window.matchMedia = (query: string) =>
    ({
      matches: query.includes('standalone') ? false : false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
      onchange: null,
    }) as MediaQueryList;
});

afterEach(() => {
  cleanup();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});

describe('App', () => {
  it('explains the practice once, then opens the trail and toggles the theme', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Como praticar' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Usar tema escuro' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(screen.getByRole('button', { name: 'Usar tema claro' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Ir para a trilha' }));
    expect(await screen.findByRole('heading', { name: 'Básico' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Como funciona' }));
    expect(screen.getByRole('heading', { name: 'Como praticar' })).toBeTruthy();
  });
});

describe('connection status', () => {
  it('reports the offline state', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    render(<OfflineNote />);
    expect(screen.getByRole('status').textContent).toContain('Sem conexão');
  });

  it('offers install when the browser asks, and hides it after Agora não', async () => {
    const user = userEvent.setup();
    render(<InstallOffer />);
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(event, {
      prompt: () => Promise.resolve(),
      userChoice: Promise.resolve({ outcome: 'dismissed' }),
    });
    window.dispatchEvent(event);
    const offer = await screen.findByRole('button', { name: 'Instalar neste aparelho' });
    expect(event.defaultPrevented).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Agora não' }));
    expect(offer.isConnected).toBe(false);
    expect(localStorage.getItem('trilha-git.install.dismissed')).toBe('1');
  });
});
