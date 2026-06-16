---
name: playwright-network-mocking
description: Use when controlling network responses in Playwright tests, mocking external APIs (payments, email, third-party SDKs), removing flakes caused by upstream services, recording HAR files for replay, or deciding whether to mock vs. hit a real backend. Make test outcomes depend only on your code, not on the internet.
---

# Playwright Network Mocking

A test that depends on someone else's server flakes when their server flakes. To fix that, control the network: stub the responses your test needs and let the real ones through where it matters, so an upstream outage never causes a red CI run.

This skill covers `page.route()` (the workhorse), `fulfill` shortcuts, HAR record/replay, and the judgement of when to mock and when not to.

## The Workhorse: `page.route()`

`page.route()` intercepts requests matching a URL pattern. Inside the handler, you decide what to do: fulfill with a stubbed response, modify the request, abort it, or pass it through.

```ts
test('shows the mocked user list', async ({ page }) => {
  await page.route('**/api/users', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]),
    })
  );

  await page.goto('/users');
  await expect(page.getByRole('row')).toHaveCount(3);   // header + 2
});
```

The `**` is a glob; `*` matches a single path segment. You can also pass a `RegExp` or a predicate function for more control.

## Fulfill Shortcuts

`route.fulfill()` accepts a `json` shortcut so you don't have to stringify by hand.

```ts
await page.route('**/api/users', route => route.fulfill({ json: users }));

// 404 with a body
await page.route('**/api/missing', route =>
  route.fulfill({ status: 404, json: { error: 'Not found' } })
);

// 500 to test error states
await page.route('**/api/users', route =>
  route.fulfill({ status: 500, json: { error: 'Server exploded' } })
);

// Network failure
await page.route('**/api/users', route => route.abort('failed'));
```

## Conditional Routing

Match on more than the URL (method, headers, body) by inspecting `route.request()`.

```ts
await page.route('**/api/users', route => {
  const req = route.request();

  if (req.method() === 'POST') {
    const body = req.postDataJSON();
    if (body.email === 'taken@test.dev') {
      return route.fulfill({ status: 409, json: { error: 'Email taken' } });
    }
    return route.fulfill({ status: 201, json: { id: 'new-id', ...body } });
  }

  if (req.method() === 'GET') {
    return route.fulfill({ json: [{ id: 1, name: 'Alice' }] });
  }

  return route.continue();
});
```

`route.continue()` lets the request proceed to the real backend. Use it as the default when you only want to mock specific cases.

## Modifying Real Requests and Responses

You don't have to fake the whole response. You can let the real request through and modify either the request or the response.

```ts
// Add a header to the request
await page.route('**/api/**', route => {
  const headers = { ...route.request().headers(), 'X-Test-Mode': 'true' };
  route.continue({ headers });
});

// Modify the response from the real server
await page.route('**/api/feature-flags', async route => {
  const response = await route.fetch();
  const json = await response.json();
  json.experiments.newCheckout = true;          // override one flag
  await route.fulfill({ response, json });
});
```

## Mocking External Dependencies

This is where mocking pays off most. Anything you don't control belongs behind a stub by default.

### Payment providers

Stripe, Braintree, and Adyen have their own sandboxes, but tests still hit the network. Mock the iframe or the API call and return a deterministic success.

```ts
await page.route('**/v1/payment_intents', route =>
  route.fulfill({
    json: { id: 'pi_test', status: 'succeeded', client_secret: 'cs_test_xxx' },
  })
);
```

For Stripe Elements specifically, run their test mode and let real requests through *only* when you're testing the integration itself.

### Email verification

Don't poll a real inbox. Mock the email send (verify the request was made) and the verification link click.

```ts
let sentEmail: { to: string; subject: string; link: string } | null = null;

await page.route('**/api/email/send', route => {
  sentEmail = route.request().postDataJSON();
  route.fulfill({ status: 200, json: { ok: true } });
});

// later
expect(sentEmail).toMatchObject({ to: 'user@test.dev', subject: /verify/i });
await page.goto(sentEmail!.link);
```

### Third-party SDKs (analytics, error tracking, feature flags)

Block them outright if your test doesn't depend on them. They add noise and occasional flakiness.

```ts
await page.route(/segment\.io|datadog|sentry/, route => route.abort());
```

## Setting Routes for the Whole Suite

