import type { APIRoute } from 'astro';

// Dynamic for dev/tests (so unknown ids hit the JSON 404 branch); prerendered
// for the known id in the static Pages build.
export const prerender = process.env.PAGES === 'true';

export function getStaticPaths() {
  return [{ params: { id: '1' } }];
}

/**
 * Local stand-in for the SWAPI people endpoint: GET /api/people/1.
 * The proxy card (05) fetches this, so `route.fetch()` returns real data
 * deterministically and offline instead of depending on swapi.dev.
 */
export const GET: APIRoute = ({ params }) => {
  const id = params.id ?? '1';
  const people: Record<
    string,
    { name: string; height: string; mass: string; url: string; films: string[] }
  > = {
    '1': {
      name: 'Luke Skywalker',
      height: '172',
      mass: '77',
      url: 'https://swapi.dev/api/people/1/',
      films: [],
    },
  };
  const person = people[id];
  if (!person) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify(person), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
