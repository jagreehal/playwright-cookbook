import type { Page } from '@playwright/test';
import { personPageLocators } from './locators';

export async function loadPersonPage(page: Page, id: string, baseUrl: string = '/'): Promise<void> {
  const url = baseUrl.includes('?') ? `${baseUrl}&id=${id}` : `${baseUrl}?id=${id}`;
  await page.goto(url);
  const $ = personPageLocators(page);
  await $.heading.waitFor({ state: 'visible', timeout: 10000 });
}

export async function openEditDialog(page: Page): Promise<void> {
  const $ = personPageLocators(page);
  await $.editButton.click();
  await page.getByRole('dialog', { name: 'Edit person' }).waitFor({ state: 'visible' });
}
