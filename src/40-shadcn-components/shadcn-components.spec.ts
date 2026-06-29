import { expect, test } from '@playwright/test';

// shadcn on base (@base-ui/react) ships accessible primitives: a Select trigger
// is a real combobox, a Toast lands in a live region, both manage focus and
// keyboard for you. The accessible *name* is still application code. These specs
// build each surface twice — once with the roles and names base-ui renders, once
// as a div clone wired only with data-testid — and run the same query against
// both. The good/bad markup is the subject under test, so it stays in the spec
// via page.setContent, the same convention as src/39-testid-strategy. The markup
// reproduces the roles base-ui emits (combobox/listbox/option for Select;
// region "Notifications" + dialog for Toast), not its class names. Mirrors the
// skill playwright-shadcn.
test.describe('40-shadcn-components: Select — the primitive has a role, the clone does not', () => {
  test('a base-ui Select trigger is a named combobox; a div select exposes no role', async ({
    page,
  }) => {
    // Good: base-ui renders the trigger as role="combobox", named by the field
    // label, and the open popup as role="listbox" with role="option" children.
    await page.setContent(`
      <span id="country-label">Country</span>
      <button type="button" role="combobox" aria-haspopup="listbox"
              aria-expanded="true" aria-controls="country-listbox"
              aria-labelledby="country-label">United Kingdom</button>
      <div role="listbox" id="country-listbox" aria-labelledby="country-label">
        <div role="option" aria-selected="true">United Kingdom</div>
        <div role="option" aria-selected="false">France</div>
        <div role="option" aria-selected="false">Spain</div>
      </div>
    `);

    // The trigger is reachable by role and name, and the chosen value shows on it.
    await expect(page.getByRole('combobox', { name: 'Country' })).toBeVisible();
    // Each option is a real option, reachable by name...
    await expect(page.getByRole('option', { name: 'France' })).toBeVisible();
    // ...and the current selection is provable, not merely visible.
    await expect(page.getByRole('option', { selected: true })).toHaveText('United Kingdom');

    // Bad: a div clone wired only with test ids. No combobox, no options — a
    // keyboard or screen-reader user has nothing to reach.
    await page.setContent(`
      <div data-testid="country-select">United Kingdom</div>
      <div data-testid="country-menu">
        <div data-testid="country-option-uk">United Kingdom</div>
        <div data-testid="country-option-fr">France</div>
      </div>
    `);

    await expect(page.getByRole('combobox')).toHaveCount(0); // no role at all
    await expect(page.getByRole('option')).toHaveCount(0); // nothing to pick by name
    await expect(page.getByTestId('country-select')).toBeVisible(); // only the test id reaches it
  });

  test('the Select popup portals to the body, so scope at page level, not the field', async ({
    page,
  }) => {
    // base-ui renders the listbox through a portal at the end of <body>, outside
    // the field region. A region-scoped query for the option finds nothing; the
    // page-scoped query does. Same portal lesson as a base-ui Dialog.
    await page.setContent(`
      <section aria-label="Country field">
        <span id="lbl">Country</span>
        <button type="button" role="combobox" aria-haspopup="listbox"
                aria-expanded="true" aria-controls="lb" aria-labelledby="lbl">France</button>
      </section>
      <div role="listbox" id="lb" aria-labelledby="lbl">
        <div role="option" aria-selected="true">France</div>
        <div role="option" aria-selected="false">Spain</div>
      </div>
    `);

    const field = page.getByRole('region', { name: 'Country field' });
    await expect(field.getByRole('combobox', { name: 'Country' })).toBeVisible(); // trigger is inside the field
    await expect(field.getByRole('option')).toHaveCount(0); // options are not
    await expect(page.getByRole('option', { name: 'Spain' })).toBeVisible(); // they portal to the page
  });
});

test.describe('40-shadcn-components: Toast — the primitive announces, the clone is silent', () => {
  test('a base-ui toast is a named dialog in the Notifications region; a div toast has no role', async ({
    page,
  }) => {
    // Good: base-ui mounts toasts in a role="region" landmark labelled
    // "Notifications". Each toast is role="dialog" (role="alertdialog" when high
    // priority), named by its title via aria-labelledby and described by its body.
    await page.setContent(`
      <div role="region" aria-label="Notifications">
        <div role="dialog" aria-labelledby="t1-title" aria-describedby="t1-desc">
          <h2 id="t1-title">Changes saved</h2>
          <p id="t1-desc">Your profile is up to date.</p>
        </div>
      </div>
    `);

    const toasts = page.getByRole('region', { name: 'Notifications' });
    await expect(toasts).toBeVisible(); // the landmark a screen-reader user navigates to
    await expect(page.getByRole('dialog', { name: 'Changes saved' })).toBeVisible(); // named by its title
    await expect(toasts.getByText('Your profile is up to date.')).toBeVisible(); // the described body

    // Bad: a floating div with a test id. No region, no role, no name — the
    // assertion is green and the toast never reaches assistive tech.
    await page.setContent(`<div data-testid="toast">Changes saved</div>`);

    await expect(page.getByRole('region', { name: 'Notifications' })).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: 'Changes saved' })).toHaveCount(0);
    await expect(page.getByTestId('toast')).toBeVisible(); // the only handle, and the only thing tested
  });

  test('the good toast text lives in a live region; the div toast announces nothing', async ({
    page,
  }) => {
    // base-ui pairs the visible toast with a visually hidden live region, so a
    // screen reader hears the message. A test can assert the announcement exists,
    // which a div toast cannot satisfy.
    await page.setContent(`
      <div role="region" aria-label="Notifications">
        <div aria-live="polite" aria-atomic="true"
             style="position:absolute;width:1px;height:1px;overflow:hidden">Changes saved</div>
        <div role="dialog" aria-labelledby="t-title">
          <h2 id="t-title">Changes saved</h2>
        </div>
      </div>
    `);

    const live = page.locator('[aria-live="polite"]');
    await expect(live).toHaveText('Changes saved'); // the message a screen reader is handed

    // Bad: no live region, so nothing is announced even though the text is on screen.
    await page.setContent(`<div data-testid="toast">Changes saved</div>`);
    await expect(page.locator('[aria-live]')).toHaveCount(0);
    await expect(page.getByTestId('toast')).toBeVisible();
  });
});

