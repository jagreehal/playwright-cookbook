import { test, expect } from '@playwright/test';
import { SwapiPersonSchema } from '../swapi/schema';
import type { SwapiPerson } from '../swapi/schema';

const knownGoodPerson: SwapiPerson = {
  name: 'Luke Skywalker',
  height: '172',
  mass: '77',
  url: 'https://swapi.dev/api/people/1/',
  films: [],
};

test.describe('08-validate-with-zod: Validate response with Zod', () => {
  test('schema gates the boundary; only parsed data reaches the page', async ({ page }) => {
    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({ json: SwapiPersonSchema.parse(knownGoodPerson) }),
    );

    await page.goto('/cards/08');

    await expect(page.getByTestId('person-name')).toHaveText('Luke Skywalker');
  });
});
