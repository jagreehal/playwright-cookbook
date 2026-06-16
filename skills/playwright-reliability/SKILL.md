---
name: playwright-reliability
description: Use when diagnosing flaky Playwright tests, deciding whether a flake is a real bug, configuring retries, working with the trace viewer, or auditing a suite for reliability. The diagnostic and the playbook for permanent fixes, and the answer to "our E2E tests are flaky."
---

# Playwright Reliability

There is no such thing as an inherently flaky test. There are tests with hidden race conditions, hidden shared state, or hidden network dependencies. Each one has a specific cause and a permanent fix. This skill is the diagnostic that finds the cause and the playbook that applies the fix.

Aim for zero flakes, not fewer. A flake that retries to green is a bug you've decided to live with.

## Diagnostic Flowchart

Start here when a test fails intermittently:

```
Test fails sometimes
│
├─ Fails locally too (with --repeat-each=20)?
│  ├─ YES → Race condition or timing issue → see "Race Conditions"
│  └─ NO  → Environment-driven → see "CI-Only Failures"
│
├─ Fails only with multiple workers (--workers > 1)?
│  └─ YES → Parallelism collision → see "Parallelism Collisions"
│
├─ Fails only when run after specific tests?
│  └─ YES → Shared state leak → see "State Leaks"
│
├─ Fails only when network is involved?
│  └─ YES → Upstream noise → see "Network Flakes"
│
└─ Fails truly randomly across all axes?
   └─ Probably a real bug — your app has the race, not your test
```

## Reproducing a Flake

Before you can fix a flake, you have to reproduce it deterministically. The single most useful command:

```bash
# Run one test 50 times
npx playwright test some.spec.ts -g "test title" --repeat-each=50

# Same, but isolate parallelism
npx playwright test some.spec.ts --repeat-each=50 --workers=1

# Same, in a CI-like environment
CI=true npx playwright test --repeat-each=20
```

Run with full traces enabled so when one fails, you have everything:

```ts
// playwright.config.ts
use: {
  trace: 'on',                           // every run captures a trace
  video: 'retain-on-failure',
  screenshot: 'only-on-failure',
}
```

Switch back to `trace: 'on-first-retry'` once you've found the cause, since full traces are expensive.

## The Trace Viewer

When a test fails, open the trace. It will show you exactly what went wrong, often immediately.

```bash
npx playwright show-trace test-results/.../trace.zip
```

The trace shows:

- **Action timeline:** every locator interaction with timings
- **Network panel:** every request, with timing waterfalls
- **Console panel:** page errors and `console.*` output
- **Source panel:** the spec source with the failing line highlighted
- **Snapshots:** DOM snapshots before and after each action, with locator targets visualised

If you skip the trace viewer and try to debug by re-running locally, you're working blind. Always check the trace first.

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

**Almost always fixed by:** namespacing the resource per worker or per stable parallel lane.

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
| Flaky `networkidle` waits | More background analytics/feature-flag traffic | Replace with specific `waitForResponse` or assertion |
| Tests pass on rerun | Race in setup; first run loses, retry wins | Move setup into fixture; ensure web-first assertions everywhere |

Reproduce CI conditions locally:

```bash
PLAYWRIGHT_VERSION=$(node -p "require('@playwright/test/package.json').version")
docker run -it --rm -v "$PWD":/work -w /work \
  "mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-jammy" \
  npx playwright test --repeat-each=20
```

Pin this image to the Playwright version your project uses; `latest` hides environment drift instead of reproducing it.

## Retries: When and How

Retries are a circuit breaker for **environmental noise**, not a fix for flakes. Configure them on CI only.

```ts
// playwright.config.ts
retries: process.env.CI ? 2 : 0,
```

Then surface retried tests so they get fixed:

```ts
// in a fixture, or globally
test.afterEach(async ({}, testInfo) => {
  if (testInfo.retry > 0 && testInfo.status === 'passed') {
    console.warn(`FLAKY: "${testInfo.title}" passed on retry ${testInfo.retry}`);
    // Or report to your tracker
  }
});
```

