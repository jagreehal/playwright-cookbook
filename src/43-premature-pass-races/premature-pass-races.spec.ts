import { expect, test, type Page } from '@playwright/test';
import { waitForApi } from '../e2e-patterns/helpers/waitForApi';

// Assertions that go green for the wrong reason. Each false-green test is a
// race the auto-waiting matchers do not save you from, because the condition
// is already true before the app has done anything. The matching fix lives in
// a separate test so it cannot ride leftover in-flight work. The lessons
// mirror the skill playwright-assertions; the diagnosis workflow is
// playwright-reliability.
test.describe('43-premature-pass-races: assertions that pass before the app does', () => {
  // A page that renders its status and controls after a round trip.
  const lateRender = (inner: string) => `
    <div id="app">Loading…</div>
    <script>
      setTimeout(() => { document.getElementById('app').innerHTML = ${JSON.stringify(inner)}; }, 300);
    </script>
  `;

  const sortableRowsHtml = `
    <button id="sort">Sort by date</button>
    <ul id="rows" data-sort="name"><li>Ada</li><li>Grace</li></ul>
    <script>
      document.getElementById('sort').addEventListener('click', async () => {
        const data = await (await fetch('/api/rows?sort=date')).json();
        const rows = document.getElementById('rows');
        rows.dataset.sort = data.key;
        rows.innerHTML = data.names.map((n) => '<li>' + n + '</li>').join('');
      });
    </script>
  `;

  async function openSortableRows(page: Page) {
    await page.route('**/api/rows*', async (route) => {
      const key = new URL(route.request().url()).searchParams.get('sort') ?? 'name';
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.fulfill({ json: { key, names: ['Ada', 'Grace'] } });
    });
    // An origin, so the relative fetch below is same-origin.
    await page.goto('/');
    await page.setContent(sortableRowsHtml);
  }

  test('absence is true before render', async ({ page }) => {
    await page.setContent(lateRender('<p>Approved</p><button>Edit</button>'));

    // Bad: the app is still on "Loading…", so the button is absent — for now.
    // toHaveCount(0) and not.toBeVisible() both settle on the first tick where
    // the element is missing. Neither waits to see whether it is coming.
    await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0); // green, and wrong
    // …and here is the proof it was a lie:
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();
  });

  test('wait for a positive landmark before asserting absence', async ({ page }) => {
    // Locked record: no Edit. Something rendered in the same pass tells you
    // the render happened, so absence now means absent — not "not yet".
    await page.setContent(lateRender('<p>Approved</p>'));
    await expect(page.getByText('Approved')).toBeVisible(); // landmark
    await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0); // now meaningful
  });

  test('end-state-only passes when Save never starts', async ({ page }) => {
    // A broken Save that never starts: no request, no spinner.
    await page.setContent(`
      <button type="button">Save</button>
      <div hidden role="status">Saving…</div>
    `);

    await page.getByRole('button', { name: 'Save' }).click();
    // Bad: waiting only for the end state passes when nothing ever started.
    await expect(page.getByRole('status')).toBeHidden(); // green, and wrong
  });

  test('a silent action needs busy to appear and then disappear', async ({ page }) => {
    await page.setContent(`
      <button type="button" id="save">Save</button>
      <div id="busy" hidden role="status">Saving…</div>
      <script>
        document.getElementById('save').addEventListener('click', () => {
          const busy = document.getElementById('busy');
          busy.hidden = false;
          setTimeout(() => { busy.hidden = true; }, 300);
        });
      </script>
    `);

    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('status')).toBeVisible(); // it started
    await expect(page.getByRole('status')).toBeHidden(); // it finished
  });

  test('a synchronous read snapshots text that is already true', async ({ page }) => {
    await page.setContent(`
      <p>Order #1</p>
      <script>
        setTimeout(() => {
          document.querySelector('p').textContent = 'Order #1 — paid';
        }, 300);
      </script>
    `);

    const status = page.getByRole('paragraph');
    // Bad: innerText() resolves once. "Order #1" is already on screen, so
    // toContain passes against the unpaid order and the paid one alike.
    expect(await status.innerText()).toContain('Order #1'); // green, and wrong
    // …and here is the proof it was a lie:
    expect(await status.innerText()).toBe('Order #1');

    // Good: the matcher takes the locator, not a string, so it re-reads until
    // the settled text holds.
    await expect(status).toHaveText('Order #1 — paid');
  });

  test('a re-fetch that renders the same text passes against the stale DOM', async ({
    page,
  }) => {
    // Sorting by a second key returns the same names in the same order — only
    // the underlying data changes. Nothing visible flips, so no matcher can
    // tell you the new data has landed.
    await openSortableRows(page);

    await page.getByRole('button', { name: 'Sort by date' }).click();
    await expect(page.getByRole('listitem')).toHaveText(['Ada', 'Grace']); // green either way
    expect(await page.getByRole('list').getAttribute('data-sort')).toBe('name'); // still the old data
  });

  test('a re-fetch that renders the same text needs the response as the done signal', async ({
    page,
  }) => {
    await openSortableRows(page);

    // Register the response wait before the click, then act. waitForApi is the
    // network done signal; toHaveAttribute covers the DOM write after json().
    const sorted = waitForApi(page, { urlPart: '/api/rows?sort=date' });
    await page.getByRole('button', { name: 'Sort by date' }).click();
    await sorted;
    await expect(page.getByRole('list')).toHaveAttribute('data-sort', 'date');
  });
});
