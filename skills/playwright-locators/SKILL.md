---
name: playwright-locators
description: Use when choosing how to find elements in Playwright, refactoring CSS selectors to semantic ones, fixing locator-related flakes, deciding when a `data-testid` is appropriate, or working with iframes/shadow DOM. Defines the locator priority that makes tests resilient to markup changes.
---

# Playwright Locators

Your locator strategy determines how well a Playwright suite ages. Get it right and a CSS class rename never breaks a test. Get it wrong and every refactor becomes a sweep across the suite.

## The Priority

Use the highest-priority locator that uniquely identifies the element. Fall back only when none of the higher-priority options apply.

| # | Locator | Use for | Why it's resilient |
|---|---------|---------|---------------------|
| 1 | `getByRole(role, { name })` | Anything interactive or semantic: buttons, links, headings, form fields, dialogs, lists | Matches what users (and assistive tech) perceive. Survives markup changes that preserve meaning. |
| 2 | `getByLabel(text)` | Form fields with `<label>`, `aria-label`, or `aria-labelledby` | Stable as long as the visible label is. Doubles as an accessibility check. |
| 3 | `getByPlaceholder(text)` | Inputs with no label (rare; usually a sign the form needs a label) | Stable but means the form has an accessibility gap. |
| 4 | `getByText(text)` | Static copy, status messages, non-interactive content | Stable while the copy is. Don't use for buttons; use `getByRole`. |
| 5 | `getByTestId(id)` | Genuinely unsemantic UI: drag handles, canvases, decorative containers used for hit-testing | Stable but bypasses accessibility. Treat as a last resort, not a default. |
| 6 | `locator('css=...')` / `xpath=` | Truly nothing else works | Brittle. Every CSS locator is a future broken test. |

## Why Role-Based Locators Win

`getByRole('button', { name: 'Submit' })` is resilient because three things have to change at once for it to break: the element type stops being a button, the accessible name changes, and no semantic alternative exists. CSS selectors break when any class is renamed.

```ts
// Bad — three different ways to break this
page.locator('div.action-bar > button.btn-primary.submit-btn[data-id="submit"]');

// Good — survives all three of: tag change, class rename, attribute removal
page.getByRole('button', { name: 'Submit' });
```

## The Catalogue

```ts
// Buttons / links / headings
page.getByRole('button', { name: 'Submit', exact: true });
page.getByRole('button', { name: /submit/i });             // regex for flexibility
page.getByRole('link',   { name: 'Home' });
page.getByRole('heading',{ name: 'Welcome', level: 1 });   // level pins to <h1>

// Form fields
page.getByRole('textbox',  { name: 'Email' });
page.getByRole('checkbox', { name: 'Remember me' });
page.getByRole('combobox', { name: 'Country' });
page.getByRole('radio',    { name: 'Express delivery' });
page.getByLabel('Email address');                          // by associated <label>
page.getByLabel('Password', { exact: true });

// Regions and landmarks
page.getByRole('navigation', { name: 'Primary' });
page.getByRole('main');
page.getByRole('dialog');
page.getByRole('alert');

// Lists
page.getByRole('list').getByRole('listitem');

// Static copy
page.getByText('Welcome back');
page.getByText(/^Welcome/);

// Last resort
page.getByTestId('drag-handle');
```

## Filtering and Chaining

These two patterns replace 90% of the cases where you'd reach for a CSS selector.

### `filter()`: narrow a locator by predicate

```ts
// Find the listitem that contains "Out of stock"
page.getByRole('listitem').filter({ hasText: 'Out of stock' });

// The listitem that does *not* contain "Out of stock"
page.getByRole('listitem').filter({ hasNotText: 'Out of stock' });

// The listitem that contains a Buy button
page.getByRole('listitem').filter({
  has: page.getByRole('button', { name: 'Buy' }),
});

// Combine — the listitem with text "Pro plan" that has a Buy button
page.getByRole('listitem')
    .filter({ hasText: 'Pro plan' })
    .filter({ has: page.getByRole('button', { name: 'Buy' }) });
```

