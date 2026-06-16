import { test, expect } from '@playwright/test';
import { makePerson } from '../swapi/builders';

test.describe('16-debug-unhandled-requests: Custom unhandled behavior', () => {
  test('handles people/1; fallback would log/abort other swapi URLs', async ({ page }) => {
    const unhandledSwapi: string[] = [];

    await page.route('**/swapi.dev/**', async (route) => {
      unhandledSwapi.push(route.request().url());
      await route.abort('blockedbyclient');
    });

    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({
        json: makePerson({ name: 'Luke Skywalker', height: '172' }),
      }),
    );

    await page.goto('/cards/16');

    await expect(page.getByTestId('person-name')).toHaveText('Luke Skywalker');
    expect(unhandledSwapi).toHaveLength(0);
  });

  test('LIFO route order: last-registered route matches first', async ({ page }) => {
    const calls: string[] = [];

    await page.route('**/swapi.dev/api/people/1/**', async (route) => {
      calls.push('first');
      await route.fallback();
    });

    await page.route('**/swapi.dev/api/people/1/**', async (route) => {
      calls.push('second');
      await route.fulfill({
        json: makePerson({ name: 'LIFO Luke', height: '172' }),
      });
    });

    await page.goto('/cards/16');
    await expect(page.getByTestId('person-name')).toHaveText('LIFO Luke');
    expect(calls).toEqual(['second']);
  });

  test('warn/abort/record fallback: log unhandled requests to console', async ({
    page,
  }) => {
    const unhandled: string[] = [];

    await page.route('**/swapi.dev/**', async (route) => {
      const url = route.request().url();
      unhandled.push(url);
      console.warn(`[UNHANDLED] No mock for: ${url}`);
      await route.abort('blockedbyclient');
    });

    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({
        json: makePerson({ name: 'Fallback Luke', height: '172' }),
      }),
    );

    await page.goto('/cards/16');

    await expect(page.getByTestId('person-name')).toHaveText('Fallback Luke');
    expect(unhandled).toHaveLength(0);
  });
});
