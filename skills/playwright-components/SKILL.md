---
name: playwright-components
description: Use when modelling reusable UI fragments (sidebars, headers, modals, table rows, cards) in Playwright tests, when the same locators appear on multiple pages, or when one feature renders differently across themes/frameworks/A-B variants. The container-rooted component pattern that composes anywhere without ceremony.
---

# Playwright Components

A component object is a class that owns the locators and actions for one **fragment** of UI: a sidebar, a header, a modal, or a table row. Components are the smallest reusable unit in this convention. They compose into pages, nest inside each other, and repeat across rows, all while surviving markup changes without touching specs.

## The Container-Rooted Pattern

A component is rooted at a `Locator` (its container), not at the `Page`. Rooting at a locator is what lets components compose.

```ts
// e2e/components/Modal.ts
import type { Locator } from '@playwright/test';

export class Modal {
  constructor(private root: Locator) {}

  readonly title         = this.root.getByRole('heading');
  readonly closeButton   = this.root.getByRole('button', { name: 'Close' });
  readonly confirmButton = this.root.getByRole('button', { name: 'Confirm' });
  readonly body          = this.root.getByRole('document');

  async confirm() { await this.confirmButton.click(); }
  async close()   { await this.closeButton.click(); }
}
```

Every locator descends from `this.root`. Hand the `Modal` any locator that points at a dialog and it works, whether that dialog is page-level, nested, or repeating.

```ts
// As a page-level dialog
const modal = new Modal(page.getByRole('dialog'));

// As a confirmation dialog inside a settings panel
const confirm = new Modal(page.getByRole('dialog', { name: 'Delete account?' }));

// As one of several modals on screen (filtered by accessible name)
const inviteModal = new Modal(page.getByRole('dialog', { name: 'Invite user' }));
```

## Page-Wide Components: Take a `Page`, Resolve the Root Internally

For singletons like a primary navigation or a global header, give the component a `Page` and have it resolve its own container.

```ts
// e2e/components/Sidebar.ts
import type { Page, Locator } from '@playwright/test';

export class Sidebar {
  readonly root: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('navigation', { name: 'Primary' });
  }

  link(name: string): Locator {
    return this.root.getByRole('link', { name });
  }

  async goTo(name: 'Dashboard' | 'Settings' | 'Reports') {
    await this.link(name).click();
  }

  async activeLinkName(): Promise<string | null> {
    return this.root.getByRole('link', { current: 'page' }).textContent();
  }

}
```

The same root pattern applies, with every locator scoped to `this.root`. The component still doesn't know or care where the page object using it lives.

## Regions: Page-Rooted, Name-Scoped Overlays

Transient overlays — dialogs, toasts, snackbars, flyouts — are a third shape. They aren't page-wide singletons (there can be several dialogs in a suite, and none exist until something opens them), but they *are* uniquely identifiable by an accessible name or role at the moment they appear. Model these as a **region**: take a `Page`, resolve the container lazily inside each method by role + name, and expose `expect*` gates.

```ts
// e2e/regions/DialogRegion.ts
import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class DialogRegion {
  constructor(private page: Page, private name: string) {}

  // Resolve lazily — the dialog may not exist yet when the region is constructed.
  dialog(): Locator { return this.page.getByRole('dialog', { name: this.name }); }

  getByLabel(label: string): Locator { return this.dialog().getByLabel(label); }
  getButton(name: string | RegExp): Locator { return this.dialog().getByRole('button', { name }); }

  async expectVisible() { await expect(this.dialog()).toBeVisible(); }
  async expectHidden()  { await expect(this.dialog()).toBeHidden(); }
}
```

