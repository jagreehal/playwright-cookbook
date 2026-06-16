import { test, expect } from '@playwright/test';
import { makePerson } from '../swapi/builders';

test.describe('28-component-testing: Component-level testing patterns', () => {
  test('page-level integration test as a proxy for component testing', async ({
    page,
  }) => {
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

    await page.goto('/cards/01');
    await expect(page.getByRole('heading', { name: 'Person' })).toBeVisible();
    await expect(page.getByTestId('person-name')).toHaveText('Luke Skywalker');
  });

  test('isolated component: create element, mount, and assert in isolation', async ({
    page,
  }) => {
    await page.goto('/cards/01');
    await expect(page.getByRole('heading', { name: 'Person' })).toBeVisible();

    const html = `
      <div data-testid="isolated-card">
        <h2>Isolated Component</h2>
        <dl>
          <dt>Name</dt><dd data-testid="iso-name">Test Character</dd>
          <dt>Height</dt><dd data-testid="iso-height">180</dd>
        </dl>
      </div>
    `;

    await page.evaluate((markup) => {
      const el = document.createElement('div');
      el.innerHTML = markup;
      document.body.appendChild(el);
    }, html);

    const card = page.getByTestId('isolated-card');
    await expect(card).toBeVisible();
    await expect(card.getByTestId('iso-name')).toHaveText('Test Character');
    await expect(card.getByTestId('iso-height')).toHaveText('180');
  });

  test('component with interaction: mount form and test submission', async ({
    page,
  }) => {
    await page.goto('/cards/01');
    await expect(page.getByRole('heading', { name: 'Person' })).toBeVisible();

    await page.evaluate(() => {
      const el = document.createElement('div');
      el.innerHTML = `
        <form data-testid="iso-form" method="dialog">
          <label for="iso-input">Name</label>
          <input id="iso-input" name="name" type="text" value="" />
          <button type="submit" data-testid="iso-submit">Submit</button>
        </form>
        <output data-testid="iso-output"></output>
      `;
      document.body.appendChild(el);

      const form = el.querySelector('form')!;
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = form.querySelector('#iso-input') as HTMLInputElement;
        const output = document.querySelector('[data-testid="iso-output"]')!;
        output.textContent = `Submitted: ${input.value}`;
      });
    });

    await page.getByLabel('Name').fill('Isolated Leia');
    await page.getByTestId('iso-submit').click();
    await expect(page.getByTestId('iso-output')).toHaveText('Submitted: Isolated Leia');
  });
});
