# Card 44: Agentic MCP → CI

The portable agent skill for this pattern is `playwright-agentic-testing`.

## What This Pattern Solves

A browser agent can pursue a **goal** through Playwright MCP: observe the UI,
adapt, and stop when the outcome holds. That is useful for exploration, flake
debugging, and reproducing bugs you cannot fully script yet.

It is a bad fit for high-frequency CI. Agent runs are slow and expensive, and
they should not own regression. The durable handoff is:

1. Explore the goal with Playwright MCP (or another browser agent loop).
2. Review the path the agent found.
3. Commit a **deterministic** Playwright test that encodes that journey.
4. Run the committed test in CI forever. Leave the live agent out of the pipeline.

This card is the committed half of that loop. Card 42 (WebMCP) is a different
surface: the *page* exposes tools to agents. Here the *agent* drives the browser
through Playwright MCP, then you keep a normal test.

## Goal an agent might pursue

```text
Open /login. Sign in as testuser / password. Land on the dashboard and confirm
the greeting mentions testuser. Prefer roles and labels over CSS selectors.
```

Hand that to an MCP-connected agent against this demo app. When it succeeds,
write the spec below (or refine what the agent drafted) using the architecture
skills — fixtures, roles, web-first assertions — not a dump of `page.click`
and sleeps.

## Code Example

```typescript
import { test, expect } from '@playwright/test';

/**
 * Deterministic journey kept after an MCP exploration session.
 * CI runs this file. It does not run the agent.
 */
test.describe('44-agentic-mcp-to-ci: committed journey after MCP explore', () => {
  test('signs in and reaches the dashboard', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();

    await page.getByLabel('Username').fill('testuser');
    await page.getByLabel('Password').fill('password');

    const submit = page.getByRole('button', { name: 'Log in' });
    await Promise.all([page.waitForURL(/protected/), submit.click()]);

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByTestId('dashboard-message')).toContainText('testuser');
  });
});
```

## How It Works

1. **MCP explores; CI executes.** The agent session is a discovery tool. The
   committed file is the regression gate.
2. **Review before you keep it.** Agent drafts often use brittle selectors and
   sleeps. Rewrite with `getByRole` / `getByLabel` and web-first assertions
   (`playwright-architecture`, `playwright-locators`, `playwright-assertions`).
3. **Do not put the agent loop in CI.** If the path is known, a Playwright test
   is faster, cheaper, and deterministic. If the path is not known, that is an
   on-demand agentic run — not a PR check.

## When To Use

- You used Playwright MCP (or similar) to find or debug a UI path and want a
  lasting regression check.
- You generate a first draft of a test with an agent and need a pattern for what
  “done” looks like in the suite.
- Not when you are testing tools the page registers for agents — that is Card 42
  (`playwright-webmcp`).
- Not when a cheaper tier already owns the claim (component / integration) —
  push the claim down; do not agentic-reprove it.

## Related Patterns

- Card 11 (Login Flow) — same demo surface, teaching form + navigation basics
- Card 42 (WebMCP Tools) — page→agent API contract, not agent→browser execution
- Card 21 / 26 — AppDriver and full architecture once journeys grow
- Skills: `playwright-agentic-testing`, `playwright-architecture`, `playwright-debugging`
