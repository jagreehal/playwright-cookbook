import { existsSync } from 'node:fs';

/**
 * Chrome's WebMCP implementation sits behind flags, and Playwright's bundled
 * Chromium does not carry it at all.
 */
export const CHROME_FLAGS = [
  '--enable-experimental-web-platform-features',
  '--enable-features=WebMCPTesting,DevToolsWebMCPSupport',
];

const CANDIDATES = [
  process.env.CHROME_BIN,
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  '/Applications/Google Chrome Dev.app/Contents/MacOS/Google Chrome Dev',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome-unstable',
  '/usr/bin/google-chrome',
];

export const findChrome = (): string | undefined =>
  CANDIDATES.find((path): path is string => !!path && existsSync(path));

/**
 * Resolve the browser, or explain what to install.
 *
 * Leaving `executablePath` undefined makes Playwright quietly fall back to
 * bundled Chromium, and the run then fails as a missing *API* rather than a
 * missing *browser*. Say which it is, at config load, before anything runs.
 */
export const requireChrome = (): string => {
  const path = findChrome();
  if (!path) {
    throw new Error(
      'No Chrome found for the WebMCP native lane. Install Google Chrome Canary, ' +
        'or point CHROME_BIN at a Chrome that ships WebMCP.',
    );
  }
  return path;
};
