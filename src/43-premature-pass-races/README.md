# Card 43: Premature-Pass Races (Assertions That Go Green Too Early)

The portable agent skills for this pattern are `playwright-assertions` and `playwright-reliability`.

## What This Pattern Solves

Auto-waiting fixes the assertions that would otherwise fail too early. It does nothing for the assertions that *pass* too early. Every matcher settles the moment its condition first holds, so any condition that is already true on a half-rendered page is green before the app has done anything at all.

These are the worst kind of flake, because they usually do not flake. They pass in CI for months, and the day the feature breaks they keep passing.

Four shapes cover almost all of them.

| Shape | Why it passes early | Fix |
|-------|---------------------|-----|
| Absence (`toHaveCount(0)`, `not.toBeVisible()`) | The element is missing *because the page has not rendered yet* | Wait for a positive landmark first |
| Silent success (busy already hidden) | You only asserted the end state, which is also the never-started state | Assert busy appears, then clears |
| Sync read + static `expect` | `innerText()` resolves once; `toContain` matches text that is already on screen | Pass the locator to the matcher, not the string |
| Re-fetch that renders the same thing | Nothing visible changes, so the matcher matches the *stale* DOM | Register `waitForApi` before the click |

## Code Example

The absence race, and the landmark that fixes it:

```typescript
// Bad: the page is still on "Loading…", so of course the button is absent.
await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0); // green, and wrong

// Good: something rendered in the same pass tells you the render happened.
await expect(page.getByText('Approved')).toBeVisible(); // landmark
await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0); // now meaningful
```

Rewriting `not.toBeVisible()` as `toHaveCount(0)` does not help — they share the race. Only the landmark does.

The re-fetch race, where no assertion on the rendered output can save you. `waitForApi` (card 15) is the network done signal; the matcher covers the last DOM write after `fetch().json()`:

```typescript
import { waitForApi } from '../e2e-patterns/helpers/waitForApi';

// Sorting by a second key returns the same names in the same order.
const sorted = waitForApi(page, { urlPart: '/api/rows?sort=date' }); // register first
await page.getByRole('button', { name: 'Sort by date' }).click();
await sorted; // the network done signal
await expect(page.getByRole('list')).toHaveAttribute('data-sort', 'date');
```

Put the register-then-act call on the region or page object that owns the control, using `waitForApi`. A wait strategy that each spec author has to remember is a wait strategy you do not have.

## Run This Example

```bash
pnpm test src/43-premature-pass-races
```

False-green tests hold the broken assertion (those lines really do pass). Fix tests are separate, so a leftover in-flight request cannot make the good path look solved.

## Prerequisites

- **Card 15**: done signals and `waitForApi`. Absence, a silent Save, and a snapshot read have no useful network signal — they survive `waitForApi`. The re-fetch case is why `waitForApi` exists.

## Common Mistakes

1. **Swapping `not.toBeVisible()` for `toHaveCount(0)`** and calling it fixed. Same race, different spelling.
2. **Asserting absence right after `goto`**. The most common false green in any suite.
3. **`const text = await locator.innerText(); expect(text).toContain(...)`**. Auto-waiting is not a bonus you get from using Playwright; it is a property of `expect(locator)`. Mix in a synchronous read and it is gone. `toContain` is the usual false green: the stale snapshot already holds the substring.
4. **Asserting only that busy/`role="status"` is hidden.** A Save that never starts is already in that state. Assert that busy appears, then that it clears.
5. **Reaching for `waitForTimeout` once you spot one of these.** A sleep makes the false green slower, not truer.

## When to Use This Pattern

- ✓ Any assertion that something is *not* there.
- ✓ Downloads, autosaves, and other actions with no visible completion.
- ✓ Sort, filter, and pagination controls that re-fetch.
- ✗ Assertions on state that only exists after an action you already awaited — the action's own auto-wait covers it.

## Related Patterns

- **Previous**: Card 15 (Done Signals) — `waitForApi` for the re-fetch; the other three shapes are the races that slip past a network wait.
- **Complementary**: Card 14 (Region Objects) and Card 26 (Full Architecture) — the place to put the landmark and register-then-act helpers so no spec has to remember them.
