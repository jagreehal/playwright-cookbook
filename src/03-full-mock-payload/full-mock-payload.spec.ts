import { test, expect } from '@playwright/test';
import type { SwapiPerson } from '../swapi/schema';

const luke = {
  name: 'Luke Skywalker',
  height: '172',
  mass: '77',
  url: 'https://swapi.dev/api/people/1/',
  films: [
    'https://swapi.dev/api/films/1/',
    'https://swapi.dev/api/films/2/',
  ],
} satisfies SwapiPerson;

test.describe('03-full-mock-payload: Full inline payload', () => {
  test('page displays full person from inline mock', async ({ page }) => {
    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({ json: luke }),
    );

    await page.goto('/cards/03');

    await expect(page.getByTestId('person-name')).toHaveText('Luke Skywalker');
    await expect(page.getByTestId('person-height')).toHaveText('172');
    await expect(page.getByTestId('person-mass')).toHaveText('77');
  });
});
