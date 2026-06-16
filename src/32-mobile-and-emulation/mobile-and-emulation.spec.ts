import { test, expect, devices } from '@playwright/test';
import { makePerson } from '../swapi/builders';

const iPhone = devices['iPhone 13'];

test.describe('32-mobile-and-emulation: Devices, viewport, geolocation, permissions, colorScheme', () => {
  test.use({
    viewport: iPhone.viewport,
    userAgent: iPhone.userAgent,
    deviceScaleFactor: iPhone.deviceScaleFactor,
    isMobile: iPhone.isMobile,
    hasTouch: iPhone.hasTouch,
  });

  test('viewport emulation: iPhone 13 viewport produces mobile-sized layout', async ({
    page,
  }) => {
    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({
        json: makePerson({
          name: 'Mobile Luke',
          height: '172',
          mass: '77',
        }),
      }),
    );

    await page.goto('/cards/01');

    const viewport = page.viewportSize();
    expect(viewport?.width).toBe(iPhone.viewport.width);
    expect(viewport?.height).toBe(iPhone.viewport.height);

    await expect(page.getByRole('heading', { name: 'Person' })).toBeVisible();
  });

  test('geolocation override: set latitude and longitude', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 51.5074, longitude: -0.1278 });

    await page.goto('/cards/01');

    const coords = await page.evaluate(
      () =>
        new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            (err) => reject(err),
            { timeout: 5000 },
          );
        }),
    );

    expect(coords.latitude).toBeCloseTo(51.5074, 2);
    expect(coords.longitude).toBeCloseTo(-0.1278, 2);
  });

  test('colorScheme: dark mode emulation', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });

    await page.goto('/cards/01');

    const prefersDark = await page.evaluate(() =>
      window.matchMedia('(prefers-color-scheme: dark)').matches,
    );
    expect(prefersDark).toBe(true);
  });

  test('permissions: grant clipboard-write permission', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-write']);

    await page.goto('/cards/01');

    await page.evaluate(async () => {
      await navigator.clipboard.writeText('test-permission');
    });
  });
});
