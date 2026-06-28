import { expect, test } from '@playwright/test';

// Selector strategy is easiest to see when you build the surface twice and run
// the same query against both. These specs set their own markup with
// page.setContent — the good/bad HTML is the subject under test, so it stays in
// the spec rather than living in the app. The lessons mirror the skill
// playwright-testid-strategy.
test.describe('39-testid-strategy: when a test id earns its place', () => {
  test('aria-label only for tests clobbers the heading in the accessibility tree', async ({
    page,
  }) => {
    // Bad: an aria-label added so a test can grab the section. It outranks the
    // visible heading, so the region is announced by the slug, not "Customer
    // reviews". Worse than a test id — this string ships to screen readers.
    await page.setContent(`
      <section aria-label="reviews-section">
        <h2>Customer reviews</h2>
        <p>3 reviews</p>
      </section>
    `);

    // The eye still reads the heading...
    await expect(page.getByRole('heading', { name: 'Customer reviews' })).toBeVisible();
    // ...but the region a screen reader announces is named by the slug.
    await expect(page.getByRole('region', { name: 'Customer reviews' })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'reviews-section' })).toBeVisible();

    // Good: point the label at the heading. One name, shared by user and test.
    await page.setContent(`
      <section aria-labelledby="reviews-heading">
        <h2 id="reviews-heading">Customer reviews</h2>
        <p>3 reviews</p>
      </section>
    `);
    await expect(page.getByRole('region', { name: 'Customer reviews' })).toBeVisible();
  });

  test('a conditional wrapper: text inversion proves nothing, a role or test id does', async ({
    page,
  }) => {
    // Bad: a buggy ribbon mounts an empty wrapper even with no message. A
    // text-only inversion is satisfied, yet the empty box is on screen.
    await page.setContent(`<div data-testid="promo-ribbon" style="padding:8px"></div>`);
    await expect(page.getByText('50% off today')).toHaveCount(0); // green, and misleading
    await expect(page.getByTestId('promo-ribbon')).toBeVisible(); // the box is still there
    await expect(page.getByTestId('promo-ribbon')).toHaveText(''); // empty — only an element query catches it

    // Good: an announcement has a role, so absence is provable without a test id.
    await page.setContent(`<div role="status">50% off today</div>`);
    await expect(page.getByRole('status')).toHaveText('50% off today');
    await page.setContent(`<div></div>`); // message cleared, wrapper gone
    await expect(page.getByRole('status')).toHaveCount(0);
  });

  test('a canvas widget exposes no role, so a wrapper test id is the only handle', async ({
    page,
  }) => {
    // A third-party date picker that paints into a canvas: nothing in the
    // accessibility tree, and the visible caption is a <span>, not a label.
    await page.setContent(`
      <div data-testid="booking-date-field">
        <span>Choose date</span>
        <canvas width="160" height="20" aria-hidden="true"></canvas>
      </div>
    `);

    await expect(page.getByRole('combobox')).toHaveCount(0); // no control to reach at all
    await expect(page.getByLabel('Choose date')).toHaveCount(0); // the span labels nothing
    await expect(page.getByTestId('booking-date-field')).toBeVisible(); // the only honest handle
  });

  test('a real combobox can be named from the wrapper you own', async ({ page }) => {
    // The library exposes a control with no name; you own the wrapper, so a
    // label closes the gap and no test id is needed.
    await page.setContent(`
      <label for="booking-date">Choose date</label>
      <input id="booking-date" role="combobox" aria-expanded="false" readonly />
    `);

    await expect(page.getByRole('combobox', { name: 'Choose date' })).toBeVisible();
    await expect(page.getByLabel('Choose date')).toBeVisible();
  });

  test('the keyboard reaches a real button, never a clickable div', async ({ page }) => {
    // A click handler fires on anything, so a div "button" passes a click test.
    // A keyboard user gets a different result.
    await page.setContent(`
      <form aria-label="Sign in">
        <input aria-label="Email" type="email" />
        <button type="submit">Sign in</button>
      </form>
      <hr />
      <div aria-label="Sign in (bad)">
        <input aria-label="Email (bad)" type="email" />
        <div onclick="void 0" style="cursor:pointer">Sign in</div>
      </div>
    `);

    // Good: the real button is in the tab order.
    await page.getByLabel('Email', { exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeFocused();

    // Bad: there is no button, and the div is skipped by Tab.
    const bad = page.locator('div[aria-label="Sign in (bad)"]');
    await expect(bad.getByRole('button', { name: 'Sign in' })).toHaveCount(0);
    await bad.getByLabel('Email (bad)').focus();
    await page.keyboard.press('Tab');
    await expect(bad.getByText('Sign in')).not.toBeFocused();
  });

  test('a placeholder is a hint, not a label', async ({ page }) => {
    // Bad: a search box with only a placeholder. No label to find.
    await page.setContent(`<input type="search" placeholder="Search products" />`);
    await expect(page.getByLabel('Search products')).toHaveCount(0);
    await expect(page.getByPlaceholder('Search products')).toBeVisible();

    // Good: a real (visually hidden) label keeps a stable name.
    await page.setContent(`
      <label for="q" style="position:absolute;width:1px;height:1px;overflow:hidden">Search products</label>
      <input id="q" type="search" placeholder="Try 'wireless headphones'" />
    `);
    await expect(page.getByRole('searchbox', { name: 'Search products' })).toBeVisible();
    await expect(page.getByLabel('Search products')).toBeVisible();
  });

  test('a fixed id collides across instances; unique ids (useId) do not', async ({ page }) => {
    // Bad: two boxes share one id, so both labels point at the first input. The
    // second box loses its name — only one searchbox is named "Search products".
    await page.setContent(`
      <label for="dup" style="position:absolute;width:1px;height:1px;overflow:hidden">Search products</label>
      <input id="dup" type="search" />
      <label for="dup" style="position:absolute;width:1px;height:1px;overflow:hidden">Search products</label>
      <input id="dup" type="search" />
    `);
    await expect(page.getByRole('searchbox', { name: 'Search products' })).toHaveCount(1);

    // Good: unique ids per instance (what useId() generates in React) keep both
    // boxes named.
    await page.setContent(`
      <label for="a" style="position:absolute;width:1px;height:1px;overflow:hidden">Search products</label>
      <input id="a" type="search" />
      <label for="b" style="position:absolute;width:1px;height:1px;overflow:hidden">Search products</label>
      <input id="b" type="search" />
    `);
    await expect(page.getByRole('searchbox', { name: 'Search products' })).toHaveCount(2);
  });
});

