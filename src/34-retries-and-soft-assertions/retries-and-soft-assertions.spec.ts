import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { makePerson } from '../swapi/builders';

test.describe('34-retries-and-soft-assertions: expect.soft, expect.poll, test.fail, test.fixme', () => {
  test('expect.soft: multiple assertions collected before failing', async ({ page }) => {
    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({
        json: makePerson({
          name: 'Mocked Luke',
          height: '172',
          mass: '77',
          url: 'https://swapi.dev/api/people/1/',
        }),
      }),
    );

    await page.goto('/cards/01');
    await expect(page.getByRole('heading', { name: 'Person' })).toBeVisible();

    // Soft assertions: both run even if one fails, errors collected at the end.
    // Change height to 'wrong-height' to see how soft assertions aggregate failures.
    await expect.soft(page.getByTestId('person-name')).toHaveText('Mocked Luke');
    await expect.soft(page.getByTestId('person-height')).toHaveText('172');
  });

  test('expect.poll: wait for a condition to become truthy', async ({ page }) => {
    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({
        json: makePerson({
          name: 'Poll Luke',
          height: '172',
          mass: '77',
          url: 'https://swapi.dev/api/people/1/',
        }),
      }),
    );

    await page.goto('/cards/01');
    await expect(page.getByRole('heading', { name: 'Person' })).toBeVisible();

    await expect
      .poll(
        () => page.getByTestId('person-name').innerText(),
        { timeout: 5000, intervals: [100, 250, 500] },
      )
      .toBe('Poll Luke');
  });

  test('expect.toPass: retry an async callback until it succeeds', async ({ page }) => {
    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({
        json: makePerson({
          name: 'ToPass Luke',
          height: '172',
          mass: '77',
          url: 'https://swapi.dev/api/people/1/',
        }),
      }),
    );

    await page.goto('/cards/01');
    await expect(page.getByRole('heading', { name: 'Person' })).toBeVisible();

    await expect(async () => {
      await expect(page.getByTestId('person-name')).toHaveText('ToPass Luke');
    }).toPass({ timeout: 5000 });
  });

  test('test.fail: expected-to-fail test (known bug or WIP feature)', async () => {
    // test.fail can be called inside the test body or at the describe level.
    // When the test fails, it's reported as "expected to fail" (a pass).
    // When the test passes unexpectedly, it fails to alert you the bug is fixed.
    test.fail(true, 'KNOWN BUG: this is a demonstration');

    expect(false).toBe(true);
  });

  test('test.fixme: skipped test marked as known-to-need-fixing', async ({ page }) => {
    test.fixme(true, 'THIS IS BROKEN: person mass not displayed yet');

    await page.goto('/cards/01');
    await expect(page.getByTestId('person-mass')).toHaveText('77');
  });

  test('the flake report keeps real results and drops test.fail()', async ({}, testInfo) => {
    const doc = readFileSync(
      path.join(testInfo.project.testDir, '../skills/playwright-reliability/references/flake-metrics.md'),
      'utf8',
    );
    const script = testInfo.outputPath('flakes.mjs');
    // Pick the block by content, so another js block in the doc cannot replace it.
    const block = [...doc.matchAll(/```js\n([\s\S]+?)```/g)].find((m) => m[1].includes('process.argv[2]'));
    expect(block, 'flake script block in flake-metrics.md').toBeDefined();
    writeFileSync(script, block![1]);

    const result = (title: string, expectedStatus: string, status: string, statuses: string[]) => ({
      title,
      file: 'a.spec.ts',
      tests: [
        { projectName: 'chromium', expectedStatus, status, results: statuses.map((s) => ({ status: s })) },
      ],
    });
    const report = testInfo.outputPath('results.json');
    writeFileSync(
      report,
      JSON.stringify({
        suites: [
          {
            title: 'a.spec.ts',
            file: 'a.spec.ts',
            suites: [
              {
                title: 'group',
                file: 'a.spec.ts',
                specs: [
                  result('rescued', 'passed', 'flaky', ['failed', 'passed']),
                  result('known bug', 'failed', 'expected', ['failed']),
                ],
              },
            ],
          },
        ],
      }),
    );

    const output = execFileSync(process.execPath, [script, report], { encoding: 'utf8' });
    expect(output).toContain('chromium › a.spec.ts › group › rescued');
    expect(output).not.toContain('known bug');
  });
});
