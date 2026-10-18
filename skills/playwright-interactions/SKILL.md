---
name: playwright-interactions
description: >-
  Drive the browser surfaces that plain click and fill miss: native form
  controls, alert/confirm/prompt dialogs, iframes and shadow DOM, keyboard
  shortcuts and focus order, drag and drop, tables and grids, and timers
  through page.clock. Use this skill when a test touches one of these
  surfaces, waits on a real timer, or reads table order. Do not use for
  choosing locators in general (playwright-locators), assertion style
  (playwright-assertions), or flake diagnosis (playwright-reliability).
---

# Interactions

Each surface below has one Playwright API built for it. Use that API and the test stays short and stable.

## Critical rules

- Register a dialog handler before the click that opens the dialog. Playwright dismisses unhandled dialogs, so an unhandled `confirm()` returns `false`.
- Enter frames with `frameLocator()` or `locator().contentFrame()`. Role and text locators pierce open shadow roots; XPath and closed roots stay out of reach.
- Use `fill()` for plain fields and `pressSequentially()` only when the widget listens to key events.
- Assert table order with `expect(rows).toHaveText([...])`. It retries; `allTextContents()` reads once.
- Install `page.clock` before the page loads. Pause it with `pauseAt()` when the test counts ticks.
- No `waitForTimeout`. Move the fake clock or wait on a web-first assertion.

## Workflow

1. Doctor the consuming repo: `playwright.config.*`, `testDir`, the `test`/`expect` import, package manager. Adapt; do not invent a parallel tree.
2. Name the surface (form control, dialog, frame, keyboard, drag, table, timer) and pick its API from the table below.
3. Scope locators to the region, frame, or row first, then act inside it.
4. Assert the user-visible outcome with a web-first matcher.
5. Run the focused spec with the project's test script.

## API by surface

| Surface | Use | Avoid |
|---|---|---|
| Checkbox, radio | `check()`, `setChecked()`, `toBeChecked()` | `click()` and reading `checked` |
| Native select | `selectOption({ label })`, `toHaveValue()` / `toHaveValues()` | clicking `<option>` |
| Validation | `toHaveAccessibleDescription()`, `getByRole('alert')` | CSS on error classes |
| Browser dialog | `page.once('dialog', d => d.accept(text))` | a handler added after the click |
| Iframe | `page.frameLocator('iframe[title="…"]')`, `contentFrame()` | `page.frames()[n]` |
| Shadow DOM | `getByRole()` from the page | XPath into a shadow root |
| Shortcut | `locator.press('ControlOrMeta+A')` | OS-specific `Meta`/`Control` |
| Focus order | `keyboard.press('Tab')`, `toBeFocused()` | checking `document.activeElement` |
| HTML5 drag | `source.dragTo(target)` | synthetic `DragEvent` dispatch |
| Pointer drag | `mouse.move/down/up` with `{ steps }` | one jump past the drag threshold |
| Table row | `getByRole('row').filter({ hasText })` | `nth()` on rows |
| Timer | `clock.install()`, `runFor()`, `fastForward()` | `waitForTimeout()` |
| Date | `clock.setFixedTime(date)` | `new Date()` in the assertion |

## Examples

```ts
// Dialog: handler first, then the trigger
page.once('dialog', (dialog) => dialog.accept('Hello'));
await page.getByRole('button', { name: 'Rename' }).click();

// Frame, then act inside it
const payment = page.frameLocator('iframe[title="Payment"]');
await payment.getByLabel('Card number').fill('4242424242424242');

// Row-scoped action, order checked with a retrying matcher
const row = page.getByRole('row').filter({ hasText: 'Kai' });
await row.getByRole('button', { name: 'Delete' }).click();
await page.getByRole('columnheader', { name: 'Name' }).click();
const dataRows = page.getByRole('row').filter({ has: page.getByRole('cell') });
await expect(dataRows).toHaveText([/^Ada/, /^Nova/]);

// Debounce: advance time between keystrokes so the reset is tested
const T0 = new Date('2026-01-01T00:00:00Z');
const search = page.getByRole('searchbox');
const results = page.getByRole('listitem');
await page.clock.install({ time: T0 });
await page.clock.pauseAt(T0);
await page.goto('/search');
await search.pressSequentially('pl');
await page.clock.runFor(200);
await search.pressSequentially('ay');
await page.clock.runFor(299);
await expect(results).toHaveCount(0);
await page.clock.runFor(1);
await expect(results).not.toHaveCount(0);
```

## Validation

- Run the focused spec with the project's test script, for example `npx playwright test <file>`. Expect a pass.
- Re-run with `--repeat-each=5`. Timer and drag tests that pass once and fail later are missing a `pauseAt()` or a `scrollIntoViewIfNeeded()`.
- Grep the spec for `waitForTimeout`, `allTextContents`, and `nth(`. Each needs a reason to stay.

## Constraints

- `dragTo` does not scroll during the drag. Scroll the drop target into view first when it can sit below the fold.
- `fastForward` fires each due timer once. Use `runFor` to see every interval tick.
- `setFixedTime` pins `Date` and leaves timers on real time.

## Related skills

- `playwright-locators`: locator priority and scoping
- `playwright-assertions`: web-first matchers
- `playwright-reliability`: diagnosing a flake before changing the test
