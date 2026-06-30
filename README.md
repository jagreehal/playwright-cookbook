# Playwright Cookbook

[![skills.sh](https://skills.sh/b/jagreehal/playwright-cookbook)](https://skills.sh/jagreehal/playwright-cookbook)

A workshop-style guide to testing with Playwright, from your first browser test to a composed architecture for large suites. Every card ships with runnable code and a README.

## Why This Cookbook?

The cookbook covers Playwright testing end to end: API mocking, locators and page objects, accessibility, auth, stability, and fixture composition.

- **Progressive**: 38 cards ordered simple to complex, each building on the last.
- **Workshop tested**: Follows the pedagogy of real Playwright training.
- **Runs for real**: Every pattern runs against the demo Astro app and passes in CI.
- **Reference quality**: Jump to any card for a self-contained pattern.

The mocking cards (02-10) use `page.route()` and `context.route()` to intercept browser requests and return deterministic responses, so tests run with no real network and no flake.

## Skills

[![skills.sh](https://skills.sh/b/jagreehal/playwright-cookbook)](https://skills.sh/jagreehal/playwright-cookbook)

This cookbook ships the patterns as **agent skills** — reusable capabilities that give your AI agent procedural knowledge for writing maintainable Playwright suites. The 22 skills under [`skills/`](./skills) cover architecture, locators, test-id strategy, shadcn (base-ui) components, type-safe i18n, fixtures, network mocking, auth, reliability, visual regression, CI, executable stories, and more. Think of them as plugins that teach your agent the conventions used throughout these cards.

### Install

Install with the [skills CLI](https://github.com/vercel-labs/skills):

```bash
# Install the full Playwright skills pack
npx skills add jagreehal/playwright-cookbook
```

This downloads the skills and makes them available to your AI agent (Claude Code, Cursor, and other compatible agents).


## Playwright MCP

[Playwright MCP](https://playwright.dev/docs/getting-started-mcp) gives AI assistants browser automation through the Model Context Protocol. Instead of screenshots, it uses structured accessibility snapshots — element roles, labels, and refs — so an agent can navigate pages, fill forms, and click controls without a vision model.

This repo ships [`.mcp.json`](./.mcp.json) so Cursor and other MCP clients can pick up the server automatically:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

**Cursor**: open **Settings → MCP** and confirm the `playwright` server is connected, or install with `npx @playwright/mcp@latest`.

**Other clients** (VS Code, Claude Code, Windsurf, etc.): copy the config above into your client's MCP settings. See the [Playwright MCP docs](https://playwright.dev/docs/getting-started-mcp) for client-specific install steps, headed/headless mode, browser selection, and advanced options.

Once connected, try:

```
Navigate to https://demo.playwright.dev/todomvc and add a few todo items.
```

Pair MCP with the [skills pack](#skills) above — skills teach conventions; MCP lets the agent drive a real browser while you work through the cards.

## Quick Start

```bash
# Install and run all tests
pnpm install
pnpm test

# Run specific cards
pnpm test src/01-first-browser-test
pnpm test src/02-mock-first-api
pnpm test src/11-login-flow

# Record real API responses (cards 06-07)
pnpm test:record

# Run in headed mode (see the browser)
pnpm test:headed

# Run with Playwright Inspector (step-through debugging)
pnpm test:debug src/01-first-browser-test

# Run UI mode (visual test explorer)
pnpm test:watch

# Lint all test files (ESLint + Playwright plugin)
pnpm lint
```

## Learning Path

**New to Playwright?** Follow the cards in order:
1. Start with **Cards 01-02** (browser basics + first mock)
2. Master **Cards 03-10** (API mocking techniques)
3. Learn **Cards 11-15** (page interactions + patterns)
4. Explore **Cards 16-26** (production patterns + architecture)
5. Advance to **Cards 27-38** (visual regression, component testing, CI, HAR, mobile, multi-context, executable stories)

**Experienced tester?** Jump to specific patterns:
- Need auth? → Card 19 (Storage State)
- Need fixtures? → Card 06 (Record & Replay)
- Need architecture? → Card 26 (Full Architecture), built on Card 12 (Locators-Actions-Flows)
- Need debugging? → Card 16 (Unhandled Requests)

## How It's Structured

### Demo Application
- **Astro app** at `apps/web` serves:
  - `/` - Person demo (SWAPI integration)
  - `/login` - Login form
  - `/protected` - Protected dashboard
  - `/docs` - Documentation (generated from card READMEs)
- Run locally: `pnpm dev:web` (opens http://localhost:9321)
- Tests use `webServer` config to run against real pages

### Cards
Each card (`src/01-...` through `src/38-...`) includes:
- **README.md**: Full explanation with diagrams, common mistakes, when to use
- **[name].spec.ts**: Runnable test demonstrating the pattern
- **Fixtures/helpers**: Supporting files where needed

All tests are isolated, deterministic, and pass in CI.

## Debugging in This Cookbook

Several debugging tools are pre-configured:

| Method | How to use |
|--------|------------|
| **UI Mode** | `pnpm test:watch` — visual explorer with timeline, DOM snapshots, and test picker |
| **Headed Mode** | `pnpm test:headed` — see the browser during test execution |
| **Playwright Inspector** | `pnpm test:debug src/...` — step through tests line by line, inspect selectors |
| **Trace Viewer** | `npx playwright show-trace test-results/.../trace.zip` — recorded traces on retry (card 29) |
| **VS Code Debugger** | Set breakpoints and press F5 with the provided `.vscode/launch.json` |
| **Verbose API Logs** | `DEBUG=pw:api pnpm test` — see every Playwright API call |
| **`page.pause()`** | Drop `await page.pause()` in any test to open Inspector at that point (card 29) |
| **Page error capture** | Auto-fixture collects console errors and attaches them on failure (card 22) |

See cards **16** (debug unhandled requests), **22** (failure artifacts), and **29** (trace viewer) for deeper dives.

## ESLint

The project ships with a strict ESLint setup combining these presets:

- `eslint:recommended` — core JavaScript best practices
- `@typescript-eslint/recommended` — TypeScript-aware rules
- `playwright/recommended` — Playwright-specific rules (async safety, locator preferences, test structure)

Type-aware rules (`no-floating-promises`, `no-misused-promises`) are enabled on spec files to catch unawaited Playwright actions at lint time — the same mistakes that cause flaky tests.

```bash
pnpm lint          # Run ESLint
pnpm lint --fix    # Auto-fix fixable issues
```

## Cards (Table of Contents)

### Part 1: Browser Fundamentals (01-02)
*Your first Playwright tests*

| Card | Topic | What You Learn |
|------|-------|----------------|
| [01-first-browser-test](./src/01-first-browser-test/README.md) | Open browser, assert on page (no mocking) | `page.goto()`, `expect().toBeVisible()`, why mocking matters |
| [02-mock-first-api](./src/02-mock-first-api/README.md) | Mock your first API with `page.route()` | `page.route()`, `route.fulfill()`, deterministic tests |

### Part 2: API Mocking Mastery (03-10)
*Control your test data*

| Card | Topic | What You Learn |
|------|-------|----------------|
| [03-full-mock-payload](./src/03-full-mock-payload/README.md) | Complete data structures, multiple assertions | Full payloads, contract testing |
| [04-mock-only-what-you-need](./src/04-mock-only-what-you-need/README.md) | Strict mode, unhandled request tracking | Strict routes, CI safety |
| [05-proxy-to-real-api](./src/05-proxy-to-real-api/README.md) | Hybrid mocking: real data + patches | `route.fetch()`, hybrid testing |
| [06-record-and-replay-fixtures](./src/06-record-and-replay-fixtures/README.md) | Capture real responses, replay offline | Fixture recording, `pnpm test:record` |
| [07-patch-fixtures](./src/07-patch-fixtures/README.md) | Override specific fields in fixtures | Edge case testing, fixture variations |
| [08-validate-with-zod](./src/08-validate-with-zod/README.md) | Runtime type safety for API responses | Zod schemas, contract validation |
| [09-generate-data-faker](./src/09-generate-data-faker/README.md) | Deterministic synthetic data | Faker builders, data generation |
| [10-per-test-overrides](./src/10-per-test-overrides/README.md) | Default handlers + scenario overrides | Error scenarios, handler composition |

### Part 3: Page Interactions (11-14)
*Beyond reading - user flows*

| Card | Topic | What You Learn |
|------|-------|----------------|
| [11-login-flow](./src/11-login-flow/README.md) | Forms, submission, navigation | `fill()`, form interactions, multi-page flows |
| [12-locators-actions-flows](./src/12-locators-actions-flows/README.md) | 3-layer architecture pattern | Separation of concerns, Page Objects |
| [13-scoped-queries](./src/13-scoped-queries/README.md) | Container-first querying, selector policy | Scoped locators, selector hierarchy |
| [14-region-objects](./src/14-region-objects/README.md) | Reusable component helpers | ToastRegion, DialogRegion patterns |

### Part 4: Stability & Reliability (15-18)
*Production-ready tests*

| Card | Topic | What You Learn |
|------|-------|----------------|
| [15-done-signals](./src/15-done-signals/README.md) | Wait for network, prevent flake | `waitForApi`, done signals, no naked clicks |
| [16-debug-unhandled-requests](./src/16-debug-unhandled-requests/README.md) | Debug missing mocks | Fallback handlers, debugging workflow |
| [17-accessibility-axe](./src/17-accessibility-axe/README.md) | Automated accessibility scanning | Axe integration, a11y testing |
| [18-stability-techniques](./src/18-stability-techniques/README.md) | Animations, strict locators, visuals | `setPreferredReducedMotion`, visual regression |

### Part 5: Architecture & Data (19-21)
*Scale your test suite*

| Card | Topic | What You Learn |
|------|-------|----------------|
| [19-auth-storage-state](./src/19-auth-storage-state/README.md) | Fast auth, storage state reuse | `storageState`, globalSetup, skip UI login |
| [20-api-seeding-cleanup](./src/20-api-seeding-cleanup/README.md) | Data factories, cleanup patterns | Test data management, factories |
| [21-app-driver-fixture](./src/21-app-driver-fixture/README.md) | High-level abstraction, test.step | Custom fixtures, test organization |

### Part 6: Debugging & Observability (22-25)
*When things go wrong*

| Card | Topic | What You Learn |
|------|-------|----------------|
| [22-failure-artifacts](./src/22-failure-artifacts/README.md) | Auto fixtures, pageerror capture | Debugging workflow, error context |
| [23-api-only-tests](./src/23-api-only-tests/README.md) | Testing APIs without browser | `request` fixture, API testing |
| [24-parameterized-tests](./src/24-parameterized-tests/README.md) | Data-driven testing patterns | Looping over typed cases |
| [25-default-conventions](./src/25-default-conventions/README.md) | Summary of all patterns | Reference checklist |

### Part 7: Architecture at Scale (26)
*Compose everything into one suite*

| Card | Topic | What You Learn |
|------|-------|----------------|
| [26-full-architecture](./src/26-full-architecture/README.md) | Fixture composition root | One `fixtures.ts`, page objects own their components, lazy + auto fixtures |

### Part 8: Advanced Playwright Patterns (27-38)
*Beyond the basics: the full Playwright toolkit*

| Card | Topic | What You Learn |
|------|-------|----------------|
| [27-visual-regression](./src/27-visual-regression/README.md) | Full visual regression depth | `maxDiffPixels`, `threshold`, masking, `stylePath`, `--update-snapshots` |
| [28-component-testing](./src/28-component-testing/README.md) | Testing components in isolation | `page.evaluate()` mount, `@playwright/experimental-ct-*` overview |
| [29-trace-viewer](./src/29-trace-viewer/README.md) | Reading and navigating traces | `--trace on`, `npx playwright show-trace`, trace modes |
| [30-ci-sharding-and-merge-reports](./src/30-ci-sharding-and-merge-reports/README.md) | CI sharding and blob reports | `--shard`, blob reporter, `merge-reports`, GitHub Actions workflow |
| [31-network-har](./src/31-network-har/README.md) | HAR record and replay | `routeFromHAR`, `recordHar`, `--save-har`, `notFound` |
| [32-mobile-and-emulation](./src/32-mobile-and-emulation/README.md) | Mobile devices and emulation | `devices['iPhone 13']`, geolocation, permissions, `colorScheme` |
| [33-worker-scoped-fixtures](./src/33-worker-scoped-fixtures/README.md) | Expensive setup once per worker | `scope: 'worker'`, DB pools, server startup |
| [34-retries-and-soft-assertions](./src/34-retries-and-soft-assertions/README.md) | Soft assertions, polling, test.fail | `expect.soft`, `expect.poll`, `expect.toPass`, `test.fail` |
| [35-multi-tab-and-multi-context](./src/35-multi-tab-and-multi-context/README.md) | Tabs, popups, multi-user contexts | `context.newPage()`, `waitForEvent('page')`, `browser.newContext()` |
| [36-file-uploads-downloads](./src/36-file-uploads-downloads/README.md) | File uploads, downloads, clipboard | `setInputFiles`, `waitForEvent('download')`, clipboard API |
| [37-global-setup-teardown](./src/37-global-setup-teardown/README.md) | Config-level setup and teardown | `globalSetup`, `globalTeardown`, `projects[].storageState` |
| [38-executable-stories](./src/38-executable-stories/README.md) | BDD-style living docs generated from tests | `story.init(testInfo)`, `given`/`when`/`then`, executable-stories reporter |
| [39-testid-strategy](./src/39-testid-strategy/README.md) | When a test id earns its place vs hides a missing role | Build-it-twice, `aria-labelledby` vs slug labels, conditional wrappers, `useId()` |
| [40-shadcn-components](./src/40-shadcn-components/README.md) | Testing shadcn (base-ui) components, isolated + rendered | Named `combobox`/`option`, `Notifications` region, portal scoping, named-role vs test id, hydration-safe interaction |
| [41-i18n-typesafe](./src/41-i18n-typesafe/README.md) | Type-safe i18next, tested by the translated name | `CustomTypeOptions`, `tsc` gate, select by shared translation source, language switch, JSON import attributes |

## Quick Reference

**Problem → Solution**

| I need to... | Go to Card... |
|--------------|---------------|
| Start learning Playwright | 01 (First Browser Test) |
| Mock an API for the first time | 02 (Mock Your First API) |
| Test a login flow | 11 (Login Flow) |
| Use real API data with patches | 05 (Proxy to Real API) |
| Record real API responses | 06 (Record Fixtures) |
| Handle form submissions | 11 (Login Flow) |
| Organize tests better | 12 (Locators-Actions-Flows) |
| Debug missing mocks | 16 (Debug Unhandled Requests) |
| Test accessibility | 17 (Accessibility with Axe) |
| Skip login UI (fast auth) | 19 (Auth Storage State) |
| Manage test data | 20 (API Seeding) |
| Fix flaky tests | 15 (Done Signals) |
| Test error scenarios | 10 (Per-Test Overrides) |
| Compose a large suite | 26 (Full Architecture) |
| Visually regress UI | 27 (Visual Regression) |
| Test in isolation | 28 (Component Testing) |
| Debug a failure | 29 (Trace Viewer) |
| Speed up CI | 30 (CI Sharding) |
| Record network | 31 (Network HAR) |
| Test mobile views | 32 (Mobile & Emulation) |
| Cache expensive setup | 33 (Worker-Scoped Fixtures) |
| Soft-assert a form | 34 (Retries & Soft Assertions) |
| Test multi-tab flows | 35 (Multi-Tab & Multi-Context) |
| Test file uploads/downloads | 36 (File Uploads & Downloads) |
| Set up per-role auth in CI | 37 (Global Setup & Teardown) |
| Generate living docs from tests | 38 (Executable Stories) |

## Tech Stack

- **Playwright Test** – Browser automation and test runner
- **TypeScript** – Type-safe tests and shared utilities
- **ESLint** – Linting with `eslint-plugin-playwright`, `typescript-eslint`, and type-aware async safety rules
- **Astro** – Demo application (docs + person/login pages)
- **Zod** – Runtime schema validation (Card 08)
- **Faker** – Synthetic data generation (Card 09)
- **executable-stories-playwright** – BDD-style living docs generated from tests (Card 38)

## Principles

This cookbook follows Playwright best practices:

- **Web-first assertions**: Use `expect().toBeVisible()`, never `waitForTimeout()`
- **Stable selectors**: Prefer `getByRole`, `getByLabel`, `getByTestId` (in that order)
- **Page Object Model**: Separate locators, actions, and flows into `locators.ts` / `actions.ts` / `flow.ts`. See `src/e2e-patterns/` and cards 12, 14, 21, 26.
- **Fixture composition**: Specs never call `page.goto()` or `page.route()` — fixtures own setup. Auto-fixtures run invisibly for cross-cutting concerns.
- **Trace on failure**: Config includes `trace: 'on-first-retry'`
- **Isolated tests**: Each test runs independently with explicit setup
- **Deterministic**: No flake, no external dependencies in tests
- **Async safety**: `no-floating-promises` and `no-misused-promises` catch unawaited Playwright actions at lint time

## Contributing

Found an issue or have a pattern to suggest? Open an issue or PR.

The cookbook uses public Playwright APIs only, with clear patterns and tests that pass in CI.

## License

MIT

---

**Pro tip**: Run cards 01-11 in order for a complete workshop (about two hours). You go from zero to writing Playwright tests with API mocking, page interactions, and the first architecture patterns. Cards 27-38 fill in every remaining Playwright feature needed for production suites.
