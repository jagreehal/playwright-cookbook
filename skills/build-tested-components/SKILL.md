---
name: build-tested-components
description: Use when building a new UI component or feature with its tests, hardening an existing component for testability, or adding component/e2e coverage. Co-designs accessible markup with role-first selectors so the query that finds an element also proves a real user can reach it, then drives a two-tier test matrix (jsdom component tests + Playwright/axe journeys). Triggers on "build a component", "add tests for X", "write tests", "make this testable", "cover this component".
---

# Build Tested Components

A component and its tests are one design problem, not two. If you write the markup first and bolt tests on after, you reach for `data-testid` to find the `<div>` you should have made a `<button>`, and the test passes while the component is unreachable by keyboard or screen reader. Co-design instead: choose the accessible markup so a **role-first query** locates every element, then the same query that drives the test proves a real user could do the same thing. A passing role query is a free accessibility assertion. A passing test id tells you a string exists in the DOM and nothing else.

This skill produces two things together: an accessible component, and a thorough two-tier test suite for it. "Thorough" is defined by the coverage matrix below — not "more `expect`s", but one test per affordance, state, and failure the component actually has.

## Workflow

1. **Design the accessible surface first.** Before writing JSX, list how a user reaches each element: a button by its name, a field by its label, a region by its heading, a status by its live region. If an element has no user-facing handle, that is a markup bug to fix now, not a reason for a test id. This list *is* your selector list.
2. **Build with semantic elements.** Real `<button>`, `<form>`, `<label htmlFor>`, `<a href>`, landmarks (`<nav>`, `<main>`, `<section aria-labelledby>`), `role="status"`/`role="alert"` for async announcements. Icon-only controls get `aria-label`; decorative icons get `aria-hidden="true"`.
3. **Centralize selectors** in a component object / page object (see below) so specs read as behaviour and a markup change touches one file.
4. **Write component-tier tests** (jsdom + Testing Library) covering the matrix. Fast, isolated, one query-level fact per test.
5. **Write an e2e journey** (Playwright) for the real user path through the feature, plus an `axe` pass on the rendered surface.
6. **Run both tiers and the type check. Paste the green output.** A test suite you describe but do not run is not done.

## Author for the Locator Priority

Build so the highest-priority locator that uniquely identifies an element actually works. Falling down this list is a signal to fix markup, not to skip a rung.

| # | Query | Element | If it fails, the fix is |
|---|---|---|---|
| 1 | `getByRole(role, { name })` | buttons, links, headings, fields, dialogs, lists, landmarks | make it a real semantic element with an accessible name |
| 2 | `getByLabel(text)` | form fields | tie a `<label htmlFor>` (or `aria-label`) to the input |
| 3 | `getByText(text)` | static copy, status messages | — (good for non-interactive content only) |
| 4 | `getByTestId(id)` | genuinely unsemantic UI, or a stable contract for dynamic/localized/repeated/3rd-party cases | give it a reason (see "Test IDs") |

Reach for `getByTestId` only after the user-facing options genuinely run out. A test id on a button instead of an accessible name hides an accessibility bug — fix the button.

## The Coverage Matrix — "more tests, but the right ones"

For each component, write a test for every row that applies. This is the checklist that turns "I added a test" into real coverage.

| Dimension | Test |
|---|---|
| **Renders** | default render exposes the expected roles/labels/headings |
| **Each affordance** | every button/link/field is reachable by role+name and does its job (`onX` fires with the right args) |
| **Each state** | loading, empty, success, and **error** each render and are announced (`role="status"`/`alert`) |
| **Async** | after the awaited action, the result appears via a live region the test reads the way a user is told |
| **Keyboard** | tab order and Enter/Space/Escape work on interactive elements (real `<button>`/`<form>` give this for free; verify it) |
| **Repeated items** | each row is selectable by a per-item accessible name, not by index; reorder doesn't break the query |
| **Negative / a11y proof** | the role/label query that *should* find an element is asserted present — and against any "bad"/legacy markup, asserted **absent** (`queryByRole(...)` → `null`). This is the test that catches the accessibility regression a test id would hide. |
| **Edge cases** | boundary props (zero items, long text, disabled, validation failure) render without breaking the contract |

