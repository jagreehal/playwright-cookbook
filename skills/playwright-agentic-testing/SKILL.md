---
name: playwright-agentic-testing
description: >-
  Explore UI goals with a browser agent (Playwright MCP), then commit a
  deterministic Playwright journey for CI. Use this skill when debugging flakes,
  reproducing production bugs, discovering a path you will encode as a test,
  or deciding whether an agent run belongs in CI. Do not use for testing
  page-registered WebMCP tools (playwright-webmcp), flake diagnosis without
  an agent (playwright-reliability), or everyday suite architecture
  (playwright-architecture).
---

# Agentic testing → deterministic CI

Agents verify **goals**. CI needs **journeys**. Use a browser agent to explore,
debug, or repro; then write or refine a Playwright test that encodes the path
you care about. Never leave the live agent loop as a PR gate.

## Critical rules

- Agentic runs are on-demand: exploration, flake hunting, production repro.
- Known paths become committed Playwright tests with web-first assertions.
- Do not put Playwright MCP (or shell CLI agent loops) in high-frequency CI.
- Prefer structured browser tools (MCP) over ad-hoc shell CLIs when reliability matters.
- Review agent-written drafts with `playwright-architecture`, `playwright-locators`, and `playwright-assertions` before merging.
- If a cheaper tier already owns the claim, push the assertion down — do not agentic-reprove it.

## Workflow

1. Doctor the consuming repo: `playwright.config.*`, `testDir`, fixtures, `baseURL`, package manager. Adapt; do not invent a parallel tree.
2. Write a short **goal** (natural language): outcome, success checks, and an explicit refusal list of claims owned elsewhere.
3. With Playwright MCP connected, run the goal against a local or test environment using non-production data.
4. When the goal succeeds, encode the path as a deterministic spec (page objects / fixtures per the suite convention). Drop sleeps, CSS click-chains, and one-off waits.
5. Validate with the project's test script on that file. Commit the spec. Keep the goal file only if the team uses it for on-demand agentic smoke — not as CI.

## Goal shape

```markdown
# Goal: <outcome>

## Success
- <observable UI / URL / server-backed state>

## Do not re-check
- <claim> → <cheaper owner>
```

## Committed journey shape

```ts
import { test, expect } from '@playwright/test';
// Or: import { test, expect } from './fixtures';

test('user reaches <outcome>', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill('testuser');
  await page.getByLabel('Password').fill('password');
  const submit = page.getByRole('button', { name: 'Log in' });
  await Promise.all([page.waitForURL(/protected/), submit.click()]);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
```

Prefer fixtures and page objects when the suite already has them.

## When agentic spend earns its place

- Exploring complex or unfamiliar UI behaviour
- Debugging a flaky workflow after traces are inconclusive
- Reproducing a production bug whose steps are incomplete

Not for: every PR, re-checking leaf UI copy, or replacing a green deterministic suite.

## Validation

- Run the committed spec with the project's test script (e.g. `npx playwright test <file>`). Expect a pass with no agent connected.
- Re-run it twice; a journey that only passes under the agent loop is not committable.
- Grep the spec for `waitForTimeout`, `page.locator('.')`, and CSS click-chains — none should survive the agent-to-spec translation.
- Confirm no CI workflow starts Playwright MCP or a shell agent loop.

## Related skills

- `playwright-architecture` — structure the committed test
- `playwright-debugging` / `playwright-reliability` — evidence before agent spend
- `playwright-webmcp` — page exposes tools to agents (different surface)
