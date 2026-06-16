---
name: playwright-page-objects
description: Use when deciding whether to create a page object, designing the API of one, refactoring page objects that have grown unwieldy, or removing page objects that aren't earning their keep. The Page Object pattern done with restraint: abstract when the page earns it, never before.
---

# Playwright Page Objects

A page object is a class that owns the locators and user actions for one screen. Done well, it makes specs read like user stories. Done badly, it adds a thin layer of `clickX()` methods that creates noise without saving anyone time.

## When a Page Earns an Object

Create a page object when **two or more** of these are true:

- The page has five or more locators a spec might reference.
- Two or more specs interact with this page.
- The page has non-trivial state (forms, multi-step actions, dynamic regions).
- The page composes a component that needs to be wired in.
- You'd otherwise repeat a navigation sequence (`goto` + `wait`) in multiple places.

If a page is just a destination with one heading and a back button, **don't** make a page object for it. Assert directly in the spec:

```ts
// fine — no page object needed
await expect(page.getByRole('heading', { name: 'About' })).toBeVisible();
```

Premature page objects are more painful than copy-paste. Promote when the second usage appears.

## The Shape

```ts
// e2e/pages/LoginPage.ts
import type { Page, Locator } from '@playwright/test';
import { DashboardPage } from './DashboardPage';

export class LoginPage {
  // Locator fields — declared, not just constructed in methods
  readonly email:    Locator = this.page.getByLabel('Email');
  readonly password: Locator = this.page.getByLabel('Password');
  readonly submit:   Locator = this.page.getByRole('button', { name: 'Sign in' });
  readonly errorAlert: Locator = this.page.getByRole('alert');

  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async signIn(user: { email: string; password: string }): Promise<DashboardPage> {
    await this.email.fill(user.email);
    await this.password.fill(user.password);
    await this.submit.click();
    return new DashboardPage(this.page);
  }
}
```

Three things to notice:

1. **Locators as fields**, not built inline in each method. Declared once, referenced everywhere. The spec can also use `loginPage.errorAlert` directly in an assertion.
2. **Action method named after intent**: `signIn(user)`, not `clickSubmitButton()`.
3. **Navigation methods return the next page object.** After `signIn`, you're on the dashboard, and the type system knows it.

## Expose Locators, Not Assertions

A common mistake is to bury `expect()` calls inside page methods:

```ts
// bad — assertion hidden inside the page
async expectLoggedIn() {
  await expect(this.page.getByText('Welcome')).toBeVisible();
}

// usage in spec
await loginPage.expectLoggedIn();   // failure trace points here, not at the real check
```

Better: expose the locator, assert in the spec.

```ts
// good — the spec owns the assertion
readonly welcomeMessage: Locator = this.page.getByText(/^Welcome,/);

// usage in spec
await expect(loginPage.welcomeMessage).toBeVisible();
//      ^^^^^^^ trace points here, with full locator detail
```

Failures stay loud and traces keep their detail, and the page object stays focused on *how to do things* rather than *what to check*.

The exception: page-level **readiness gates** like `assertOnPage()` or `assertLoaded()`, used as a precondition at the top of a test (or inside a static `open()` factory so the object is never returned half-loaded). These earn their keep even when they're a single check, because they gate the page being ready rather than verifying a feature outcome. Write them as web-first assertions (`await expect(this.heading).toBeVisible()`), not bare `locator.waitFor()`, so a failure still points at the locator with full detail. What does *not* earn its keep is wrapping an ordinary feature assertion (`expectStatusIsActive()`) — expose the locator and let the spec assert it.

## Composing Components

A page object owns its components. The fixture wires them in:

```ts
// e2e/pages/DashboardPage.ts
import type { Page, Locator } from '@playwright/test';
import { Sidebar } from '../components/Sidebar';
import { Header }  from '../components/Header';

export class DashboardPage {
  readonly sidebar: Sidebar;
  readonly header:  Header;

  readonly heading:          Locator = this.page.getByRole('heading', { name: 'Dashboard' });
  readonly newProjectButton: Locator = this.page.getByRole('button',  { name: 'New project' });

  constructor(private page: Page) {
    this.sidebar = new Sidebar(page);
    this.header  = new Header(page);
  }

  async goto() { await this.page.goto('/dashboard'); }

  async createProject(name: string) {
    await this.newProjectButton.click();
    await this.page.getByLabel('Project name').fill(name);
    await this.page.getByRole('button', { name: 'Create' }).click();
  }
}
```

The page is a coordinator: it owns its top-level locators and delegates everything else to components. See `playwright-components` for the component contract.

