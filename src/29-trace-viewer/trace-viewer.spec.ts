import { execFileSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import { makePerson } from '../swapi/builders';

test.describe('29-trace-viewer: Reading traces and the show-trace workflow', () => {
  test("generates a trace on retry when configured with 'on-first-retry'", async ({
    page,
  }) => {
    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({
        json: makePerson({
          name: 'Mocked Luke',
          height: '172',
          mass: '77',
          url: 'https://swapi.dev/api/people/1/',
        }),
      }),
    );

    await page.goto('/cards/01');
    await expect(page.getByRole('heading', { name: 'Person' })).toBeVisible();
    await expect(page.getByTestId('person-name')).toHaveText('Mocked Luke');
  });

  test('deliberate assertion to show what a trace reveals', async ({ page }) => {
    test.info().annotations.push({
      type: 'tip',
      description:
        'Open the trace with: npx playwright show-trace test-results/.../trace.zip',
    });

    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({
        json: makePerson({
          name: 'Darth Vader',
          height: '202',
          mass: '136',
          url: 'https://swapi.dev/api/people/1/',
        }),
      }),
    );

    await page.goto('/cards/01');
    await expect(page.getByRole('heading', { name: 'Person' })).toBeVisible();

    // The trace records every action: page.goto, route.fulfill, expect calls,
    // screenshots, and console logs, all with timestamps.
    await expect(page.getByTestId('person-name')).toHaveText('Darth Vader');
  });

  test('page.pause opens Playwright Inspector for step-through debugging', async ({
    page,
  }) => {
    test.info().annotations.push({
      type: 'tip',
      description:
        'Run with: npx playwright test --headed --debug. Press F8 to resume, F10 to step over.',
    });

    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({
        json: makePerson({ name: 'Pause Luke' }),
      }),
    );

    await page.goto('/cards/01');

    // Uncomment the line below to pause the test at this point.
    // Playwright Inspector opens automatically, letting you step through
    // the test line by line. Useful when: a selector won't resolve,
    // the page state looks wrong, or you need to inspect the DOM mid-test.
    // await page.pause();

    await expect(page.getByTestId('person-name')).toHaveText('Pause Luke');
  });

  test('log API responses to diagnose network issues', async ({ page }) => {
    // Attach a listener that logs every failed API response during the test.
    // This surfaces network errors that silent failures hide.
    page.on('response', async (res) => {
      if (res.url().includes('/api/') && res.status() >= 400) {
        console.log(`API error: ${res.status()} ${res.url()}`);
      }
    });

    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({
        json: makePerson({ name: 'API Debug Luke' }),
      }),
    );

    await page.goto('/cards/01');
    await expect(page.getByTestId('person-name')).toHaveText('API Debug Luke');
  });

  // `playwright trace` keeps one opened trace per machine, so the lock stops a
  // repeated run from opening a second trace halfway through this one.
  test('read a saved trace from the terminal', { lock: 'trace-cli' }, async ({ browser }, testInfo) => {
    const zip = testInfo.outputPath('trace.zip');
    const context = await browser.newContext();
    await context.tracing.start({ snapshots: true });
    const page = await context.newPage();
    await page.setContent('<button>Save</button>');
    await page.getByRole('button', { name: 'Save' }).click();
    await context.tracing.stop({ path: zip });
    await context.close();

    const trace = (...args: string[]) =>
      execFileSync('npx', ['playwright', 'trace', ...args], { encoding: 'utf8' });

    expect(trace('open', zip)).toContain('Actions:');
    try {
      expect(trace('actions')).toContain("getByRole('button', { name: 'Save' })");
      expect(trace('errors')).toContain('No errors');
    } finally {
      trace('close');
    }
  });
});
