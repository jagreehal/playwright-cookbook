---
name: playwright-fixtures
description: Use when designing the fixtures.ts file for a Playwright suite, deciding between test-scoped and worker-scoped fixtures, composing fixtures together, providing options with defaults, or wiring page objects, components, and flows into specs. The DI layer that lets specs read like user stories.
---

# Playwright Fixtures

Fixtures are Playwright's dependency-injection mechanism, and the most important architectural feature in the framework. They let specs declare what they need rather than constructing it, and they handle setup and teardown automatically.

In this convention, `fixtures.ts` is the composition root for anything a spec can request. Specs never call `new`; fixtures construct spec-visible pages, components, and flow wrappers. Page objects can still construct private child components they own.

## The Shape

```ts
// e2e/fixtures.ts
import { test as base, expect } from '@playwright/test';
import { LoginPage }      from './pages/LoginPage';
import { DashboardPage }  from './pages/DashboardPage';
import { Sidebar }        from './components/Sidebar';
import { UserTable }      from './components/UserTable';
import { login }          from './flows/login';

type User = { email: string; password: string };

type Fixtures = {
  // Options (configurable, with defaults)
  defaultUser: User;

  // Components
  sidebar:   Sidebar;
  userTable: UserTable;

  // Pages
  loginPage:     LoginPage;
  dashboardPage: DashboardPage;

  // Flows (as callable fixtures)
  loginAsDefaultUser: () => Promise<void>;
};

export const test = base.extend<Fixtures>({
  defaultUser: [{ email: 'user@test.dev', password: 'pw' }, { option: true }],

  sidebar:       async ({ page }, use) => use(new Sidebar(page)),
  userTable:     async ({ page }, use) => use(new UserTable(page)),

  loginPage:     async ({ page }, use) => use(new LoginPage(page)),
  dashboardPage: async ({ page }, use) => use(new DashboardPage(page)),

  loginAsDefaultUser: async ({ page, defaultUser }, use) => {
    await use(async () => { await login(page, defaultUser); });
  },
});

export { expect };
```

Specs import `test` and `expect` from this file, never from `@playwright/test`:

```ts
// e2e/dashboard.spec.ts
import { test, expect } from './fixtures';

test('navigating to settings', async ({ dashboardPage, sidebar }) => {
  await dashboardPage.goto();
  await sidebar.goTo('Settings');
  await expect(sidebar.activeLinkName()).resolves.toBe('Settings');
});
```

This re-export is small but matters: if you add a custom matcher to `expect`, every spec gets it without changing imports.

## How Fixtures Work

Three things to know:

1. **Lazy.** A fixture only runs when a test asks for it. Listing 30 fixtures has zero cost for tests that use two of them.
2. **Per-test by default.** Every test gets a fresh instance.
3. **Composable.** A fixture can ask for other fixtures, which are built in dependency order.

```ts
// dashboardPage depends on page (built-in) AND sidebar
dashboardPage: async ({ page, sidebar }, use) => {
  await use(new DashboardPage(page, sidebar));
},
```

When a spec asks for `dashboardPage`, Playwright builds `page`, then `sidebar`, then `dashboardPage`, all automatically.

## Setup and Teardown

The `await use(value)` line is where the test runs. Code before it is setup; code after it is teardown.

```ts
seededTodos: async ({ page }, use) => {
  // Setup
  const todos = await api.seedTodos({ count: 5 });
  await page.goto('/todos');

  // Test runs
  await use(todos);

  // Teardown
  await api.deleteTodos(todos.map(t => t.id));
},
```

For async resources (database connections, API clients) this guarantees cleanup even when the test fails.

## Scopes: Test vs Worker

| Scope | Lifetime | Use for |
|---|---|---|
| `test` (default) | Fresh per test | Page objects, components, per-test data, anything cheap to construct |
| `worker` | One per worker process | Expensive setup that's safely shareable: API clients, seeded read-only data, per-worker user accounts |

```ts
// Worker-scoped: built once per worker, shared across that worker's tests
type WorkerFixtures = { apiClient: ApiClient };

export const test = base.extend<Fixtures, WorkerFixtures>({
  apiClient: [
    async ({}, use) => {
      const client = await ApiClient.connect(process.env.API_URL!);
      await use(client);
      await client.disconnect();
    },
    { scope: 'worker' },
  ],
});
```

**The trap:** worker-scoped fixtures must produce **isolated** data. If two parallel workers seed the same user record, they collide. Use `testInfo.workerIndex` for throwaway per-worker data, or `testInfo.parallelIndex` for stable per-lane data that should survive a worker restart:

```ts
type WorkerFixtures = { testUser: { email: string; id: string } };

export const test = base.extend<Fixtures, WorkerFixtures>({
  testUser: [
    async ({}, use, testInfo) => {
      const email = `user-${testInfo.workerIndex}@test.dev`;
      const user  = await api.createUser({ email });
      await use(user);
      await api.deleteUser(user.id);
    },
    { scope: 'worker' },
  ],
});
```

See `playwright-test-isolation` for the full isolation discipline.

## Options: Configurable Defaults

Options are fixtures with default values that can be overridden per project or per test.

```ts
type Options = {
  defaultUser: User;
  baseURL: string;
};

export const test = base.extend<Options & Fixtures>({
  defaultUser: [
    { email: 'user@test.dev', password: 'pw' },
    { option: true },                          // ← marks it as an option
  ],
});
```

Override globally in config:

```ts
// playwright.config.ts
export default defineConfig({
  use: {
    defaultUser: { email: 'admin@test.dev', password: process.env.ADMIN_PW! },
  },
});
```

Override per-project:

