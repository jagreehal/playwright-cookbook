import type { APIRoute } from 'astro';
import { createUserRoute } from '../../../lib/api/user';

export const prerender = process.env.PAGES === 'true';

export const GET: APIRoute = createUserRoute('2');
