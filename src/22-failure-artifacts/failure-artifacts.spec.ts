import { test as base, expect } from '@playwright/test';
const test = base.extend<{
  captureErrors: void;
  lastApiResponse: { response: { status: number; body: unknown } | null };
}>({
  captureErrors: [
    async ({ page }, use, testInfo) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => {
        errors.push(`PAGEERROR: ${e.message}`);
      });
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(`CONSOLE: ${msg.text()}`);
        }
      });
      await use();
      if (testInfo.status !== 'passed' && errors.length > 0) {
        await testInfo.attach('page-errors', {
          body: errors.join('\n'),
          contentType: 'text/plain',
        });
      }
    },
    { auto: true },
  ],
  lastApiResponse: async ({ page }, use) => {
    const ref: { response: { status: number; body: unknown } | null } = {
      response: null,
    };

    await page.route('**/swapi.dev/api/people/1/**', async (route) => {
      ref.response = {
        status: 200,
        body: {
          name: 'Luke Skywalker',
          height: '172',
          mass: '77',
        },
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        json: ref.response.body,
      });
    });

    await use(ref);

    if (ref.response) {
      await test.info().attach('last-api-response', {
        body: JSON.stringify(ref.response, null, 2),
        contentType: 'application/json',
      });
    }
  },
});

test.describe('22-failure-artifacts: Error capture fixture', () => {
  // captureErrors is an auto fixture: it runs for every test without being
  // requested, and attaches collected errors only when the test does not pass.
  test('passing test attaches nothing', async ({ page }) => {
    await page.goto('/cards/22');
    await expect(page.getByRole('heading', { name: 'Person' })).toBeVisible();
  });

  test('lastApiResponse captures and attaches the API body', async ({
    page,
    lastApiResponse,
  }) => {
    await page.goto('/cards/22');
    await expect(page.getByRole('heading', { name: 'Person' })).toBeVisible();

    expect(lastApiResponse.response).not.toBeNull();
    expect(lastApiResponse.response!.status).toBe(200);
    expect(lastApiResponse.response!.body).toEqual(
      expect.objectContaining({ name: 'Luke Skywalker' }),
    );
  });

  // Expected failure. Exercises the attach-on-failure branch in both fixtures.
  test('failing test attaches captured errors and the last API response', async ({
    page,
    lastApiResponse,
  }) => {
    test.fail();
    expect(lastApiResponse).toBeDefined();
    await page.goto('/cards/22');
    await expect(page.getByTestId('person-name')).toHaveText('No Such Person');
  });
});
