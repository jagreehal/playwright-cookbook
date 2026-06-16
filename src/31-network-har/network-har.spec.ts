import { test, expect } from '@playwright/test';
import { makePerson } from '../swapi/builders';

test.describe('31-network-har: recording a HAR with route.fulfill mocking', () => {
  test('use route.fulfill as standard network mocking for explicit control', async ({
    page,
  }) => {
    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({
        json: makePerson({
          name: 'Explicit Luke',
          height: '172',
          mass: '77',
          url: 'https://swapi.dev/api/people/1/',
        }),
      }),
    );

    await page.goto('/cards/01');

    await expect(page.getByTestId('person-name')).toHaveText('Explicit Luke');
  });

  test('record HAR via context option and assert route.fulfill serves correct data', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      recordHar: {
        path: './test/fixtures/swapi-people-1.har',
        mode: 'full',
        content: 'embed',
      },
    });

    const page = await context.newPage();
    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({
        json: makePerson({
          name: 'HAR Recorded Luke',
          height: '172',
          mass: '77',
          url: 'https://swapi.dev/api/people/1/',
        }),
      }),
    );

    await page.goto('/cards/01');
    await expect(page.getByTestId('person-name')).toHaveText('HAR Recorded Luke');

    await context.close();
  });

  test('replay: routeFromHAR serves the recorded SWAPI response', async ({
    page,
  }) => {
    // Replay only the SWAPI call from the HAR; the page itself still loads live.
    // notFound: 'abort' fails loudly if a matched request is missing from the HAR.
    await page.routeFromHAR('./test/fixtures/swapi-people-1.har', {
      url: '**/swapi.dev/**',
      notFound: 'abort',
    });

    await page.goto('/cards/01');

    // The body comes straight from the recorded HAR entry, no route.fulfill here.
    await expect(page.getByTestId('person-name')).toHaveText('HAR Recorded Luke');
  });
});
