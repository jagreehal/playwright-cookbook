# Card 18: Stability and visual checks

## Scenario

You want to reduce timing flake from animations and transitions, and use visual assertions where they add value.

## Aim

- Disable animations: inject CSS (`* { transition: none !important; animation: none !important; }`) so the UI settles predictably.
- Strict locators: scope queries (container first, then role inside) so Playwright's strict mode catches ambiguity, and fix duplicate matches when they appear.
- Visual checks: use `expect(locator).toHaveScreenshot()` on a component, such as the person card, so the snapshot stays small and a diff points straight at the changed element.

## How it works

1. A `beforeEach` adds an init script that injects a style tag to disable transitions and animations. The script guards on `document.documentElement`: it injects immediately when the root exists, and falls back to a `DOMContentLoaded` listener otherwise, so it does not throw when it runs before the document is ready.
2. The first test opens `/cards/18`, scopes to the dialog, then clicks the Save button inside it. Scoping keeps the locator strict so an accidental duplicate match fails loudly.
3. The second test opens `/cards/18`, scopes to the person card, and compares it with `toHaveScreenshot('person-card.png')`. The first run writes the snapshot; later runs diff against it.

## When to use

- Enable animation-disabling in CI or for flaky tests.
- Reach for component screenshots on critical UI areas, since a focused snapshot is more stable and easier to review than a full-page one.
