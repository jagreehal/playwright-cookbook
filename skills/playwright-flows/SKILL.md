---
name: playwright-flows
description: Use when modelling user journeys that span multiple pages (login, signup, checkout, onboarding), when the same multi-step sequence is needed in many specs, or when deciding whether a sequence belongs in a page object vs a flow. Plain async functions with one job: orchestrate the journey and leave the assertions to the spec.
---

# Playwright Flows

A flow is a plain async function that walks a user through a multi-page journey. Login, signup, checkout, "create project then invite teammate." Flows live alongside pages and components rather than inside them, so they don't couple unrelated parts of the UI.

## What a Flow Is

```ts
// e2e/flows/login.ts
import type { Page } from '@playwright/test';

export async function login(
  page: Page,
  user: { email: string; password: string },
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}
```

Three properties define a flow:

1. **It's a plain async function**, not a class. Takes `page` and any data it needs. Returns `Promise<void>` (or, occasionally, a useful summary like a created entity's id — or the page object it lands on, for a single-destination flow like login→dashboard; see the note on the anti-pattern below).
2. **It spans multiple pages.** If it stays on one page, it's a page-object method, not a flow.
3. **It contains no `expect()` calls.** Flows orchestrate; specs assert. (One exception below.)

## When to Use a Flow vs. a Page-Object Method

| The sequence… | Lives where |
|---|---|
| Stays on one page | Page-object method |
| Crosses two or more pages | Flow |
| Is a single click or fill | Don't extract it; use the locator |
| Is a precondition for many tests | Flow, wrapped in a fixture |

**Rule of thumb:** if a journey involves `goto`, `waitForURL`, or the user landing somewhere new, it's a flow.

## Wrap Flows in Fixtures

A flow on its own is just a function. Wrap it in a fixture so specs request it without importing it directly.

```ts
// e2e/fixtures.ts (excerpt)
import { login } from './flows/login';

export const test = base.extend<Fixtures>({
  defaultUser: [{ email: 'user@test.dev', password: 'pw' }, { option: true }],

  loginAsDefaultUser: async ({ page, defaultUser }, use) => {
    await use(async () => { await login(page, defaultUser); });
  },

  loginAsAdmin: async ({ page }, use) => {
    await use(async () => {
      await login(page, { email: 'admin@test.dev', password: process.env.ADMIN_PW! });
    });
  },
});
```

The spec asks for the flow it needs:

```ts
test('admin sees the audit log', async ({ loginAsAdmin, page }) => {
  await loginAsAdmin();
  await page.goto('/audit');
  await expect(page.getByRole('heading', { name: 'Audit log' })).toBeVisible();
});
```

The spec doesn't know the flow exists as a function. It only knows there's a `loginAsAdmin` fixture. That's the right level of abstraction.

## The Journey-Not-Click Rule

Flows model **what a user is trying to accomplish across pages**. They're not a dumping ground for shared interactions.

```ts
// good — a journey
flows/
├── login.ts
├── signup.ts
├── createProject.ts
└── checkoutAsGuest.ts

// bad — these are component or page-object methods, not flows
flows/
├── clickSave.ts          ← belongs on a component
├── openModal.ts          ← belongs on a page or component
├── fillEmailField.ts     ← belongs on a page
└── selectFirstResult.ts  ← belongs on a page
```

The smell: if a flow is one or two lines of UI interaction with no navigation, it's not a flow. Move it.

## Authentication: Use a Flow, Then Replace It With Storage State

The login flow is the most common flow you'll write. But running it through the UI in every test is slow. The convention:

1. Write `login` as a flow once.
2. Use it in your auth setup project to produce a `storageState`.
3. Tests that need a logged-in user pick up the storage state automatically, with no UI login per test.
4. Keep the flow around; some tests genuinely need to test the login UI itself.

```ts
// e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test';
import { login } from './flows/login';

setup('authenticate default user', async ({ page }) => {
  await login(page, {
    email: process.env.TEST_EMAIL!,
    password: process.env.TEST_PASSWORD!,
  });
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.context().storageState({ path: 'playwright/.auth/user.json' });
});
```

This is the only place a flow contains an `expect()`: to verify the precondition that the next steps depend on. See `playwright-auth` for the full pattern.

## Returning Useful Data

Most flows return `void`. When a flow creates an entity that subsequent steps need, return it.

