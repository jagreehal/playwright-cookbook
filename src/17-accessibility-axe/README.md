# Card 17: Axe accessibility scan

## Scenario

You want to catch accessibility violations in the page under test without manual checks.

## Aim

- Run an axe accessibility scan (via `@axe-core/playwright`) on the loaded page.
- Assert zero violations so regressions fail the test.

## How it works

1. Install `@axe-core/playwright`.
2. After `page.goto('/cards/17')`, create an `AxeBuilder({ page })` and call `analyze()`.
3. Attach the violations to the test report so a failure is inspectable: `testInfo.attach('axe-violations', { body: JSON.stringify(violations, null, 2), contentType: 'application/json' })`.
4. Assert `violations` has length 0.

### Scoping the scan

This card calls `.disableRules(['region', 'color-contrast'])`. Scoping keeps the scan focused on what the test owns:

- `region` fires on this layout pattern, not on a real defect, so it adds noise.
- `color-contrast` here flags the code-highlight theme rather than the application UI.

Disabling `color-contrast` can hide genuine contrast failures, so turn it off only for known-noise areas and keep it on for the rest of your suite.

The standard scoping options are:

- `.withTags(['wcag2a', 'wcag2aa'])` to run only rules under chosen tags.
- `.include('main')` to scan one part of the page.
- `.exclude('.code-block')` to skip a region you do not control.

Prefer narrowing scope with `.include()` or `.exclude()` over disabling rules, so you keep coverage where it counts.

## When to use

- Any critical user flow or layout. Run axe alongside functional assertions.
- CI: fail the build when new violations appear, and read the attached report to see which rule fired.
