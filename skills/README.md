# Playwright skills pack

Agent skills for writing maintainable Playwright suites. Install them into **any** Playwright repo. You do not need to clone this cookbook.

```bash
npx skills add jagreehal/playwright-cookbook
```

That makes the skills available to Claude Code, Cursor, and other compatible agents. Pair them with [Playwright MCP](https://playwright.dev/docs/getting-started-mcp) if you want the agent to drive a real browser while it works.

A runnable workshop that exercises the same patterns lives in the [playwright-cookbook](https://github.com/jagreehal/playwright-cookbook) repo. Cloning it is optional.

## How to use a skill in your repo

1. Doctor the project: find `playwright.config.*`, `testDir`, existing fixtures, and the package manager.
2. Adapt the skill's `e2e/` examples to that layout. Do not invent a parallel tree.
3. Run the project's test script against the files you touched. That run is the proof.

## Index

Start with **playwright-architecture** if the suite has no convention yet.

| Skill | Job |
|---|---|
| `playwright-architecture` | Folder layout and five non-negotiable rules |
| `playwright-config` | `playwright.config.ts` defaults, projects, timeouts |
| `playwright-projects-tags` | Project matrices and tag taxonomy |
| `playwright-fixtures` | `fixtures.ts` composition root |
| `playwright-locators` | Locator priority |
| `playwright-testid-strategy` | When a `data-testid` is the only honest handle |
| `playwright-assertions` | Web-first assertions; no sleeps |
| `playwright-page-objects` | Page objects with restraint |
| `playwright-components` | Container-rooted UI fragments |
| `playwright-flows` | Cross-page journeys |
| `playwright-auth` | `storageState` instead of per-test UI login |
| `playwright-test-isolation` | Parallel-safe tests |
| `playwright-test-data` | Factories, worker namespacing, teardown |
| `playwright-network-mocking` | `page.route`, HAR, mock vs real |
| `playwright-error-observability` | Fail on unexpected console/page errors |
| `playwright-reliability` | Flake diagnosis and permanent fixes |
| `playwright-debugging` | Trace, inspector, shortest path to a fix |
| `playwright-visual-regression` | Deterministic screenshots |
| `playwright-ci` | Sharding, artifacts, gates |
| `playwright-i18n` | Type-safe i18next + translated locators |
| `playwright-shadcn` | Named-role tests for shadcn/base-ui |
| `playwright-webmcp` | Two-lane tests for `document.modelContext` tools |
| `playwright-agentic-testing` | MCP goal explore → commit deterministic CI journey |
| `playwright-executable-stories` | Living docs from real tests |
| `build-tested-components` | Co-design accessible markup with its tests |