Track the rate of "passed-on-retry" tests as a quality metric. If it's not decreasing toward zero, your suite isn't getting healthier.

## Quarantine: Sometimes Necessary, Always Temporary

A genuinely flaky test that's blocking releases can be quarantined while you fix the cause:

```ts
test.fixme(true, 'flaky on CI: see issue #1234 — auth race condition');
```

Two rules:

1. Every quarantined test gets an issue link.
2. You don't add a second one until the first is fixed.

A quarantine queue that grows is a suite that's losing the war. A quarantine queue that stays at one or two with active issues is healthy maintenance.

## Console Errors as Reliability Signal

A `console.error` in the page during a test is usually evidence that something is wrong, even if the test passes. Auto-fail on them:

```ts
// auto-fixture in fixtures.ts
captureConsoleErrors: [
  async ({ page }, use) => {
    const errors: string[] = [];
    const allowed = [
      /favicon\.ico/,                // known noise
      /\[fast refresh\]/i,            // dev-only
    ];
    page.on('pageerror', err => {
      if (!allowed.some(p => p.test(err.message))) errors.push(err.message);
    });
    page.on('console', msg => {
      if (msg.type() === 'error' && !allowed.some(p => p.test(msg.text()))) {
        errors.push(msg.text());
      }
    });
    await use();
    if (errors.length) throw new Error(`Console errors:\n${errors.join('\n')}`);
  },
  { auto: true },
],
```

This catches unhandled rejections, React error boundaries, and runtime errors that the UI swallowed but shouldn't have. A test that "passed" while the page logged an error has not actually passed.

## The Reliability Audit

Periodically audit a suite with this checklist:

- [ ] No `waitForTimeout` anywhere. (Search the codebase.)
- [ ] No `await locator.isVisible()` inside conditionals.
- [ ] No `waitForLoadState('networkidle')` without a specific reason.
- [ ] All `beforeAll` blocks are read-only or use worker-scoped fixtures.
- [ ] All test data is namespaced by `workerIndex`, `parallelIndex`, or per-test.
- [ ] Auth uses storage state, not UI login per test.
- [ ] Third-party services are mocked by default.
- [ ] `trace: 'on-first-retry'` is set in config.
- [ ] Console errors fail the test.
- [ ] Retries are CI-only.
- [ ] Passed-on-retry rate is tracked and trending toward zero.

A suite that passes this audit is one you can trust.

## Anti-Patterns

| Anti-pattern | Why it's wrong | Fix |
|---|---|---|
| "Just retry it" | Hides real bugs as flakes | Find the cause; retries are for env noise only |
| Silent retries on every test on CI | Real failures get masked | Surface retried tests; investigate |
| Bumping `expect.timeout` to fix a flake | Doesn't address the cause; suite gets slower | Find the wait condition or mock the network |
| Screenshots without `animations: 'disabled'` | Visual diff flakes on CSS transitions | Set `animations: 'disabled'` in screenshot opts |
| Quarantining a test without an issue link | Quarantine queue grows forever | Always link an issue; review weekly |
| Ignoring console errors | Hides bugs that didn't surface in UI | Auto-fixture that fails on unexpected errors |
| Debugging from logs alone | Slower than reading the trace | Open the trace first, every time |
| Treating "passed on retry" as success | Hides degrading reliability | Track and report the rate |

## Cross-References

- The assertion model that prevents most race conditions: `playwright-assertions`.
- Per-worker data namespacing: `playwright-test-isolation`.
- Mocking out upstream noise: `playwright-network-mocking`.
- Storage state for auth (and the isolation it gives you): `playwright-auth`.
- The architectural rules that make the whole reliability story possible: `playwright-architecture`.

## Quick Quality Checklist

- Specs do not construct objects directly; fixtures own spec-visible wiring.
- No sleeps (`waitForTimeout`) used as synchronization.
- Locators are semantic first (`getByRole`/`getByLabel`) and centralized.
- Network behavior is intentional: mocked or explicitly integration-tagged.
- Changes include at least one reproducible command/example.
