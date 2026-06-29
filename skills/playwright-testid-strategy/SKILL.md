---
name: playwright-testid-strategy
description: Use when deciding whether a `data-testid` is justified, reviewing a PR that reaches for test ids, asserting that a conditional element is present or gone, or judging whether an aria-label is a real label or a test hook in disguise. Settles the "default or fallback" question that playwright-locators raises, with the cases where a test id is genuinely the only solution and the anti-patterns that hide accessibility bugs.
---

# Playwright Test ID Strategy

`playwright-locators` ranks `getByTestId` last and says reach for it only when nothing higher applies. This skill answers the next question: in the cases people actually argue about, is a test id the default they reached for too early, or the only honest handle left?

A test id is a fallback for the **test contract**, not a license to skip a role, a label, or keyboard support. The mistake was never using one. The mistake is using one without thinking.

## The One Question

> Would you ship this attribute to a user if no test existed?

A real accessible name passes: a screen-reader user wants to hear "Filter reviews". A test id fails, and that is fine — `data-testid` never enters the accessibility tree, so it costs the user nothing. The trap is the middle: an `aria-label` added only so a test can grab an element. That one ships to users as audible noise. It is worse than a test id, not better.

## Build It Twice

The fastest way to know whether a selector proves anything is to build the surface twice — once semantic, once test-id-only — and run the same query against both. A role query that passes against the good markup and fails against the bad one is doing two jobs: finding the element and proving a real user could too. A test id passes against both, which is exactly what hides the problem. The runnable demos live in `src/39-testid-strategy`.

## When a Test ID Is the Only Solution

These are real. Reach for the test id here without guilt, and assert the user-visible content separately when it matters.

- **An optional wrapper with no role of its own.** A box renders only when an optional value is set, and its only content is that value. Inverting a text query proves nothing: with the text gone, the query cannot tell an absent wrapper from a present-but-empty one. Give it a role first (`role="status"` for an announcement) so absence is provable. If no role fits, the wrapper test id is the only handle.

```ts
// a bug leaves an empty box on screen; a text inversion still reports green
await expect(region.getByText('50% off today')).toHaveCount(0); // satisfied, and misleading
await expect(region.getByTestId('promo-ribbon')).toBeVisible(); // the empty box is still there
```

- **A third-party widget that paints into a canvas or closed shadow root.** There is no role to query and no control to label. You own the wrapper, not the widget, so a wrapper test id is the only reach. Do not assert on the library's internal DOM — that tests the library, not your app.

```ts
await expect(region.getByRole('combobox')).toHaveCount(0);     // nothing to reach
await expect(region.getByTestId('booking-date-field')).toBeVisible(); // the only handle
```

- **A decorative element announced elsewhere.** An `aria-hidden` spinner whose loading state lives in a separate live region. A role query would find nothing by design, so the test id is correct.

## When the Markup Is One Change From Reachable

Before you mint a test id, check whether the element is one fix away from a semantic handle, because the same fix helps a user.

- A third-party `<input role="combobox">` ships with no name → add a `<label>` on the wrapper you own (`useId()` for the id, so a second instance does not cross-wire). Now `getByRole('combobox', { name })` works.
- A section has a visible heading but no programmatic name → point `aria-labelledby` at the heading. Now `getByRole('region', { name })` works, and the name is the heading a user already reads.
- A `<div onClick>` "button" → make it a `<button>`. A click test passes against a div, but a keyboard user cannot reach it; the Tab-and-Enter test that follows proves why the role query's rejection protects a real user.

## Anti-Patterns

| Anti-pattern | Failure mode | Fix |
|---|---|---|
| `aria-label` added only so a test can find an element | Overrides the visible heading in the a11y tree; the slug is announced to screen-reader users | Use the real name source: heading via `aria-labelledby`, control via `<label>`. A test id if you only need a test hook. |
| Asserting a conditional element is gone by text inversion alone | An empty-but-present wrapper passes; the bug ships | Give it a role and `queryByRole`, or assert the element by test id |
| `data-testid` on a button instead of an accessible name | Tests pass while the button is unreachable by keyboard and screen reader | Give the button its name; let `getByRole` find it |
| A placeholder standing in for a label | The name vanishes on first keystroke and is announced inconsistently | A `<label>` (visually hidden with `sr-only` if needed) or `aria-label` |
| A fixed `id` for `htmlFor`/`aria-labelledby` | A second instance cross-wires both labels to the first element | `useId()` (React) or an id prop, so each instance is unique |
| A test id on every nesting level (wrapper soup) | A second set of class names that identify nothing | Mark only what matters; scope by role, region, or row |
| `aria-label` on a section that already has a heading | Clobbers the heading name to serve a test | Drop the label; use `aria-labelledby` to the heading |

## Naming

If you do add one, name it for the business concept in kebab-case: `checkout-primary-action`, `booking-date-field`. Never `btn-1`, `add-2`, `test`, or a database primary key, which changes between a dev database and a fresh CI seed. Key repeated items on a stable identifier like a slug or SKU.

## Cross-References

- The locator priority this skill sits beneath: `playwright-locators`.
- The same verdict for components built on a library: `playwright-shadcn`, where the primitive has a role but the name is still your code.
- The localized version of the copy-churn question: `playwright-i18n`, where the translated name is the contract and a test id is the fallback.
- Centralizing selectors so a test id can change without touching specs: `playwright-page-objects` and `playwright-components`.
- Asserting presence and absence with web-first matchers: `playwright-assertions`.
- Scanning for the accessibility gaps a test-id-only suite hides: `src/17-accessibility-axe`.
- Runnable good/bad demos for every case here: `src/39-testid-strategy`.

## Quick Quality Checklist

- Every test id carries a reason: clearer, more stable, or the only option — never a shortcut past a missing role or name.
- No `aria-label` exists only to be queried; each one is a name you would ship to a user.
- Conditional elements assert presence and absence by role or test id, never by text inversion alone.
- Inputs are reached by label, not placeholder; label ids come from `useId()`, not fixed strings.
- Test ids name the business concept in kebab-case and key repeated items on a stable identifier.
