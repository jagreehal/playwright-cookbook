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

# 4) open trace
npx playwright show-trace test-results/**/trace.zip
```

## Symptom -> Cause -> Fix

- Timeout waiting for visible element -> wrong locator or premature assert -> move to semantic locator + `expect(locator)`.
- Passes serially, fails parallel -> shared resource collision -> worker-indexed test data.
- Passes on retry only -> race condition -> remove snapshot reads / sleeps, use web-first assertions.
- Fails only CI -> env differences -> pin viewport/timezone/locale; never rely on `networkidle` (racy everywhere, worse on CI) — wait on a specific response or web-first assertion.
- Random 5xx/429 -> upstream dependency -> mock route or split into integration-tagged tests.

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
