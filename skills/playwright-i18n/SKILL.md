---
name: playwright-i18n
description: >-
  Makes localized Playwright tests select by translated accessible names from a
  type-safe i18next source, not pasted copy. Use this skill when testing a
  localized UI, selecting a control whose text is translated, or making t() keys
  fail the build. Do not use for generic locators (playwright-locators) or
  test-id policy (playwright-testid-strategy).
---

# Playwright i18n Strategy

A localized control has no single fixed string. Its accessible name is "Checkout securely" in English and "Terminer l'achat en sécurité" in French. Two habits keep tests honest about that: make the translation source type-safe so keys cannot rot, and select controls by the translated name read from that same source, never a second copy pasted into the test.

This skill sits beneath `playwright-locators` and shares the test-id judgment of `playwright-testid-strategy`. Localized copy is one of the few cases where a test id genuinely earns its place, and the rule for when is below.

## Critical rules

- Import the same JSON the app renders. Build selectors from it. Never paste a translated string into a spec.
- Gate `t()` with `CustomTypeOptions` and `tsc` in CI so a bad key is a compile error, not an empty string.
- A test id earns its place only for CMS/A/B copy; assert the rendered text separately when it is a requirement.

## Workflow

1. Doctor the consuming repo: find locale JSON, i18next setup, and how specs import `test`. Adapt paths; do not invent a parallel i18n tree.
2. If types are missing, add static JSON imports plus `CustomTypeOptions` and a `tsc` gate.
3. Change specs to select by `en.checkout` / `fr.checkout` (or the project's namespace shape).
4. Validate with `tsc` plus a focused Playwright spec that switches locale.

## Make The Setup Type-Safe

i18next is type-safe when TypeScript can see the shape of the default-language JSON at build time. Import the namespaces, expose them through `CustomTypeOptions`, and a missing key becomes a compile error.

```ts
// i18n.ts — static imports are the whole point; a fetch would erase the types
import common from './locales/en/common.json';
import navigation from './locales/en/navigation.json';

export const defaultNS = 'common';
export const resources = { en: { common, navigation } } as const;
```

```ts
// i18next.d.ts
import 'i18next';
import type { defaultNS, resources } from './i18n';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: (typeof resources)['en'];
  }
}
```

Now `t('save')` compiles, `t('xxxx')` is an error, and `t('navigation:sidebar.home')` is checked against the navigation namespace. Run `tsc` in CI so the check is a gate, not a suggestion. A focused tsconfig that includes the i18n files and every component that calls `t()` keeps the gate fast and free of unrelated errors. A locale-parity test should assert every non-default locale shares the same key tree as the default language.

If the JSON is loaded at runtime from `/public`, a CMS, or a service, TypeScript cannot see the keys. Import the base-language JSON for typing even when the runtime copy comes from elsewhere, or generate types with the official `i18next-cli`.

## Select By The Translated Name, From One Source

The translation source is the contract. Import the same JSON the app renders and build the selector from it, so a copy edit moves the screen and the test together.

```ts
import en from '../app/locales/en/common.json' with { type: 'json' };
import fr from '../app/locales/fr/common.json' with { type: 'json' };

await page.getByRole('button', { name: en.checkout }).click();
// after switching language, the same control answers to its French name
await expect(page.getByRole('button', { name: fr.checkout })).toBeVisible();
await expect(page.getByRole('button', { name: en.checkout })).toHaveCount(0);

// Interpolated copy: derive expectations from the same JSON placeholders.
import { interpolate } from '../app/i18n/interpolate';
await expect(page.getByRole('status')).toHaveText(interpolate(en.greeting, { name: 'Jag' }));
```

The `with { type: 'json' }` attribute keeps the import statically typed, the same property that makes `t()` safe on the app side. A hardcoded `'Checkout securely'` passes today and goes red the day the button is translated, which reads as a regression when the button is fine.

## When A Test ID Earns Its Place Here

Localized copy is a real reason to reach for a test id, but only when the wording itself is not the contract:

- **The copy is A/B tested or CMS-driven.** The wording is not stable enough to select on. Drive the flow by `data-testid`, then assert the localized text separately when it is a requirement.

```ts
const button = page.getByTestId('checkout-primary-action');
await button.click();                          // stable across copy and locale
await expect(button).toHaveText(fr.checkout);  // assert the copy when it matters
```

- **The translation comes from a source the test should not mirror.** If reproducing the lookup in the test would duplicate app logic, move the contract behind an id and assert the rendered text against the same source the app used.

When the translated label *is* the contract and comes from a source you can import, select by the name. The id is the fallback, not the default.

## Anti-Patterns

| Anti-pattern | Failure mode | Fix |
|---|---|---|
| Hardcoding a translated string in the test | Red the day the copy is localized or edited, with nothing actually broken | Build the selector from the imported translation source |
| Fetching locale JSON so the keys are untyped | `t('chekout')` ships an empty string; no compile error | Static JSON imports plus `CustomTypeOptions`, gated by `tsc` |
| A test id on every localized control by default | Green in any language, and blind to which language rendered | Select by the translated name; keep the id for dynamic or CMS copy |
| A language switch labelled by a translated word | The switch loses its own handle after it flips the language | Label it with an endonym ("English", "Français") that reads the same in every language |

## Cross-References

- The locator priority this skill sits beneath: `playwright-locators`.
- The default-or-fallback question for the test id: `playwright-testid-strategy`.
- Centralizing localized selectors so the contract can change without touching specs: `playwright-page-objects`.

## Validation

- Run `tsc` (or the project's typecheck script) and `npx playwright test` on the focused spec. Expect both to pass.
- No spec hardcodes a translated string; selectors come from the same JSON the app renders.
- A language switch is verified across at least two locales, with language-stable handles on the switch itself.
- A test id appears only for dynamic or CMS-driven copy.
