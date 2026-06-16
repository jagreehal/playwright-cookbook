# Card 23: API-only tests (request context)

## Scenario

You want to test HTTP APIs without launching a browser: GET/POST with headers, assert status and JSON body.

## Aim

- Use Playwright's **`request`** fixture (same as `context.request` or `page.request`) to call your API.
- Set headers (e.g. `Accept: application/json`), assert `response.status()`, and parse `response.json()` for assertions.
- Keeps tests fast and focused when you only need to validate the API contract.

## How it works

1. In a test, use the **`request`** fixture (no `page` needed).
2. Call `request.get(url, { headers: { Accept: 'application/json' } })` or `request.post(url, { data: body })`.
3. Assert `response.status()` and `const body = await response.json()`; then assert on `body`.

`request` uses the project's `baseURL`, so you can pass relative paths like `/api/health` when your app serves them.

## When to use

- Contract or sanity tests for REST/JSON endpoints.
- Seeding or resetting data via API before/after UI tests (see [20-api-seeding-cleanup](../20-api-seeding-cleanup/README.md)).
- Any test that doesn't need the browser.
