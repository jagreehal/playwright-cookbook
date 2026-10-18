import { expect, test } from '@playwright/test';

// Native controls carry their own state: a checkbox knows it is checked, a
// select knows its value, an input knows its accessible description. Assert
// that state with the matching web-first matcher instead of reading DOM
// properties by hand.
test.describe('45-native-form-controls: inputs, checks, selects, hover, clicks, validation', () => {
  test('fill replaces, clear empties, pressSequentially types key by key', async ({ page }) => {
    await page.setContent(`
      <label>Full name <input name="fullName" value="Old value" /></label>
      <label>Search <input name="search" /></label>
      <p data-testid="keys">0</p>
      <script>
        let n = 0;
        // Count printable keys only: clear() sends a Delete key of its own.
        document.querySelector('[name=search]').addEventListener('keydown', (e) => {
          if (e.key.length === 1) document.querySelector('[data-testid=keys]').textContent = String(++n);
        });
      </script>
    `);

    const name = page.getByLabel('Full name');
    await name.fill('Ada Lovelace'); // fill replaces the existing value
    await expect(name).toHaveValue('Ada Lovelace');
    await name.clear();
    await expect(name).toHaveValue('');

    // fill sets the value in one input event. Key handlers never fire.
    await page.getByLabel('Search').fill('abc');
    await expect(page.getByTestId('keys')).toHaveText('0');

    // pressSequentially fires keydown/keypress/keyup per character, for
    // widgets that react to keys (autocomplete, masked inputs).
    await page.getByLabel('Search').clear();
    await page.getByLabel('Search').pressSequentially('abc');
    await expect(page.getByTestId('keys')).toHaveText('3');
  });

  test('check, uncheck, setChecked and disabled checkboxes', async ({ page }) => {
    await page.setContent(`
      <label><input type="checkbox" name="terms" /> Accept terms</label>
      <label><input type="checkbox" name="updates" checked /> Email me updates</label>
      <label><input type="checkbox" name="locked" checked disabled /> Locked preference</label>
    `);

    // Bad: click() toggles. If the box was already checked, you unchecked it.
    // check() is idempotent and throws if the box does not end up checked.
    await page.getByLabel('Accept terms').check();
    await expect(page.getByLabel('Accept terms')).toBeChecked();

    await page.getByLabel('Email me updates').uncheck();
    await expect(page.getByLabel('Email me updates')).not.toBeChecked();

    // setChecked takes the target state from data, e.g. a parameterized test.
    await page.getByLabel('Email me updates').setChecked(true);
    await expect(page.getByLabel('Email me updates')).toBeChecked();

    await expect(page.getByLabel('Locked preference')).toBeDisabled();
    await expect(page.getByLabel('Locked preference')).toBeChecked();
  });

  test('a radio group allows one choice', async ({ page }) => {
    await page.setContent(`
      <fieldset>
        <legend>Plan</legend>
        <label><input type="radio" name="plan" value="free" /> Free</label>
        <label><input type="radio" name="plan" value="pro" /> Pro</label>
      </fieldset>
    `);

    const plan = page.getByRole('group', { name: 'Plan' });
    await plan.getByLabel('Free').check();
    await plan.getByLabel('Pro').check();
    await expect(plan.getByLabel('Pro')).toBeChecked();
    await expect(plan.getByLabel('Free')).not.toBeChecked();
  });

  test('selectOption by value, by label, and multiple', async ({ page }) => {
    await page.setContent(`
      <label>Country
        <select name="country">
          <option value="">Choose…</option>
          <option value="gb">United Kingdom</option>
          <option value="ca">Canada</option>
        </select>
      </label>
      <label>Toppings
        <select name="toppings" multiple>
          <option value="cheese">Cheese</option>
          <option value="ham">Ham</option>
          <option value="olives">Olives</option>
        </select>
      </label>
    `);

    const country = page.getByLabel('Country');
    await country.selectOption('gb'); // a string matches value or label
    await expect(country).toHaveValue('gb');
    await country.selectOption({ label: 'Canada' }); // explicit label
    await expect(country).toHaveValue('ca');

    const toppings = page.getByLabel('Toppings');
    await toppings.selectOption(['cheese', 'olives']);
    await expect(toppings).toHaveValues(['cheese', 'olives']);
  });

  test('hover reveals content that is hidden until pointer-over', async ({ page }) => {
    await page.setContent(`
      <style>
        .tip { display: none; }
        .wrap:hover .tip { display: block; }
      </style>
      <div class="wrap">
        <button type="button">Show tip</button>
        <div role="tooltip" class="tip">Saved drafts</div>
      </div>
    `);

    await expect(page.getByRole('tooltip')).toBeHidden();
    await page.getByRole('button', { name: 'Show tip' }).hover();
    await expect(page.getByRole('tooltip')).toHaveText('Saved drafts');
  });

  test('dblclick, right click, and disabled buttons', async ({ page }) => {
    await page.setContent(`
      <p role="status">Ready</p>
      <button type="button" id="dbl">Double click me</button>
      <button type="button" id="ctx">Right click me</button>
      <button type="button" disabled>Disabled button</button>
      <script>
        const status = document.querySelector('[role=status]');
        document.getElementById('dbl').addEventListener('dblclick', () => { status.textContent = 'Double-clicked'; });
        document.getElementById('ctx').addEventListener('contextmenu', (e) => {
          e.preventDefault();
          status.textContent = 'Right-clicked';
        });
      </script>
    `);

    await page.getByRole('button', { name: 'Double click me' }).dblclick();
    await expect(page.getByRole('status')).toHaveText('Double-clicked');
    await page.getByRole('button', { name: 'Right click me' }).click({ button: 'right' });
    await expect(page.getByRole('status')).toHaveText('Right-clicked');

    // Bad: click() on a disabled button waits for it to enable, then times out.
    // Assert the state you expect instead.
    await expect(page.getByRole('button', { name: 'Disabled button' })).toBeDisabled();
  });

  test('validation errors are linked to the field they describe', async ({ page }) => {
    await page.setContent(`
      <form novalidate>
        <label>Email <input name="email" type="email" aria-describedby="email-error" /></label>
        <p id="email-error"></p>
        <button type="submit">Save profile</button>
      </form>
      <div role="alert"></div>
      <script>
        document.querySelector('form').addEventListener('submit', (e) => {
          e.preventDefault();
          const email = document.querySelector('[name=email]');
          const ok = email.value.includes('@');
          email.setAttribute('aria-invalid', String(!ok));
          document.getElementById('email-error').textContent = ok ? '' : 'Enter a valid email';
          document.querySelector('[role=alert]').textContent = ok ? '' : '1 error in the form';
        });
      </script>
    `);

    const email = page.getByLabel('Email');
    await email.fill('nope');
    await page.getByRole('button', { name: 'Save profile' }).click();

    // Bad: getByText('Enter a valid email') proves the text exists somewhere,
    // and passes when the message sits next to the wrong field.
    // Good: toHaveAccessibleDescription proves a screen reader hears the error
    // on this field.
    await expect(email).toHaveAccessibleDescription('Enter a valid email');
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByRole('alert')).toHaveText('1 error in the form');

    await email.fill('ada@example.com');
    await page.getByRole('button', { name: 'Save profile' }).click();
    await expect(email).toHaveAccessibleDescription('');
  });
});
