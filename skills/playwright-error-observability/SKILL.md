---
name: playwright-error-observability
description: Make Playwright tests fail on unexpected browser runtime errors, console errors, and critical failed responses. Use when adding console/pageerror guards, auditing false-green tests, or deciding which error signals should be asserted versus allowlisted.
---

# Playwright Error Observability

Silent browser errors produce false-green suites. This skill makes runtime failures observable and actionable.

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

## Quick Quality Checklist

- Unexpected `console.error` fails test.
- Unexpected `pageerror` fails test.
- Error allowlist is explicit and narrow.
- Critical response failures are surfaced in assertions.
- Failure output includes actionable messages.
