---
name: playwright-reliability
description: >-
  Diagnoses flaky Playwright tests and applies a permanent fix, not a retry.
  Use this skill when tests flake, when deciding whether a flake is a product
  bug, or when auditing retries and traces. Do not use for first-pass
  assertion choice (playwright-assertions) or isolation design
  (playwright-test-isolation).
---

# Playwright Reliability

There is no such thing as an inherently flaky test. There are tests with hidden race conditions, hidden shared state, or hidden network dependencies. Each one has a specific cause and a permanent fix. This skill is the diagnostic that finds the cause and the playbook that applies the fix.

Aim for zero flakes, not fewer. A flake that retries to green is a bug you've decided to live with.

## Critical rules

- Classify before changing: locator, timing, state leak, network, product bug.
- Prove the fix with `--repeat-each`. A single green run is not evidence.
- Retries hide bugs. Do not raise retries as the fix.

## Workflow

1. Doctor the consuming repo: reproduce with `npx playwright test <file> -g "<title>" --repeat-each=30`, then `--workers=1`.
2. Open the trace. Classify using the flowchart below. Apply the matching fix from the other skills.
3. Validate with the same `--repeat-each` command. Expect a pass.

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

## Failure Classes

[references/failure-classes.md](references/failure-classes.md) holds the fix for each class: race conditions, parallelism collisions, state leaks, network flakes, and CI-only failures.

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

## Measuring Flakiness Across Runs

A retry shows a flake within one run. A final verdict that flips between runs is the stronger signal. [references/flake-metrics.md](references/flake-metrics.md) defines the rules and has a script that flattens a JSON report.

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

A test can pass while the page throws. Fail on unexpected console errors with the auto-fixture in `playwright-error-observability`.

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

## Validation

- The failing test was reproduced with `--repeat-each` before the fix.
- After the fix, the same command passes. A single green run is not enough.
