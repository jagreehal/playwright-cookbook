import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Page-rooted region: scopes queries to a named dialog.
 * The query methods return a Locator synchronously, so callers chain actions
 * directly (`region.getButton(/save/i).click()`) without a double await.
 * Contrast with Modal, which takes a Locator root instead of a Page.
 */
export class DialogRegion {
  constructor(
    private page: Page,
    private name: string,
  ) {}

  dialog(): Locator {
    return this.page.getByRole('dialog', { name: this.name });
  }

  getByLabel(label: string): Locator {
    return this.dialog().getByLabel(label);
  }

  getButton(name: string | RegExp): Locator {
    return this.dialog().getByRole('button', { name });
  }

  async expectVisible(): Promise<void> {
    await expect(this.dialog()).toBeVisible();
  }

  async expectHidden(): Promise<void> {
    await expect(this.dialog()).toBeHidden();
  }
}
