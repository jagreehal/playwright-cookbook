# Card 20: API seeding factories and cleanup

## Scenario

You want test data created via code (not through the UI) and cleaned up so runs don't pollute each other.

## Aim

- **Factory**: `createClient(partial)` that returns the created entity (id, name). In a real app the factory takes the `request` context and POSTs, e.g. `createClient(request, partial)`.
- **Cleanup**: in a `try { ... } finally { await Promise.all(ids.map(id => api.delete(...))) }` so cleanup runs even when the test fails.
- **unique(testInfo, prefix)**: generate stable unique names so parallel runs don't collide.

## How it works

1. This card uses an in-memory "store" and a factory that pushes to it and returns an id (no real server required).
2. In a real app you'd use `request.post('/api/clients', { data })` and `request.delete('/api/clients/:id')`.
3. Test pushes created ids into an array, then in `finally` calls cleanup; uses `unique(testInfo, 'client')` for the name.

## Why `try/finally` (or a fixture), not `afterEach`

`afterEach` looks like a natural fit for cleanup, but it has two problems:

1. **It runs even when setup failed.** If `beforeEach` throws, `afterEach` still fires and tries to clean up state that was never created.
2. **It can't be reused.** Cleanup logic lives in the file, not composable across suites.

`try/finally` keeps setup and cleanup in the same block, so they're obviously paired. When the same pattern repeats across many tests, promote it to a **fixture**. The `use()` callback acts as a built-in finally:

```ts
const test = base.extend({
  seededClient: async ({ request }, use) => {
    const client = await createClient(request);
    await use(client);                        // test runs here
    await deleteClient(request, client.id);   // always runs, even on failure
  },
});
```

**Rule of thumb:** `try/finally` for one-off cleanup in a single test; fixture when the same setup/teardown is needed in more than one test.

## When to use

- Any test that needs specific data (e.g. a client, an order); avoid building it through the UI.
