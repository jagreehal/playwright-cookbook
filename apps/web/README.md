# Playwright Cookbook — Docs site

Astro site that hosts:

- **Demo pages** (what Playwright tests run against):
  - `/` — Person card, loads SWAPI data into a `<dl>` with `data-testid` attributes
  - `/cards/:id` — Same person page, scoped to a card number (e.g. `/cards/01`)
  - `/login` — Login form with username/password fields
  - `/protected` — Dashboard visible after login, shows user info
  - `/docs` — All card READMEs rendered as documentation
- **Browser JS** at `src/app/app.js` and `src/app/login.js` — vanilla JS the tests drive

## App structure (for test authors)

### Person page (`/`, `/cards/:id`)

Renders SWAPI person data with these test IDs:

| Element | Locator |
|---------|---------|
| Heading | `getByRole('heading', { name: 'Person' })` |
| Name | `getByTestId('person-name')` |
| Height | `getByTestId('person-height')` |
| Mass | `getByTestId('person-mass')` |
| Error state | `getByRole('alert')` (or `getByTestId('error')`) |
| Loading state | `getByText('Loading…')` |
| Edit button | `getByTestId('edit-person')` |
| Person card | `getByTestId('person-card:${id}')` |

### Login page (`/login`)

| Element | Locator |
|---------|---------|
| Username | `getByLabel('Username')` |
| Password | `getByLabel('Password')` |
| Submit | `getByRole('button', { name: /log in/i })` |

### Protected page (`/protected`)

| Element | Locator |
|---------|---------|
| Heading | `getByRole('heading', { name: 'Dashboard' })` |
| Message | `getByTestId('dashboard-message')` |

### Valid credentials

| Username | Password |
|----------|----------|
| `testuser` | `password` |
| `admin` | `adminpass` |
| `alice` | `secret` |

## Commands

```bash
pnpm dev      # dev server on http://localhost:9321
pnpm build    # static build
pnpm preview  # preview build on 9321
```

From repo root, `pnpm dev:web` runs this app (used by `webServer` in `playwright.config.ts`).

## Adding card READMEs as MDX

Add a file under `src/content/docs/` with frontmatter, e.g.:

```mdx
---
title: Card 01 - First browser test
description: Open a browser and assert on page content
---

# Card 01: First browser test

...content from src/01-first-browser-test/README.md...
```

The doc appears in the docs list at `/docs` and individually at `/docs/01-first-browser-test`.
