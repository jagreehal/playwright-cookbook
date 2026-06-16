import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { loadPersonPage, openEditDialog } from './actions';
import { personPageLocators } from './locators';
import { Modal } from '../components/Modal';

export class PersonPage {
  constructor(readonly page: Page) {}

  /** The displayed person name, exposed so specs assert without raw locators. */
  get name(): Locator {
    return personPageLocators(this.page).name;
  }

  async assertLoaded(): Promise<void> {
    const $ = personPageLocators(this.page);
    await expect($.heading).toBeVisible();
  }

  /**
   * Opens the edit dialog and returns a container-rooted Modal scoped to it.
   * The page object owns the dialog locator and the `new`, the spec never
   * constructs the component or knows how it is rooted.
   */
  async openEditDialog(): Promise<Modal> {
    await openEditDialog(this.page);
    return new Modal(this.page.getByRole('dialog', { name: 'Edit person' }));
  }

  static async open(page: Page, personId: string, baseUrl: string = '/'): Promise<PersonPage> {
    await loadPersonPage(page, personId, baseUrl);
    const personPage = new PersonPage(page);
    await personPage.assertLoaded();
    return personPage;
  }
}
