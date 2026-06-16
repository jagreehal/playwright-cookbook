---
name: playwright-executable-stories
description: Use when adding executable-stories-playwright to a Playwright suite, configuring its reporter, converting existing specs into BDD-style stories, generating user-story docs from tests, or embedding screenshots and recorded video into a test report. Turns ordinary `test()` blocks into living Markdown/HTML documentation with no `.feature` files and no step-definition glue.
---

# Playwright Executable Stories

`executable-stories-playwright` produces BDD-readable documentation from your real tests. You keep writing native Playwright `test()`. You add `story.init(testInfo)` and `given`/`when`/`then` markers. A reporter turns each run into living docs. No Cucumber, no `.feature` files, no parallel step-definition layer to keep in sync.

The docs regenerate from the actual run, so they cannot drift from the tests.

## Install

```bash
pnpm add -D executable-stories-playwright executable-stories-formatters
```

`executable-stories-formatters` is a peer dependency. Install it too, or the reporter has nothing to write with.

## Quick Start

```ts
import { test, expect } from '@playwright/test';
import { story } from 'executable-stories-playwright';

test('a user logs in', async ({ page }, testInfo) => {
  story.init(testInfo);                  // testInfo is the SECOND callback arg

  story.given('a user on the login page');
  await page.goto('/login');

  story.when('they submit valid credentials');
  await page.getByLabel('Username').fill('alice');
  await page.getByLabel('Password').fill('secret');
  await page.getByRole('button', { name: 'Log in' }).click();

  story.then('the dashboard greets them');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
```

Then wire the reporter (below) and run `npx playwright test`. The scenario lands in your docs.

## The Three Things That Trip Everyone Up

Read these first. They cause the "it ran but produced nothing / timed out / report is empty" reports.

1. **`testInfo` is the second argument of the test callback.** `async ({ page }, testInfo) => {`. Pass it to `story.init(testInfo)`. Omit it and the scenario is never linked to the test, so it never appears.
2. **A CLI `--reporter` flag overrides the config reporters.** `playwright test --reporter=list` disables the story reporter, so no docs are written. To generate docs, run plain `npx playwright test` (or `pnpm test`) and let the config reporters run.
3. **The default format is `cucumber-json`, not human-readable.** Always set `formats: ['html']` (or `['markdown']`) explicitly.

## Reporter Setup

Add the reporter as a `[modulePath, options]` tuple. Playwright instantiates it; never pass `new Reporter()`.

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['html'],                                       // Playwright's own report, separate
    ['executable-stories-playwright/reporter', {
      formats: ['html'],                            // or ['markdown']; default is cucumber-json
      outputDir: 'docs',
      outputName: 'user-stories',                   // → docs/user-stories.html
      output: { mode: 'aggregated' },               // one file; 'colocated' = per-spec
      html: {
        title: 'User Stories',
        darkMode: true,
        searchable: true,
        embedScreenshots: true,                     // inline as base64 (portable)
        // theme: 'default' | 'corporate' | 'terminal' | 'minimal' | 'dashboard' | 'playful'
      },
      // rawRunPath: 'docs/raw-run.json',           // for the executable-stories CLI
    }],
  ],
});
```

Keep the reporter in every run so the docs stay current. In sharded CI, generate stories from the merged run, not per shard (see `playwright-ci`).

## Step Markers

Keywords: `given`, `when`, `then`, `and`, `but` (importable both as `story.given(...)` and top-level `given(...)`). The `story` object also carries AAA and generic aliases: `arrange`/`act`/`assert` and `setup`/`context`/`execute`/`action`/`verify`. Pick one vocabulary per suite.

Three call styles:

```ts
// 1. Marker-only — keeps the test flat. State the step, then write the code.
story.when('they submit the form');
await page.getByRole('button', { name: 'Submit' }).click();

// 2. Marker + inline docs — attach evidence to the step in one call.
story.then('the order is created', {
  json: { label: 'Response', value: { id: 'ord_123' } },
});

