import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import node from '@astrojs/node';
import react from '@astrojs/react';

// PAGES=true → pure-static build for GitHub Pages (no server adapter, base path).
// Unset → local dev / Playwright tests: node adapter + dynamic API routes, root base.
const PAGES = process.env.PAGES === 'true';
const SITE = process.env.SITE ?? 'https://jagreehal.github.io';
const BASE = process.env.BASE ?? '/playwright-cookbook';

/**
 * Rehype plugin: prefix root-absolute links/images in Markdown with the base
 * path so the prose's `/cards/NN`, `/docs/...`, `/` links work under the
 * project subpath. No-op when base is "/".
 */
function rehypeBaseLinks() {
  const base = BASE.replace(/\/$/, '');
  if (!base) return () => {};
  const fix = (node) => {
    if (node.type === 'element') {
      for (const attr of ['href', 'src']) {
        const v = node.properties?.[attr];
        if (
          typeof v === 'string' &&
          v.startsWith('/') &&
          !v.startsWith('//') &&
          !v.startsWith(base + '/')
        ) {
          node.properties[attr] = base + v;
        }
      }
    }
    (node.children ?? []).forEach(fix);
  };
  return (tree) => fix(tree);
}

export default defineConfig({
  output: 'static',
  site: SITE,
  base: PAGES ? BASE : undefined,
  ...(PAGES ? {} : { adapter: node({ mode: 'standalone' }) }),
  integrations: [mdx(), react()],
  // The dev-only toolbar floats at the bottom of the page and intercepts
  // pointer events on elements rendered there (breaks click-driven tests).
  devToolbar: { enabled: false },
  markdown: {
    // Dual themes so fenced code follows the site's light/dark toggle.
    // defaultColor:false emits --shiki-light / --shiki-dark CSS vars per token.
    shikiConfig: {
      themes: { light: 'vitesse-light', dark: 'vitesse-dark' },
      defaultColor: false,
      wrap: true,
    },
    rehypePlugins: PAGES ? [rehypeBaseLinks] : [],
  },
  vite: {
    server: {
      port: 9321,
    },
  },
});
