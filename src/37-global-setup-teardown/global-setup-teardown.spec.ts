import * as fs from 'fs';
import { test, expect } from '@playwright/test';

const AUTH_DIR = 'playwright/.auth';
const ADMIN_AUTH_FILE = `${AUTH_DIR}/admin.json`;
const USER_AUTH_FILE = `${AUTH_DIR}/user.json`;
const GLOBAL_SETUP_MARKER = `${AUTH_DIR}/.setup-done`;

// A `setup` project (src/auth.setup.ts, wired via `dependencies: ['setup']`) is
// the modern replacement for globalSetup: it logs in each role once, saves a
// storageState file per role, and writes a marker. These specs consume that
// output instead of doing setup in beforeAll (playwright-test-isolation).
test.describe('37-global-setup-teardown: setup project, storageState files', () => {
  test.describe('admin role', () => {
    test.use({ storageState: ADMIN_AUTH_FILE });

    test('admin can access protected page without UI login', async ({ page }) => {
      await page.goto('/protected');
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
      await expect(page.getByTestId('dashboard-message')).toContainText('admin');
    });
  });

  test.describe('user role', () => {
    test.use({ storageState: USER_AUTH_FILE });

    test('user can access protected page without UI login', async ({ page }) => {
      await page.goto('/protected');
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
      await expect(page.getByTestId('dashboard-message')).toContainText('testuser');
    });
  });

  test.describe('no auth, unauthenticated', () => {
    // No storageState override: this describe runs with the project's default
    // (anonymous) state.
    test('unauthenticated user is redirected to login', async ({ page }) => {
      await page.goto('/protected');
      await expect(page).toHaveURL(/login/);
      await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
    });
  });

  test('setup marker file exists (proves the setup project ran first)', async () => {
    expect(fs.existsSync(GLOBAL_SETUP_MARKER)).toBe(true);
  });
});