## Action Methods: The Naming Test

Read the method name out loud. Does it describe a user action or a DOM operation?

| Bad | Good |
|---|---|
| `clickSubmit()` | `submit()` |
| `clickSettingsLink()` | `goToSettings()` |
| `fillEmail(email)` | (just expose `email` and let the spec fill it, or roll into `signIn(user)`) |
| `clickButton3()` | `confirmDelete()` |
| `openDialog()` | (depends: what does the dialog *do*? `editProfile()`?) |
| `getEmailValue()` | (just expose `email`: `await expect(page.email).toHaveValue(...)`) |

If the method is a one-line wrapper around a click or fill, it's probably noise. Either expose the locator and let the spec interact directly, or roll the action up into something with real meaning such as `signIn`, `addToCart`, or `submit`.

## Navigation Returns the Next Page

When an action takes the user to a different page, return the corresponding page object:

```ts
async signIn(user: User): Promise<DashboardPage> {
  // ...
  return new DashboardPage(this.page);
}

async logOut(): Promise<LoginPage> {
  await this.header.userMenu.click();
  await this.page.getByRole('menuitem', { name: 'Sign out' }).click();
  return new LoginPage(this.page);
}
```

This makes flow explicit and compiler-checked. A spec that calls `loginPage.signIn()` then tries to use `loginPage.welcomeMessage` is a type error, and a logical one too, because by then you're on a different page.

If you'd rather get pages from fixtures (so you don't construct `new DashboardPage()` inside a method), have the action method just complete the navigation, and the spec asks for the next page from its fixtures. Both styles are fine; pick one and be consistent.

## A Base Page (Optional)

For shared concerns such as common headers, "is on page" checks, and breadcrumb navigation, a small base class is reasonable.

```ts
export abstract class BasePage {
  constructor(protected page: Page) {}
  async title() { return this.page.title(); }
  async waitForReady() {
    await this.page.waitForLoadState('domcontentloaded');
  }
}
```

Don't put locators on the base class unless they genuinely appear on every page (a global header, a flash-message region). Inheritance for sharing one or two lines is over-engineering.

## Anti-Patterns

| Anti-pattern | Why it's wrong | Fix |
|---|---|---|
| Page object per route | Most routes don't earn one | Wait until two specs touch the page |
| `clickXButton()` methods | Wrapper noise | Expose the locator or write a real action method |
| Assertions buried inside methods | Failures lose context | Expose locators; assert in the spec |
| Building locators inside each method | Repetition + harder to share | Locators as fields, declared once |
| Page object owns its own assertions about navigation | Couples spec readability to internals | Use `await expect(page).toHaveURL(...)` in the spec |
| One giant `LoginPage` with 30 methods | Outgrew page-object scope | Split into components (form, header, etc.) |
| Returning `void` from navigation methods | Lose type-checked flow | Return the next page object |
| Storing `ElementHandle` instead of `Locator` | No auto-wait, stale references | Always store `Locator` |
| `new LoginPage(page)` in specs | Construction in specs (Rule 1) | Provide the page object via a fixture |

## A Worked Example

```ts
// e2e/login.spec.ts
import { test, expect } from './fixtures';

test('valid credentials sign the user in', async ({ loginPage }) => {
  await loginPage.goto();
  const dashboardPage = await loginPage.signIn({
    email: 'user@test.dev',
    password: 'pw',
  });
  await expect(dashboardPage.heading).toBeVisible();
});

test('invalid credentials show an error', async ({ loginPage }) => {
  await loginPage.goto();
  await loginPage.signIn({ email: 'user@test.dev', password: 'wrong' });
  await expect(loginPage.errorAlert).toContainText(/invalid credentials/i);
});
```

No selectors. No construction. Two distinct user behaviours, each verifiable in five lines.

## Cross-References

- The folder layout and the rule that says specs don't construct page objects: `playwright-architecture`.
- Components a page composes: `playwright-components`.
- How fixtures hand page objects to specs: `playwright-fixtures`.
- Cross-page journeys (login flows that span login + dashboard) live as flows, not page-object methods: `playwright-flows`.
- Locator strategies for the fields: `playwright-locators`.

## Quick Quality Checklist

- Specs do not construct objects directly; fixtures own spec-visible wiring.
- No sleeps (`waitForTimeout`) used as synchronization.
- Locators are semantic first (`getByRole`/`getByLabel`) and centralized.
- Network behavior is intentional: mocked or explicitly integration-tagged.
- Changes include at least one reproducible command/example.
