import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

export async function openTrail(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('trilha-git.intro.v1', '1');
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Básico' })).toBeVisible();
}

export async function expectNoPageOverflow(page: Page) {
  const extra = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(extra).toBeLessThanOrEqual(1);
}

export async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const summary = results.violations.map((violation) => {
    const targets = violation.nodes
      .slice(0, 3)
      .map((node) => node.target.join(' '))
      .join(' | ');
    return `${violation.id}: ${violation.help} [${targets}]`;
  });
  expect(summary).toEqual([]);
}
