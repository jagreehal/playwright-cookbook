import { test, expect } from '@playwright/test';
import type { SwapiPerson } from '../swapi/schema';

test.describe('02-mock-first-api: Playwright + page.route', () => {
  test('GET people/1 returns mocked person in UI', async ({ page }) => {
    const luke = {
      name: 'Luke Skywalker',
      height: '172',
    } satisfies Partial<SwapiPerson>;

    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({ json: luke }),
    );

    await page.goto('/cards/02');

    await expect(page.getByTestId('person-name')).toHaveText('Luke Skywalker');
    await expect(page.getByTestId('person-height')).toHaveText('172');
  });
});
