/**
 * Auth setup project (see `playwright-auth` / `playwright-config`).
 *
 * Runs once before the functional projects (wired via `dependencies: ['setup']`
 * in playwright.config.ts). It performs the UI login a single time per role and
 * saves the resulting storage state to disk, so every other spec starts already
 * authenticated by pointing at the file — no per-test UI login, no `beforeAll`.
 */
import * as fs from 'fs';
import { test as setup, expect } from '@playwright/test';
import { loginAs } from './e2e-patterns/login/flow';

const AUTH_DIR = 'playwright/.auth';
const USER_FILE = `${AUTH_DIR}/user.json`;
const ADMIN_FILE = `${AUTH_DIR}/admin.json`;
const MARKER = `${AUTH_DIR}/.setup-done`;

setup('authenticate as user', async ({ page }) => {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  await loginAs(page, 'testuser', 'password');
  await expect(page.getByTestId('dashboard-message')).toContainText('testuser');
  await page.context().storageState({ path: USER_FILE });
});

setup('authenticate as admin', async ({ page }) => {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  await loginAs(page, 'admin', 'adminpass');
  await expect(page.getByTestId('dashboard-message')).toContainText('admin');
  await page.context().storageState({ path: ADMIN_FILE });
  fs.writeFileSync(MARKER, 'setup-completed');
});
