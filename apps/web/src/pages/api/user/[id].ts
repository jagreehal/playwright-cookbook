import type { APIRoute } from 'astro';

// Dynamic for dev/tests (so /api/user/999 hits the JSON 404 branch);
// prerendered for known ids in the static Pages build.
export const prerender = process.env.PAGES === 'true';

export function getStaticPaths() {
  return [{ params: { id: '1' } }, { params: { id: '2' } }];
}

/** Example API: GET /api/user/1 returns a minimal user object for API-testing card. */
export const GET: APIRoute = ({ params }) => {
  const id = params.id ?? '0';
  const users: Record<string, { id: string; name: string; role: string }> = {
    '1': { id: '1', name: 'Alice', role: 'admin' },
    '2': { id: '2', name: 'Bob', role: 'user' },
  };
  const user = users[id];
  if (!user) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify(user), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
