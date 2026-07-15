---
name: playwright-webmcp
description: >-
  Two-lane Playwright testing for pages that register WebMCP tools on
  document.modelContext. Use this skill when a page exposes agent tools, when
  bundled Chromium lacks the API, when choosing a test double versus flagged
  Chrome, or when tool schemas and handlers need coverage. Do not use for
  mocking HTTP APIs (playwright-network-mocking), generic test.extend wiring
  (playwright-fixtures), or testing an agent's reasoning about the tools.
---

# Testing WebMCP tools with Playwright

WebMCP lets a page register tools an agent can call via `document.modelContext.registerTool()`. Bundled Chromium has no WebMCP. Chrome ships it behind flags. Split the suite so everyday tests run anywhere, and a native lane keeps the double honest.

## Critical rules

- Default lane: bundled Chromium plus a `document.modelContext` double installed with `page.addInitScript()` (before any page script).
- Native lane: real Chrome with flags, files named `*.contract.ts` so the default run ignores them. Feature-detect and skip; never fail as a missing API.
- Before writing the double, read [references/chrome-behaviours.md](references/chrome-behaviours.md). Match throw → `UnknownError`. Do not copy a library that returns the message as text.
- Resolve Chrome with `requireChrome()` / `CHROME_BIN` and throw when missing. `executablePath: undefined` falls back to bundled Chromium and the failure reads as a page bug.
- Probe on `http://localhost`, never a `data:` URL (opaque origin, no `modelContext`).
- Detect `executeTool` separately from `modelContext`. It is a Chromium preview extension.
- Assert user-visible state after a tool call. A handler can report success while the DOM never moves.

## Workflow

1. Doctor the consuming repo: find `playwright.config.*`, `testDir`, existing fixtures import, package manager, `baseURL`. Adapt; do not invent a parallel tree.
2. Install the double on `page` via a fixture that calls `addInitScript`, then extend `test` so specs import from that file.
3. Write page tests against the page's tools: advertised names, parsed `inputSchema`, handler results, and the same UI a click would change.
4. Add a native config that launches Chrome with the flags below, `testMatch: '**/*.contract.ts'`, and `requireChrome()`. Feature-detect `registerTool` in `beforeEach` and `test.skip` when absent.
5. Validate with the project's commands (see below). Do not leave extra Chrome processes.

Default-lane double (throw must become `UnknownError`):

```ts
import { test as base, type Page } from '@playwright/test';

const installWebMcpShim = async (page: Page) => {
  await page.addInitScript(() => {
    const registry = new Map();
    const fail = (name, message) => {
      const error = new Error(message);
      error.name = name;
      throw error;
    };
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      value: {
        async registerTool(tool, options) {
          if (registry.has(tool.name)) fail('InvalidStateError', `Duplicate: ${tool.name}`);
          registry.set(tool.name, tool);
          options?.signal?.addEventListener('abort', () => registry.delete(tool.name));
        },
        async getTools() {
          return [...registry.keys()].sort().map((name) => ({
            name,
            description: registry.get(name).description,
            inputSchema: JSON.stringify(registry.get(name).inputSchema ?? {}),
          }));
        },
        async executeTool(tool, inputJson) {
          if (typeof inputJson !== 'string') fail('UnknownError', 'Failed to parse input arguments');
          try {
            const result = await registry.get(tool.name).execute(JSON.parse(inputJson));
            return typeof result === 'string' ? result : String(JSON.stringify(result));
          } catch {
            fail(
              'UnknownError',
              'Tool was executed but the invocation failed. For example, the script function threw an error',
            );
          }
        },
      },
    });
  });
};

export const test = base.extend({
  page: async ({ page }, use) => {
    await installWebMcpShim(page);
    await use(page);
  },
});
```

Page test: assert the UI, not only the return value.

```ts
test('an agent calling a tool changes what the user sees', async ({ page }) => {
  await page.goto('/cart');
  const result = await page.evaluate(async () => {
    const [add] = await document.modelContext.getTools();
    return document.modelContext.executeTool(add, JSON.stringify({ sku: 'espresso', qty: 2 }));
  });
  expect(JSON.parse(result)).toMatchObject({ sku: 'espresso' });
  await expect(page.getByTestId('cart-count')).toHaveText('2');
});
```

Native config. Use `channel: 'chrome-canary'` only when any installed Canary is enough.

```ts
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.contract.ts',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    launchOptions: {
      executablePath: requireChrome(),
      args: [
        '--enable-experimental-web-platform-features',
        '--enable-features=WebMCPTesting,DevToolsWebMCPSupport',
      ],
    },
  },
});
```

```ts
export const requireChrome = (): string => {
  const found = [process.env.CHROME_BIN, '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary']
    .find((candidate): candidate is string => !!candidate && existsSync(candidate));
  if (!found) throw new Error('No Chrome with WebMCP. Set CHROME_BIN.');
  return found;
};
```

```ts
test.beforeEach(async ({ page }) => {
  await page.goto('/cart');
  const available = await page.evaluate(
    () => typeof document.modelContext?.registerTool === 'function',
  );
  test.skip(!available, 'This Chrome exposes no document.modelContext');
});
```

TypeScript's DOM lib does not know `modelContext`. Declare a narrow slice (`inputSchema: string`, optional `executeTool`). A wrong guess is a lie the compiler defends.

## Validation

- Default lane: `npx playwright test e2e/webmcp --project=chromium` (or the project's test script and path). Expect a pass without flagged Chrome.
- Native lane, if a flagged Chrome exists: `npx playwright test --config=playwright-webmcp-native.config.ts`. Expect skip when the API is absent, pass when it is present.
- At least one test asserts user-visible state after a tool call.
- Schema tests `JSON.parse` `inputSchema` before asserting `required` / `enum`.

## Constraints

- Do not mock `document.modelContext` in the native lane.
- Do not make the native lane a required CI gate; most runners have no flagged Chrome.
- Do not version-gate (`>= 152`). Ask the browser.

`playwright-fixtures` for extending `test`. `playwright-projects-tags` for keeping `*.contract.ts` out of the default run.
