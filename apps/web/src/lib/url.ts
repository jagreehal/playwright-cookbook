// Prefix an app-absolute path with the configured base so links work both at
// root (dev / tests) and under the GitHub Pages project subpath.
const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export function href(path: string): string {
  return `${base}${path}`;
}
