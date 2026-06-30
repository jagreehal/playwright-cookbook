import { expect, test } from '@playwright/test';

// The translation source is the contract. These specs import the same JSON the
// app renders (see apps/web/src/i18n/locales), so a selector is never a second
// copy of a string that can drift. Import attributes keep the JSON statically
// typed, the same property that makes t() type-safe on the app side.
import { interpolate } from '../../apps/web/src/i18n/interpolate.ts';
import en from '../../apps/web/src/i18n/locales/en/common.json' with { type: 'json' };
import fr from '../../apps/web/src/i18n/locales/fr/common.json' with { type: 'json' };

const greetingName = 'Jag';

test.describe('41-i18n-typesafe: the translated name is the contract', () => {
  test('a localized control is selected by its translated name, from the shared source', async ({
    page,
  }) => {
    // Render the English copy from the shared source.
    await page.setContent(`<button type="button">${en.checkout}</button>`);
    await expect(page.getByRole('button', { name: en.checkout })).toBeVisible();

    // Swap to the French copy from the same source. A selector built from `fr`
    // finds the control; the English name no longer matches, which is correct.
    await page.setContent(`<button type="button">${fr.checkout}</button>`);
    await expect(page.getByRole('button', { name: fr.checkout })).toBeVisible();
    await expect(page.getByRole('button', { name: en.checkout })).toHaveCount(0);
  });

  test('a hardcoded string breaks on a copy change; a test id hides which language rendered', async ({
    page,
  }) => {
    // A test that inlines the English string passes today...
    await page.setContent(`<button type="button">${en.checkout}</button>`);
    await expect(page.getByRole('button', { name: 'Checkout securely' })).toBeVisible();

    // ...and silently stops finding the control the day the copy is localized,
    // even though the button itself is fine.
    await page.setContent(`<button type="button">${fr.checkout}</button>`);
    await expect(page.getByRole('button', { name: 'Checkout securely' })).toHaveCount(0);

    // A test id keeps passing across the switch — and proves nothing about the
    // copy. When the wording is dynamic, that is the deal: drive by the id, then
    // assert the localized text separately when it is a requirement.
    await page.setContent(`<button type="button" data-testid="checkout">${fr.checkout}</button>`);
    await expect(page.getByTestId('checkout')).toBeVisible();
    await expect(page.getByTestId('checkout')).toHaveText(fr.checkout);
  });
});

test.describe('41-i18n-typesafe: the rendered card page', () => {
  // The island hydrates with client:load; its mount effect sets this attribute,
  // so we wait for it before the language switch, which is a client interaction.
  async function gotoCard(page: import('@playwright/test').Page) {
    await page.goto('/cards/41');
    await expect(page.locator('html')).toHaveAttribute('data-card41-hydrated', 'true');
  }

  test('controls follow their translated name across a language switch', async ({ page }) => {
    await gotoCard(page);
    const store = page.getByRole('region', { name: 'localized storefront' });

    // English: every control is reachable by the name from the shared source.
    await expect(store.getByRole('button', { name: en.checkout })).toBeVisible();
    await expect(store.getByRole('button', { name: en.addToBasket })).toBeVisible();
    await expect(store.getByRole('searchbox', { name: en.search.label })).toBeVisible();
    await expect(store.getByRole('status')).toHaveText(
      interpolate(en.greeting, { name: greetingName }),
    );

    await page
      .getByRole('group', { name: 'Language' })
      .getByRole('button', { name: 'Français' })
      .click();

    // French: the same controls, now reachable by their French names. The English
    // names stop matching, which is the test following the contract, not breaking.
    await expect(store.getByRole('button', { name: fr.checkout })).toBeVisible();
    await expect(store.getByRole('button', { name: en.checkout })).toHaveCount(0);
    await expect(store.getByRole('searchbox', { name: fr.search.label })).toBeVisible();
    await expect(store.getByRole('status')).toHaveText(
      interpolate(fr.greeting, { name: greetingName }),
    );
  });

  test('the language switch keeps stable handles in every language', async ({ page }) => {
    await gotoCard(page);
    const lang = page.getByRole('group', { name: 'Language' });

    // Endonyms read the same whatever the active language is, so the switch never
    // loses its own handles the way a translated label would.
    await expect(lang.getByRole('button', { name: 'English' })).toBeVisible();
    await expect(lang.getByRole('button', { name: 'Français' })).toBeVisible();

    await lang.getByRole('button', { name: 'Français' }).click();
    await expect(lang.getByRole('button', { name: 'Français' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(lang.getByRole('button', { name: 'English' })).toBeVisible();
  });
});
