# Card 19: Storage-state auth plus one UI login test

## Scenario

You want most tests to start already authenticated so they run fast and stable, while keeping one UI login smoke test that exercises the real form.

## Aim

- **UI login smoke**: one test goes to the login page, submits the form, and asserts it lands on the protected page.
- **Reuse saved state**: capture `storageState` once, then open protected pages in fresh contexts without logging in again.
- **In a real project**: wire the saved state into config so every test starts authenticated.

## How it works

This card runs three tests against the app's `/login` and `/protected` routes.

1. **UI login smoke test** (no saved state): `loginAs` fills the username and password, submits, and the test asserts the URL matches `/protected` and the Dashboard heading is visible.
2. **Simulated already-logged-in**: the test visits `/login`, writes `auth` and `user` keys into `localStorage`, then visits `/protected` and asserts the Dashboard renders for the stored user. This is a simulation. A real `storageState` file captures cookies plus per-origin `localStorage`, so you rarely set keys by hand.
3. **Reuse saved state, per role**: a `setup` project (`src/auth.setup.ts`, wired via `dependencies: ['setup']` in `playwright.config.ts`) logs in once per role and saves `playwright/.auth/user.json` and `admin.json`. The tests here just declare `test.use({ storageState: 'playwright/.auth/user.json' })` (or `admin.json`) at the describe level and reach `/protected` with no UI login — no `beforeAll`, no manual `browser.newContext`.

This is the real-project wiring: the `setup` project does the login once, and any spec opts into a role with `test.use({ storageState })`. See `playwright.config.ts` for the project + `dependencies` setup.

Add `playwright/.auth` to `.gitignore` so saved sessions never get committed.

## When to use

- Any app with login. It avoids repeating the login flow in every test and reduces flake.
