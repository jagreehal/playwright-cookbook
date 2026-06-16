# Card 22: Failure artifacts and error capture

## Scenario

You want failures to be debuggable in under a minute: trace, screenshot, video, and optionally the last API response or console errors.

## Aim

- **Config**: trace on first retry, screenshot and video on failure (already in `playwright.config.ts`).
- **Console + pageerror**: an auto-fixture subscribes to `page.on('pageerror')` and `page.on('console', msg => type === 'error')`, collects the messages, and attaches them when the test does not pass, so silent frontend crashes show up in the report.

## How it works

1. The `captureErrors` auto-fixture pushes every `pageerror` and console error into an array while the test runs.
2. After `await use()`, it checks `testInfo.status`. The attach fires only when the test did not pass, so a green run produces no noise.
3. The spec includes one passing test (nothing attached) and one `test.fail()` test that drives the failure branch on purpose.
4. Trace, screenshot, and video come from `playwright.config.ts`, not from this fixture.

## When to use

- Every project; adjust what you attach based on what helps your team (API body, console, network log).
