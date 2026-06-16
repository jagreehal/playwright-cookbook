# Card 24: Parameterized (data-driven) tests

## Scenario

You want to run the same test logic for multiple inputs (e.g. different user IDs, roles, or API responses) without copy-pasting.

## Aim

- Define a **data set** (array or object) and generate one test per row (or a single test that loops).
- Use **`for...of`** with `test(...)` so each iteration registers a separate test with a distinct title and result.
- Keeps specs DRY and makes failures point to the exact input that failed.

## How it works

1. Define an array of inputs, e.g. `const testData = [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }];`
2. Loop: `for (const row of testData) { test(\`User ${row.id} is ${row.name}\`, async ({ request }) => { ... }); }`
3. Each iteration registers one test; the title can include `row` so the report shows which case failed.

Playwright has no `describe.each` (that is a Jest/Vitest API). When you do not want one test per row, write a single test that loops over the data and asserts inside a `test.step` per case so the report still shows which input failed.

## When to use

- Same assertion logic for multiple IDs, locales, or roles.
- API contract tests for several endpoints or status codes.
- Avoid when the number of cases is huge (prefer a single test that loops and asserts inside, or a small representative set).