Why this is *not* the "component takes a `Page`" anti-pattern below: the region resolves a **role + accessible name** that uniquely scopes the overlay, so it still nests and repeats (two `DialogRegion(page, 'Edit person')` / `DialogRegion(page, 'Delete account')` coexist). The anti-pattern is a component that queries `page.locator(...)` from an *unscoped* page root. A region with an `expect*` gate is also the one place a component-like object owns assertions — because gating "is the overlay open?" is a readiness check, not a feature assertion (mirrors `assertLoaded()` in `playwright-page-objects`).

Prefer a `Locator`-rooted component (`Modal` above) when a page object already owns the container locator and can hand it in; reach for a region when the spec needs to open and gate an overlay directly without threading a locator through.

## Repeating Components: Rows, Cards, List Items

The container-rooted pattern is at its best when the same component appears many times.

```ts
// e2e/components/UserRow.ts
import type { Locator } from '@playwright/test';

export class UserRow {
  constructor(private root: Locator) {}

  readonly name   = this.root.getByRole('cell').nth(0);
  readonly email  = this.root.getByRole('cell').nth(1);
  readonly status = this.root.getByRole('cell').nth(2);
  readonly editButton   = this.root.getByRole('button', { name: 'Edit' });
  readonly deleteButton = this.root.getByRole('button', { name: 'Delete' });

  async edit()   { await this.editButton.click(); }
  async delete() { await this.deleteButton.click(); }
}

// e2e/components/UserTable.ts
import type { Page, Locator } from '@playwright/test';
import { UserRow } from './UserRow';

export class UserTable {
  private root: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('table', { name: 'Users' });
  }

  rowFor(email: string): UserRow {
    return new UserRow(this.root.getByRole('row').filter({ hasText: email }));
  }

  async rowCount(): Promise<number> {
    return this.root.getByRole('row').count() - 1;   // minus header
  }
}
```

Usage in a spec reads naturally:

```ts
const row = userTable.rowFor('alice@test.dev');
await expect(row.status).toHaveText('Active');
await row.edit();
```

The factory function `rowFor()` returns a fresh `UserRow` rooted at the right cell. Because Playwright locators are lazy, this is cheap: nothing is queried until you await an action or assertion.

## Multi-Implementation: When the Same UI Has Two DOMs

If the same conceptual component renders differently across themes, frameworks, or feature flags, define an interface and let the fixture pick the implementation. Tests stay identical.

```ts
// e2e/components/Sidebar.ts — the contract
import type { Locator } from '@playwright/test';

export interface ISidebar {
  goTo(name: string): Promise<void>;
  activeLinkName(): Promise<string | null>;
  root(): Locator;
}

// e2e/components/SidebarReact.ts
import type { Page, Locator } from '@playwright/test';
import type { ISidebar } from './Sidebar';

export class SidebarReact implements ISidebar {
  private rootLocator: Locator;
  constructor(page: Page) {
    this.rootLocator = page.getByTestId('primary-sidebar');
  }
  async goTo(name: string) {
    await this.rootLocator.getByRole('link', { name }).click();
  }
  async activeLinkName() {
    return this.rootLocator.getByRole('link', { current: 'page' }).textContent();
  }
  root() { return this.rootLocator; }
}

// e2e/components/SidebarSvelte.ts
export class SidebarSvelte implements ISidebar {
  private rootLocator: Locator;
  constructor(page: Page) {
    this.rootLocator = page.getByRole('navigation', { name: 'Primary' });
  }
  async goTo(name: string) {
    await this.rootLocator.getByRole('link', { name }).click();
  }
  async activeLinkName() {
    return this.rootLocator.getByRole('link', { current: 'page' }).textContent();
  }
  root() { return this.rootLocator; }
}
```

The fixture chooses (`playwright-fixtures` covers the wiring):

```ts
sidebar: async ({ page }, use, testInfo) => {
  const Impl = testInfo.project.name === 'react' ? SidebarReact : SidebarSvelte;
  await use(new Impl(page));
},
```

**Don't reach for this until you have two implementations.** A premature interface costs readability now for a future that may never arrive. The pattern is simple to add when you need it.