The negative/a11y proof row is the one base agents skip. Include it: it is what makes the suite catch the bug that matters.

## Component-Tier Example (jsdom + Testing Library)

Fast, isolated, asserts whether a single query resolves. One behaviour per test.

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { LoginForm } from './LoginForm'

test('submits with the credentials a user could actually enter', async () => {
  const onSubmit = vi.fn()
  render(<LoginForm onSubmit={onSubmit} />)
  const user = userEvent.setup()

  // The selectors that find it also prove a user could.
  await user.type(screen.getByLabelText('Email address'), 'jag@example.com')
  await user.type(screen.getByLabelText('Password'), 'hunter2')
  await user.click(screen.getByRole('button', { name: 'Sign in' }))

  expect(onSubmit).toHaveBeenCalledWith({ email: 'jag@example.com', password: 'hunter2' })
})

test('the error state is announced, not just shown', async () => {
  render(<LoginForm onSubmit={() => { throw new Error('bad creds') }} />)
  await userEvent.setup().click(screen.getByRole('button', { name: 'Sign in' }))
  // role="alert" / role="status" — the test reads it the way a screen reader announces it.
  expect(await screen.findByRole('alert')).toHaveTextContent(/invalid/i)
})
```

When you also keep a deliberately broken variant, prove the role query fails against it — that failing assertion *is* the accessibility test:

```tsx
render(<LoginFormBad />)
expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull()  // it is a <div>
expect(screen.queryByLabelText('Email address')).toBeNull()           // placeholder, not a label
```

## E2E-Tier Example (Playwright + axe)

Real browser, real DOM, the full journey, plus an accessibility lint. Use web-first assertions (`await expect(...)`) — they auto-wait. Never `waitForTimeout` as synchronization.

```ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('a user signs in and lands on the dashboard', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email address').fill('jag@example.com')
  await page.getByLabel('Password').fill('hunter2')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})

