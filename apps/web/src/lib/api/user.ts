import type { APIRoute } from 'astro';

export type User = { id: string; name: string; role: string };

const users: Record<string, User> = {
  '1': { id: '1', name: 'Alice', role: 'admin' },
  '2': { id: '2', name: 'Bob', role: 'user' },
};

export function getUser(id: string): User | undefined {
  return users[id];
}

export function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** GET /api/user/:id — used by dynamic routes for unknown ids (404 JSON). */
export const getUserById: APIRoute = ({ params }) => {
  const id = params.id ?? '0';
  const user = getUser(id);
  if (!user) {
    return jsonResponse({ error: 'Not found' }, 404);
  }
  return jsonResponse(user, 200);
};

/** GET /api/user/:id — used by static literal routes /api/user/1 and /api/user/2. */
export function createUserRoute(id: string): APIRoute {
  return () => {
    const user = getUser(id);
    if (!user) {
      return jsonResponse({ error: 'Not found' }, 404);
    }
    return jsonResponse(user, 200);
  };
}
