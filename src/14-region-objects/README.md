# Card 14: Region objects (component-scoped helpers)

## Scenario

You want reusable helpers for repeated UI bits (toast, dialog, modal) without a giant page class.

## Aim

- Region objects: small classes that expose locators and assertion helpers for one region (`ToastRegion`, `DialogRegion`).
- Use them inside any test without creating a "ToastPage".

## How it works

1. `ToastRegion` takes `page`: `toast()` returns `page.getByRole('status')`; `expectSuccess(msg)` asserts the toast contains text.
2. `DialogRegion` takes `page` plus a dialog name: `dialog()`, `getByLabel()`, and `getButton()` return locators scoped to that dialog, plus `expectVisible()` and `expectHidden()`. The query methods return a `Locator` synchronously, so you chain actions directly: `dialogRegion.getByLabel('Name').fill(...)` and `dialogRegion.getButton(/save/i).click()`.
3. `Modal` is the container-rooted contrast. It takes a `Locator` root instead of a `Page`, and every input and button descends from `this.root`. Pass it the dialog locator (`new Modal(page.getByRole('dialog', { name: 'Edit person' }))`) and it never reaches back to the page. Use this form when the same component appears in more than one container, or when you want to root a component without giving it the whole page.
4. The first test drives the edit-and-save flow through `DialogRegion`, then `toastRegion.expectSuccess(/saved/i)`. The second test drives the same flow through the container-rooted `Modal`.

## When to use

- Any repeated component (toast, modal, sidebar). Page-rooted regions read well for one-off dialogs; container-rooted components compose better when the same widget shows up in several places.
