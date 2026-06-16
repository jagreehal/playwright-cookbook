# Card 12: Locators → Actions → Flows (3-layer model)

## Scenario

You want selectors centralized, waits consistent, and tests readable without giant page objects.

## Aim

- **Locators**: return Locators only (no clicks, no expects).
- **Actions**: one interaction + a "done signal" (e.g. wait for URL or element).
- **Flows**: business steps composed from actions; expose **assertLoaded()** and **return next page** (e.g. `PersonPage`).

## How it works

1. `src/e2e-patterns/person/locators.ts`: `personPageLocators(page)` returns `{ heading, name, height, ... }`.
2. `src/e2e-patterns/person/actions.ts`: `loadPersonPage(page, id, '/cards/12')` does the goto and waits for the heading to be visible.
3. `src/e2e-patterns/person/PersonPage.ts`: `PersonPage` has `assertLoaded()` and a static `PersonPage.open(page, id, '/cards/12')` that loads the page and returns the page object (the return-next-page pattern).

## When to use

- Default structure for any screen or flow; keeps tests describing behavior, not selectors.
