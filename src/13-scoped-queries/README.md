# Card 13: Scoped queries and selector policy

## Scenario

You want to avoid clicking the wrong Save button and reduce selector churn with a clear policy.

## Aim

- Scoped queries: find a container first (`getByRole('dialog', { name: 'Edit person' })`), then query inside it (`dialog.getByRole('button', { name: /^save$/i })`).
- Selector policy: `getByRole` (with name) for interactive elements; `getByLabel` for inputs; `getByTestId` for repeated or dynamic UI; CSS only as a last resort.
- Test IDs with context: `person-card:${id}` on the container, then role or text queries inside it.

## How it works

1. Open the page with `PersonPage.open(page, '1', '/cards/13')`, then trigger the dialog with `getByTestId('edit-person')`.
2. Find the dialog once, then scope the Name input and Save button to it.
3. Anchor the button name: `{ name: /^save$/i }`. An unanchored `/save/i` also matches "Save and close", so anchoring with `^` and `$` keeps the click on the exact Save button.
4. For repeated cards, query the container by test ID (`person-card:${id}` via `personCardLocator`), then use role and text queries inside it.

## When to use

- Every test that touches dialogs, tables, or repeated cards. Enforce in code review and optionally lint.
