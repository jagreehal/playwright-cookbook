import { defineConfig } from '@playwright/test';
import { CHROME_FLAGS, requireChrome } from './src/42-webmcp-tools/chrome';

/**
 * The native lane (Card 42).
 *
 * Everything else in this cookbook runs on bundled Chromium against a WebMCP
 * test double. This config drives a real Chrome with the flags on, so the
 * double can be checked instead of trusted. Run it on demand:
 *
 *   pnpm test:webmcp:native
 *
 * `.contract.ts` rather than `.spec.ts` keeps these files out of the default
 * `pnpm test`, which has no browser that could pass them.
 */
export default defineConfig({
  testDir: './src/42-webmcp-tools',
  testMatch: '**/*.contract.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:9321',
    launchOptions: {
      executablePath: requireChrome(),
      args: CHROME_FLAGS,
    },
  },
  webServer: {
    command: 'pnpm --filter playwright-cookbook-web dev',
    url: 'http://localhost:9321',
    reuseExistingServer: !process.env.CI,
  },
});
