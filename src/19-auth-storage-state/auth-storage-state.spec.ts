import { test, expect } from '@playwright/test';
import { loginAs } from '../e2e-patterns/login/flow';

const roleFiles = {
  user: 'playwright/.auth/user.json',
  admin: 'playwright/.auth/admin.json',
};

test.describe('19-auth-storage-state: Auth and storage state', () => {
  // The storageState files are produced once by the `setup` project
  // (src/auth.setup.ts), wired via `dependencies: ['setup']`. Specs here just
  // consume them — no per-test UI login, no beforeAll.

  test('UI login smoke: submit form and land on protected page', async ({
    page,
  }) => {
    // Keep one real UI login: some tests genuinely need to exercise the login UI.
    const dashboardPage = await loginAs(page, 'testuser', 'password');

    await dashboardPage.assertLoaded();
    await expect(page).toHaveURL(/protected/);
    await expect(dashboardPage.heading).toBeVisible();
    await expect(dashboardPage.dashboardMessage).toContainText('testuser');
  });

  test('simulated storage state: set auth then visit protected', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('auth', '1');
      localStorage.setItem('user', 'stored-user');
    });
    await page.goto('/protected');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByTestId('dashboard-message')).toContainText(
      'stored-user',
    );
  });

  test.describe('reuse saved user state', () => {
    test.use({ storageState: roleFiles.user });

    test('open protected without UI login', async ({ page }) => {
      await page.goto('/protected');
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
      await expect(page.getByTestId('dashboard-message')).toContainText(
        'testuser',
      );
    });
  });

  test.describe('admin role', () => {
    test.use({ storageState: roleFiles.admin });

    test('admin accesses protected without login', async ({ page }) => {
      await page.goto('/protected');
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
      await expect(page.getByTestId('dashboard-message')).toContainText('admin');
    });
  });
});
