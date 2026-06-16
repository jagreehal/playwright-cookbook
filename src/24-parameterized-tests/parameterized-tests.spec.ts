import { test, expect } from '@playwright/test';

interface User {
  id: string;
  name: string;
  role: string;
}

const users: User[] = [
  { id: '1', name: 'Alice', role: 'admin' },
  { id: '2', name: 'Bob', role: 'user' },
];

for (const { id, name, role } of users) {
  test(`User ${id} is ${name} with role ${role}`, async ({ request }) => {
    const response = await request.get(`/api/user/${id}`, {
      headers: { Accept: 'application/json' },
    });
    expect(response.status()).toBe(200);

    const body: User = await response.json();
    expect(body.id).toBe(id);
    expect(body.name).toBe(name);
    expect(body.role).toBe(role);
  });
}

test('all users have required fields', async ({ request }) => {
  for (const { id } of users) {
    const response = await request.get(`/api/user/${id}`, {
      headers: { Accept: 'application/json' },
    });
    expect(response.status()).toBe(200);

    const body: User = await response.json();
    expect(body).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      role: expect.any(String),
    });
  }
});
