import { test, expect } from '@playwright/test';

interface User {
  id: string;
  name: string;
  role: string;
}

test.describe('23-api-only-tests: API tests with request fixture', () => {
  test('GET /api/health returns 200 and ok: true', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);

    const body = (await response.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  test('GET /api/user/1 with Accept header returns user JSON', async ({
    request,
  }) => {
    const response = await request.get('/api/user/1', {
      headers: { Accept: 'application/json' },
    });
    expect(response.status()).toBe(200);

    const body: User = await response.json();
    expect(body).toEqual({ id: '1', name: 'Alice', role: 'admin' });
    expect(body.id).toBe('1');
    expect(body.name).toBe('Alice');
    expect(body.role).toBe('admin');
  });

  test('GET /api/user/999 returns 404', async ({ request }) => {
    const response = await request.get('/api/user/999', {
      headers: { Accept: 'application/json' },
    });
    expect(response.status()).toBe(404);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe('Not found');
  });
});
