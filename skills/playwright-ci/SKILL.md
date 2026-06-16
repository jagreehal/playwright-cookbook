---
name: playwright-ci
description: Use when setting up Playwright in CI, sharding tests, caching browsers/deps, publishing artifacts, and enforcing quality gates for large suites. Covers deterministic, fast, debuggable CI execution.
---

# Playwright CI

CI proves test quality. Aim for fast feedback and rich failure artifacts, not raw pass rate.

## Baseline CI Policy

1. Block `test.only` on CI.
2. Run with retries on CI, zero retries locally.
3. Use blob reports for sharded CI, then merge into one HTML report.
4. Shard once suite runtime exceeds ~5 minutes.
5. Separate smoke and integration jobs.

## GitHub Actions Baseline

```yaml
name: e2e
on: [push, pull_request]

jobs:
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

## Anti-Patterns

- One giant CI job with no artifacts.
- Browser matrix before basic stability.
- Hidden flaky tests rerun until green without tracking.
- Uploading separate HTML reports for each shard with no merged report.
- Putting slashes such as `1/3` in artifact names.

## Cross-References

- Config strategy: `playwright-config`
- Flake classification: `playwright-debugging`, `playwright-reliability`
- Auth bootstrap: `playwright-auth`

## Quick Quality Checklist

- Specs do not construct objects directly; fixtures own spec-visible wiring.
- No sleeps (`waitForTimeout`) used as synchronization.
- Locators are semantic first (`getByRole`/`getByLabel`) and centralized.
- Network behavior is intentional: mocked or explicitly integration-tagged.
- Changes include at least one reproducible command/example.
