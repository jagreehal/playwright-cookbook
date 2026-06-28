# Card 39: Test ID strategy — when a test id earns its place

## Scenario

A reviewer keeps finding `data-testid` reached for too early, and `aria-label` reached for as a "more accessible" test hook. You want a runnable answer to "is this test id justified, or is it hiding a missing role or name?"

## Aim

- Show the cases where a test id is genuinely the only solution: a conditional wrapper with no role, a canvas/shadow widget with no control, a decorative element.
- Show the anti-pattern that looks accessible and is not: an `aria-label` added only so a test can grab an element, which clobbers the visible heading in the accessibility tree.
- Prove why a text inversion does not assert a conditional wrapper is gone, and what does.
- Show that a click test passes against a `<div onClick>` while the keyboard test catches it.

## How it works

1. Each test builds the surface twice with `page.setContent` — once semantic, once test-id-only — and runs the same query against both. The good/bad markup is the subject under test, so it stays in the spec rather than in the app (the same spirit as the isolated-component test in `src/28-component-testing`).
2. A role or label query that passes against the good markup and returns `toHaveCount(0)` against the bad one is doing two jobs: finding the element and proving a real user could too.
3. The conditional-wrapper test mounts a buggy empty box and shows the text inversion stays green while `getByTestId(...)` plus `toHaveText('')` catches it.
4. The keyboard test focuses a field, presses `Tab`, and asserts focus lands on a real `<button>` but never on the `<div>`.

## When to use

- In review, when judging whether a `data-testid` or an `aria-label` is justified.
- As the companion to the `playwright-testid-strategy` skill and the `playwright-locators` priority.

## Run

```bash
pnpm test src/39-testid-strategy
```