### Chaining: descend into a locator

```ts
// The heading inside the article
page.getByRole('article').getByRole('heading');

// The Cancel button inside the dialog
page.getByRole('dialog').getByRole('button', { name: 'Cancel' });
```

A chained locator scopes its descendant search to the parent. This is how you write components that stay safe when other parts of the page have similar elements.

## Indexing

Use sparingly. Reaching for an index usually signals that you should filter instead.

```ts
page.getByRole('listitem').first();
page.getByRole('listitem').last();
page.getByRole('listitem').nth(2);   // 0-indexed
```

If you reach for `nth(3)` because it's "the one with the price", filter by text instead. The index changes when items reorder; the filter doesn't.

## Test IDs: When and How

`data-testid` is a tool, not a default. Reach for it only when:

- The element has no semantic role (decorative containers, drag handles, canvases).
- The accessible name is dynamic and unstable (auto-generated IDs in copy).
- You're testing visual or layout properties of an otherwise unsemantic element.

If you're adding `data-testid` to a button instead of giving it a proper accessible name, you're hiding an accessibility bug. Fix the button.

Configure the attribute name once in your config:

```ts
// playwright.config.ts
use: {
  testIdAttribute: 'data-testid',  // default; or 'data-qa', 'data-pw', etc.
}
```

## Iframes

Iframes are not part of the document tree by default. You must enter them explicitly with `frameLocator`.

```ts
const stripeFrame = page.frameLocator('iframe[name="stripe-card"]');
await stripeFrame.getByLabel('Card number').fill('4242424242424242');

// Nested
const inner = page.frameLocator('#outer').frameLocator('#inner');
await inner.getByRole('button', { name: 'Submit' }).click();
```

When third-party iframes (Stripe, reCAPTCHA, Auth0) cause flakes, the answer is usually network mocking. See `playwright-network-mocking`.

## Shadow DOM

Playwright pierces shadow DOM by default for semantic locators. If your component uses shadow roots, `getByRole` and friends still work without ceremony.

```ts
// Just works — Playwright finds the button inside the shadow root
page.getByRole('button', { name: 'Submit' });
```

## Anti-Patterns

| Anti-pattern | Failure mode | Fix |
|---|---|---|
| `page.locator('.btn-primary')` | Class rename breaks every test | `page.getByRole('button', { name: '…' })` |
| `page.locator('#user-123')` | Generated IDs change | Filter by text or role + accessible name |
| `page.locator('div > nav > ul > li:nth-child(2) > a')` | Any markup change breaks it | `page.getByRole('navigation').getByRole('link', { name: 'Settings' })` |
| `data-testid` on a button instead of an accessible name | Tests pass while a11y rots | Add the accessible name; let `getByRole` find it |
| `nth(3)` because items reorder | Off-by-one when data changes | `filter({ hasText: '…' })` |
| Selector strings in specs | Refactor blast radius | Move into a component or page (see `playwright-architecture`) |

## Debugging Locators

When a locator isn't matching what you expect:

```ts
// Highlight the element in headed mode
await page.getByRole('button').highlight();

// Count matches — if !== 1 you have a uniqueness problem
const count = await page.getByRole('button', { name: 'Save' }).count();

// Open the inspector
// PWDEBUG=1 npx playwright test
```

Or use `npx playwright codegen <url>` to record interactions and watch which locators Playwright generates, then refine.

## Cross-References

- Locators are stored as fields on components and page objects, not in specs. See `playwright-architecture` and `playwright-components`.
- Assertions use these locators directly with web-first `expect()`. See `playwright-assertions`.
- When the same locator strategy needs to work across two implementations (React vs. Svelte, themed UIs), see `playwright-components` for the interface pattern.

## Quick Quality Checklist

- Specs do not construct objects directly; fixtures own spec-visible wiring.
- No sleeps (`waitForTimeout`) used as synchronization.
- Locators are semantic first (`getByRole`/`getByLabel`) and centralized.
- Network behavior is intentional: mocked or explicitly integration-tagged.
- Changes include at least one reproducible command/example.
