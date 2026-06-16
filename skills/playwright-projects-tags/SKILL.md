---
name: playwright-projects-tags
description: Design Playwright project matrices and tag taxonomy for selective local, PR, and nightly runs. Use when splitting smoke/integration/visual tests, adding setup dependencies, avoiding duplicated project coverage, or deciding how tests should be filtered in CI.
---

# Playwright Projects & Tags

Project and tag strategy decides whether the suite stays fast as it grows or buckles under runtime.

## Non-Negotiables

1. Use tags to encode execution intent (`@smoke`, `@integration`, `@visual`), not ownership/team names.
2. Use project dependencies for setup/bootstrap ordering.
3. Keep local default run fast; run heavier categories in CI/nightly.
4. Avoid overlapping project/tag definitions that run the same test twice unintentionally.

## Worked Example

```ts
// playwright.config.ts
projects: [
  { name: 'setup', testMatch: /.*\.setup\.ts/ },
  {
    name: 'chromium-smoke',
    grep: /@smoke/,
    dependencies: ['setup'],
  },
  {
    name: 'chromium-integration',
    grep: /@integration/,
    dependencies: ['setup'],
  },
]
```

```ts
// e2e/checkout.spec.ts
test('guest checkout @smoke', async ({ page }) => {
  // ...
});

test('checkout handles payment provider timeout @integration', async ({ page }) => {
  // ...
});
```

```bash
# local fast cycle
npx playwright test --project=chromium-smoke

# nightly deeper run
npx playwright test --project=chromium-integration
```

## Anti-Patterns

- Tags added ad-hoc with no taxonomy.
- Same test matched by multiple projects unintentionally.
- Using tags to compensate for flaky tests instead of fixing them.
- Setup logic duplicated per project instead of dependencies.

## Cross-References

- Config fundamentals: `playwright-config`
- CI usage: `playwright-ci`
- Auth setup project: `playwright-auth`
- Flake triage: `playwright-reliability`

## Quick Quality Checklist

- Tag taxonomy is documented and enforced.
- Project filters are mutually intentional.
- Setup ordering uses dependencies, not implicit assumptions.
- PR job runs a fast meaningful subset.
- Nightly job covers integration/deeper scenarios.
