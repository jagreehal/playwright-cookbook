import { test, expect } from '@playwright/test';
import { ToastRegion } from '../e2e-patterns/regions/ToastRegion';
import { DialogRegion } from '../e2e-patterns/regions/DialogRegion';
import { Modal } from '../e2e-patterns/components/Modal';
import { PersonPage } from '../e2e-patterns/person/PersonPage';
import { makePerson } from '../swapi/builders';

test.describe('14-region-objects: Toast and dialog regions', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({
        json: makePerson({
          name: 'Luke Skywalker',
          height: '172',
          mass: '77',
          url: 'https://swapi.dev/api/people/1/',
        }),
      }),
    );
  });

  test('ToastRegion expectSuccess after edit save', async ({ page }) => {
    const personPage = await PersonPage.open(page, '1', '/cards/14');
    await personPage.assertLoaded();

    await page.getByTestId('edit-person').click();

    const dialogRegion = new DialogRegion(page, 'Edit person');
    await dialogRegion.expectVisible();
    await dialogRegion.getByLabel('Name').fill('Luke Updated');
    await dialogRegion.getButton(/save/i).click();

    await dialogRegion.expectHidden();

    const toastRegion = new ToastRegion(page);
    await toastRegion.expectSuccess(/saved/i);
  });

  test('container-rooted Modal: locator-root, no Page dependency', async ({ page }) => {
    await PersonPage.open(page, '1', '/cards/14');
    await page.getByTestId('edit-person').click();

    const dialog = page.getByRole('dialog', { name: 'Edit person' });
    const modal = new Modal(dialog);

    await expect(modal.nameInput).toBeVisible();
    await modal.fillName('Container Leia');
    await modal.confirm();

    await expect(dialog).toBeHidden();
    await expect(page.getByTestId('person-name')).toHaveText('Container Leia');
  });
});
