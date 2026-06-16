import { test, expect } from '@playwright/test';
import { PersonPage } from '../e2e-patterns/person/PersonPage';
import { personPageLocators } from '../e2e-patterns/person/locators';
import { loadPersonPage } from '../e2e-patterns/person/actions';
import type { SwapiPerson } from '../swapi/schema';

const luke: SwapiPerson = {
  name: 'Luke Skywalker',
  height: '172',
  mass: '77',
  url: 'https://swapi.dev/api/people/1/',
  films: [],
};

test.describe('12-locators-actions-flows: 3-layer model', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({ json: luke }),
    );
  });

  test('flow returns PersonPage and assertLoaded passes', async ({ page }) => {
    const personPage = await PersonPage.open(page, '1', '/cards/12');

    await personPage.assertLoaded();

    const $ = personPageLocators(page);
    await expect($.name).toHaveText('Luke Skywalker');
  });

  test('actions and locators used without flows', async ({ page }) => {
    await loadPersonPage(page, '1', '/cards/12');

    const $ = personPageLocators(page);
    await expect($.heading).toBeVisible();
    await expect($.name).toHaveText('Luke Skywalker');
  });
});
