import { test, expect } from '@playwright/test';

/**
 * Deterministic journey kept after an MCP exploration session.
 *
 * An agent might pursue this as a goal via Playwright MCP:
 *   Open /login. Sign in as testuser / password. Land on the dashboard and
 *   confirm the greeting mentions testuser.
 *
 * CI runs this file. It does not run the agent. See README.md for the handoff.
 */
test.describe('44-agentic-mcp-to-ci: committed journey after MCP explore', () => {
  test('signs in and reaches the dashboard', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();

    await page.getByLabel('Username').fill('testuser');
    await page.getByLabel('Password').fill('password');

    const submit = page.getByRole('button', { name: 'Log in' });
    await Promise.all([page.waitForURL(/protected/), submit.click()]);

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByTestId('dashboard-message')).toContainText('testuser');
  });
});
