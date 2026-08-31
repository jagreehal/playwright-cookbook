---
name: playwright-architecture
description: >-
  Defines the Playwright suite folder layout and five non-negotiable rules
  (fixtures own construction, selectors live in one place, action-named methods,
  web-first assertions, test independence). Use this skill when starting a new
  Playwright suite, restructuring an existing one, deciding where test code
  should live, or onboarding a team. Do not use for locator choice
  (playwright-locators), fixture mechanics (playwright-fixtures), or flake
  diagnosis (playwright-reliability).
---

# Playwright Architecture

The convention. Every other skill in this pack is a deeper dive into one part of what's described here.

## Critical rules

- Specs ask for fixtures. They do not call `new`, import from `@playwright/test`, or build helpers inline.
- Selectors live in the component or page object that owns the UI.
- Methods are user actions (`signIn`), not DOM operations (`clickLoginButton`).
- Every page assertion is `await expect(locator)...`. No `waitForTimeout`.
- Tests are independent. No shared mutable `beforeAll` setup.

## Workflow

1. Doctor the consuming repo: find `playwright.config.*`, current test directory, and whether a `fixtures.ts` already exists. Adapt this layout; do not invent a second tree beside an existing one.
2. Create or align `e2e/` with `components/`, `pages/`, `flows/`, and `fixtures.ts`.
3. Move spec-visible construction into fixtures. Move selectors into page/component objects. Extract repeated journeys into flows.
4. Validate with a focused `npx playwright test` on one migrated spec.

## The Thesis

E2E tests are not fragile. People blame them for flakes that come from four mistakes (racy waits, selector drift, shared state, uncontrolled network) and from one structural mistake: putting everything in the spec file. Fix the structure and three of the four go away. Web-first assertions handle the fourth.

This convention scales from ten specs to a thousand without ever needing to be rewritten.

## Folder Layout

```
e2e/
├── *.spec.ts        # tests — describe user intent, assert with expect()
├── components/      # reusable UI fragments (sidebar, header, modal, table row)
├── pages/           # only pages with real page-level behaviour
├── flows/           # cross-page user journeys (login, checkout)
└── fixtures.ts      # composition root for spec-visible objects
```

Four small layers, each with one job. A spec touches none of them directly except `fixtures.ts`.

## The Five Rules

These are non-negotiable. Every rule prevents a specific failure mode. Skip a rule and the failure mode comes back.

### 1. Specs never construct anything

Specs ask for fixtures. They do not call `new`, they do not import from `@playwright/test`, and they do not build their own helpers inline.

```ts
// good
test('user can sign in', async ({ loginPage, dashboardPage }) => { /* ... */ });

// bad
test('user can sign in', async ({ page }) => {
  const loginPage = new LoginPage(page);   // construction in spec
  // ...
});
```

**Failure mode without it:** wiring code multiplies across the suite. When a constructor signature changes, you edit fifty files.

Fixtures are the composition root for objects a spec can request. Page objects may still construct private child components that they own; the line is that specs never see that wiring.

### 2. Selectors live in exactly one place

Inside the component or page object that owns the UI. If a spec contains a CSS selector or even a `getByRole` call for an interaction, it's a leak. (Direct locator use in *assertions* is fine; see Rule 4 below for the nuance.)

```ts
// good — interaction goes through the object
await dashboardPage.openUserMenu();

// bad — spec knows the selector
await page.getByRole('button', { name: 'Open user menu' }).click();
```

**Failure mode without it:** a markup change breaks every spec that touched that element. Page objects exist precisely to absorb this churn.

### 3. Methods are user actions, not DOM operations

Page-object methods are named after what a user does. `signIn(user)`, `addToCart()`, `goToSettings()`. Not `clickLoginButton()` or `fillEmailField()`.

**Failure mode without it:** the page object is a thin wrapper around `.click()` that adds noise without adding meaning. Tests still read like DOM scripts.

### 4. Web-first assertions only

Every assertion that touches the page is `await expect(locator)...`. No `waitForTimeout`. No `await locator.isVisible()` inside an `if`. No race-prone polling.

```ts
// good — auto-retries until the condition is true or the timeout fires
await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

// bad — fixed sleep, racy
await page.waitForTimeout(1000);

// bad — one-shot read, not retried
expect(await page.getByRole('button').isVisible()).toBe(true);
```

**Failure mode without it:** flakes. Teams that call Playwright "flaky" have usually skipped this rule.

Direct `expect(locator)` in specs is encouraged for assertions, even though Rule 2 hides selectors for *interactions*. The split: page objects own how to *do* things; tests own what to *check*.

### 5. Tests are independent

Each test starts from scratch: a fresh browser context, no shared `beforeAll` data, no order dependencies. Any test passes when run alone, in any order, in parallel, on any worker.

**Failure mode without it:** the test that fails on CI is never the test with the bug. State leaks between tests turn a small problem into a debugging nightmare.

## How the Layers Compose

