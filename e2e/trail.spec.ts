import { expect, test } from '@playwright/test';
import { level1Tasks } from '../src/content/git/level1';
import { expectAccessible, expectNoPageOverflow, openTrail } from './helpers';

test('first visit explains the practice, then opens the trail', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Como praticar' })).toBeVisible();
  await expectAccessible(page);
  await expectNoPageOverflow(page);
  await page.getByRole('button', { name: 'Ir para a trilha' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Básico' })).toBeVisible();
  await expect(page.getByText('Nenhuma tarefa concluída ainda.')).toBeVisible();
  await expectNoPageOverflow(page);
});

test('completes a level 1 task and leaves Histórico closed', async ({ page }) => {
  await openTrail(page);
  await page.getByRole('link', { name: /Iniciar o repositório/ }).click();
  await expect(page.getByRole('heading', { name: 'Iniciar o repositório' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Entendi, vamos praticar' })).toBeVisible();
  await expectNoPageOverflow(page);
  await page.getByRole('button', { name: 'Entendi, vamos praticar' }).click();
  await page.getByRole('textbox', { name: 'Digite o comando' }).fill('git init');
  await page.getByRole('button', { name: 'Executar' }).click();
  await expect(page.getByRole('log')).toContainText('Initialized empty Git repository');
  await page.getByRole('button', { name: 'Verificar tarefa' }).click();
  await expect(page.getByRole('heading', { name: 'Tarefa concluída' })).toBeVisible();
  await page.getByRole('link', { name: 'Voltar à trilha' }).first().click();
  await expect(page.getByText('1 de 8 tarefas concluídas.')).toBeVisible();
  const historico = page.locator('section', {
    has: page.getByRole('heading', { name: 'Histórico' }),
  });
  await expect(historico).toContainText('Fechado.');
});

test('opens Histórico after Básico and keeps Branches closed', async ({ page }) => {
  const outcomes: Record<string, unknown> = {};
  for (const task of level1Tasks) {
    outcomes[task.id] = {
      taskId: task.id,
      conceptId: task.conceptId,
      solved: true,
      attempts: 1,
      hintsUsed: 0,
      firstTry: true,
      score: 1,
      at: 1_700_000_000_000,
    };
  }
  const snapshot = JSON.stringify({ version: 1, outcomes, reviews: {} });
  await page.addInitScript((raw) => {
    localStorage.setItem('trilha-git.intro.v1', '1');
    localStorage.setItem('trilha-git.progress.v1', raw);
  }, snapshot);
  await page.goto('/');
  const historico = page.locator('section', {
    has: page.getByRole('heading', { name: 'Histórico' }),
  });
  const branches = page.locator('section', {
    has: page.getByRole('heading', { name: 'Branches' }),
  });
  await expect(historico.getByRole('link', { name: /Ver a alteração na pasta/ })).toBeVisible();
  await expect(historico).not.toContainText('Fechado.');
  await expect(branches).toContainText('Fechado.');
  await expect(branches.getByRole('link')).toHaveCount(0);
});

test('toggles the theme and keeps it after reload', async ({ page }) => {
  await openTrail(page);
  await page.getByRole('button', { name: 'Usar tema escuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expectAccessible(page);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Usar tema claro' })).toBeVisible();
  await page.getByRole('button', { name: 'Usar tema claro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expectAccessible(page);
});

test('reloads from the service worker while offline', async ({ page, context }) => {
  await openTrail(page);
  await page.waitForFunction(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return registration?.active?.state === 'activated';
  });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await expect(page.getByRole('heading', { level: 1, name: 'Básico' })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Básico' })).toBeVisible();
  await expect(
    page.getByText('Sem conexão. Dá para continuar com o que este navegador já abriu.'),
  ).toBeVisible();
});

test('ignores a broken progress file and does not run terminal HTML', async ({ page }) => {
  const dialogs: string[] = [];
  page.on('dialog', (dialog) => {
    dialogs.push(dialog.message());
    void dialog.dismiss();
  });
  await page.addInitScript(() => {
    localStorage.setItem('trilha-git.intro.v1', '1');
    localStorage.setItem('trilha-git.progress.v1', '{');
  });
  const response = await page.goto('/');
  expect(response?.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(response?.headers()['x-content-type-options']).toBe('nosniff');
  await expect(
    page.getByText('Não consegui ler o progresso salvo. Começando de novo neste navegador.'),
  ).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Básico' })).toBeVisible();

  await page.goto('/#/tarefa/iniciar-repositorio');
  const payload = '<img src=x onerror="alert(1)"><script>alert(1)</script>';
  await page.getByRole('button', { name: 'Entendi, vamos praticar' }).click();
  await page.getByRole('textbox', { name: 'Digite o comando' }).fill(`echo ${payload}`);
  await page.getByRole('button', { name: 'Executar' }).click();
  const log = page.getByRole('log');
  await expect(log).toContainText(payload);
  await expect(log.locator('script, img')).toHaveCount(0);
  expect(dialogs).toEqual([]);
});

test('checks the task screen with axe', async ({ page }) => {
  await openTrail(page);
  await page.getByRole('link', { name: /Iniciar o repositório/ }).click();
  await expect(page.getByRole('heading', { name: 'Iniciar o repositório' })).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('button', { name: 'Usar tema escuro' }).click();
  await expectAccessible(page);
  await page.getByRole('button', { name: 'Entendi, vamos praticar' }).click();
  await expect(page.getByRole('textbox', { name: 'Digite o comando' })).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('button', { name: 'Rever a lição' }).click();
  await expect(page.getByRole('heading', { name: 'O que é' })).toBeVisible();
  await expectAccessible(page);
  await expectNoPageOverflow(page);
});
