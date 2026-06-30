# Card 41: Type-safe i18n, tested by the translated name

## Scenario

The app is localized with `i18next` and `react-i18next`. Two failure modes follow. A test hardcodes "Checkout securely" and goes red the day the button is translated, even though nothing is broken. A developer writes `t('chekout')` and ships an empty string, because nothing checks the key. This card removes both.

## Aim

- Make the i18next setup type-safe so `t('xxxx')` is a compile error, not a blank string in production. The proof runs as `tsc` in CI.
- Test localized controls by the translated accessible name, read from the same JSON the app renders, so the selector is never a second copy of a string.
- Show what a language switch does to a selector: the control stays, its name changes, and a test built from the translation source follows it.

## How it works

1. **Type safety comes from importing the JSON, not fetching it.** `apps/web/src/i18n/i18n.ts` imports the default-language namespaces, and `i18next.d.ts` feeds their shape into `CustomTypeOptions`. A focused project, `tsconfig.i18n.json`, typechecks the setup, every `t()` call in `Card41I18n.tsx`, and a proof file whose `@ts-expect-error` lines require bad keys to error. `locale-parity.ts` asserts `en` and `fr` share the same key tree. `pnpm typecheck` runs both gates, and the CI workflow gates on it.
2. **The test imports the same source the app uses.** The spec imports `en/common.json` and `fr/common.json` with `import ... with { type: 'json' }`, which keeps them statically typed, then selects by `getByRole('button', { name: en.checkout })`. Interpolated copy such as the greeting uses the shared `interpolate()` helper so expectations track `{{name}}` placeholders in the JSON.
3. **Two tiers run the lesson.** The isolated tier renders the copy with `page.setContent` and shows a hardcoded string break while a source-built selector holds. The rendered tier drives `/cards/41`, clicks the language switch, and re-finds every control by its French name. The switch buttons use endonyms ("English", "Français") so they keep stable handles in any language.

## When to use

- When a localized control needs a stable test contract and you are weighing a test id against the translated name.
- When `t()` typos slip past review because nothing checks the keys.
- As the runnable companion to the `playwright-i18n` skill, beneath `playwright-locators` and beside `playwright-testid-strategy`.

## Run

```bash
pnpm test src/41-i18n-typesafe
pnpm typecheck            # the i18n type-safety gate
```
