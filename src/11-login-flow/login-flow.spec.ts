import { test, expect } from '@playwright/test';

test.describe('11-login-flow: Forms and navigation', () => {
  test('fills login form and shows protected content', async ({ page }) => {
    await page.goto('/login');

    // Assert login page loaded
    await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();

    // Fill form using accessible labels
    await page.getByLabel('Username').fill('testuser');
    await page.getByLabel('Password').fill('password');

    // Submit form and wait for navigation in one step to avoid a race
    const submit = page.getByRole('button', { name: 'Log in' });
    await Promise.all([page.waitForURL(/protected/), submit.click()]);

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByTestId('dashboard-message')).toContainText('testuser');
  });

  test('verifies storage state after login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Username').fill('alice');
    await page.getByLabel('Password').fill('secret');

    const submit = page.getByRole('button', { name: 'Log in' });
    await Promise.all([page.waitForURL(/protected/), submit.click()]);

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    const auth = await page.evaluate(() => localStorage.getItem('auth'));
    const user = await page.evaluate(() => localStorage.getItem('user'));

    expect(auth).toBe('1');
    expect(user).toBe('alice');
  });

  test('submitting empty credentials stays on the login page', async ({ page }) => {
    await page.goto('/login');

    // The required inputs block submission, so no navigation happens.
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page).toHaveURL(/login/);
    await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
  });

  test('invalid credentials: wrong password shows error and stays on login', async ({
    page,
  }) => {
    await page.goto('/login');

    await page.getByLabel('Username').fill('testuser');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Log in' }).click();

    // Should stay on login page and show error
    await expect(page).toHaveURL(/login/);
    await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
    await expect(page.getByTestId('login-error')).toBeVisible();
    await expect(page.getByTestId('login-error')).toContainText(/invalid/i);
  });

  test('invalid credentials: unknown username shows error', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Username').fill('nouser');
    await page.getByLabel('Password').fill('password');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page).toHaveURL(/login/);
    await expect(page.getByTestId('login-error')).toBeVisible();
    await expect(page.getByTestId('login-error')).toContainText(/invalid/i);
  });
});
