# Card 21: App driver fixture and test.step

## Scenario

You want one high-level abstraction (AppDriver) that exposes flows (auth, person) so tests stay clean, and you want readable reports via test.step.

## Aim

- **AppDriver**: class that holds `page` and optionally `request`, and exposes `auth`, `person` (or similar) as flow objects.
- **Fixture**: `test.extend<{ app: AppDriver }>({ app: async ({ page, request }, use) => { await use(new AppDriver(page, request)); } })`.
- **test.step**: wrap major actions (e.g. "Open person", "Edit and save") so the trace and report show clear steps.

## How it works

1. `AppDriver(page, request, personUrl = '/cards/21')` exposes `person` (PersonFlow) and `auth` (AuthFlow); tests call `app.person.open('1')` or `app.auth.loginAs('user', 'pass')`. The default `personUrl` loads `/cards/21`; override it per card under test.
2. Fixture provides `app`; tests use `const personPage = await app.person.open('1')` and assert through the typed getter `personPage.name`.
3. Use `await test.step('Open person', () => app.person.open('1'))` so the step appears in the report.

## When to use

- Default for any suite with multiple flows; keeps tests short and consistent.
