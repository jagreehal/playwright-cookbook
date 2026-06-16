import { defineMiddleware } from 'astro:middleware';
import { getUser, jsonResponse } from './lib/api/user';

export const onRequest = defineMiddleware(async (context, next) => {
  const match = context.url.pathname.match(/^\/api\/user\/([^/]+)\/?$/);
  if (!match) {
    return next();
  }

  const user = getUser(match[1]);
  if (user) {
    return next();
  }

  return jsonResponse({ error: 'Not found' }, 404);
});
