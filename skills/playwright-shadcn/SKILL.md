---
name: playwright-shadcn
description: Use when testing shadcn/ui components built on base (`@base-ui/react`) with Playwright, or when a review treats "we use shadcn, so accessibility is handled" as settled. Covers what the primitives give you (real roles, keyboard, focus traps) versus what stays application code (the accessible name), the portal scoping every overlay needs, and the surfaces where a test id hides a missing name.
---

# Playwright shadcn (base-ui) Strategy

shadcn on base (`@base-ui/react`) ships accessible primitives. A `Select` trigger is a real `combobox`, a `Dialog` traps focus, a `Toast` lands in a live region, an icon `Button` is keyboard-focusable. None of that writes the accessible name. The name is your code, and a `data-testid` passes whether you wrote it or not.

So the failure mode shifts. Plain-HTML bad markup gives you div soup: no role, no keyboard, nothing to find. shadcn bad markup gives you a correct primitive with a missing name. The keyboard works. The role exists. The named query still fails, and a test id hides the gap.

This skill sits beneath `playwright-locators` and shares its verdict with `playwright-testid-strategy`: reach for the role and name first, and let a test id earn its place only when no name exists.

## The One Question

> Would you ship this component to a screen-reader user as it stands?

A shadcn `Dialog` with a `DialogTitle` passes. A user hears "Widget, dialog". The same `Dialog` with the title dropped still opens, still traps focus, and announces nothing a user can act on. The primitive is not the gap. The missing title is.

## What The Primitive Gives You, What You Wire

| Surface | base-ui gives you | You still wire | The query that proves it |
|---|---|---|---|
| Icon `Button` | a focusable `<button>` | `aria-label` (the icon has no text) | `getByRole('button', { name: 'Delete item' })` |
| `Dialog` | `dialog` role, focus trap, escape-to-close | `DialogTitle`, visible or `sr-only` | `getByRole('dialog', { name: 'Widget' })` |
| Field `Input` | a real input with keyboard support | `FieldLabel` tied by `htmlFor`/`id` | `getByLabel('Email address')` |
| `Select` | trigger `combobox`, popup `listbox`, `option`s | the field label that names the trigger | `getByRole('combobox', { name: 'Country' })` |
| `Toast` | a `Notifications` region, a live region, focus order | the toast title (`aria-labelledby`) | `getByRole('dialog', { name: 'Changes saved' })` |

For each row, `getByRole('button')` or `getByRole('dialog')` without a name still finds the element. Add the name to the query and it fails until your team supplies it. Test for the named role, not the role type.

## Build It Twice

The fastest way to know whether a selector proves anything is to build the surface twice: once with the roles base-ui renders, once as a div clone wired only with `data-testid`. Run the same query against both. A named-role query passes against the good markup and returns `toHaveCount(0)` against the clone, so it finds the element and proves a user could reach it. A test id passes against both, which is what hides the problem. The runnable demos for Select and Toast live in `src/40-shadcn-components`.

```ts
// good: base-ui Select renders a named combobox and real options
await expect(page.getByRole('combobox', { name: 'Country' })).toBeVisible();
await expect(page.getByRole('option', { selected: true })).toHaveText('United Kingdom');

// bad: a div clone with test ids has no role to reach
await expect(page.getByRole('combobox')).toHaveCount(0);
await expect(page.getByTestId('country-select')).toBeVisible(); // the only handle
```

## Scope Overlays At Page Level

A `Select` popup, a `Dialog`, and a `Toast` all portal to the end of `<body>`, outside the field or region they belong to. A query scoped to that region comes back empty. Scope at page level instead.

```ts
// the listbox renders outside the field, so the field-scoped query misses it
await expect(field.getByRole('option')).toHaveCount(0);
await expect(page.getByRole('option', { name: 'Spain' })).toBeVisible();

// a Dialog portals to the body — query the page, not the demo region
await page.getByRole('button', { name: 'Open widget' }).click();
await expect(page.getByRole('dialog', { name: 'Widget' })).toBeVisible();
```

When two regions share a name prefix, pass `exact: true` so `Widget dialog (good)` does not also match `shadcn widget dialog (good)`.

## axe And The Named Role Catch Different Things

Run axe over a shadcn `Dialog` with no title and it reports `aria-dialog-name`, a serious violation, so axe and a named-role query agree there. Run axe over an `Input` with a placeholder and no label and it stays quiet, because a placeholder counts toward the accessible name in the name computation. The label query still finds nothing, and the placeholder vanishes on the first keystroke. Neither check alone is enough. Keep both, and lean on the named-role query for the cases axe waves through.

## Anti-Patterns

| Anti-pattern | Failure mode | Fix |
|---|---|---|
| `data-testid` on an icon `Button` instead of a name | A real, focusable button that assistive tech announces as nothing | `aria-label` on the `Button`; let `getByRole('button', { name })` find it |
| A `Dialog` with no `DialogTitle` | Focus traps correctly, but the dialog has no accessible name | `DialogTitle`, `sr-only` when design wants no visible heading |
| A placeholder standing in for a `FieldLabel` | axe passes, `getByLabel` fails, the name disappears on the first keystroke | `FieldLabel` tied by `htmlFor`/`id`, from `useId()` so instances do not collide |
| Treating "we use shadcn" as accessibility coverage | Named queries fail across the app while click-and-test-id specs stay green | Test for named roles and labels, not role types |
| A region-scoped query for a portaled overlay | The popup renders at the body, so the query is empty | Scope the overlay query at page level |

## Naming Test IDs You Do Keep

When a test id earns its place behind a stable primitive, name it for the business concept in kebab-case: `checkout-primary-action`, `country-select`. Never `btn-1` or `select-2`. The full case for when a test id is the right call lives in `playwright-testid-strategy`.

## Cross-References

- The locator priority this skill sits beneath: `playwright-locators`.
- The default-or-fallback question for test ids: `playwright-testid-strategy`.
- Centralizing overlay and field selectors so a contract can change without touching specs: `playwright-page-objects`.
- Scanning for the accessibility gaps a test-id-only suite hides: `src/17-accessibility-axe`.
- Runnable demos for every case here, isolated with `setContent` and rendered live at `/cards/40`: `src/40-shadcn-components`.

## Quick Quality Checklist

- Every shadcn surface is reached by a named role or a label, not a role type or a test id.
- Icon buttons carry `aria-label`, dialogs carry a title, inputs carry a `FieldLabel`.
- Overlay queries (Select popup, Dialog, Toast) scope at page level, with `exact: true` when names share a prefix.
- Labels and dialog titles come from `useId()`-based ids, so a second instance does not cross-wire.
- A test id appears only when no name fits, named for the business concept, and the user-visible content is asserted separately.
