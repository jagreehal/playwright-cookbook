import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class DashboardPage {
  constructor(readonly page: Page) {}

  get heading(): Locator {
    return this.page.getByRole('heading', { name: 'Dashboard' });
  }

  get dashboardMessage(): Locator {
    return this.page.getByTestId('dashboard-message');
  }

  async assertLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }
}
