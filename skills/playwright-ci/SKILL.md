---
name: playwright-ci
description: >-
  Sets up Playwright in CI with sharding, artifacts, and quality gates. Use
  this skill when adding a workflow, caching browsers, publishing reports, or
  splitting PR vs nightly jobs. Do not use for playwright.config.ts defaults
  (playwright-config) or tag taxonomy (playwright-projects-tags).
---

# Playwright CI

CI proves test quality. Aim for fast feedback and rich failure artifacts, not raw pass rate.

## Critical rules

- Block `test.only` on CI. Retries on CI, zero locally.
- Blob reports per shard, then merge. Shard once the suite exceeds ~5 minutes.
- Separate smoke and integration jobs.
- Lint and type-check the tests before you run them. A missing `await` passes the run and flakes on a later one.

## Workflow

1. Doctor the consuming repo: find existing CI config, package manager, how browsers are installed, and current test command.
2. Apply the baseline policy and workflow shape below, using that package manager and test script.
3. Validate by running the same command CI will run locally (`npx playwright test --shard=1/2` is enough as a smoke of the flags).

## Baseline CI Policy

1. Block `test.only` on CI.
2. Run with retries on CI, zero retries locally.
3. Use blob reports for sharded CI, then merge into one HTML report.
4. Shard once suite runtime exceeds ~5 minutes.
5. Separate smoke and integration jobs.
6. Gate on `tsc --noEmit` and a lint job with `eslint-plugin-playwright` (see below).

## GitHub Actions Baseline

```yaml
name: e2e
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: npm
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npx eslint .

  playwright:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shardIndex: [1, 2, 3]
        shardTotal: [3]

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: npm
      - run: npm ci
      # Install only the browsers your projects use, e.g. `install --with-deps chromium`.
      - run: npx playwright install --with-deps
      - run: npx playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }} --reporter=blob
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: blob-report-${{ matrix.shardIndex }}
          path: blob-report
          retention-days: 1

  merge-reports:
    if: always()
    needs: [playwright]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: npm
      - run: npm ci
      - uses: actions/download-artifact@v4
        with:
          path: all-blob-reports
          pattern: blob-report-*
          merge-multiple: true
      - run: npx playwright merge-reports --reporter=html ./all-blob-reports
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-html-report
          path: playwright-report
```

## Sharding Rules

- Start sharding when median run time is above 5 minutes.
- Keep shard count tied to suite growth; avoid over-sharding tiny suites.
- Know what Playwright is distributing: by default sharding divides test files; with fully parallel tests it can distribute individual tests.
- Watch shard durations. If one shard is much slower, split large files or use fully parallel mode where safe.

## Quality Gates

- Gate merge on smoke job.
- Run integration/nightly separately.
- Track and alert on "passed on retry" count.
- Once the suite is stable, add `--fail-on-flaky-tests` (or `failOnFlakyTests: !!process.env.CI` in config). A test that passes only on retry then fails the build. Without it the run exits 0.
- For a fast PR check, `--only-changed=origin/main` runs the test files changed since that ref. Keep a full run on the main branch, because a change to app code touches no test file.

## Lint the Tests

Use `eslint-plugin-playwright` with type-aware `@typescript-eslint/no-floating-promises`. The pair flags four flake sources at lint time: a missing `await`, a one-shot `isVisible()` check, `waitForTimeout`, and a stray `test.only`.

- Start from the plugin's `recommended` config. Turn `missing-playwright-await`, `no-focused-test`, `prefer-web-first-assertions`, `valid-expect` and `no-standalone-expect` up to `error`.
- Keep `expect-expect` on. When tests assert through helpers such as `assertLoaded()` or `expectToast()`, list them in `assertFunctionPatterns`. The rule then flags a test with no assertion, which would pass on any build.
- Apply the promise rules to specs, page objects, fixtures, setup files and config. A floating promise in a helper reaches each test that calls it.
- Trial the stricter optional rules one at a time. Turn one on, read each hit, and keep the rule when the hits are real defects. `no-raw-locators`, `no-nth-methods` and `no-get-by-title` flag deliberate code in many suites, such as an iframe found by its `title` or a list-order check. `prefer-native-locators` fits most suites.

```js
// eslint.config.js
import playwright from 'eslint-plugin-playwright';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    files: ['tests/**/*.ts', 'e2e/**/*.ts', 'playwright.config.ts'],
    extends: [tseslint.configs.base],
    languageOptions: { parserOptions: { projectService: true } },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },
  {
    ...playwright.configs['flat/recommended'],
    files: ['tests/**/*.{spec,setup}.ts', 'e2e/**/*.{spec,setup}.ts'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/missing-playwright-await': 'error',
      'playwright/no-focused-test': 'error',
      'playwright/prefer-web-first-assertions': 'error',
      'playwright/expect-expect': ['warn', { assertFunctionPatterns: ['^(assert|expect)[A-Z]'] }],
    },
  },
);
```

oxlint runs the same plugin as is. List it under `"jsPlugins": ["eslint-plugin-playwright"]`, put the rules in `overrides` as `playwright/<rule>`, and run `oxlint --type-aware` for `typescript/no-floating-promises`.

## Reading a Red Build

Report by root cause, not by job. Download the failed job logs and the reports, then:

1. Lead with a short summary. Group the same test failing across browsers, or the same error across tests, into one line.
2. Sort each cause: regression from this commit, known flake, infrastructure, or platform-specific.
3. Call out only what this commit introduced. Most red on a busy branch was already there.
4. List the full failures underneath, as test, location, and error.

Use `playwright-reliability` to tell a flake from a regression over several runs.

## Upgrading Playwright

- Pin an exact version of `@playwright/test`, and keep any Docker image on the same version.
- Upgrade in its own PR, and read the Breaking Changes section of the release notes first.
- Run the whole suite, not only the smoke job. A behavior change can make a passing action time out, or a failing one pass.
- If a test changes outcome, prove it with two side-by-side installs (see `playwright-debugging`).

## Anti-Patterns

- One giant CI job with no artifacts.
- Browser matrix before basic stability.
- Hidden flaky tests rerun until green without tracking.
- Uploading separate HTML reports for each shard with no merged report.
- Putting slashes such as `1/3` in artifact names.
- Running tests with no lint gate, so a missing `await` reaches CI as a flake.
- Turning off `expect-expect` when helpers assert. Configure `assertFunctionPatterns` for them.

## Cross-References

- Config strategy: `playwright-config`
- Flake classification: `playwright-debugging`, `playwright-reliability`
- Auth bootstrap: `playwright-auth`

## Validation

- The workflow uses the project's package manager and test script, not this cookbook's.
- The lint job runs `eslint-plugin-playwright` and `no-floating-promises` over specs and helpers, and passes.
- Locally, `npx playwright test --shard=1/2` (or the project's equivalent) parses and runs.
