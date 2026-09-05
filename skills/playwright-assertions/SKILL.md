---
name: playwright-assertions
description: >-
  Establishes web-first Playwright assertions so timing flakes disappear. Use
  this skill when writing assertions, replacing waitForTimeout or sleeps,
  polling non-UI conditions, or asserting on URLs, network, or state. Do not
  use for flake root-cause triage (playwright-reliability) or locator choice
  (playwright-locators).
---

# Playwright Assertions & Waiting

One rule prevents most flakes: **every assertion that touches the page is `await expect(locator)…`**. No sleeps, no manual polling, no fixed-delay waits.

This skill covers the model, the catalogue, and the legitimate cases where you do need to poll something with the right tool.

## Critical rules

- Page assertions are `await expect(locator)...`. Never `waitForTimeout`. Never `await locator.isVisible()` inside an `if`.
- For non-locator conditions, use `expect.poll` (or `toPass`), not a sleep.
- Auto-wait fixes fail-too-early, not pass-too-early. Absence, hidden, and substring checks settle the moment they first hold — including before the app has done anything.

## Workflow

1. Doctor the consuming repo: find existing `expect` import (from fixtures vs `@playwright/test`) and any `waitForTimeout`.
2. Replace sleeps and snapshot reads with web-first matchers from the catalogue below.
3. Validate with `npx playwright test` on the focused spec. Re-run with `--repeat-each=5` if the original failure was a flake.

## The Mental Model

Playwright has three timing mechanisms. Use them in this order:

1. **Auto-waiting actions**: `click`, `fill`, `press`, etc. wait for the element to be attached, visible, stable, enabled, and ready to receive events. You don't add waits before actions.
2. **Web-first assertions**: `await expect(locator)…` retries the assertion until it passes or the timeout fires. This is how you "wait for" UI conditions.
3. **`expect.poll`**: for asserting on values that aren't locators (API responses, DB rows, computed state). Retries the function until the assertion holds.

`waitForTimeout` is not on this list, because it is not a synchronization primitive. Use it only for temporary local debugging, never as a committed test wait.

## Web-First Assertions

These auto-retry. They're the foundation.

### Visibility, presence, count

```ts
await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
await expect(page.getByRole('button', { name: 'Submit' })).toBeHidden();
await expect(page.getByRole('alert')).not.toBeVisible();

await expect(page.getByRole('listitem')).toHaveCount(5);
await expect(page.getByRole('listitem')).toHaveCount(0);   // empty list
```

Absence assertions settle on the first tick where the element is missing — including every tick before the page has rendered it. Wait for a positive landmark that renders in the same pass, then assert absence:

```ts
await expect(page.getByText('Approved')).toBeVisible();                    // landmark
await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0);   // now meaningful
```

`not.toBeVisible()` and `toHaveCount(0)` share the race; swapping one for the other fixes nothing.

### State

```ts
await expect(page.getByRole('button', { name: 'Submit' })).toBeEnabled();
await expect(page.getByRole('button', { name: 'Submit' })).toBeDisabled();
await expect(page.getByRole('checkbox', { name: 'Agree' })).toBeChecked();
await expect(page.getByLabel('Email')).toBeFocused();
await expect(page.getByLabel('Email')).toBeEditable();
await expect(page.getByLabel('Search')).toBeEmpty();
```

### Content

```ts
await expect(page.getByRole('heading')).toHaveText('Welcome');
await expect(page.getByRole('heading')).toHaveText(/welcome/i);
await expect(page.getByRole('heading')).toContainText('Welcome');

await expect(page.getByLabel('Email')).toHaveValue('user@test.dev');

await expect(page.getByRole('listitem')).toHaveText(['Apple', 'Banana', 'Cherry']);
```

A one-shot `innerText()` plus static `expect` is a snapshot. `toContain` is the usual false green: the stale text already holds the substring.

```ts
// stale — "Order #1" is on screen before it becomes "Order #1 — paid"
expect(await page.getByRole('paragraph').innerText()).toContain('Order #1');

await expect(page.getByRole('paragraph')).toHaveText('Order #1 — paid');
```

### Attributes & CSS

```ts
await expect(page.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
await expect(page.getByRole('button')).toHaveClass(/primary/);
await expect(page.getByRole('button')).toHaveCSS('color', 'rgb(0, 0, 255)');
```

### Page-level

```ts
await expect(page).toHaveURL('/dashboard');
await expect(page).toHaveURL(/\/dashboard/);
await expect(page).toHaveTitle('Dashboard — Acme');
```

### Response

```ts
const response = await page.request.get('/api/users');
await expect(response).toBeOK();
```

## Auto-Waiting Actions

These already wait. Don't put assertions or sleeps in front of them.

```ts
await page.getByRole('button', { name: 'Submit' }).click();
//   ^^^^^^^ already waits for: attached, visible, stable, enabled, receives events

// You don't need this:
// await expect(page.getByRole('button')).toBeVisible();   ← redundant
// await page.waitForTimeout(500);                          ← not synchronization
// await page.getByRole('button').click();
```

