import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Demonstrates the `build-tested-components` skill end to end.
//
// Two versions of the same newsletter signup are mounted side by side:
//  - GOOD: semantic markup, so a role-first query reaches every element. The
//    query that drives the test also proves a real user could do the same.
//  - BAD:  divs + test ids. A click test passes while nobody can tab to the
//    "button" and no screen reader sees a form.
//
// The card uses the same inject-and-assert technique as Card 28, so it runs
// against the existing demo server with no component-test framework.

const MARKUP = `
  <div id="a11y-demo">
    <!-- GOOD: every element has a user-facing handle -->
    <section id="good" aria-labelledby="good-heading">
      <h2 id="good-heading">Newsletter</h2>
      <form aria-label="Newsletter signup">
        <label for="good-email">Email address</label>
        <input id="good-email" name="email" type="email" />
        <button type="submit">Subscribe</button>
      </form>
      <p role="status" id="good-status"></p>
      <div id="good-errors"></div>
    </section>

    <!-- BAD: reachable only by test id -->
    <div id="bad" data-testid="newsletter">
      <div data-testid="newsletter-title">Newsletter</div>
      <input data-testid="email-input" type="email" placeholder="Email address" />
      <div data-testid="subscribe-btn">Subscribe</div>
      <div data-testid="newsletter-status"></div>
    </div>
  </div>
`;

test.describe('39-accessible-components: build the component so role-first queries reach it', () => {
  test.beforeEach(async ({ page }) => {
    // Any served page gives a live DOM root; we mount our own components into it.
    await page.goto('/cards/01');
    await expect(page.getByRole('heading', { name: 'Person' })).toBeVisible();

    await page.evaluate((markup) => {
      const host = document.createElement('div');
      host.innerHTML = markup;
      document.body.appendChild(host);

      // GOOD: announce success in a live region, errors via role="alert".
      const goodForm = host.querySelector('#good form') as HTMLFormElement;
      goodForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = (host.querySelector('#good-email') as HTMLInputElement).value.trim();
        const status = host.querySelector('#good-status')!;
        const errors = host.querySelector('#good-errors')!;
        status.textContent = '';
        errors.innerHTML = '';
        if (!email) {
          const alert = document.createElement('p');
          alert.setAttribute('role', 'alert');
          alert.textContent = 'Enter your email address';
          errors.appendChild(alert);
          return;
        }
        status.textContent = `Subscribed: ${email}`;
      });

      // BAD: a clickable div. No role, no keyboard access, no announced status.
      const badBtn = host.querySelector('[data-testid="subscribe-btn"]') as HTMLElement;
      badBtn.addEventListener('click', () => {
        const email = (host.querySelector('[data-testid="email-input"]') as HTMLInputElement).value.trim();
        host.querySelector('[data-testid="newsletter-status"]')!.textContent = `Subscribed: ${email}`;
      });
    }, MARKUP);
  });

  test('GOOD renders: the surface is exposed by role, no test id needed', async ({ page }) => {
    // The section is itself the region, so query it at page level (the name is unique).
    await expect(page.getByRole('region', { name: 'Newsletter' })).toBeVisible();
    const root = page.locator('#good');
    await expect(root.getByLabel('Email address')).toBeVisible();
    await expect(root.getByRole('button', { name: 'Subscribe' })).toBeVisible();
  });

  test('GOOD affordance + success state: the query that drives it proves a user could', async ({ page }) => {
    const root = page.locator('#good');
    await root.getByLabel('Email address').fill('jag@example.com');
    await root.getByRole('button', { name: 'Subscribe' }).click();
    // Read the result the way a screen reader announces it.
    await expect(root.getByRole('status')).toHaveText('Subscribed: jag@example.com');
  });

  test('GOOD error state is announced, not just shown', async ({ page }) => {
    const root = page.locator('#good');
    await root.getByRole('button', { name: 'Subscribe' }).click(); // submit empty
    await expect(root.getByRole('alert')).toHaveText('Enter your email address');
  });

  test('BAD: the test id passes while the a11y proof fails', async ({ page }) => {
    const root = page.locator('#bad');

    // Only the test id reaches it — green, and blind.
    await root.getByTestId('email-input').fill('jag@example.com');
    await root.getByTestId('subscribe-btn').click();
    await expect(root.getByTestId('newsletter-status')).toHaveText('Subscribed: jag@example.com');

    // The negative/a11y proof: the user-facing queries find nothing.
    await expect(root.getByRole('button', { name: 'Subscribe' })).toHaveCount(0); // it is a <div>
    await expect(root.getByLabel('Email address')).toHaveCount(0);                // placeholder, not a label
  });

  test('axe passes on GOOD; the label query is the net axe is not on BAD', async ({ page }, testInfo) => {
    const results = await new AxeBuilder({ page })
      .include('#good')
      .disableRules(['color-contrast']) // unstyled demo markup; structural rules still run
      .analyze();

    await testInfo.attach('axe-violations', {
      body: JSON.stringify(results.violations, null, 2),
      contentType: 'application/json',
    });

    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious).toEqual([]);

    // axe is satisfied by the BAD input's placeholder-as-name, but the label
    // query still catches the gap a user hits the moment they start typing.
    await expect(page.locator('#bad').getByLabel('Email address')).toHaveCount(0);
  });
});
