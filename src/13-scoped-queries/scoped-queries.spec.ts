import { test, expect } from '@playwright/test';
import { personCardLocator } from '../e2e-patterns/person/locators';
import { PersonPage } from '../e2e-patterns/person/PersonPage';
import { makePerson } from '../swapi/builders';

test.describe('13-scoped-queries: Scoped queries and selector policy', () => {
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

  test('scoped row: locate row first, then query inside', async ({ page }) => {
    await page.goto('/cards/13');

    await page.evaluate(() => {
      const table = document.createElement('table');
      table.innerHTML = `
        <thead><tr><th>Name</th><th>Height</th><th>Action</th></tr></thead>
        <tbody>
          <tr data-testid="person-row:1">
            <td data-testid="person-name">Luke</td><td>172</td><td><button>Edit</button></td>
          </tr>
          <tr data-testid="person-row:2">
            <td data-testid="person-name">Leia</td><td>150</td><td><button>Edit</button></td>
          </tr>
          <tr data-testid="person-row:3">
            <td data-testid="person-name">Han</td><td>185</td><td><button>Edit</button></td>
          </tr>
        </tbody>
      `;
      document.body.appendChild(table);
    });

    const row = page.getByTestId('person-row:2');
    await expect(row).toBeVisible();
    await expect(row.getByTestId('person-name')).toHaveText('Leia');
  });

  test('.filter(): narrow down locators by text or has', async ({ page }) => {
    await page.goto('/cards/13');

    await page.evaluate(() => {
      const list = document.createElement('ul');
      list.innerHTML = `
        <li data-testid="item">In stock: Lightsaber</li>
        <li data-testid="item">Out of stock: Blaster</li>
        <li data-testid="item">In stock: Shield</li>
      `;
      document.body.appendChild(list);
    });

    const inStock = page.getByTestId('item').filter({ hasText: 'In stock' });
    await expect(inStock).toHaveCount(2);

    const outOfStock = page.getByTestId('item').filter({ hasText: 'Out' });
    await expect(outOfStock).toHaveCount(1);
  });

  test('.nth(): pick a specific occurrence from multiple matches', async ({ page }) => {
    await page.goto('/cards/13');

    await page.evaluate(() => {
      const list = document.createElement('ul');
      list.innerHTML = `
        <li data-testid="item">First</li>
        <li data-testid="item">Second</li>
        <li data-testid="item">Third</li>
      `;
      document.body.appendChild(list);
    });

    await expect(page.getByTestId('item').nth(0)).toHaveText('First');
    await expect(page.getByTestId('item').nth(1)).toHaveText('Second');
    await expect(page.getByTestId('item').nth(2)).toHaveText('Third');
  });

  test('scoped query: dialog first, then button and label inside', async ({ page }) => {
    await PersonPage.open(page, '1', '/cards/13');

    await page.getByTestId('edit-person').click();

    const dialog = page.getByRole('dialog', { name: 'Edit person' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Name').fill('Leia');
    await dialog.getByRole('button', { name: /^save$/i }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByTestId('person-name')).toHaveText('Leia');
  });

  test('test-id with context: person-card:id then role inside', async ({ page }) => {
    await PersonPage.open(page, '1', '/cards/13');

    const card = personCardLocator(page, '1');
    await expect(card).toBeVisible();
    await expect(card.getByTestId('person-name')).toHaveText('Luke Skywalker');
    await card.getByRole('button', { name: 'Edit' }).click();

    await expect(page.getByRole('dialog', { name: 'Edit person' })).toBeVisible();
  });
});
