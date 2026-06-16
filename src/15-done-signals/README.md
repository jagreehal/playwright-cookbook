# Card 15: Done signals and the waitForApi helper

## Scenario

You want no naked click: every interaction has a clear completion signal so tests don't flake.

## Aim

- Done signals: after a load, wait for the response; after a modal save, wait for the dialog to hide and the toast to show.
- `waitForApi`: a small helper that waits for a response matching `urlPart` and an optional method, so waits stay consistent and readable.

## How it works

1. `waitForApi(page, { urlPart, method?, ok? })` wraps `page.waitForResponse()` and returns the matching `Response`. It matches successful responses by default; pass `ok: false` to await an error response.
2. Done signal for load: assign the wait first, then act, then await it. This registers the listener before the navigation fires the request, so you never miss it:

   ```ts
   const responsePromise = waitForApi(page, { urlPart: '/people/1' });
   await page.goto('/cards/15');
   const response = await responsePromise;
   expect(response.ok()).toBe(true);
   ```

3. Done signal for save: click Save, then wait for the dialog to be hidden and the toast to be visible. No arbitrary timeouts.
4. Polling for DOM state: when the signal is a value rather than a response, use `expect.poll(() => locator.textContent()).toBe('Polled Leia')`. It retries the callback until the expectation passes or the timeout elapses, which suits state that settles after an async update with no network call to await.

## When to use

- Every submit or modal save. Use `expect.poll` when you are waiting on rendered state with no response to hook. Eliminates `waitForTimeout` and reduces flake.
