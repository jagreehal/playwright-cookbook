/**
 * Composition root for large Playwright suites.
 *
 * Specs import `test` and `expect` from here, never from @playwright/test.
 * Every page, component, flow, and cross-cutting concern is a named fixture.
 *
 * ## When to use fixtures-based vs AppDriver POM
 *
 * This fixtures-based approach scales to 100+ specs with lazy construction
 * and auto-fixtures. Each test pays only for the fixtures it requests.
 *
 * Prefer this when:
 * - Suites exceed ~30 specs and benefit from lazy dependency injection
 * - Cross-cutting concerns (animations, error capture) should run invisibly
 * - Different tests need different subsets of pages/components
 *
 * For smaller suites or teams new to Playwright, consider the simpler
 * AppDriver pattern (`AppDriver.ts`) — a single namespaced object that
 * groups all flows under `app.person.*`, `app.auth.*`, etc.
 *
 * ## Scaling rules
 *
 * 1. Specs never set up infrastructure, no `page.route`, no `page.goto`, no
 *    constructing page objects. Pages, flows, and cross-cutting concerns are
 *    fixtures. Scoped components (e.g. a Modal) are exposed by the page object
 *    that owns their root locator, so the `new` lives there, not in the spec.
 * 2. Fixtures own setup and teardown, tests describe intent.
 * 3. Auto-fixtures run for every test without being requested.
 * 4. Flow fixtures are closures: call them, don't import them.
 */

import { test as base, expect } from '@playwright/test';
import { PersonPage } from './person/PersonPage';
import { DashboardPage } from './dashboard/DashboardPage';
import { ToastRegion } from './regions/ToastRegion';
import { loginAs } from './login/flow';

// ── Fixture type declarations ──────────────────────────────────────────────

type Fixtures = {
  personPage: PersonPage;
  disableAnimations: void;
  capturePageErrors: void;
  loginAsDefaultUser: () => Promise<DashboardPage>;
  toast: ToastRegion;
};

// ── Fixture implementations ────────────────────────────────────────────────

export const test = base.extend<Fixtures>({
  /**
   * Page fixture: PersonPage is pre-loaded and ready before the test runs.
   * The spec never calls page.goto() or page.route(), asked and provided.
   */
  personPage: async ({ page }, use) => {
    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          name: 'Luke Skywalker',
          height: '172',
          mass: '77',
          url: 'https://swapi.dev/api/people/1/',
          films: [],
        }),
      }),
    );
    const personPage = await PersonPage.open(page, '1', '/cards/26');
    await use(personPage);
  },

  /**
   * Auto-fixture: disables CSS transitions and animations before every page load.
   * Runs automatically, no test needs to request it.
   */
  disableAnimations: [
    async ({ page }, use) => {
      await page.addInitScript(() => {
        const style = document.createElement('style');
        style.textContent =
          '*, *::before, *::after { transition: none !important; animation: none !important; }';
        if (document.documentElement) {
          document.documentElement.appendChild(style);
        } else {
          document.addEventListener('DOMContentLoaded', () => {
            document.documentElement.appendChild(style);
          });
        }
      });
      await use();
    },
    { auto: true },
  ],

  /**
   * Auto-fixture: captures console errors and unhandled page errors.
   * Attaches them to the test report on failure, no test requests this.
   */
  capturePageErrors: [
    async ({ page }, use, testInfo) => {
      const errors: string[] = [];

      page.on('pageerror', (err) => {
        errors.push(`pageerror: ${err.message}`);
      });

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(`console.error: ${msg.text()}`);
        }
      });

      await use();

      if (testInfo.status !== 'passed' && errors.length > 0) {
        await testInfo.attach('console-errors', {
          body: errors.join('\n'),
          contentType: 'text/plain',
        });
      }
    },
    { auto: true },
  ],

  /**
   * Flow fixture: wraps loginAs in a closure so specs call it, not import it.
   * Returns the DashboardPage the flow lands on, so the spec asserts through
   * the page object instead of re-deriving raw locators (architecture Rule 2).
   * Teardown would go after use(), e.g. clearing auth state.
   */
  loginAsDefaultUser: async ({ page }, use) => {
    await use(() => loginAs(page, 'testuser', 'password'));
  },

  /**
   * Component fixture: ToastRegion available on demand.
   * Specs that don't need a toast don't pay for it, fixtures are lazy.
   */
  toast: async ({ page }, use) => {
    await use(new ToastRegion(page));
  },
});

export { expect };
