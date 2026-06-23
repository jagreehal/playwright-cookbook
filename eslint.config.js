import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['apps/web/dist/**', 'apps/web/.astro/**', 'node_modules/**'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // ── Playwright spec files: plugin rules ────────────────────────────────
  {
    files: ['src/**/*.spec.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      'playwright/expect-expect': 'off',
      'no-empty-pattern': 'off',
      // Allow page.pause() for debugging; flag as warning, not error
      'playwright/no-page-pause': 'warn',
      // Playwright discourages networkidle — wait on a specific response or assertion.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value="networkidle"]',
          message:
            'Never use networkidle — wait on waitForResponse or a web-first assertion.',
        },
      ],
    },
  },

  {
    files: ['src/**/*.spec.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Catches returning a Promise in a void context (e.g. test callbacks)
      '@typescript-eslint/no-misused-promises': 'error',
      // Catches unhandled Promise results from Playwright actions
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },

  // ── Browser-side JS (the app under test) ───────────────────────────────
  {
    files: ['src/app/**/*.js'],
    languageOptions: { globals: globals.browser },
  },

  // ── Node-side TypeScript utilities ─────────────────────────────────────
  {
    files: ['src/**/*.ts', 'playwright.config.ts'],
    languageOptions: { globals: globals.node },
    rules: {
      'no-undef': 'off', // TypeScript handles type checking
    },
  },

  // ── Web app build/config files (Astro config, content collections) ─────
  {
    files: ['apps/web/**/*.{js,mjs,ts}'],
    languageOptions: { globals: globals.node },
    rules: {
      'no-undef': 'off', // build-time Node files; TS/Astro handle checking
    },
  },
);