// 3. Callback — wraps the work, captures timing, returns the body's value.
const total = await story.when('the totals are computed', async ({ page }) => {
  return page.getByTestId('total').innerText();
});
```

**Default to marker-only.** It is the least ceremony and the easiest to read. Use the callback form only when you want per-step timing or a returned value.

> Callback steps receive a fixtures argument only when you pass fixtures into `init`: `story.init({ page }, testInfo)`. Without that, the callback still runs but its fixtures arg is empty. Marker-only sidesteps this entirely.

## Scenario Metadata

Pass options to `story.init` as the last argument:

```ts
story.init(testInfo, {
  tags: ['e2e', 'auth'],                 // labels in the report
  ticket: 'JIRA-123',                    // or [{ id: 'JIRA-123', url: '...' }]
  covers: ['src/auth/**'],               // product code this scenario exercises
  meta: { owner: 'payments' },           // arbitrary key/value
  traceUrlTemplate: 'https://grafana.example.com/explore?traceId={traceId}',
});
```

`test.describe('Authentication', () => { ... })` titles become section headings in the docs. The scenario title is the Playwright test title.

## Rich Doc Entries

Call these inside a step to attach evidence. Each returns a `DocEntry` and accepts nested `children`.

| Method | Use |
|---|---|
| `story.note('text')` | A plain explanatory line |
| `story.json({ label, value })` | Pretty-printed JSON payload |
| `story.kv({ label, value })` | A single labelled value |
| `story.table({ label, columns, rows })` | Tabular data |
| `story.code({ label, content, lang })` | A code block |
| `story.link({ label, url })` | An external link |
| `story.section({ title, markdown })` | A rich Markdown block |
| `story.mermaid({ code, title })` | A rendered diagram |
| `story.screenshot({ path, alt })` | An image **the reporter won't already collect** (see below) |
| `story.video({ path, caption, poster })` | A video **the reporter won't already collect** (see below) |
| `story.console({ page, label, includeErrors })` | Snapshot page console / errors (PW ≥ 1.56) |
| `story.observePageErrors({ page, ignore })` | Structured runtime-error capture (PW ≥ 1.56) |

These same keys are available inline via the docs object on a marker (`story.then('...', { note, json, table, ... })`).

## Screenshots and Video — Let the Reporter Do It

The reporter already collects Playwright's native attachments. On `onTestEnd` it persists every video/screenshot/trace: small files (≤ `inlineMaxBytes`, default 1 MB) are base64-inlined into the report, larger ones are copied to `<outputDir>/attachments/`. It also dedupes the multiple `.webm` files Playwright sometimes emits. The report is portable on its own — no manual copying, no `story.video()`, no `story.screenshot()`.

**Video** — record it. That is the whole step:

```ts
test.use({ video: 'on' });   // cookbook configs often default to retain-on-failure
```

The reporter finds the recording, inlines or copies it, and shows one player per scenario.

**Screenshots** — attach with Playwright's API. The reporter inlines it:

```ts
await testInfo.attach('dashboard', {
  body: await page.screenshot(),     // body keeps it off disk; reporter inlines small images
  contentType: 'image/png',
});
```

**The duplication trap:** do **not** also call `story.screenshot()` or `story.video()` for an artifact Playwright already attaches. The reporter renders the auto-collected attachment *and* your explicit story entry, so the media shows twice. Reserve `story.screenshot()` / `story.video()` for media the reporter cannot see on its own — an image you generated yourself, or a video at an external `http(s)` URL.

Tune persistence with the reporter's `attachments` option:

```ts
['executable-stories-playwright/reporter', {
  formats: ['html'],
  outputDir: 'docs',
  attachments: { inlineMaxBytes: 2_000_000, dir: 'docs/attachments', enabled: true },
}]
```

`featureVideo: true` on `story.init` is a separate convenience that promotes the recording to a featured inline player; it duplicates with a manual `story.video()` for the same recording, so use one or the other.

## Converting Existing Tests

Three mechanical edits. No behaviour change; the test still passes or fails on the same conditions.

1. Add `testInfo` as the second callback parameter: `async ({ page }, testInfo) => {`.
2. Call `story.init(testInfo)` first.
3. Add `given`/`when`/`then` markers in front of the code they describe.

Keep the `.spec.ts` filename. The runner and reporter pick up `*.spec.ts`; do not rename to `.story.test.ts`.

For modifiers, use Playwright's native `test.skip` / `test.only` / `test.fixme` / `test.fail` / `test.slow`. They work unchanged and a skipped or failing scenario is reflected in the report.

## Generating and Viewing Docs

```bash
npx playwright test            # config reporters run → writes docs/user-stories.html
open docs/user-stories.html    # macOS; use your OS opener otherwise
```

Generated docs and recorded media are build artifacts. Gitignore `docs/` (or your chosen `outputDir`) unless you deliberately publish the report.

## Anti-Patterns

| Anti-pattern | Why it breaks | Fix |
|---|---|---|
| `story.init()` with no `testInfo` | Scenario never links to the test; absent from docs | `async ({ page }, testInfo) => { story.init(testInfo); }` |
| Running with `--reporter=list` and expecting docs | CLI flag overrides config reporters | Run plain `npx playwright test` |
| Leaving `formats` unset | Default is `cucumber-json`, not readable | `formats: ['html']` or `['markdown']` |
| `new Reporter({...})` in config | Playwright wants a module-path tuple | `['executable-stories-playwright/reporter', {...}]` |
| `story.video()`/`story.screenshot()` for an artifact Playwright already attaches | Reporter renders the auto-collected attachment *and* the story entry → media shown twice | Let the reporter collect the native attachment; reserve `story.*` for media it can't see |
| `featureVideo: true` plus a manual `story.video()` for the same recording | Both render the same `.webm` | Use one or the other |
| Manually copying `.webm` files or `await page.video()?.saveAs()` in `afterEach` | Reinvents the reporter's persistence; `saveAs` also waits for page close → timeout | Set `video: 'on'`; the reporter persists and dedupes automatically |
| Callback steps expecting `{ page }` without init fixtures | Fixtures arg is empty | Pass `story.init({ page }, testInfo)` or use marker-only |
| Renaming specs to `.story.test.ts` | Runner/reporter expect `.spec.ts` | Keep `*.spec.ts` |
| Generating stories per shard in CI | Each shard sees a fraction of tests | Generate from the merged run |

## Cross-References

- Runnable example: Card 38 (`src/38-executable-stories`) in this cookbook.
- The journey these stories document: `playwright-flows`, and Card 11 (login flow).
- Reporter behaviour in sharded CI: `playwright-ci`.
- Web-first assertions the steps wrap: `playwright-assertions`.

## Quick Quality Checklist

- `testInfo` is the second callback arg and is passed to `story.init`.
- Reporter is a module-path tuple with `formats: ['html']` (or `['markdown']`).
- Docs generated with a plain run, not a `--reporter` override.
- One step vocabulary across the suite (BDD or AAA, not both).
- Screenshots/video copied into `outputDir`; report is portable.
- `outputDir` is gitignored unless intentionally published.
