import type { Page } from '@playwright/test';

export function loginLocators(page: Page) {
  return {
    username: page.getByLabel('Username'),
    password: page.getByLabel('Password'),
    submit: page.getByRole('button', { name: /log in/i }),
  };
}
