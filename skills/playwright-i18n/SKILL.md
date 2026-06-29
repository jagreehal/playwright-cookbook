---
name: playwright-i18n
description: Use when testing a localized UI built with i18next and react-i18next, when deciding how to select a control whose text is translated, or when making the i18next setup type-safe so a bad t() key fails the build instead of shipping an empty string. Pairs the locator priority of playwright-locators with the test-id judgment of playwright-testid-strategy for the localized case.
---

# Playwright i18n Strategy

A localized control has no single fixed string. Its accessible name is "Checkout securely" in English and "Terminer l'achat en sécurité" in French. Two habits keep tests honest about that: make the translation source type-safe so keys cannot rot, and select controls by the translated name read from that same source, never a second copy pasted into the test.

This skill sits beneath `playwright-locators` and shares the test-id judgment of `playwright-testid-strategy`. Localized copy is one of the few cases where a test id genuinely earns its place, and the rule for when is below.

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

Now `t('save')` compiles, `t('xxxx')` is an error, and `t('navigation:sidebar.home')` is checked against the navigation namespace. Run `tsc` in CI so the check is a gate, not a suggestion. A focused project that includes the i18n files and every component that calls `t()` keeps the gate fast and free of unrelated errors. `locale-parity.ts` asserts every non-default locale shares the same key tree as English. The runnable setup lives in `apps/web/src/i18n`, exercised by `src/41-i18n-typesafe`.

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
- The runnable type-safe setup and the two-tier spec: `src/41-i18n-typesafe`.

## Quick Quality Checklist

- The i18next setup imports its JSON statically and declares `CustomTypeOptions`, and `tsc` runs in CI on every `t()` call site.
- Every non-default locale shares the same key tree as English (`locale-parity.ts`).
- No test hardcodes a translated string; selectors are built from the same source the app renders.
- A language switch is verified across at least two locales, and its own controls use language-stable handles.
- A test id appears only for dynamic or CMS-driven copy, with the rendered text asserted separately.
