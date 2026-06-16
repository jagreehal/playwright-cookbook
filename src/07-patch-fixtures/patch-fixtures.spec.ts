import path from 'node:path';
import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { SwapiPersonSchema, type SwapiPerson } from '../swapi/schema';

const FIXTURE_FILE = path.join(process.cwd(), 'test', 'fixtures', 'swapi.people.1.json');

test.describe('07-patch-fixtures: Override one field from a fixture', () => {
  test('patches height to "unknown" and shows the fallback warning', async ({ page }) => {
    // One base fixture, validated on load so a stale fixture fails loudly.
    const base: SwapiPerson = SwapiPersonSchema.parse(
      JSON.parse(fs.readFileSync(FIXTURE_FILE, 'utf8')),
    );

    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({ json: { ...base, height: 'unknown' } }),
    );

    await page.goto('/cards/07');

    await expect(page.getByTestId('person-name')).toContainText('Luke');
    await expect(page.getByTestId('person-height')).toHaveText('unknown');
    await expect(page.getByTestId('height-warning')).toBeVisible();
  });
});
