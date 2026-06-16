import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { makePerson } from '../swapi/builders';

test.describe('17-accessibility-axe: Axe scan', () => {
  test('person page has no accessibility violations', async ({ page }, testInfo) => {
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

    await page.goto('/cards/17');
    await expect(page.getByRole('heading', { name: 'Person' })).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(['region', 'color-contrast'])
      .include('#app')
      .exclude('[data-testid="toast"]')
      .analyze();

    await testInfo.attach('axe-violations', {
      body: JSON.stringify(accessibilityScanResults.violations, null, 2),
      contentType: 'application/json',
    });

    await testInfo.attach('axe-passes', {
      body: JSON.stringify(accessibilityScanResults.passes, null, 2),
      contentType: 'application/json',
    });

    expect(accessibilityScanResults.violations).toHaveLength(0);
  });

  test('scan with tags: restrict to WCAG 2.2 AA rules only', async ({ page }, testInfo) => {
    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({
        json: makePerson({
          name: 'Axe Tags Luke',
          height: '172',
          mass: '77',
        }),
      }),
    );

    await page.goto('/cards/17');
    await expect(page.getByRole('heading', { name: 'Person' })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .disableRules(['region', 'color-contrast'])
      .analyze();

    await testInfo.attach('axe-tagged-violations', {
      body: JSON.stringify(results.violations, null, 2),
      contentType: 'application/json',
    });

    expect(results.violations).toHaveLength(0);
  });
});
