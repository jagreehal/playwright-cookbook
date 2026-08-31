---
name: playwright-error-observability
description: >-
  Makes Playwright tests fail on unexpected console errors, pageerrors, and
  critical failed responses. Use this skill when adding guards, auditing
  false-green tests, or deciding what to allowlist. Do not use for flake
  diagnosis (playwright-reliability) or network mocking
  (playwright-network-mocking).
---

# Playwright Error Observability

Silent browser errors produce false-green suites. This skill makes runtime failures observable and actionable.

## Critical rules

- Unexpected `console.error` and `pageerror` fail the test.
- Allowlists are explicit and narrow.

## Workflow

1. Doctor the consuming repo: find existing console listeners, auto-fixtures, and known noisy third parties.
2. Add a fixture (prefer auto) that collects errors and throws after the test if any unexpected ones fired.
3. Validate with a spec that triggers a known `console.error` and expect that spec to fail, then with a clean spec that still passes.

## Non-Negotiables

1. Capture and fail on unexpected `console.error` and `pageerror` events.
2. Explicitly assert expected error states (do not ignore them).
3. Track failed HTTP responses for critical API surfaces.
4. Keep allowlists explicit and minimal.

## Worked Example

```ts
import { test as base, expect } from '@playwright/test';

type Fixtures = {
  errorCollector: { errors: string[] };
};

export const test = base.extend<Fixtures>({
  errorCollector: async ({ page }, use) => {
    const errors: string[] = [];

    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
    });
    page.on('response', (response) => {
      const url = response.url();
      if (/\/api\/(checkout|billing|orders)\b/.test(url) && response.status() >= 500) {
        errors.push(`api ${response.status()}: ${url}`);
      }
    });

    await use({ errors });

    const allow = [/ResizeObserver loop limit exceeded/];
    const unexpected = errors.filter((e) => !allow.some((r) => r.test(e)));
    expect(unexpected, `Unexpected browser errors:\n${unexpected.join('\n')}`).toEqual([]);
  },
});
```

## Anti-Patterns

- Ignoring console/page errors because tests "still pass".
- Adding broad regex allowlists that mask real regressions.
- Asserting only UI copy while critical API calls fail in background.
- Collecting errors without failing the test.

## Cross-References

- Flake diagnosis: `playwright-debugging`, `playwright-reliability`
- Network control: `playwright-network-mocking`
- CI artifact discipline: `playwright-ci`

## Validation

- A spec that logs `console.error` fails. A clean spec still passes.
- The allowlist is explicit and does not swallow unexpected errors.
