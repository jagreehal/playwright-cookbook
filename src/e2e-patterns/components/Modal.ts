import type { Locator } from '@playwright/test';

/**
 * Container-rooted component: receives a Locator (its root), not Page.
 * Every locator and interaction descends from this.root.
 * Contrast with DialogRegion which takes Page directly.
 */
export class Modal {
  readonly nameInput: Locator;
  readonly confirmButton: Locator;

  constructor(private root: Locator) {
    this.nameInput = this.root.getByLabel('Name');
    this.confirmButton = this.root.getByRole('button', { name: /save/i });
  }

  async fillName(name: string): Promise<void> {
    await this.nameInput.fill(name);
  }

  async confirm(): Promise<void> {
    await this.confirmButton.click();
  }
}