The exception: when you want to *assert* the button is visible as a checkpoint before interacting (e.g. test readability, or you're debugging a race), the assertion is fine. It is not required for correctness.

## `expect.poll` for Non-Locator Waits

When the thing you're waiting on isn't a `Locator`, use `expect.poll`. It re-runs your function until the assertion passes or the timeout fires.

```ts
// Wait until the API reports the order exists
await expect.poll(
  async () => (await api.getOrders(userId)).length,
  { timeout: 5_000, intervals: [200, 500, 1_000] }
).toBe(1);

// Wait until a computed value matches
await expect.poll(() => store.cart.itemCount).toBe(3);
```

Use this for: API state, database rows, in-memory app state, anything outside the page's DOM.

## When You Genuinely Need to Wait for Something Specific

### Wait for a URL change

```ts
await page.waitForURL('**/dashboard');
await page.waitForURL(/\/dashboard$/);

// Action + wait, without race
const navigation = page.waitForURL('**/dashboard');
await page.getByRole('button', { name: 'Continue' }).click();
await navigation;
```

### Wait for a specific network response

```ts
const responsePromise = page.waitForResponse(
  resp => resp.url().includes('/api/orders') && resp.status() === 200
);
await page.getByRole('button', { name: 'Place order' }).click();
const response = await responsePromise;
expect(await response.json()).toMatchObject({ id: expect.any(String) });
```

Always set up `waitFor*` *before* triggering the action, otherwise you're racing. When the rendered output does not change (same names after a sort, same count after a filter), the response *is* the done signal. Follow it with a matcher for the DOM write after `json()`:

```ts
const sorted = page.waitForResponse((r) => r.url().includes('/api/rows?sort=date'));
await page.getByRole('button', { name: 'Sort by date' }).click();
await sorted;
await expect(page.getByRole('list')).toHaveAttribute('data-sort', 'date');
```

### Wait for an element to disappear

`toBeHidden()` is already true of a spinner that never started. Assert it appears, then that it clears:

```ts
await expect(page.getByRole('status')).toBeVisible();
await expect(page.getByRole('status')).toBeHidden();
```

## Soft Assertions

For checks where you want to see *all* the failures in one run rather than stopping at the first.

```ts
test('dashboard widgets render', async ({ dashboardPage }) => {
  await dashboardPage.goto();
  await expect.soft(dashboardPage.salesWidget).toBeVisible();
  await expect.soft(dashboardPage.usersWidget).toBeVisible();
  await expect.soft(dashboardPage.activityWidget).toBeVisible();
  // All three checked; failures collated at the end
});
```

Use sparingly. If three things must all be true, three hard assertions are usually clearer.

## Custom Matchers

When you find yourself repeating an assertion shape across many tests, extend `expect`:

```ts
// e2e/matchers.ts
import { expect as baseExpect } from '@playwright/test';
import type { Page } from '@playwright/test';

export const expect = baseExpect.extend({
  async toBeOnDashboard(page: Page) {
    const heading = page.getByRole('heading', { name: 'Dashboard' });
    try {
      await baseExpect(heading).toBeVisible();
      return { pass: true, message: () => 'on dashboard' };
    } catch {
      return { pass: false, message: () => 'not on dashboard' };
    }
  },
});

// usage
await expect(page).toBeOnDashboard();
```

Re-export `expect` from your fixtures file (see `playwright-fixtures`) so specs always import the extended version.

## Configuring Timeouts

Don't reach for global timeout bumps to fix flakes; fix the flake. But for genuinely slow operations:

```ts
// playwright.config.ts
export default defineConfig({
  expect: {
    timeout: 5_000,            // default per-assertion timeout
  },
  timeout: 30_000,             // per-test timeout
});

// per-assertion override
await expect(page.getByText('Slow report')).toBeVisible({ timeout: 30_000 });
```

If you're frequently overriding timeouts, the right answer is usually network mocking (see `playwright-network-mocking`) or a more targeted assertion, not a longer wait.

## Anti-Patterns

| Anti-pattern | Why it's wrong | Fix |
|---|---|---|
| `await page.waitForTimeout(1000)` | Fixed sleep: slow when nothing's happening, racy when things are slow | `await expect(locator).toBeVisible()` |
| `expect(await locator.isVisible()).toBe(true)` | One-shot read, not retried | `await expect(locator).toBeVisible()` |
| `expect(await locator.innerText()).toContain(...)` | Snapshot; the substring is often already true of the stale DOM | `await expect(locator).toHaveText(...)` |
| `toHaveCount(0)` / `not.toBeVisible()` right after `goto` | Condition is true of the unrendered page | Wait for a same-pass landmark, then assert absence |
| `toBeHidden()` as the only check after a silent action | Never-started is also hidden | Assert busy/`status` appears, then clears |
| `if (await locator.isVisible()) { ... }` | Branch on a racy snapshot | Restructure: assert the precondition or use `count() > 0` only when truly conditional |
| `await page.waitForLoadState('networkidle')` | Vague, slow, often never fires with WebSockets | Wait for the *specific* thing you need with `waitForResponse` or an assertion |
| `await page.waitForSelector('.foo')` | Old API, encourages CSS selectors | `await expect(page.getByRole(...)).toBeVisible()` |
| Bumping `expect.timeout` to fix a flake | Hides the cause; suite gets slower | Find the real wait condition or mock the network |
| `page.waitForTimeout` "to let animations finish" | Animations should be disabled in tests | `animations: 'disabled'` in screenshot opts; `prefers-reduced-motion` in config |

## A Small Discipline

Every time you're about to type `waitForTimeout`, stop and ask: *what am I actually waiting for?* The answer is one of:

- An element to appear → `toBeVisible`
- An element to disappear → `toBeHidden`
- A URL change → `waitForURL`
- A network response → `waitForResponse`
- A non-DOM value → `expect.poll`

There is always a right tool. `waitForTimeout` does not wait for a condition; it guesses at a duration.

## Cross-References

- For the locators these assertions consume, see `playwright-locators`.
- For controlling network timing so you don't *need* to wait long, see `playwright-network-mocking`.
- For the broader flake diagnostic, see `playwright-reliability`.

## Validation

- Run `npx playwright test` on the focused spec. Expect a pass.
- The changed spec has no `waitForTimeout` and no snapshot `isVisible()` used as a wait.