```ts
projects: [
  { name: 'as-admin', use: { defaultUser: { email: 'admin@test.dev', password: 'a' } } },
  { name: 'as-user',  use: { defaultUser: { email: 'user@test.dev',  password: 'u' } } },
],
```

Override per-test:

```ts
test.use({ defaultUser: { email: 'special@test.dev', password: 'pw' } });
test('special user can do thing', async ({ loginAsDefaultUser }) => { ... });
```

## Composing Flows: Callable Fixtures

A flow function becomes a fixture by wrapping it in a callable closure:

```ts
loginAsDefaultUser: async ({ page, defaultUser }, use) => {
  await use(async () => { await login(page, defaultUser); });
},

createProject: async ({ page }, use) => {
  await use(async (data: ProjectData) => { return createProjectFlow(page, data); });
},
```

The fixture's value is a function. The spec calls it with whatever arguments the flow needs.

```ts
test('user can create a project', async ({ loginAsDefaultUser, createProject }) => {
  await loginAsDefaultUser();
  const project = await createProject({ name: 'Apollo', visibility: 'private' });
  await expect(page.url()).toBe(project.url);
});
```

## Auto-Fixtures (Use Sparingly)

An auto-fixture runs for every test in scope, whether requested or not.

```ts
captureConsoleErrors: [
  async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await use();
    if (errors.length) throw new Error(`Console errors: ${errors.join('\n')}`);
  },
  { auto: true },
],
```

Useful for cross-cutting checks (no console errors, no failed network requests, accessibility scan after each test). Don't use them for setup that only some tests need; those should be opt-in fixtures.

## Auth as a Fixture

When you've followed `playwright-auth` and have a `storageState` from a setup project, you don't need a per-test login fixture for the default user, because every test in that project starts logged in. You'd then have fixtures for *other* roles:

```ts
adminPage: async ({ browser }, use) => {
  const context = await browser.newContext({ storageState: 'playwright/.auth/admin.json' });
  const page = await context.newPage();
  await use(page);
  await context.close();
},

anonymousPage: async ({ browser }, use) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await use(page);
  await context.close();
},
```

This is the cleanest way to mix authenticated and unauthenticated tests in one suite.

## Anti-Patterns

| Anti-pattern | Why it's wrong | Fix |
|---|---|---|
| `new LoginPage(page)` in specs | Construction in specs (Architecture Rule 1) | Provide via fixture |
| Importing `test` from `@playwright/test` in specs | Bypasses fixtures and custom matchers | Always import from `./fixtures` |
| Heavy setup in test-scoped fixtures | Slow suite | Move to worker scope; use `workerIndex` for isolation |
| Worker-scoped fixture with shared mutable data | Parallel workers collide | Use `testInfo.workerIndex` or `testInfo.parallelIndex` to make data unique |
| Auto-fixture used as a setup for some tests | Hidden coupling, hard to debug | Make it opt-in by removing `{ auto: true }` |
| `beforeAll` to log in or seed data | Leaks state between tests | Fixture (worker-scoped if expensive) + storage state for auth |
| Returning the `page` from a fixture you constructed | Confuses ownership | Either reuse the built-in `page` or create a new context and give back the page from that |
| Fixture that calls `expect()` for setup verification | Failure trace points at the fixture, not the test | Use `waitForURL` or assertion-free preconditions; let the test assert |

## A Worked Fixtures File

A complete, real fixtures file for a small suite:

```ts
// e2e/fixtures.ts
import { test as base, expect } from '@playwright/test';
import { LoginPage }      from './pages/LoginPage';
import { DashboardPage }  from './pages/DashboardPage';
import { SettingsPage }   from './pages/SettingsPage';
import { Sidebar }        from './components/Sidebar';
import { Header }         from './components/Header';
import { Modal }          from './components/Modal';
import { login }          from './flows/login';

type User = { email: string; password: string };

type Options = {
  defaultUser: User;
};

type Fixtures = {
  sidebar: Sidebar;
  header:  Header;

  loginPage:     LoginPage;
  dashboardPage: DashboardPage;
  settingsPage:  SettingsPage;

  confirmModal: Modal;

  loginAsDefaultUser: () => Promise<void>;
};

export const test = base.extend<Options & Fixtures>({
  defaultUser: [{ email: 'user@test.dev', password: 'pw' }, { option: true }],

  sidebar:        async ({ page }, use) => use(new Sidebar(page)),
  header:         async ({ page }, use) => use(new Header(page)),

  loginPage:      async ({ page }, use) => use(new LoginPage(page)),
  dashboardPage:  async ({ page }, use) => use(new DashboardPage(page)),
  settingsPage:   async ({ page }, use) => use(new SettingsPage(page)),

  confirmModal:   async ({ page }, use) =>
    use(new Modal(page.getByRole('dialog', { name: /confirm/i }))),

  loginAsDefaultUser: async ({ page, defaultUser }, use) => {
    await use(async () => { await login(page, defaultUser); });
  },
});

export { expect };
```

Read top to bottom: types describe the surface, the body describes how each is built. A new contributor can scan this in a minute and know exactly what's available.

## Cross-References

- The rule that fixtures own spec-visible construction: `playwright-architecture`.
- The page objects fixtures provide: `playwright-page-objects`.
- The components fixtures provide: `playwright-components`.
- The flows fixtures wrap: `playwright-flows`.
- Auth via storage state, which removes the need for per-test login fixtures: `playwright-auth`.
- Worker-scoped data isolation: `playwright-test-isolation`.

## Quick Quality Checklist

- Specs do not construct objects directly; fixtures own spec-visible wiring.
- No sleeps (`waitForTimeout`) used as synchronization.
- Locators are semantic first (`getByRole`/`getByLabel`) and centralized.
- Network behavior is intentional: mocked or explicitly integration-tagged.
- Changes include at least one reproducible command/example.
