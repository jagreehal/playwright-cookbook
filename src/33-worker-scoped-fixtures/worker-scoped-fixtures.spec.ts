import { existsSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { test as base, expect } from '@playwright/test';

const dbConnection: { connected: boolean; initCount: number } = {
  connected: true,
  initCount: 0,
};

let workerInitCount = 0;

const test = base.extend<
  { expensiveSetup: { id: string }; workerCleanup: string[] },
  { workerSetup: { connId: string } }
>({
  workerSetup: [
    async ({}, use) => {
      workerInitCount++;
      const connId = `conn-${workerInitCount}-${Date.now()}`;
      dbConnection.initCount++;
      await use({ connId });
      dbConnection.connected = false;
    },
    { scope: 'worker' },
  ],

  expensiveSetup: async ({ workerSetup }, use) => {
    const id = `test-using-${workerSetup.connId}`;
    await use({ id });
  },

  workerCleanup: async ({}, use) => {
    const ids: string[] = [];
    await use(ids);
    ids.forEach(() => { dbConnection.initCount--; });
  },
});

test.describe('33-worker-scoped-fixtures: Expensive setup once per worker', () => {
  test('workerSetup initCount is 1 due to worker scope, shared across tests', async ({
    expensiveSetup,
  }) => {
    expect(dbConnection.initCount).toBe(1);
    expect(expensiveSetup.id).toContain('conn-');
  });

  test('second test in same worker reuses the same workerSetup', async ({
    expensiveSetup,
    workerSetup,
  }) => {
    expect(dbConnection.initCount).toBe(1);
    expect(expensiveSetup.id).toContain(workerSetup.connId);
  });

  test('workerCleanup collects IDs across tests in the worker', async ({
    workerCleanup,
  }) => {
    workerCleanup.push('test-id-A');
    workerCleanup.push('test-id-B');
    expect(workerCleanup).toContain('test-id-A');
    expect(workerCleanup).toContain('test-id-B');
  });

  // One shared resource that cannot be split per worker. Each test fails if it
  // finds another test already holding the marker file.
  for (const name of ['first', 'second', 'third']) {
    test(`lock: ${name} test never overlaps the others`, { lock: 'shared-marker' }, async ({}, testInfo) => {
      const marker = path.join(testInfo.project.outputDir, 'shared-marker');
      expect(existsSync(marker)).toBe(false);
      writeFileSync(marker, name);
      await setTimeout(300);
      rmSync(marker);
    });
  }
});
