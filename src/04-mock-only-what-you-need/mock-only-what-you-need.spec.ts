import { test, expect } from '@playwright/test';
import type { SwapiPerson } from '../swapi/schema';

test.describe('04-mock-only-what-you-need: Strict mock scope', () => {
  test('only people/1 is mocked; other SWAPI requests are aborted', async ({ page }) => {
    const luke = {
      name: 'Luke Skywalker',
      height: '172',
    } satisfies Partial<SwapiPerson>;

    const unhandled: string[] = [];

    await page.route('**/swapi.dev/**', async (route) => {
      unhandled.push(route.request().url());
      await route.abort('blockedbyclient');
    });

    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({ json: luke }),
    );

    await page.goto('/cards/04');

    await expect(page.getByTestId('person-name')).toHaveText('Luke Skywalker');
    expect(unhandled).toHaveLength(0);
  });

  test('request to people/2 is not mocked so falls to fallback and app shows error', async ({
    page,
  }) => {
    const luke = {
      name: 'Luke Skywalker',
      height: '172',
    } satisfies Partial<SwapiPerson>;

    await page.route('**/swapi.dev/**', async (route) => {
      await route.abort('blockedbyclient');
    });

    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({ json: luke }),
    );

    await page.goto('/cards/04?id=2');

    await expect(page.getByTestId('error')).toBeVisible();
  });

  test('context.route: mock applies to all pages in the context', async ({
    page,
    context,
  }) => {
    const luke = {
      name: 'Luke Skywalker',
      height: '172',
    } satisfies Partial<SwapiPerson>;

    await context.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({ json: luke }),
    );

    const secondPage = await context.newPage();
    await secondPage.goto('/cards/04');
    await expect(secondPage.getByTestId('person-name')).toHaveText('Luke Skywalker');

    await page.goto('/cards/04');
    await expect(page.getByTestId('person-name')).toHaveText('Luke Skywalker');

    await secondPage.close();
  });

  test('route.fallback: delegate to the next matching handler', async ({ page }) => {
    await page.route('**/swapi.dev/api/people/1/**', async (route) => {
      if (route.request().url().includes('?role=admin')) {
        await route.fulfill({ json: { name: 'Admin Luke', height: '172' } });
      } else {
        await route.fallback();
      }
    });

    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({ json: { name: 'Default Luke', height: '172' } }),
    );

    await page.goto('/cards/04');
    await expect(page.getByTestId('person-name')).toHaveText('Default Luke');
  });

  test('times option: route handles only the first N requests', async ({ page }) => {
    let callCount = 0;

    await page.route('**/swapi.dev/api/people/1/**', async (route) => {
      callCount++;
      await route.fulfill({ json: { name: `Call ${callCount}`, height: '172' } });
    }, { times: 2 });

    await page.goto('/cards/04');
    await expect(page.getByTestId('person-name')).toHaveText('Call 1');

    await page.reload();
    await expect(page.getByTestId('person-name')).toHaveText('Call 2');

    await page.reload();
    expect(callCount).toBe(2);
  });
});
