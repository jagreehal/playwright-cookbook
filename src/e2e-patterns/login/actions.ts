import type { Page } from '@playwright/test';
import { loginLocators } from './locators';

export async function login(page: Page, username: string, password: string): Promise<void> {
  const $ = loginLocators(page);
  await $.username.fill(username);
  await $.password.fill(password);
  await Promise.all([
    page.waitForURL(/protected|\/$/, { waitUntil: 'commit' }),
    $.submit.click(),
  ]);
}
