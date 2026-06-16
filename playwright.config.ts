import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './src',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // Don't pin workers:1 on an isolated, parallel-safe suite (playwright-config).
  workers: isCI ? '50%' : undefined,
  // Strict global/expect/action timeouts surface races fast (playwright-config).
  timeout: 60_000,
  expect: {
    timeout: 7_500,
    // Cross-runner font antialiasing shifts a handful of edge pixels (~38px on
    // these small cards) even with deterministic data and pinned rendering.
    // Tolerate a tiny pixel-diff ratio so committed baselines survive runner
    // image bumps, while structural regressions (thousands of pixels) still
    // fail. Per-test maxDiffPixels overrides remain stricter where set, since
    // the smaller of the two limits wins (playwright-visual-regression).
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
  },
  // On CI emit a blob report to merge across shards, plus junit for the CI UI;
  // the HTML report is produced by the merge step (playwright-ci).
  reporter: isCI
    ? [
        ['list'],
        ['blob'],
        ['junit', { outputFile: 'test-results/junit.xml' }],
        executableStories(),
      ]
    : [['html'], executableStories()],
  use: {
    baseURL: 'http://localhost:9321',
    // Demo pages: / (person), /login, /protected. Docs: /docs
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [
    // Auth bootstrap: logs in once per role, writes storageState files.
    { name: 'setup', testMatch: /.*\.setup\.ts/, use: { ...devices['Desktop Chrome'] } },

    // Functional suite: everything except visual snapshots. Depends on setup so
    // storageState files exist for the specs that consume them.
    // Selective runs: `--grep @smoke` / `--grep @integration`.
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      grepInvert: /@visual/,
      dependencies: ['setup'],
    },

    // Visual suite: isolated project with pinned rendering for deterministic,
    // CI-safe screenshot diffs (playwright-visual-regression).
    {
      name: 'chromium-visual',
      grep: /@visual/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        timezoneId: 'UTC',
        locale: 'en-US',
      },
    },
  ],
  webServer: {
    command: 'pnpm --filter playwright-cookbook-web dev',
    url: 'http://localhost:9321',
    reuseExistingServer: !isCI,
  },
});

// The executable-stories reporter is kept in every run so the cookbook's
// user-story docs stay in sync.
function executableStories(): [string, Record<string, unknown>] {
  return [
    'executable-stories-playwright/reporter',
    {
      formats: ['html'],
      outputDir: 'docs',
      outputName: 'user-stories',
      output: { mode: 'aggregated' },
      html: {
        title: 'Playwright Testing Cookbook - User Stories',
        darkMode: true,
        searchable: true,
        embedScreenshots: true,
      },
    },
  ];
}
