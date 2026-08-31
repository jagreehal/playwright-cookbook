---
name: playwright-projects-tags
description: >-
  Designs Playwright project matrices and tag taxonomy for smoke, PR, and
  nightly runs. Use this skill when splitting smoke/integration/visual tests,
  adding setup dependencies, or deciding how tests are filtered in CI. Do not
  use for playwright.config.ts timeouts and retries (playwright-config) or CI
  YAML (playwright-ci).
---

# Playwright Projects & Tags

Project and tag strategy decides whether the suite stays fast as it grows or buckles under runtime.

## Critical rules

- Tags encode execution intent (`@smoke`, `@integration`, `@visual`), not team names.
- Setup ordering uses `dependencies`, not implicit file order.

## Workflow

1. Doctor the consuming repo: find existing projects, grep/tags, and CI job commands.
2. Add or tighten the matrix and tag taxonomy below. Point CI at `--grep @smoke` for PRs if that is the split.
3. Validate with `npx playwright test --list --grep @smoke` (or the project's tags) and confirm the count matches intent.

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

## Validation

- `npx playwright test --list --grep @smoke` (or the project's tags) returns the intended subset.
- Setup projects are declared with `dependencies`.