test('the sign-in form has no serious accessibility violations', async ({ page }) => {
  await page.goto('/login')
  const results = await new AxeBuilder({ page }).include('form[aria-label="Sign in"]').analyze()
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious).toEqual([])
})
```

axe and role queries catch **different** bugs — a placeholder satisfies axe's name computation but `getByLabel` still finds nothing, and a user loses that placeholder the moment they type. Keep both; neither alone is enough.

## Decision Rules: Which Tier

- **Default a behaviour to the component tier.** It is faster, isolates one query, and shows a pass/fail in milliseconds. Most affordance/state/edge-case rows of the matrix live here.
- **Promote to e2e** when the test needs a real browser: multi-page journeys, real focus/scroll/layout, third-party iframes, network, or an `axe` pass. One e2e journey per feature is usually enough; do not re-test every prop permutation in the browser.
- **Run axe once per surface** at the e2e tier, scoped with `.include(...)` to the component under test.

## Centralize Selectors

Inline selectors in dozens of tests are the real maintenance pain — solve it with an object, not by making everything a test id. The abstraction choice and the selector choice are separate.

```ts
class LoginPage {
  constructor(private readonly page: Page) {}
  email() { return this.page.getByLabel('Email address') }
  signIn() { return this.page.getByRole('button', { name: 'Sign in' }) }
  // If the copy later becomes A/B-tested, swap THIS line to a test id. The spec never changes.
}
```

Component objects (Playwright) root every locator at a container `Locator` so they nest and repeat; page objects own navigation. Specs construct nothing directly when fixtures wire them.

## Test IDs: Every One Carries a Reason

A test id is a fallback for the test contract, not permission to skip roles, labels, names, focus, or keyboard support. It earns its place only for:

- copy product/marketing changes on purpose (A/B-tested CTAs)
- localized text from a CMS/experiment the test should not mirror
- repeated items a user-facing name cannot disambiguate — keyed on a **stable business id** (`product-card-wool-socks`, `line-item-SKU-8472`), never `item-2` or a DB primary key
- third-party widgets whose DOM you do not own — after giving the wrapper *you* own a role and name
- structural/legacy hooks with no useful role, as a scope to assert real content inside

Name it by meaning, kebab-case: `checkout-primary-action`, not `btn-1` or `blue-wrapper-v2`. When you select by a test id because the copy is dynamic, assert the copy *separately* on the same element so the wording stays under test.

## Anti-Patterns

| Anti-pattern | Failure mode | Fix |
|---|---|---|
| `<div onClick>` + `getByTestId` | green test, unreachable by keyboard/SR | real `<button>`, found by `getByRole` |
| Writing tests after markup is frozen | test ids paper over a11y gaps | design the selector list before the JSX |
| Only happy-path tests | error/empty/loading states ship broken | one test per state row of the matrix |
| Skipping the negative/a11y proof | accessibility regressions pass silently | assert the role query is present (and absent on bad markup) |
| `data-testid` on a semantic element | a11y rots while tests stay green | give it an accessible name; let `getByRole` find it |
| Index selectors (`add-2`, `nth(3)`) for repeated rows | breaks on reorder/reseed | per-item accessible name, or a stable-id test id |
| `waitForTimeout` as sync | flaky, slow | web-first `await expect(...)` auto-waits |
| `expect()` inside a page/component object | failures hide the real check | objects expose locators; specs assert |
| Re-testing every prop in the browser | slow suite, duplicated coverage | props at the component tier, one journey at e2e |
| Describing tests you never ran | unknown if it's green | run both tiers + typecheck, paste output |

## Validation

After building, prove it:

1. **Run the component tier** (your component-test command, e.g. `vitest run`), the **e2e tier** (your Playwright command, e.g. `playwright test`), and the **type check** (your typecheck command). Paste the passing counts. Use the script names this project actually defines — do not assume `test:e2e`/`typecheck` exist.
2. **Coverage check:** every applicable matrix row has a test, including the negative/a11y proof and at least one error/empty state.
3. **Selector check:** no `getByTestId` without a one-line reason from the "Test IDs" list; no CSS/`nth` selector standing in for a filter or accessible name.
4. **a11y check:** an `axe` pass on the new surface, scoped with `.include(...)`, with zero serious/critical violations.

## Cross-References

Authoritative docs to verify specifics against (prefer these over blog posts):

- Testing Library query priority and `getByRole`/`getByLabel`: <https://testing-library.com/docs/queries/about/#priority>.
- Playwright locators and the `getByRole`-first model: <https://playwright.dev/docs/locators>.
- Playwright web-first (auto-waiting) assertions: <https://playwright.dev/docs/test-assertions>.
- `@axe-core/playwright` accessibility scanning: <https://playwright.dev/docs/accessibility-testing>.
- ARIA roles and accessible-name computation: <https://www.w3.org/TR/wai-aria-1.2/> and <https://www.w3.org/TR/accname-1.2/>.

## Quick Quality Checklist

- The selector list was designed before the markup; every element has a user-facing handle.
- Markup is semantic: real buttons/forms/labels/landmarks; icon controls named, decorative icons hidden.
- Every applicable coverage-matrix row has a test, including the negative/a11y proof and error/empty/loading states.
- Locators are role-first; every `data-testid` carries a reason and a meaningful kebab-case name.
- Selectors are centralized in a component/page object; specs read as behaviour.
- e2e adds one real journey plus a scoped `axe` pass; no `waitForTimeout` as synchronization.
- Both tiers and the type check were run; the green output is shown.
