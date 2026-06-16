---
name: playwright-test-isolation
description: Use when designing for parallel test execution, debugging tests that fail only when run with others, isolating per-worker test data, deciding between `beforeAll` and fixtures, or making sure tests pass in any order. The discipline that keeps a parallel suite stable.
---

# Playwright Test Isolation

A test that fails when run alongside other tests is a bug, not a flake. Test isolation means every test passes when run alone, in any order, on any worker. This skill is the discipline that gets you there and keeps you there.

## The Bar

Three checks. Run each occasionally; fix any that fail.

```bash
# 1. Each test passes in isolation
npx playwright test --workers=1 --grep "test title"

# 2. Tests do not depend on neighboring files
npx playwright test path/to/suspect.spec.ts --workers=1
npx playwright test --workers=1

# 3. Tests pass at full parallelism
npx playwright test
```

Playwright does not provide a general-purpose `--shuffle` flag. Prove order independence by running suspect files alone, running the full suite serially, and then running with normal parallelism. If a test only passes when run after some other test, you have shared state. If it only passes serially, you have a parallelism collision. Both are fixable, and neither is flaky.

## Built-In Isolation

Playwright gives you a lot of isolation for free:

- **Per-test browser context.** Each test gets a fresh `BrowserContext` with fresh cookies, `localStorage`, and `sessionStorage`. No browser state leaks between tests.
- **Per-test fixtures.** Test-scoped fixtures are constructed fresh for every test (see `playwright-fixtures`).
- **Workers are processes.** Workers don't share memory. They do share external resources like your backend and database, and that's where collisions happen.

Your job is the external part.

## Worker-Indexed Data

The main tools for parallel-safe data are `testInfo.workerIndex` and `testInfo.parallelIndex`.

- `workerIndex` is unique for each worker process and starts at 1.
- `parallelIndex` is 0-based and stays the same when Playwright restarts a worker after a failure.

Use `workerIndex` for throwaway names that only need to be unique during one run. Use `parallelIndex` for reusable per-lane resources such as pre-created accounts, schemas, or cached auth files.

```ts
// Worker-scoped: one user per worker, isolated by index
testUser: [
  async ({}, use, testInfo) => {
    const email = `user-${testInfo.workerIndex}@test.dev`;
    const user  = await api.createUser({ email });
    await use(user);
    await api.deleteUser(user.id);
  },
  { scope: 'worker' },
],
```

With four workers you get four independent users. Tests in one worker never touch data created by another worker.

This pattern works for anything: database tenants, project ids, S3 prefixes, queue topics. Whatever your suite touches at scale, namespace it by a Playwright worker or parallel index.

## No `beforeAll` for Shared Mutable State

`test.beforeAll` runs once per file per worker. It is **not** a tool for sharing data between tests: anything it sets up is mutable shared state by default.

```ts
// bad — every test in the file inherits whatever the previous one did to this user
test.beforeAll(async ({ browser }) => {
  globalUser = await api.createUser({ email: 'shared@test.dev' });
});

test('test A modifies user', async () => { /* … */ });
test('test B reads user',     async () => { /* assumes test A didn't run */ });
```

Use `beforeAll` only for things that are genuinely read-only and idempotent (and even then, prefer a worker-scoped fixture). Anything mutable goes in a per-test fixture.

```ts
// good
testUser: async ({}, use) => {
  const user = await api.createUser({ email: `${randomId()}@test.dev` });
  await use(user);
  await api.deleteUser(user.id);
},
```

## Database Isolation

Three patterns, ordered by how much isolation they buy.

### Pattern 1: Transaction rollback (best for most cases)

Wrap each test in a transaction; roll back at teardown.

```ts
dbTransaction: async ({}, use) => {
  const tx = await db.beginTransaction();
  await use(tx);
  await tx.rollback();
},
```

Every write inside the test disappears at the end. Fast, complete, no cleanup leakage. Requires that your app code uses the same transaction the test fixture is holding, typically by injecting a transaction-aware client.

### Pattern 2: Per-worker schema or namespace

Each worker uses a different DB schema, prefix, or tenant id.

```ts
dbSchema: [
  async ({}, use, testInfo) => {
    const schema = `test_${testInfo.parallelIndex}`;
    await db.createSchema(schema);
    await use(schema);
    await db.dropSchema(schema);
  },
  { scope: 'worker' },
],
```

Useful when transactions don't fit (e.g. tests that need to commit in one step and read in another). More expensive than transactions, but cheaper than a full DB per worker.

### Pattern 3: Per-test entity creation with cleanup

Create the entities the test needs in a fixture; delete them in teardown. Works for most CRUD-style tests.

```ts
testProduct: async ({}, use) => {
  const product = await api.createProduct({ name: `Test ${randomId()}` });
  await use(product);
  await api.deleteProduct(product.id);
},
```

