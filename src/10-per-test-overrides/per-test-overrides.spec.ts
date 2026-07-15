import { test, expect } from '@playwright/test';
import type { SwapiPerson } from '../swapi/schema';

const luke: SwapiPerson = {
  name: 'Mocked Luke',
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

    await expect(page.getByTestId('person-name')).toHaveText('Mocked Luke');
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

  // A real slow backend can't be dialled up on demand; a delayed fulfill can.
  // This is the only way to reliably assert what the user sees *while waiting*.
  test('slow response: loading state shows while waiting, then data', async ({
    page,
  }) => {
    await page.route('**/swapi.dev/api/people/1/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1_500));
      await route.fulfill({ json: luke });
    });

    await page.goto('/cards/10');

    await expect(page.getByTestId('loading')).toBeVisible();
    await expect(page.getByTestId('person-name')).toHaveText('Mocked Luke');
    await expect(page.getByTestId('loading')).toBeHidden();
  });

  // Transient failures are the hardest backend behaviour to reproduce for
  // real. With a call counter the sequence is exact: two 500s, then fallback
  // to the happy-path mock from beforeEach.
  test('resilience: fails twice, retry succeeds on the third call', async ({
    page,
  }) => {
    let calls = 0;

    await page.route('**/swapi.dev/api/people/1/**', async (route) => {
      calls++;
      if (calls < 3) {
        await route.fulfill({ status: 500, body: `Call ${calls}` });
      } else {
        await route.fallback();
      }
    });

    await page.goto('/cards/10');
    await expect(page.getByTestId('error')).toBeVisible();

    await page.getByTestId('retry').click();
    await expect(page.getByTestId('error')).toBeVisible();

    await page.getByTestId('retry').click();
    await expect(page.getByTestId('person-name')).toHaveText('Mocked Luke');
    expect(calls).toBe(3);
  });
});
