import { expect, test, type Page } from '@playwright/test';
import { expectNoPageOverflow, openTrail } from './helpers';

const hintSteps = [
  ['Dica: conceito', 'Conceito.'],
  ['Dica: sintaxe', 'Sintaxe.'],
  ['Dica: resposta', 'Resposta.'],
] as const;

async function fieldBox(page: Page) {
  const box = await page.getByRole('textbox', { name: 'Digite o comando' }).boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

function fits(box: { y: number; height: number }, height: number) {
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(height + 1);
}

async function openInitTask(page: Page) {
  await openTrail(page);
  await page.getByRole('link', { name: /Iniciar o repositório/ }).click();
  await expect(page.getByRole('heading', { name: 'Iniciar o repositório' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'O que é' })).toBeVisible();
  await page.getByRole('button', { name: 'Entendi, vamos praticar' }).click();
  await expect(page.getByRole('textbox', { name: 'Digite o comando' })).toBeVisible();
}

test('command field stays in view after every hint on a phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'phone viewport');
  const sizes = [
    { width: 412, height: 780 },
    { width: 393, height: 727 },
    { width: 412, height: 640 },
  ];

  for (const size of sizes) {
    await page.setViewportSize(size);
    await openInitTask(page);
    const input = page.getByRole('textbox', { name: 'Digite o comando' });
    const before = await fieldBox(page);
    fits(before, size.height);

    for (const [button, hint] of hintSteps) {
      await page.getByRole('button', { name: button }).click();
      await expect(page.getByText(hint, { exact: false }).last()).toBeInViewport();
      const next = await fieldBox(page);
      fits(next, size.height);
      expect(Math.abs(next.y - before.y)).toBeLessThan(1);
    }

    const keys = await page.locator('.keys').boundingBox();
    expect(keys).not.toBeNull();
    fits(keys!, size.height);
    await expect(page.getByRole('heading', { name: 'Iniciar o repositório' })).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Verificar tarefa' })).toBeInViewport();
    await expectNoPageOverflow(page);

    await input.fill('git init');
    await page.getByRole('button', { name: 'Executar' }).click();
    await expect(page.getByRole('log')).toContainText('Initialized empty Git repository');
    fits(await fieldBox(page), size.height);
  }
});

test('a long scenario still leaves the command field on screen', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'phone viewport');
  await page.setViewportSize({ width: 412, height: 780 });
  await page.addInitScript(() => {
    localStorage.setItem('trilha-git.intro.v1', '1');
  });
  await page.goto('/#/tarefa/ver-diff');
  await expect(page.getByRole('heading', { name: 'Ver a alteração na pasta' })).toBeVisible();
  await page.getByRole('button', { name: 'Entendi, vamos praticar' }).click();
  const before = await fieldBox(page);
  fits(before, 780);
  for (const [button] of hintSteps) {
    await page.getByRole('button', { name: button }).click();
    const next = await fieldBox(page);
    fits(next, 780);
    expect(Math.abs(next.y - before.y)).toBeLessThan(1);
  }
  await expect(page.getByText('Resposta.', { exact: false })).toBeInViewport();
  await expectNoPageOverflow(page);
});

test('desktop terminal does not move when hints open', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop viewport');
  await openInitTask(page);
  const input = page.getByRole('textbox', { name: 'Digite o comando' });
  const before = await fieldBox(page);
  const lesson = await page.locator('.lesson').boundingBox();
  expect(lesson).not.toBeNull();
  expect(before.x).toBeGreaterThan(lesson!.x + lesson!.width - 1);

  for (const [button, hint] of hintSteps) {
    await page.getByRole('button', { name: button }).click();
    await expect(page.getByText(hint, { exact: false }).last()).toBeVisible();
    const next = await fieldBox(page);
    expect(Math.abs(next.y - before.y)).toBeLessThan(1);
    expect(Math.abs(next.x - before.x)).toBeLessThan(1);
  }

  await input.fill('git init');
  await page.getByRole('button', { name: 'Executar' }).click();
  await expect(page.getByRole('log')).toContainText('Initialized empty Git repository');
});

test('reopening the lesson keeps the command field on screen', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'phone viewport');
  await page.setViewportSize({ width: 393, height: 727 });
  await openInitTask(page);
  const before = await fieldBox(page);
  fits(before, 727);
  await page.getByRole('button', { name: 'Rever a lição' }).click();
  await expect(page.getByRole('heading', { name: 'O que é' })).toBeVisible();
  const next = await fieldBox(page);
  fits(next, 727);
  expect(Math.abs(next.y - before.y)).toBeLessThan(1);
  await expectNoPageOverflow(page);
  await page.getByRole('button', { name: 'Recolher a lição' }).click();
  await expect(page.getByRole('heading', { name: 'O que é' })).toHaveCount(0);
});
