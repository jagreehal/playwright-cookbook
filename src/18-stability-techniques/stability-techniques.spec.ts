import { test, expect } from '@playwright/test';
import { personCardLocator } from '../e2e-patterns/person/locators';
import { PersonPage } from '../e2e-patterns/person/PersonPage';
import { makePerson } from '../swapi/builders';

test.describe('18-stability-techniques: Disable animations, strict locators, screenshots', () => {
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
      // The init script can run before document.documentElement exists.
      // Inject now if the root is ready, otherwise wait for DOMContentLoaded.
      if (document.documentElement) {
        inject();
      } else {
        document.addEventListener('DOMContentLoaded', inject, { once: true });
      }
    });
  });

  test('strict locator: scope to dialog then button', async ({ page }) => {
    await PersonPage.open(page, '1', '/cards/18');
    await page.getByTestId('edit-person').click();

    const dialog = page.getByRole('dialog', { name: 'Edit person' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /save/i }).click();
    await expect(dialog).toBeHidden();
  });

  test('component screenshot: person card', { tag: '@visual' }, async ({ page }) => {
    await PersonPage.open(page, '1', '/cards/18');
    const card = personCardLocator(page, '1');
    await expect(card).toBeVisible();
    await expect(card).toHaveScreenshot('person-card.png');
  });
});
