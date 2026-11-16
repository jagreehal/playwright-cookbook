---
name: playwright-debugging
description: >-
  Diagnoses a failing Playwright test from trace, inspector, and console
  evidence, then applies a permanent fix. Use this skill when a test fails and
  you need the shortest path from failure to fix. Do not use for suite-wide
  flake policy (playwright-reliability) or for writing assertions
  (playwright-assertions).
---

# Playwright Debugging

Debugging should be evidence-first: reproduce, capture trace, isolate failure class, apply targeted fix.

## Critical rules

- Reproduce before changing. Open the trace. Classify, then fix.
- Do not add `waitForTimeout` as a "fix".

## Workflow

1. Doctor the consuming repo: find the failing spec, existing trace/screenshot settings, and the exact test title.
2. Follow the 5-step triage below.
3. Validate with `--repeat-each=10` on the failing test. Expect a pass.

## 5-Step Triage

1. Re-run single test with `--repeat-each`.
2. Re-run with `--workers=1`.
3. Open trace and inspect action/network/console timelines.
4. Classify failure: locator, timing, state leak, network, product bug.
5. Apply the specific fix and prove with repeated runs.

## Commands

```bash
# 1) reproduce
npx playwright test e2e/foo.spec.ts -g "can save profile" --repeat-each=30

# 2) isolate parallelism
npx playwright test e2e/foo.spec.ts -g "can save profile" --repeat-each=30 --workers=1

# 3) headed + inspector
PWDEBUG=1 npx playwright test e2e/foo.spec.ts -g "can save profile"

# 4) open trace in the viewer
npx playwright show-trace test-results/**/trace.zip

# 5) re-run only what failed last time
npx playwright test --last-failed
```

## Reading a Trace Without a Browser

`npx playwright trace` answers the same questions from the terminal, which suits agents and CI machines. All commands after `open` use the opened trace.

```bash
npx playwright trace open test-results/<test-folder>/trace.zip
npx playwright trace actions --errors-only     # which step failed
npx playwright trace action 12                 # params, logs, source for that step
npx playwright trace requests --failed         # status >= 400
npx playwright trace console --errors-only
npx playwright trace errors                    # errors with stack traces
npx playwright trace snapshot 12               # accessibility snapshot at that step
npx playwright trace close
```

A retried test writes one folder per attempt (`...-retry1`). Open the attempt you care about, and check the folder name first: a `setup` project writes traces too.

## Symptom -> Cause -> Fix

- Timeout waiting for visible element -> wrong locator or premature assert -> move to semantic locator + `expect(locator)`.
- Passes serially, fails parallel -> shared resource collision -> worker-indexed test data.
- Passes on retry only -> race condition -> remove snapshot reads / sleeps, use web-first assertions.
- Fails only CI -> env differences -> pin viewport/timezone/locale; never rely on `networkidle` (racy everywhere, worse on CI) — wait on a specific response or web-first assertion.
- Random 5xx/429 -> upstream dependency -> mock route or split into integration-tagged tests.

## Regression After a Playwright Upgrade

When a test passes on one Playwright version and fails on the next, prove it outside your app. Install both versions side by side and run one small spec in each.

```bash
mkdir -p /tmp/pw-good/tests /tmp/pw-bad/tests
(cd /tmp/pw-good && npm init -y && npm i -D @playwright/test@<good> && npx playwright install chromium)
(cd /tmp/pw-bad  && npm init -y && npm i -D @playwright/test@<bad>  && npx playwright install chromium)
```

Give both folders the same spec and a config with one project, so each run reports one result:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

- Skip `npm init playwright@latest`. It prompts, and its three browser projects multiply the output.
- Confirm the difference is real before reading any code.
- What shipped is in `node_modules/playwright-core/lib/` and `node_modules/playwright/lib/`. Much of it is bundled, so search for the function and compare that, not whole files.
- You can edit that compiled JS in the throwaway install to test a theory. Node loads it with no build step.

## Reporting a Playwright or Browser Bug

Reduce the failure to a spec with no app code, using `page.setContent()` or a route. Then state what fails, expected versus actual, the Playwright version, the browser, the OS, and the root cause if you found it. For a regression, quote the changed code from both versions. If the fault is in the browser, a repro with no Playwright at all is worth the effort, because the browser's owners can run it directly.

## Anti-Patterns

- Rerunning failing tests repeatedly without opening trace artifacts.
- Debugging by adding sleeps instead of fixing synchronization.
- Accepting “passed on retry” as success without root-cause classification.
- Mixing multiple speculative fixes in one PR, making causality unclear.
- Ignoring CI-only environment differences (locale/timezone/resources).

## Mandatory Artifacts for Any Flake PR

1. Failing trace screenshot or trace link.
2. Root-cause category.
3. Exact code change that removes class of failure.
4. Proof run: at least one repeated run command and result.

## Cross-References

- Assertion model: `playwright-assertions`
- Isolation fixes: `playwright-test-isolation`
- Network fixes: `playwright-network-mocking`
- Suite hardening: `playwright-reliability`

## Validation

- The original failure was reproduced. The trace was opened.
- After the fix, `npx playwright test <file> -g "<title>" --repeat-each=10` passes.
