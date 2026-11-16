# Failure Classes

The fix for each class of flake. Classify first with the flowchart in the main skill.

## Race Conditions

The most common cause. The test is faster than the app and asserts before the UI catches up. Or, worse, the test is slower than the app and the app changes state before the test sees it.

**Almost always caused by:** non-web-first assertions, manual sleeps, or branching on a stale snapshot.

```ts
// flaky — fixed sleep
await page.waitForTimeout(1000);
expect(await page.getByText('Saved').isVisible()).toBe(true);

// fixed — auto-retried web-first assertion
await expect(page.getByText('Saved')).toBeVisible();
```

```ts
// flaky — branches on a one-shot read
if (await page.getByRole('button', { name: 'Continue' }).isVisible()) {
  await page.getByRole('button', { name: 'Continue' }).click();
}

// fixed — wait for the button, then click (auto-waits)
await page.getByRole('button', { name: 'Continue' }).click();

// or, if it's truly conditional, count rather than visibility check
const buttons = page.getByRole('button', { name: 'Continue' });
if (await buttons.count() > 0) await buttons.click();
```

The full assertion model is in `playwright-assertions`.

## Parallelism Collisions

The test passes alone or with `--workers=1` but fails in parallel. Two tests are reaching the same external resource: a database row, a shared user, a cache entry, a third-party rate limit.

**Almost always fixed by:** namespacing the resource per worker or per stable parallel lane. When the resource cannot be split, such as one global settings row, give those tests a shared `lock` so they never overlap (see `playwright-test-isolation`).

```ts
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

The full pattern catalogue is in `playwright-test-isolation`.

## State Leaks

A test passes alone but fails when run after some other specific test. One test is leaving state behind that breaks the next one: usually a database row, a logged-in session, a cache, or a feature flag.

**Almost always caused by:** `beforeAll` setup, cleanup in `afterAll` instead of fixture teardown, or a fixture missing its teardown half.

```ts
// dangerous — cleanup in afterAll runs once at end, but mid-suite each test sees the user
test.beforeAll(async () => { user = await createUser(); });
test.afterAll(async () => { await deleteUser(user); });

// fixed — per-test fixture with teardown
testUser: async ({}, use) => {
  const user = await createUser();
  await use(user);
  await deleteUser(user.id);
},
```

Audit every `beforeAll`. If the thing it sets up is mutable and tests in the file modify it, that's the leak.

## Network Flakes

The test depends on a service that's sometimes slow or sometimes unavailable. CI runs that hit a real third-party API will fail when that API has issues.

**Almost always fixed by:** mocking the third party.

```ts
await page.route(/api\.example-third-party\.com/, route =>
  route.fulfill({ status: 200, json: stubResponse })
);
```

Even your own backend can be a source: a slow database, a flaky migration, a service that's rate-limited. Decide which calls you genuinely need to test against the real service and stub the rest. See `playwright-network-mocking`.

## CI-Only Failures

Test passes locally, fails on CI. The environment is different: slower CPUs, less memory, cold container starts, a different timezone, a smaller viewport, no GPU.

**Common culprits and fixes:**

| CI symptom | Likely cause | Fix |
|---|---|---|
| Element not found | Slower CI CPU, animations not yet finished | Disable animations, longer assertion timeouts only as a last resort |
| Timeout exceeded | Insufficient `expect.timeout` for slower CI | Bump per-assertion if genuinely needed; first investigate why CI is slower |
| Screenshot diff fails on CI | Different OS/font rendering | Run snapshots in containerised CI to match local; pin docker image |
| Flaky `networkidle` waits | More background analytics/feature-flag traffic | Never use `networkidle` (the Playwright team discourages it as racy) — wait on a specific `waitForResponse` or a web-first assertion |
| Tests pass on rerun | Race in setup; first run loses, retry wins | Move setup into fixture; ensure web-first assertions everywhere |

Reproduce CI conditions locally:

```bash
PLAYWRIGHT_VERSION=$(node -p "require('@playwright/test/package.json').version")
docker run -it --rm -v "$PWD":/work -w /work \
  "mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-jammy" \
  npx playwright test --repeat-each=20
```

Pin this image to the Playwright version your project uses; `latest` hides environment drift instead of reproducing it.