```ts
// e2e/flows/createProject.ts
import type { Page } from '@playwright/test';

export async function createProject(
  page: Page,
  data: { name: string; visibility: 'private' | 'public' },
): Promise<{ id: string; url: string }> {
  await page.goto('/projects/new');
  await page.getByLabel('Project name').fill(data.name);
  await page.getByRole('radio', { name: data.visibility }).check();
  await page.getByRole('button', { name: 'Create' }).click();
  await page.waitForURL(/\/projects\/[\w-]+$/);

  const url = page.url();
  const id  = url.split('/').pop()!;
  return { id, url };
}
```

This is judgement: don't return data the spec doesn't need. If the spec just navigates to the project after, returning `void` and using `page.url()` in the spec is fine too.

## Chaining Flows

Compose flows by calling them. The composing function is itself a flow.

```ts
// e2e/flows/onboardNewTeam.ts
import { signup } from './signup';
import { createProject } from './createProject';
import { inviteTeammate } from './inviteTeammate';

export async function onboardNewTeam(
  page: Page,
  data: { admin: User; teamName: string; teammate: User },
) {
  await signup(page, data.admin);
  const project = await createProject(page, { name: data.teamName, visibility: 'private' });
  await inviteTeammate(page, data.teammate.email);
  return project;
}
```

If a fixture is the right place to expose `onboardNewTeam`, wrap it. Otherwise specs can import it directly, though fixtures are preferred.

## Network Considerations

Flows that traverse many pages are the most common source of network-related flakes. Two patterns help:

- **Wait for the right thing.** `await page.waitForURL(...)` instead of `waitForLoadState('networkidle')`. The URL change is precise; network idle is vague.
- **Mock the upstream.** A login flow that depends on an external auth provider should mock the provider. See `playwright-network-mocking`.

## Anti-Patterns

| Anti-pattern | Why it's wrong | Fix |
|---|---|---|
| Flow with an `expect()` in the middle | Mixes orchestration with verification | Move the assertion to the spec, or use `waitForURL` to gate progress |
| Flow that doesn't navigate | Misuses the layer | Move to a component or page-object method |
| Login implemented inline in five different specs | Duplication, drift | One `login` flow, used everywhere |
| Flow as a class with state | Flows are stateless functions | If you need state, you want a page object |
| Flow that takes no arguments and uses a hardcoded user | Can't reuse for other roles | Take a `user` parameter; provide defaults via fixture options |
| `flows/clickSave.ts` | Single click is not a journey | Use the locator or roll into a real action |
| A *multi-destination* flow returning one page object | Couples a journey to one page's construction | Return data; let the fixture provide page objects |

**Single-destination flows are the exception.** A flow that always lands the user on one known page (login → dashboard, checkout → confirmation) may return that page object so the spec asserts through it instead of re-deriving raw locators (which would violate `playwright-architecture` Rule 2). This matches `playwright-page-objects`, where navigation methods return the next page object. The anti-pattern is a *branching, multi-page* journey hard-wiring itself to one page's constructor — there, return data and let a fixture hand back the page object.

## A Worked Example

```ts
// e2e/billing.spec.ts
import { test, expect } from './fixtures';

test('paid user sees billing details on first login', async ({
  page, loginAsPaidUser, billingPage,
}) => {
  await loginAsPaidUser();
  await billingPage.goto();

  await expect(billingPage.planName).toHaveText('Pro');
  await expect(billingPage.nextInvoiceDate).toBeVisible();
});
```

The spec asks for a logged-in paid user (via a flow-backed fixture), navigates to billing (via a page object), and asserts on what the user sees. The test reads as intent, with no waits and no manual construction.

## Cross-References

- The architectural rule that says specs don't import flows directly: `playwright-architecture`.
- The fixture wrapping that makes flows ergonomic: `playwright-fixtures`.
- Auth as the canonical flow + storage-state pattern: `playwright-auth`.
- Mocking upstream services so flows are deterministic: `playwright-network-mocking`.

## Quick Quality Checklist

- Specs do not construct objects directly; fixtures own spec-visible wiring.
- No sleeps (`waitForTimeout`) used as synchronization.
- Locators are semantic first (`getByRole`/`getByLabel`) and centralized.
- Network behavior is intentional: mocked or explicitly integration-tagged.
- Changes include at least one reproducible command/example.