// The same id-collision lesson against the rendered card page, so the demo a
// visitor browses is the demo under test (the convention other cards follow).
test.describe('39-testid-strategy: the rendered card page', () => {
  test('the page renders, and the id-collision pair behaves as documented', async ({ page }) => {
    await page.goto('/cards/39');

    // Bad pair: a shared fixed id names only the first box.
    const fixed = page.getByRole('region', { name: 'Search ids (fixed)' });
    await expect(fixed.getByRole('searchbox', { name: 'Search products' })).toHaveCount(1);

    // Good pair: unique ids name both.
    const unique = page.getByRole('region', { name: 'Search ids (unique)' });
    await expect(unique.getByRole('searchbox', { name: 'Search products' })).toHaveCount(2);
  });

  test('the React island gives each useId() instance a unique, working label', async ({
    page,
  }) => {
    await page.goto('/cards/39');

    // Two <SearchBox /> instances, each with a useId() id, so both keep a name.
    const island = page.getByRole('region', { name: 'Search ids (React useId)' });
    await expect(island.getByRole('searchbox', { name: 'Search products' })).toHaveCount(2);

    // The ids React generated are actually distinct.
    const ids = await island.getByRole('searchbox').evaluateAll((els) => els.map((e) => e.id));
    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
    expect(ids[0]).not.toBe('');
  });
});
