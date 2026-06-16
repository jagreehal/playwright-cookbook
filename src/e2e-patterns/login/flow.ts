import type { Page } from '@playwright/test';
import { login } from './actions';
import { DashboardPage } from '../dashboard/DashboardPage';

export async function loginAs(
  page: Page,
  username: string,
  password: string,
): Promise<DashboardPage> {
  await page.goto('/login');
  await login(page, username, password);
  await page.waitForURL(/protected|\/$/);
  const dashboardPage = new DashboardPage(page);
  await dashboardPage.assertLoaded();
  return dashboardPage;
}
