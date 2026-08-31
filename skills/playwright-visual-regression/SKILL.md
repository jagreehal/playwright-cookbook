---
name: playwright-visual-regression
description: >-
  Adds Playwright screenshot tests with deterministic rendering and CI-safe
  review. Use this skill when adding toHaveScreenshot, debugging visual diffs,
  or deciding which regions get snapshots. Do not use for functional
  assertions (playwright-assertions) or project/tag splits
  (playwright-projects-tags).
---

# Playwright Visual Regression

Visual tests are high-signal only when rendering is deterministic. This skill defines the minimum policy.

## Critical rules

- Disable animations and hide the caret. Pin viewport, timezone, and locale.
- Snapshot stable, high-value regions. Tag visual tests and isolate them in a project.

## Workflow

1. Doctor the consuming repo: find existing screenshot tests, CI OS, and whether fonts/animations already differ across runners.
2. Add a visual project with pinned rendering. Scope snapshots. Set a review policy for diffs.
3. Validate with `npx playwright test --project=<visual-project>` (or `--grep @visual`). Expect a pass on a clean baseline; a real UI change should fail the snapshot.

## Non-Negotiables

1. Disable animations during screenshot assertions.
2. Stabilize viewport, timezone, locale, and fonts in CI.
3. Keep snapshots scoped to meaningful UI regions where possible.
4. Use separate tags/projects for visual runs.

## Worked Example

```ts
import { test, expect } from '@playwright/test';

test('settings header visual @visual', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

  await expect(page.getByRole('main')).toHaveScreenshot('settings-main.png', {
    animations: 'disabled',
    caret: 'hide',
    scale: 'css',
  });
});
```

```ts
// playwright.config.ts (visual project example)
{
  name: 'chromium-visual',
  grep: /@visual/,
  use: {
    viewport: { width: 1280, height: 720 },
    timezoneId: 'UTC',
    locale: 'en-GB',
  },
}
```

## Anti-Patterns

- Full-page snapshots for highly dynamic pages by default.
- Running visual tests in mixed environments with different fonts/renderers.
- Allowing large threshold drift without ownership.
- Mixing functional and visual assertions in one noisy test.

## Cross-References

- Project/tag strategy: `playwright-projects-tags`
- CI determinism: `playwright-ci`, `playwright-config`
- Debugging diffs: `playwright-debugging`

## Validation

- Run the visual project or `@visual` grep. Expect a pass on an unchanged UI.
- Animations/caret are disabled. Viewport/timezone/locale are pinned.
