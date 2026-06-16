import { faker } from '@faker-js/faker';
import { test, expect } from '@playwright/test';
import { makePerson } from '../swapi/builders';

test.describe('09-generate-data-faker: Deterministic synthetic data', () => {
  test.beforeEach(() => {
    faker.seed(123);
  });

  test('seeded builder produces the same person every run', async ({ page }) => {
    const person = makePerson({ name: 'Test' });

    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({ json: person }),
    );

    await page.goto('/cards/09');

    // Overridden field.
    await expect(page.getByTestId('person-name')).toHaveText('Test');
    // Faker-generated fields are deterministic for seed 123.
    await expect(page.getByTestId('person-height')).toHaveText('219');
    await expect(page.getByTestId('person-mass')).toHaveText('116');
  });

  test('seed determinism matters: same seed, same sequence of data', async () => {
    faker.seed(42);
    const person1 = makePerson({ name: 'A' });
    faker.seed(42);
    const person2 = makePerson({ name: 'A' });

    expect(person1.name).toBe('A');
    expect(person2.name).toBe('A');
    expect(person1.height).toBe(person2.height);
    expect(person1.mass).toBe(person2.mass);
  });

  test('without seed, data differs every run (non-deterministic)', async () => {
    const person1 = makePerson();
    const person2 = makePerson();

    expect(person1.name).not.toBe(person2.name);
    expect(person1.height).not.toBe(person2.height);
  });

  test('faker.seed is process-global, so parallel workers share the RNG state', async ({
    page,
  }, testInfo) => {
    const workerIndex = testInfo.workerIndex;
    faker.seed(100 + workerIndex);

    const person = makePerson({ name: `Worker ${workerIndex}` });

    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({ json: person }),
    );

    await page.goto('/cards/09');
    await expect(page.getByTestId('person-name')).toHaveText(`Worker ${workerIndex}`);
  });
});
