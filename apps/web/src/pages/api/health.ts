import type { APIRoute } from 'astro';

// Dynamic for dev/tests; prerendered to a static file for the Pages build.
export const prerender = process.env.PAGES === 'true';

export const GET: APIRoute = () => {
  return new Response(
    JSON.stringify({ ok: true, env: process.env.NODE_ENV ?? 'development' }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
};
