import { test, expect } from '@playwright/test';
import { makePerson } from '../swapi/builders';

test.describe('34-retries-and-soft-assertions: expect.soft, expect.poll, test.fail, test.fixme', () => {
  test('expect.soft: multiple assertions collected before failing', async ({ page }) => {
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

    await page.goto('/cards/01');
    await expect(page.getByRole('heading', { name: 'Person' })).toBeVisible();

    // Soft assertions: both run even if one fails, errors collected at the end.
    // Change height to 'wrong-height' to see how soft assertions aggregate failures.
    await expect.soft(page.getByTestId('person-name')).toHaveText('Luke Skywalker');
    await expect.soft(page.getByTestId('person-height')).toHaveText('172');
  });

  test('expect.poll: wait for a condition to become truthy', async ({ page }) => {
    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({
        json: makePerson({
          name: 'Poll Luke',
          height: '172',
          mass: '77',
          url: 'https://swapi.dev/api/people/1/',
        }),
      }),
    );

    await page.goto('/cards/01');
    await expect(page.getByRole('heading', { name: 'Person' })).toBeVisible();

    await expect
      .poll(
        () => page.getByTestId('person-name').innerText(),
        { timeout: 5000, intervals: [100, 250, 500] },
      )
      .toBe('Poll Luke');
  });

  test('expect.toPass: retry an async callback until it succeeds', async ({ page }) => {
    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({
        json: makePerson({
          name: 'ToPass Luke',
          height: '172',
          mass: '77',
          url: 'https://swapi.dev/api/people/1/',
        }),
      }),
    );

    await page.goto('/cards/01');
    await expect(page.getByRole('heading', { name: 'Person' })).toBeVisible();

    await expect(async () => {
      await expect(page.getByTestId('person-name')).toHaveText('ToPass Luke');
    }).toPass({ timeout: 5000 });
  });

  test('test.fail: expected-to-fail test (known bug or WIP feature)', async () => {
    // test.fail can be called inside the test body or at the describe level.
    // When the test fails, it's reported as "expected to fail" (a pass).
    // When the test passes unexpectedly, it fails to alert you the bug is fixed.
    test.fail(true, 'KNOWN BUG: this is a demonstration');

    expect(false).toBe(true);
  });

  test('test.fixme: skipped test marked as known-to-need-fixing', async ({ page }) => {
    test.fixme(true, 'THIS IS BROKEN: person mass not displayed yet');

    await page.goto('/cards/01');
    await expect(page.getByTestId('person-mass')).toHaveText('77');
  });
});
