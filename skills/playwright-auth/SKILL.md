---
name: playwright-auth
description: Use when setting up authentication for a Playwright suite, replacing per-test UI logins with a faster pattern, supporting multiple user roles in one suite, or handling OAuth/SSO. The storage-state pattern turns 30-second test setups into 10-millisecond ones and removes auth-related flakes.
---

# Playwright Authentication

If your tests log in through the UI on every run, your suite pays a tax of 5–30 seconds per test. Across 200 tests that wastes an hour per CI run, and every login is another chance to flake.

To fix this, use the **storage-state pattern**: log in once, persist the resulting cookies and `localStorage`, then reuse them across every test. With a setup project and project dependencies it's a five-minute change that pays off on every CI run after.

## The Pattern

Three moving parts:

1. **A setup project** that runs once before the suite and produces a `storageState` file.
2. **A real project** (chromium, firefox, etc.) that depends on the setup project and loads the storage state into every browser context.
3. **A login flow** that the setup project uses (and that other tests can also use directly when they're testing the login UI itself).

```
playwright/.auth/
  user.json          ← produced by setup, loaded by the project
e2e/
  auth.setup.ts      ← the setup project
  flows/login.ts     ← the reusable login flow
  fixtures.ts
  *.spec.ts
```

## Setup File

```ts
// e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test';
import { login } from './flows/login';

const authFile = 'playwright/.auth/user.json';

setup('authenticate default user', async ({ page }) => {
  await login(page, {
    email:    process.env.TEST_EMAIL!,
    password: process.env.TEST_PASSWORD!,
  });
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.context().storageState({ path: authFile });
});
```

The setup file imports the same `login` flow used elsewhere, a single source of truth for "how to log in" (see `playwright-flows`).

## Config Wiring

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
```

`dependencies: ['setup']` makes the setup project run first; if it fails, dependent projects are skipped. The dependent project's tests now start with the user already authenticated.

Add `playwright/.auth/` to `.gitignore`. These files contain real session credentials. If the state only needs to live for one run, put it under the project's `outputDir` so Playwright cleans it automatically.

## Per-Test, From Logged-In

A test in the dependent project can navigate straight to authenticated routes without logging in:

```ts
test('user can view their dashboard', async ({ page }) => {
  await page.goto('/dashboard');
  // Already logged in — no UI login needed
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
```

## Multiple Roles

For suites that need both admin and regular-user perspectives, produce one storage file per role:

```ts
// e2e/auth.setup.ts
setup('admin auth', async ({ page }) => {
  await login(page, { email: 'admin@test.dev', password: process.env.ADMIN_PW! });
  await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible();
  await page.context().storageState({ path: 'playwright/.auth/admin.json' });
});

setup('user auth', async ({ page }) => {
  await login(page, { email: 'user@test.dev', password: process.env.USER_PW! });
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.context().storageState({ path: 'playwright/.auth/user.json' });
});
```

```ts
// playwright.config.ts
projects: [
  { name: 'setup', testMatch: /.*\.setup\.ts/ },
  {
    name: 'admin tests',
    testMatch: /.*admin.*\.spec\.ts/,
    use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/admin.json' },
    dependencies: ['setup'],
  },
  {
    name: 'user tests',
    testMatch: /.*user.*\.spec\.ts/,
    use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
    dependencies: ['setup'],
  },
],
```

Naming convention: file paths route specs to the right role. `admin/dashboard.spec.ts` runs in the admin project; `user/dashboard.spec.ts` runs in the user project.

## Mixed-Auth Tests in One Spec

Sometimes a single test needs two contexts at once: admin and user. Load each storage file into a fresh context via fixtures:

```ts
// e2e/fixtures.ts (excerpt)
adminPage: async ({ browser }, use) => {
  const ctx = await browser.newContext({ storageState: 'playwright/.auth/admin.json' });
  const page = await ctx.newPage();
  await use(page);
  await ctx.close();
},

userPage: async ({ browser }, use) => {
  const ctx = await browser.newContext({ storageState: 'playwright/.auth/user.json' });
  const page = await ctx.newPage();
  await use(page);
  await ctx.close();
},

anonymousPage: async ({ browser }, use) => {
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await ctx.newPage();
  await use(page);
  await ctx.close();
},
```

```ts
test('admin sees a request that the user sent', async ({ adminPage, userPage }) => {
  await userPage.goto('/help/new');
  await userPage.getByLabel('Subject').fill('Need help');
  await userPage.getByRole('button', { name: 'Submit' }).click();

  await adminPage.goto('/admin/requests');
  await expect(adminPage.getByRole('row', { name: /Need help/ })).toBeVisible();
});
```

## API-Level Login (Faster, Where Possible)

The UI login is necessary for *testing* the login UI. For *every other test*, the UI login is overhead. Two ways to skip even further:

### Option A: API login in setup

If your auth endpoint is reachable directly:

```ts
setup('authenticate via API', async ({ request }) => {
  const res = await request.post('/api/login', {
    data: { email: 'user@test.dev', password: 'pw' },
  });
  expect(res.ok()).toBeTruthy();

  // Save state — Playwright captures cookies set by the response
  await request.storageState({ path: 'playwright/.auth/user.json' });
});
```

This skips the browser entirely. Many auth implementations support this; OAuth/SSO usually doesn't.

### Option B: Programmatic token injection

If your app stores a JWT in `localStorage`, inject it directly:

```ts
setup('inject auth token', async ({ page }) => {
  const token = await fetchToken({ email: 'user@test.dev', password: 'pw' });
  await page.context().addInitScript(([t]) => {
    window.localStorage.setItem('auth_token', t);
  }, [token]);
  await page.goto('/');
  await page.context().storageState({ path: 'playwright/.auth/user.json' });
});
```

This bypasses the login form entirely. It's faster and less brittle, but only works if your auth doesn't rely on httpOnly cookies set by the server.

## OAuth / SSO

Logging into a third-party identity provider via Playwright is fragile and slow. Two strategies:

1. **Use the IdP's API for token issuance.** Most providers (Auth0, Okta, Cognito) have a way to mint a token in CI without interactive login. Use that in setup.
2. **Mock the IdP entirely.** For the bulk of your suite that doesn't test the IdP itself, intercept the IdP redirect in `page.route()` and return a canned token. See `playwright-network-mocking`.

Don't try to script through Google or Microsoft login UIs. They defeat automation and change frequently, and they impose rate limits that will block you.

## Refreshing Storage State

Storage state can expire. Two approaches:

- **Re-run setup on every CI run.** Cheapest mental model; storage is always fresh. Run setup unconditionally.
- **Cache between runs with a TTL.** Skip setup if `playwright/.auth/user.json` exists and is younger than, say, 30 minutes. Worth it only for very large suites.

If a test fails with "redirected to /login," your storage state has expired. Re-run setup.

## Anti-Patterns

| Anti-pattern | Why it's wrong | Fix |
|---|---|---|
| Logging in via UI in every test | Slow, flaky, wasted CI minutes | Storage state + setup project |
| Hardcoded credentials in spec files | Leaks to repo, can't rotate | Environment variables |
| Storing storage state in git | Real session tokens | `.gitignore` and re-run setup on CI |
| Sharing a single auth file across roles | Tests use the wrong role | One storage file per role; per-project routing |
| `beforeAll` to log in (no setup project) | State leaks between tests, no parallelism | Setup project with `dependencies` |
| Logging into Google/Microsoft via Playwright | They block automation | Use the IdP's test API or mock the redirect |
| Re-running login per test "for safety" | Storage state already isolated per context | Trust the pattern; re-run setup if it expires |
| Storage state for an unauthenticated test | Test runs as a logged-in user accidentally | `test.use({ storageState: { cookies: [], origins: [] } })` or a fresh context with empty storage state |

## Cross-References

- The login flow that backs setup and ad-hoc UI login tests: `playwright-flows`.
- The fixtures that provide per-role pages: `playwright-fixtures`.
- Mocking an OAuth/SSO provider: `playwright-network-mocking`.
- Why this pattern is also a test-isolation win: `playwright-test-isolation`.

## Quick Quality Checklist

- Specs do not construct objects directly; fixtures own spec-visible wiring.
- No sleeps (`waitForTimeout`) used as synchronization.
- Locators are semantic first (`getByRole`/`getByLabel`) and centralized.
- Network behavior is intentional: mocked or explicitly integration-tagged.
- Changes include at least one reproducible command/example.