// The second tier: the same lessons against the rendered card page, where real
// shadcn-on-base components run with their own JS. The Select popup, the Dialog,
// and the Toast genuinely portal to the body, so the page-scope queries below
// are not a contrivance — they are the only way to reach the rendered overlay.
// (The setContent specs above are the isolated unit; this is the integrated one,
// the convention card 39 follows.)
test.describe('40-shadcn-components: the rendered card page', () => {
  // The island hydrates with client:load. Its mount effect sets this attribute,
  // so we wait for it before the first interaction, which would otherwise race
  // hydration and be swallowed.
  async function gotoCard(page: import('@playwright/test').Page) {
    await page.goto('/cards/40');
    await expect(page.locator('html')).toHaveAttribute('data-card40-hydrated', 'true');
  }

  test('shadcn login: the good form is driven by label, the bad one only by test id', async ({
    page,
  }) => {
    await gotoCard(page);

    const good = page.getByRole('region', { name: 'shadcn login (good)' });
    await good.getByLabel('Email address').fill('jag@example.com');
    await good.getByLabel('Password').fill('hunter2');
    await good.getByRole('button', { name: 'Sign in' }).click();
    await expect(good.getByRole('alert')).toHaveCount(0); // valid submit, no validation alert

    const bad = page.getByRole('region', { name: 'shadcn login (bad)' });
    await expect(bad.getByLabel('Email address')).toHaveCount(0); // placeholders, not labels
    await bad.getByTestId('shadcn-email-input').fill('jag@example.com');
    await bad.getByTestId('shadcn-login-submit').click();
    await expect(bad.getByRole('button', { name: 'Sign in' })).toBeVisible(); // the Button is real
  });

  test('shadcn icon button: the good one has a name, the bad one needs a test id', async ({
    page,
  }) => {
    await gotoCard(page);

    const good = page.getByRole('region', { name: 'shadcn icon button (good)' });
    await good.getByRole('button', { name: 'Delete item' }).click();
    await expect(good.getByRole('status')).toHaveText('Item deleted');

    const bad = page.getByRole('region', { name: 'shadcn icon button (bad)' });
    await expect(bad.getByRole('button', { name: 'Delete item' })).toHaveCount(0); // unnamed
    await expect(bad.getByRole('button')).toHaveCount(1); // but a real button
    await bad.getByTestId('shadcn-delete-btn').click();
    await expect(bad.getByTestId('shadcn-delete-result')).toBeVisible();
  });

  test('shadcn select: the good combobox is named and its options portal to the page', async ({
    page,
  }) => {
    await gotoCard(page);

    const good = page.getByRole('region', { name: 'shadcn select (good)' });
    const trigger = good.getByRole('combobox', { name: 'Country' });
    await expect(trigger).toBeVisible();

    await trigger.click();
    await expect(page.getByRole('listbox')).toBeVisible();
    // The popup portals to the body, so it is not inside the field region...
    await expect(good.getByRole('option')).toHaveCount(0);
    // ...it is reachable at page scope, where the user picks an option by name.
    await page.getByRole('option', { name: 'France' }).click();
    await expect(trigger).toHaveText('France'); // the trigger shows the chosen value

    const bad = page.getByRole('region', { name: 'shadcn select (bad)' });
    await expect(bad.getByRole('combobox')).toHaveCount(1); // a real combobox...
    await expect(bad.getByRole('combobox', { name: 'Country' })).toHaveCount(0); // ...but unnamed
    await expect(bad.getByTestId('shadcn-country-trigger')).toBeVisible(); // only the test id reaches it
  });

  test('shadcn dialog: the good one exposes a named dialog, the bad one has no name', async ({
    page,
  }) => {
    await gotoCard(page);

    const good = page.getByRole('region', { name: 'shadcn dialog (good)' });
    await good.getByRole('button', { name: 'Open widget' }).click();
    // The dialog portals to the body, so it is found at page scope, not in the region.
    const named = page.getByRole('dialog', { name: 'Widget' });
    await expect(named).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(named).toHaveCount(0);

    const bad = page.getByRole('region', { name: 'shadcn dialog (bad)' });
    await bad.getByRole('button', { name: 'Open widget' }).click();
    await expect(page.getByRole('dialog')).toBeVisible(); // a dialog role, focus trap works
    await expect(page.getByRole('dialog', { name: 'Widget' })).toHaveCount(0); // but no name
    await page.getByRole('button', { name: 'Close' }).click();
  });

  test('shadcn toast: the good one announces in the Notifications region, the bad one is a silent div', async ({
    page,
  }) => {
    await gotoCard(page);

    // Bad first, in isolation: the div is on screen but exposes no toast role.
    const bad = page.getByRole('region', { name: 'shadcn toast (bad)' });
    await bad.getByTestId('shadcn-toast-trigger').click();
    await expect(bad.getByTestId('shadcn-toast')).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Changes saved' })).toHaveCount(0);

    // Good: base-ui mounts the toast in the Notifications region as a named dialog.
    const good = page.getByRole('region', { name: 'shadcn toast (good)' });
    await good.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('region', { name: 'Notifications' })).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Changes saved' })).toBeVisible();
  });
});
