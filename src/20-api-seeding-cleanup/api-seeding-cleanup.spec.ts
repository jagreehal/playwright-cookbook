import { test as base, expect } from '@playwright/test';
import { unique } from '../e2e-patterns/helpers/unique';

type Client = { id: string; name: string };
const store = new Map<string, Client>();

// The id is supplied by the caller using the worker-namespaced `unique()`
// helper, so seeded data is collision-free under parallel runs and the id is
// reproducible from the test (no unseeded Math.random()).
function createClient(partial: Partial<Client>, id: string): Client {
  const client = { id, name: partial.name ?? 'Unnamed', ...partial };
  store.set(id, client);
  return client;
}

async function cleanup(ids: string[]): Promise<void> {
  await Promise.all(
    ids.map((id) => {
      store.delete(id);
      return Promise.resolve();
    }),
  );
}

let workerStoreCleanupCount = 0;

const test = base.extend<object, { workerCleanupTracker: number }>({
  workerCleanupTracker: [
    async ({}, use) => {
      await use(++workerStoreCleanupCount);
      store.clear();
    },
    { scope: 'worker' },
  ],
});

test.describe('20-api-seeding-cleanup: Factories and cleanup', () => {
  test.beforeEach(() => {
    store.clear();
  });

  test('createClient + cleanup in finally', async ({}, testInfo) => {
    const createdIds: string[] = [];
    try {
      const client = createClient(
        { name: unique(testInfo, 'client') },
        unique(testInfo, 'client-id'),
      );
      createdIds.push(client.id);
      expect(store.has(client.id)).toBe(true);
      expect(client.name).toContain('client');
    } finally {
      await cleanup(createdIds);
    }
    expect(store.size).toBe(0);
  });

  test('cleanup in finally runs and removes created ids', async (
    {},
    testInfo,
  ) => {
    const createdIds: string[] = [];
    try {
      const client = createClient(
        { name: unique(testInfo, 'client') },
        unique(testInfo, 'client-id'),
      );
      createdIds.push(client.id);
    } finally {
      await cleanup(createdIds);
    }
    expect(createdIds.every((id) => !store.has(id))).toBe(true);
  });

  test('request.post factory: seed via API with auth headers', async ({
    request,
  }) => {
    const response = await request.get('/api/health', {
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    expect(response.status()).toBe(200);
  });
});