Slow at scale (creates and deletes for every test). Use when neither transaction rollback nor per-worker schemas are practical.

## Storage State Isolation

For authenticated tests, the storage-state pattern (see `playwright-auth`) does isolation work for you: each test gets a fresh context loading from the same storage file. Tests don't share live cookies. They all start from the same persisted state.

If a test mutates auth state (e.g. logs out, changes password), it must do so in its own context, which it already has. No leakage to other tests.

## Don't Share `page` or `context`

```ts
// catastrophic — shared page, state leaks everywhere
let page: Page;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
});

test('A', async () => { await page.goto('/x'); /* … */ });
test('B', async () => { /* page is in unknown state from A */ });
```

The default of one context per test is right in nearly every case. The legitimate exception is a sequence of tests that genuinely model a continuous user session (rare, and usually a sign you should compose into one test). For those, use `test.describe.configure({ mode: 'serial' })` and document the trade-off.

## Avoiding Order Dependencies

A test that "needs" to run after another test is a coupled test. Two ways to fix:

- **Make the dependency a fixture.** If test B needs the data from test A, the data should come from a fixture, not from A's side effect.
- **Combine into one test.** If two assertions only make sense together, they're one test (but consider whether they're testing one behaviour or two).

When you find an order dependency, look for the implicit shared resource. It's usually a database row or a global flag.

## Test Tags for Isolation Concerns

Tag tests that have known constraints so they can be filtered in CI:

```ts
test('long-running data import @slow @serial', async () => { /* … */ });
test('reads the read-only seed @readonly', async () => { /* … */ });
```

```bash
# Run the fast subset on every push
npx playwright test --grep-invert @slow

# Run serial tests serially
npx playwright test --grep @serial --workers=1
```

## CI: One Worker on CI by Default?

The Playwright generator sets `workers: process.env.CI ? 1 : undefined`. If you've followed this skill, you can drop that and run parallel on CI too, because your isolation discipline is what makes it safe. Most teams find a 5–10× speedup once they trust their isolation.

```ts
workers: process.env.CI ? '50%' : undefined,   // half the available CPUs on CI
```

If a flake appears on CI but not locally when you do this, see `playwright-reliability`. The diagnostic distinguishes parallelism issues from environment issues.

## Anti-Patterns

| Anti-pattern | Why it's wrong | Fix |
|---|---|---|
| `beforeAll` that creates mutable test data | Data persists between tests in the same file | Per-test (or worker-scoped) fixture |
| Shared user account across all parallel runs | Workers collide on logged-in state | Per-worker user with `workerIndex` or stable lane with `parallelIndex` |
| Hardcoded entity ids (`createUser({ id: 1 })`) | Reruns clash with leftover data | Generated ids; teardown in fixture |
| Tests that depend on running in file order | Order changes break them | Make dependencies explicit via fixtures |
| Cleanup in `afterAll` instead of fixture teardown | Skipped when the test crashes | Cleanup in `await use()` teardown |
| `test.describe.configure({ mode: 'serial' })` for tests that don't need it | Loses parallelism unnecessarily | Use only when genuinely required and document why |
| Sharing a single browser `context` between tests | State (cookies, storage) leaks | Default one-context-per-test |
| Tests that pass alone but fail in parallel | Hidden shared resource | Find the resource; isolate it via a worker/parallel index or transactions |

## Diagnostic: When a Test Fails Only in Some Conditions

| Symptom | Likely cause | Where to look |
|---|---|---|
| Fails locally, fails on CI | Real bug or environmental difference | Run with `--repeat-each=20` locally to confirm |
| Passes alone, fails with other tests | Shared state (database, auth, cache) | Audit `beforeAll` and any worker-scoped fixtures |
| Passes serially, fails parallel | Worker collision on backend resource | Add worker/parallel-index namespacing |
| Passes locally, fails on CI only | Environment differences (timing, resource limits) | Increase trace artifacts; see `playwright-reliability` |
| Passes mostly, fails sometimes | Race condition in the test | Audit waits; switch to web-first assertions (`playwright-assertions`) |

## Cross-References

- The fixture mechanics that enable isolation: `playwright-fixtures`.
- Storage state for auth (which solves a large class of isolation problems for free): `playwright-auth`.
- Network mocking to remove environment-driven flakiness: `playwright-network-mocking`.
- The full flake diagnostic: `playwright-reliability`.

## Quick Quality Checklist

- Specs do not construct objects directly; fixtures own spec-visible wiring.
- No sleeps (`waitForTimeout`) used as synchronization.
- Locators are semantic first (`getByRole`/`getByLabel`) and centralized.
- Network behavior is intentional: mocked or explicitly integration-tagged.
- Changes include at least one reproducible command/example.
