---
name: playwright-config
description: Use when creating or refactoring playwright.config.ts, defining projects and dependencies, splitting smoke vs integration runs, setting retries/workers/timeouts, or hardening config for CI. Opinionated defaults and decision rules for config that scales.
---

# Playwright Config

The config file holds the suite's architecture. A weak `playwright.config.ts` creates slow, flaky suites even when the tests are good.

## Non-Negotiable Defaults

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? (process.env.PLAYWRIGHT_WORKERS ?? '50%') : undefined,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  expect: {
    timeout: 7_500,
  },
  timeout: 60_000,
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

## Decision Rules

1. `retries` are for CI signal, not local development. Track tests that pass only on retry.
2. Use one `setup` project for auth/bootstrap. Never re-run UI login in every test.
3. Use project matrix only for meaningful dimensions: browser, role, app variant.
4. Keep `timeout` strict globally; raise specific assertion/action timeouts locally in tests only when needed.
5. Keep screenshots/videos only on failure; traces on first retry.
6. Do not hardcode `workers: 1` on CI after the suite is isolated. Use `PLAYWRIGHT_WORKERS=1` temporarily when diagnosing a parallelism failure.
7. For sharded CI, use the blob reporter at execution time and merge reports after all shards; see `playwright-ci`.

## Project Matrix Pattern

```ts
projects: [
  { name: 'setup', testMatch: /.*\.setup\.ts/ },
  {
    name: 'chromium-smoke',
    grep: /@smoke/,
    use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
    dependencies: ['setup'],
  },
  {
    name: 'chromium-integration',
    grep: /@integration/,
    use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
    dependencies: ['setup'],
  },
]
```

## Anti-Patterns

- `waitForTimeout` as config workaround.
- Global `timeout` set huge to hide races.
- Same suite for mocked and real-network tests with no tagging split.
- Browser matrix before suite stability.
- Permanent single-worker CI for a suite that claims to support parallel execution.

## Cross-References

- Setup/auth dependencies: `playwright-auth`
- Parallel-safe data: `playwright-test-isolation`
- Flake triage: `playwright-reliability`, `playwright-debugging`
- Network posture: `playwright-network-mocking`

## Quick Quality Checklist

- Specs do not construct objects directly; fixtures own spec-visible wiring.
- No sleeps (`waitForTimeout`) used as synchronization.
- Locators are semantic first (`getByRole`/`getByLabel`) and centralized.
- Network behavior is intentional: mocked or explicitly integration-tagged.
- Changes include at least one reproducible command/example.