For routes that should apply to every test, set them in a fixture or in `playwright.config.ts` via `use.extraHTTPHeaders` and route handlers configured per project.

The clean place is an auto-fixture (see `playwright-fixtures`):

```ts
mockThirdParties: [
  async ({ context }, use) => {
    await context.route(/segment\.io|datadog|sentry/, route => route.abort());
    await use();
  },
  { auto: true },
],
```

Note `context.route()` rather than `page.route()`: it applies to every page in every context this fixture touches.

## HAR Record and Replay

For tests that interact with a complex API surface, recording a real session as a HAR file and replaying it gives you fidelity without coupling to live data.

### Record once

```ts
test('record HAR', async ({ page }) => {
  await page.routeFromHAR('e2e/har/dashboard.har', {
    update: true,                              // record mode
    notFound: 'fallback',                      // unmatched requests go to network
  });
  await page.goto('/dashboard');
  // perform the journey you want to capture
});
```

Run once with `update: true` to capture; commit the resulting HAR.

### Replay on every test

```ts
test('dashboard loads from HAR', async ({ page }) => {
  await page.routeFromHAR('e2e/har/dashboard.har', { notFound: 'abort' });
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
```

`notFound: 'abort'` is strict: any request not in the HAR fails. This catches unexpected new calls during development.

HARs are best for read-only journeys (dashboards, reports, browse pages). Write flows are better hand-mocked because the request body matters.

## When Not to Mock

Mocking is a tool to apply selectively. The cases where you should *not* mock:

- **The thing you're testing.** Tests of the checkout API hit the real checkout API. Tests of the search results hit the real search service.
- **End-to-end smoke suites.** A small number of tests should hit the real backend stack to verify integration. Tag them `@integration` and run them separately if they're slow.
- **When the mock would be more code than the integration.** A simple GET-and-render page doesn't need a mock; the real backend is faster than maintaining stubs.

The bulk of your suite (UI behaviour, component states, error rendering, edge cases) wins from mocking. The minority that genuinely tests integration shouldn't.

## Determinism: Time, Random, IDs

Mocking the network gets you most of the way to deterministic tests. The other sources of nondeterminism:

- **Time.** Use `page.clock.install()` to freeze and advance time deterministically when the installed Playwright version supports the Clock API; verify with `npx playwright --version` before encoding this in a shared helper.
  ```ts
  await page.clock.install({ time: new Date('2025-01-01T00:00:00Z') });
  await page.clock.fastForward('30:00');   // advance 30 minutes
  ```
- **Random IDs.** Mock the response so the IDs are stable, or stub `crypto.randomUUID` via `addInitScript`.
- **Animations.** Disable in screenshots (`animations: 'disabled'`) and rely on auto-waiting for behaviour.

## Anti-Patterns

| Anti-pattern | Why it's wrong | Fix |
|---|---|---|
| Letting real third-party calls through everywhere | Tests flake when the third party flakes | Mock by default; let through where intent demands it |
| Mocking *every* call, including your own backend | Tests stop catching backend regressions | Real backend by default for *your* services; mock outside dependencies |
| HAR captured against staging, replayed against production | Subtle drift between captured and live responses | Re-record when the API changes |
| Inline mock setup at the top of every test | Repeated noise | Auto-fixture for cross-cutting mocks; per-test for case-specific |
| Mocking after `page.goto()` | The first request already fired | Set routes before navigation |
| Stringifying JSON manually | Easy to forget content-type, easy to typo | Use the `json:` shortcut |
| Mocking response shape that diverges from production | Tests pass on a fictional API | Generate mock fixtures from real responses; review when API changes |
| `await page.waitForResponse(...)` *and* mocking the same call | Confusing: the waited response is the mock | Either mock or wait, not both |

## Cross-References

- The web-first assertions you use after the network is stable: `playwright-assertions`.
- Auth flows often need third-party mocking: `playwright-auth`.
- Network-driven flake diagnosis: `playwright-reliability`.
- Setting routes via fixtures cleanly: `playwright-fixtures`.

## Quick Quality Checklist

- Specs do not construct objects directly; fixtures own spec-visible wiring.
- No sleeps (`waitForTimeout`) used as synchronization.
- Locators are semantic first (`getByRole`/`getByLabel`) and centralized.
- Network behavior is intentional: mocked or explicitly integration-tagged.
- Changes include at least one reproducible command/example.
