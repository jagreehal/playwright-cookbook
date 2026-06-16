import { test, expect } from '@playwright/test';
import { personCardLocator } from '../e2e-patterns/person/locators';
import { PersonPage } from '../e2e-patterns/person/PersonPage';
import { makePerson } from '../swapi/builders';

test.describe('27-visual-regression: toHaveScreenshot depth: masking, threshold, stylePath', { tag: '@visual' }, () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({
        json: makePerson({
          name: 'Luke Skywalker',
          height: '172',
          mass: '77',
          url: 'https://swapi.dev/api/people/1/',
        }),
      }),
    );
    await page.addInitScript(() => {
      const css = '* { transition: none !important; animation: none !important; }';
      const inject = () => {
        const style = document.createElement('style');
        style.textContent = css;
        const root = document.head ?? document.documentElement;
        root.appendChild(style);
      };
      if (document.documentElement) {
        inject();
      } else {
        document.addEventListener('DOMContentLoaded', inject, { once: true });
      }
    });
  });

  test('element-level screenshot of the person card', async ({ page }) => {
    await PersonPage.open(page, '1', '/cards/18');
    const card = personCardLocator(page, '1');
    await expect(card).toBeVisible();
    await expect(card).toHaveScreenshot('person-card-element.png');
  });

  test('screenshot with maxDiffPixels and threshold for lenient comparison', async ({ page }) => {
    await PersonPage.open(page, '1', '/cards/18');
    const card = personCardLocator(page, '1');
    await expect(card).toBeVisible();
    await expect(card).toHaveScreenshot('person-card-lenient.png', {
      maxDiffPixels: 100,
      threshold: 0.3,
    });
  });

  test('reuse a golden with a diff tolerance via maxDiffPixels', async ({ page }) => {
    await PersonPage.open(page, '1', '/cards/18');
    const card = personCardLocator(page, '1');
    await expect(card).toBeVisible();

    // Compares against the same committed golden as test 1, but allows up to
    // 100 differing pixels so minor rendering variance does not fail the run.
    await expect(card).toHaveScreenshot('person-card-element.png', { maxDiffPixels: 100 });
  });
});
