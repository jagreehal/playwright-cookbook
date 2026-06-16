import { test, expect } from '@playwright/test';
import type { SwapiPerson } from '../swapi/schema';

const luke: SwapiPerson = {
  name: 'Luke Skywalker',
  height: '172',
  mass: '77',
  url: 'https://swapi.dev/api/people/1/',
  films: [],
};

test.describe('10-per-test-overrides: Scenario-based route override', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({ json: luke }),
    );
  });

  test('GET people/1 returns 200 and person by default', async ({ page }) => {
    await page.goto('/cards/10');

    await expect(page.getByTestId('person-name')).toHaveText('Luke Skywalker');
  });

  test('handles SWAPI 500 when overridden', async ({ page }) => {
    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({ status: 500, body: '' }),
    );

    await page.goto('/cards/10');

    await expect(page.getByTestId('error')).toBeVisible();
    await expect(page.getByTestId('error')).toContainText('500');
  });

  test('handles SWAPI 404 when overridden', async ({ page }) => {
    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({ status: 404, body: 'Not Found' }),
    );

    await page.goto('/cards/10');

    await expect(page.getByTestId('error')).toBeVisible();
    await expect(page.getByTestId('error')).toContainText('404');
  });

  test('handles network timeout via route.abort', async ({ page }) => {
    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.abort('timedout'),
    );

    await page.goto('/cards/10');

    await expect(page.getByTestId('error')).toBeVisible();
  });

  test('handles malformed response via invalid JSON', async ({ page }) => {
    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'not-valid-json{{{',
      }),
    );

    await page.goto('/cards/10');

    await expect(page.getByTestId('error')).toBeVisible();
  });
});
