import { test, expect } from '@playwright/test';

test.describe('01-first-browser-test: Open browser and assert on page', () => {
  // @smoke: a fast, always-run sanity check. Selective run: `--grep @smoke`.
  test('shows an error when the external API fails', { tag: '@smoke' }, async ({ page }) => {
    // Simulate the real SWAPI being unavailable. Without mocking, a flaky
    // external dependency makes this the outcome you cannot control.
    await page.route('**/swapi.dev/api/people/**', (route) =>
      route.fulfill({ status: 500 }),
    );

    await page.goto('/cards/01');

    await expect(page.getByRole('heading', { name: 'Person' })).toBeVisible();
    await expect(page.getByTestId('error')).toBeVisible();
  });
});
