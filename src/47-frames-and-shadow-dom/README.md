# Card 47: Frames & Shadow DOM

The portable agent skills for this pattern are `playwright-interactions` and `playwright-locators`.

## What This Pattern Solves

Payment widgets, embedded forms and chat bubbles often live in an `<iframe>`. Design-system components often render inside a shadow root. An iframe holds a second document, so you enter it with `frameLocator()`. A shadow root belongs to the same document, and Playwright's locators walk into it when the root is open. Pick the right tool for each and the test needs no `evaluate` calls or deep CSS selectors.

## How It Works

1. **Enter a frame**: `page.frameLocator('iframe[title="Payment"]')`, or start from an accessible locator and call `.contentFrame()`.
2. **Chain for nested frames**: one `.contentFrame()` per document.
3. **Use normal locators inside**: `getByRole`, `getByLabel`, `getByText` all work inside a frame locator.
4. **Assert across frames**: act in the frame, assert the result wherever the app shows it, often the parent page.
5. **Shadow DOM**: no special API. Role, text and CSS locators pierce open roots. XPath does not. Closed roots stay out of reach.

## Code Example

```typescript
// Bad: the button lives in the frame's document.
await expect(page.getByRole('button', { name: 'Subscribe' })).toHaveCount(0);

// Good: enter the frame first.
const frame = page.getByTitle('Newsletter').contentFrame();
await frame.getByLabel('Email').fill('ada@example.com');
await frame.getByRole('button', { name: 'Subscribe' }).click();
await expect(page.getByRole('status')).toHaveText('Subscribed');

// Nested frames: one step per document.
await page.getByTitle('Outer').contentFrame()
  .getByTitle('Inner').contentFrame()
  .getByRole('button', { name: 'Ping' }).click();

// Open shadow root: the same locator you would use without it.
await page.getByRole('button', { name: 'Shadow action' }).click();
```

## Run This Example

```bash
pnpm test src/47-frames-and-shadow-dom
```

## Prerequisites

- **Card 12**: Locators, actions and flows.
- **Card 13**: Scoped queries.

## Key Concepts

- **`FrameLocator`**: Lazy, waits for the frame and re-resolves on every action. Use it for actions and assertions.
- **`locator.contentFrame()`**: Turns a locator for an `<iframe>` element into a `FrameLocator`, so you can find the frame by title or role instead of CSS.
- **`page.frame({ url })`**: Returns a `Frame` object (or `null`) for `url()`, `parentFrame()` and `evaluate()`. It does not wait, so wait for something inside the frame first.
- **Open shadow roots**: Playwright's role, text and CSS engines pierce them by default.
- **XPath**: Does not pierce shadow roots. Another reason to prefer role locators.
- **Closed shadow roots**: Hidden from page scripts and from Playwright. Test the component's public surface.

## When to Use This Pattern

- ✓ Third-party embeds: payments, video, newsletters, chat.
- ✓ Web components and design systems that use shadow DOM.
- ✓ Asserting that an action inside a frame updates the host page.
- ✗ Cross-origin frames you do not control and cannot stub. Mock the integration at the network layer (Cards 02-10).
- ✗ New windows and tabs (Card 35).

## Common Mistakes

1. **Page locator for an element inside an iframe**: Finds nothing and times out. Enter the frame.
2. **`page.frames()[1]`**: Index order changes when the page adds a frame. Find frames by title or URL.
3. **`page.frame()` straight after navigation**: Returns `null` before the frame attaches. Wait on a frame locator first.
4. **XPath into a web component**: XPath stops at the shadow boundary. Use role or CSS.
5. **`evaluate` to reach into shadow roots**: Unneeded for open roots, and it skips actionability checks.

## Flow Diagram

```mermaid
flowchart LR
    Page["page"] -->|getByTitle('Outer').contentFrame()| Outer["outer frame document"]
    Outer -->|getByTitle('Inner').contentFrame()| Inner["inner frame document"]
    Inner -->|getByRole('button')| Btn["Ping"]
    Page -->|getByRole pierces open root| Shadow["#host shadow root"]
    Shadow --> SBtn["Shadow action"]
```

## Related Patterns

- **Previous**: Card 46 (Browser Dialogs).
- **Next**: Card 48 (Keyboard, Mouse & Drag).
- **Complementary**: Card 13 (Scoped Queries), Card 35 (Multi-Tab & Multi-Context).
