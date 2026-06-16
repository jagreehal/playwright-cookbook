---
name: playwright-visual-regression
description: Add Playwright screenshot regression tests with deterministic rendering, scoped baselines, and CI-safe review policy. Use when adding `toHaveScreenshot`, debugging visual diffs, stabilizing snapshots, or deciding which UI regions should have visual coverage.
---

# Playwright Visual Regression

Visual tests are high-signal only when rendering is deterministic. This skill defines the minimum policy.

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

## Quick Quality Checklist

- Visual tests are tagged and isolated.
- Animations/caret are disabled in screenshot assertions.
- Environment (viewport/timezone/locale) is pinned.
- Snapshots focus on stable, high-value regions.
- Diff review process is explicit in PR flow.
