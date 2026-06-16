import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class ToastRegion {
  constructor(private page: Page) {}

  toast() {
    return this.page.getByRole('status');
  }

  async expectSuccess(message: RegExp | string): Promise<void> {
    await expect(this.toast()).toContainText(message);
  }
}
