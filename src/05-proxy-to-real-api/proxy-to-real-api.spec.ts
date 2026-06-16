import { test, expect } from '@playwright/test';
import { SwapiPersonSchema } from '../swapi/schema';

test.describe('05-proxy-to-real-api: Real response, then patch', () => {
  // @integration: touches a real (locally-proxied) response, not a pure mock.
  // Selective run: `--grep @integration`.
  test('fetches the real response, patches one field, asserts deterministically', { tag: '@integration' }, async ({
    page,
  }) => {
    await page.route('**/api/people/1', async (route) => {
      // route.fetch() performs the real request. The card page proxies a local
      // endpoint, so this returns real data without depending on a remote API.
      const response = await route.fetch();

      // The proxied JSON is untrusted; parse it so the patched object is typed.
      const person = SwapiPersonSchema.parse(await response.json());

      // Only the name is forced. Height (172) stays as the endpoint returned it.
      await route.fulfill({ json: { ...person, name: 'Deterministic Luke' } });
    });

    await page.goto('/cards/05');

    await expect(page.getByTestId('person-name')).toHaveText('Deterministic Luke');
    await expect(page.getByTestId('person-height')).toHaveText('172');
  });
});
