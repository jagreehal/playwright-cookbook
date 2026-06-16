import { test, expect } from '@playwright/test';
import { waitForApi } from '../e2e-patterns/helpers/waitForApi';
import { ToastRegion } from '../e2e-patterns/regions/ToastRegion';
import { DialogRegion } from '../e2e-patterns/regions/DialogRegion';
import { makePerson } from '../swapi/builders';

test.describe('15-done-signals: Done signals and waitForApi', () => {
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
  });

  test('waitForApi: wait for people/1 response then assert page loaded', async ({
    page,
  }) => {
    const responsePromise = waitForApi(page, { urlPart: '/people/1' });
    await page.goto('/cards/15');
    const response = await responsePromise;
    expect(response.ok()).toBe(true);

    await expect(page.getByRole('heading', { name: 'Person' })).toBeVisible();
    await expect(page.getByTestId('person-name')).toHaveText('Luke Skywalker');
  });

  test('done signal for modal save: wait dialog hidden and toast', async ({
    page,
  }) => {
    await page.goto('/cards/15');
    await expect(page.getByRole('heading', { name: 'Person' })).toBeVisible();

    await page.getByTestId('edit-person').click();
    const dialog = new DialogRegion(page, 'Edit person');
    await dialog.expectVisible();

    await dialog.getByLabel('Name').fill('Leia');
    await dialog.getButton(/save/i).click();

    await dialog.expectHidden();
    const toast = new ToastRegion(page);
    await toast.expectSuccess(/saved/i);
  });

  test('expect.poll: poll DOM for async state change after edit', async ({
    page,
  }) => {
    await page.goto('/cards/15');
    await expect(page.getByRole('heading', { name: 'Person' })).toBeVisible();

    await page.getByTestId('edit-person').click();
    await page.getByRole('dialog', { name: 'Edit person' }).getByLabel('Name').fill('Polled Leia');
    await page.getByRole('dialog', { name: 'Edit person' }).getByRole('button', { name: /save/i }).click();

    await expect.poll(
      () => page.getByTestId('person-name').textContent(),
      { timeout: 5_000 },
    ).toBe('Polled Leia');
  });
});