```
spec ──asks for──▶ fixture ──constructs──▶ page ──composes──▶ component ──owns──▶ Locator
                                  │
                                  └──wraps──▶ flow ──orchestrates──▶ multiple pages
```

- **Locator:** Playwright's lazy, auto-waiting reference to an element. Always prefer semantic locators (see `playwright-locators`).
- **Component:** a class rooted at a `Locator`. Owns the locators for one fragment of UI. Composes anywhere (see `playwright-components`).
- **Page:** composes components and exposes user actions. Optional but powerful (see `playwright-page-objects`).
- **Flow:** a plain `async (page, ...) => Promise<void>` for journeys that span pages (see `playwright-flows`).
- **Fixture:** the wiring layer for spec-visible objects. Provides components, pages, and flow wrappers to specs (see `playwright-fixtures`).

A spec stitches these together by name in its destructuring argument. That's the entire surface area a spec author needs.

## Worked Example

A complete checkout test under this convention. Read it as if you knew nothing about the suite.

```ts
// e2e/checkout.spec.ts
import { test, expect } from './fixtures';

test.describe('Checkout', () => {
  test('guest can complete a purchase @smoke', async ({
    page, productPage, cartPage, checkoutPage,
  }) => {
    await productPage.goto('sku-123');
    await productPage.addToCart();
    await expect(cartPage.itemCount).toHaveText('1');

    await cartPage.goto();
    await cartPage.checkout();

    await checkoutPage.fillShipping({ email: 'guest@test.dev', address: '123 Test St' });
    await checkoutPage.payWithCard('4242424242424242');

    await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible();
  });
});
```

You could read this aloud to a non-technical stakeholder and they would understand it. Aim for that level of clarity.

The selectors are gone. The waits are gone. The construction is gone. What's left is the user story.

## When to Add Each Layer

| You're about to write… | Layer |
|---|---|
| The same login sequence in a third spec | A flow |
| The same sidebar locators in a second page | A component |
| A page with five or more locators or any non-trivial state | A page object |
| Anything you'd otherwise construct twice | A fixture |
| A locator string in a spec | Stop. Move it into a component or page. |
| A `waitForTimeout` | Stop. Use a web-first assertion. |

**Don't pre-build empty layers.** Start with one spec using `page` directly, then promote to a component the second time you copy a locator. Promote to a page object when the page earns it. Premature abstraction is more painful than copy-paste.

## Configuration Essentials

The `playwright.config.ts` settings that earn their keep on day one:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? (process.env.PLAYWRIGHT_WORKERS ?? '50%') : undefined,
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

Two things to notice:

- `trace: 'on-first-retry'`: when something fails, you get a full trace automatically. No reproducing locally.
- `setup` project + `dependencies`: the auth handshake runs once before the suite (see `playwright-auth`).
- `PLAYWRIGHT_WORKERS`: lets CI turn parallelism down during diagnosis without baking single-worker execution into the suite.

## Cross-References

Each rule above has a dedicated skill that explains the mechanics, the edge cases, and the failure modes:

- Rule 1 (no construction in specs) → `playwright-fixtures`
- Rule 2 (selectors in one place) → `playwright-locators`, `playwright-components`, `playwright-page-objects`
- Rule 3 (action-named methods) → `playwright-page-objects`, `playwright-flows`
- Rule 4 (web-first assertions) → `playwright-assertions`
- Rule 5 (test independence) → `playwright-test-isolation`, `playwright-auth`

For controlling the upstream noise that causes the *fourth* class of flakes, see `playwright-network-mocking`.

For diagnosing a flake that slipped through and turning it into a permanent fix, see `playwright-reliability`.

## Anti-Patterns

| Anti-pattern | Failure mode | Fix |
|---|---|---|
| Specs instantiate pages/components directly | Constructor churn across many specs | Move spec-visible construction into `fixtures.ts` |
| Selector usage spread across specs | Refactor blast radius and brittle tests | Centralize selectors in page/component objects |
| Methods mirror DOM actions only (`clickX`) | Page objects add indirection but no abstraction | Expose user-intent methods (`signIn`, `goToSettings`) |
| `waitForTimeout` as synchronization | Timing flakes and CI-only failures | Use web-first assertions and locator auto-waiting |
| Shared mutable setup in `beforeAll` | Order-dependent and parallel-collision failures | Use test/worker-scoped fixtures with teardown |

## Validation

- Run `npx playwright test` on a spec that uses the new layout (or the project's test script). Expect a pass.
- Specs import `test` from `./fixtures`, not `@playwright/test`.
- No spec calls `new` for a page, component, or flow.

## Quick Quality Checklist

- Specs do not construct objects directly; fixtures own spec-visible wiring.
- No sleeps (`waitForTimeout`) used as synchronization.
- Locators are semantic first (`getByRole`/`getByLabel`) and centralized.
- Network behavior is intentional: mocked or explicitly integration-tagged.
- Changes include at least one reproducible command/example.
