---
name: playwright-debugging
description: Use when a Playwright test fails and you need fast root-cause diagnosis using trace viewer, inspector, console/network evidence, and repeatable repro commands. Focuses on shortest path from failure to permanent fix.
---

# Playwright Debugging

Debugging should be evidence-first: reproduce, capture trace, isolate failure class, apply targeted fix.

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
- Fails only CI -> env differences -> pin viewport/timezone/locale, eliminate `networkidle` assumptions.
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

## Quick Quality Checklist

- Specs do not construct objects directly; fixtures own spec-visible wiring.
- No sleeps (`waitForTimeout`) used as synchronization.
- Locators are semantic first (`getByRole`/`getByLabel`) and centralized.
- Network behavior is intentional: mocked or explicitly integration-tagged.
- Changes include at least one reproducible command/example.
