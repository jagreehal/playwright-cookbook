import { test, expect } from '@playwright/test';
import { makePerson } from '../swapi/builders';

test.describe('30-ci-sharding: Sharding and blob-report merge', () => {
  test('worker 1: test that would benefit from sharding', async ({ page }) => {
    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({
        json: makePerson({
          name: 'Shard Test A',
          height: '172',
          mass: '77',
        }),
      }),
    );

    await page.goto('/cards/01');
    await expect(page.getByRole('heading', { name: 'Person' })).toBeVisible();
    await expect(page.getByTestId('person-name')).toHaveText('Shard Test A');
  });

  test('worker 2: independently shardable test', async ({ page }) => {
    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({
        json: makePerson({
          name: 'Shard Test B',
          height: '182',
          mass: '87',
        }),
      }),
    );

    await page.goto('/cards/01');
    await expect(page.getByRole('heading', { name: 'Person' })).toBeVisible();
    await expect(page.getByTestId('person-name')).toHaveText('Shard Test B');
  });

  test('shows worker identity via testInfo', async ({ page }, testInfo) => {
    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({
        json: makePerson({
          name: `Worker ${testInfo.workerIndex}`,
          height: '172',
          mass: '77',
        }),
      }),
    );

    await page.goto('/cards/01');
    await expect(page.getByRole('heading', { name: 'Person' })).toBeVisible();
    await expect(page.getByTestId('person-name')).toBeVisible();
  });
});
