import path from 'node:path';
import fs from 'node:fs';
import { test, expect } from '@playwright/test';

const FIXTURES_DIR = path.join(process.cwd(), 'test', 'fixtures');

function fixturePath(id: string) {
  return path.join(FIXTURES_DIR, `swapi.people.${id}.json`);
}

function isRecordMode() {
  return process.env.RECORD_FIXTURES === '1';
}

test.describe('06-record-and-replay-fixtures: Replay from fixtures', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/swapi.dev/api/people/**', async (route) => {
      const url = route.request().url();
      const match = url.match(/\/people\/(\d+)/);
      const id = match ? match[1] : '1';
      const file = fixturePath(id);

      if (!isRecordMode() && fs.existsSync(file)) {
        const json = JSON.parse(fs.readFileSync(file, 'utf8'));
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(json),
        });
      }

      const response = await route.fetch();
      const body = await response.text();
      const json = body ? JSON.parse(body) : {};
      fs.mkdirSync(FIXTURES_DIR, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(json, null, 2), 'utf8');
      await route.fulfill({
        status: response.status(),
        headers: response.headers(),
        body,
      });
    });
  });

  test('GET people/1 returns fixture when not in record mode', async ({ page }) => {
    await page.goto('/cards/06');

    await expect(page.getByTestId('person-name')).toBeVisible();
    await expect(page.getByTestId('person-name')).toContainText('Luke');
  });
});