Use semantic locators across implementations when the user-facing contract is the same. Reach for `getByTestId` only for the root or genuinely unsemantic pieces, and keep that selector inside the component.

## Composition: Components Inside Components

A component can take other components as collaborators when the relationship is fixed.

```ts
export class Header {
  readonly userMenu: UserMenu;

  constructor(page: Page) {
    this.userMenu = new UserMenu(page.getByRole('banner').getByRole('menu', { name: 'User' }));
    // ...
  }
}
```

If the relationship varies (this header sometimes has a `UserMenu`, sometimes doesn't), let the spec or page object compose them externally. Don't add optional collaborators inside components, because they're an architectural smell.

## What Goes Inside a Component

| Goes in | Example |
|---|---|
| Locator fields | `closeButton`, `title` |
| User actions | `confirm()`, `close()`, `selectOption(name)` |
| Factory methods for repeated children | `rowFor(email)` returning a `UserRow` |
| Container-relative state queries | `activeLinkName()` returning `Promise<string \| null>` |

| Doesn't go in | Why |
|---|---|
| `expect()` calls | Assertions belong in specs (Rule 4 of the architecture) |
| `page.goto()` | Components don't navigate; pages do |
| Test data | Components encode UI, not domain data |
| Other components' locators | Components only know about their own root |

A state query returns a value (`Promise<string | null>`), not a `Locator`, so it can't auto-retry on its own. When you only need to *assert* the value, prefer exposing a `Locator` and using a web-first matcher — `await expect(sidebar.activeLink).toHaveText('Settings')`. When the spec genuinely needs the value (branching, logging), keep the query but assert it with `expect.poll(() => sidebar.activeLinkName()).toBe('Settings')` so it retries. Never `await expect(query()).resolves.toBe(...)` — that resolves once and reintroduces the timing flake web-first assertions exist to remove.

## Anti-Patterns

| Anti-pattern | Failure mode | Fix |
|---|---|---|
| Component takes a `Page` and queries from an *unscoped* `page.locator(...)` | Can't nest, can't repeat | Take a `Locator` root, resolve a page-wide singleton, or scope by role + accessible name (a region) |
| Component reaches into siblings via `..` or absolute selectors | Breaks the encapsulation that makes composition work | Restructure: pass siblings in or move the logic up |
| `expect()` inside component methods | Failures hide the real check | Expose locators; assert in the spec |
| Component for every `<div>` | Ceremony with no reuse | Wait until the second usage |
| Hardcoded `nth(0)`, `nth(1)` everywhere | Order changes break tests | Filter by accessible name or text |
| Re-instantiating components per call | Slow if expensive (rare) and code-noisy | Cache as fields where it makes sense |

## A Worked Example

```ts
// e2e/users.spec.ts
import { test, expect } from './fixtures';

test('admin can deactivate a user', async ({ usersPage, userTable, confirmModal }) => {
  await usersPage.goto();

  const row = userTable.rowFor('alice@test.dev');
  await expect(row.status).toHaveText('Active');

  await row.delete();
  await confirmModal.confirm();

  await expect(row.status).toHaveText('Inactive');
});
```

Three components in play (`UserTable`, `UserRow`, `Modal`) and one page object (`UsersPage`), with no selectors and no waits in the spec. The spec describes what an admin does and what they expect to see.

## Cross-References

- How components fit into the wider architecture: `playwright-architecture`.
- The page objects that compose components: `playwright-page-objects`.
- How the fixture file wires components into specs: `playwright-fixtures`.
- The locator strategies the components use internally: `playwright-locators`.

## Quick Quality Checklist

- Specs do not construct objects directly; fixtures own spec-visible wiring.
- No sleeps (`waitForTimeout`) used as synchronization.
- Locators are semantic first (`getByRole`/`getByLabel`) and centralized.
- Network behavior is intentional: mocked or explicitly integration-tagged.
- Changes include at least one reproducible command/example.
