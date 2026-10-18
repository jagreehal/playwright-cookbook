import { expect, test, type Page } from '@playwright/test';

// Two boundaries a page locator cannot cross on its own: an iframe is a second
// document, so you must enter it. A shadow root is part of the same document,
// and Playwright's locators already pierce it when the root is open.
test.describe('47-frames-and-shadow-dom: frameLocator, nested frames, shadow roots', () => {
  // Serve frame documents from a route so they get a real URL that
  // page.frame({ url }) can match. Same-origin, so frames can talk to parent.
  async function serveFrames(page: Page) {
    const docs: Record<string, string> = {
      '/frames/newsletter': `
        <h1>Newsletter</h1>
        <label>Email <input /></label>
        <button type="button" onclick="parent.document.querySelector('[role=status]').textContent = 'Subscribed'">Subscribe</button>
      `,
      '/frames/outer': `<iframe title="Inner" src="/frames/inner"></iframe>`,
      '/frames/inner': `
        <button type="button" onclick="parent.parent.document.querySelector('[role=status]').textContent = 'Pong'">Ping</button>
      `,
    };
    await page.route('**/frames/**', (route) => {
      const path = new URL(route.request().url()).pathname;
      return route.fulfill({ contentType: 'text/html', body: docs[path] ?? '' });
    });
    await page.goto('/');
  }

  test('a page locator cannot see inside an iframe', async ({ page }) => {
    await serveFrames(page);
    await page.setContent(`
      <p role="status">Ready</p>
      <iframe title="Newsletter" src="/frames/newsletter"></iframe>
    `);

    // Bad: the button lives in the frame's document, so the page finds nothing.
    await expect(page.getByRole('button', { name: 'Subscribe' })).toHaveCount(0);

    // Good: enter the frame, then use the same role locators as anywhere else.
    const frame = page.frameLocator('iframe[title="Newsletter"]');
    await frame.getByLabel('Email').fill('ada@example.com');
    await frame.getByRole('button', { name: 'Subscribe' }).click();

    // Cross-frame assertion: the action ran in the frame, the result shows on
    // the page.
    await expect(page.getByRole('status')).toHaveText('Subscribed');
  });

  test('contentFrame turns an element locator into a frame locator', async ({ page }) => {
    await serveFrames(page);
    await page.setContent(`<iframe title="Newsletter" src="/frames/newsletter"></iframe>`);

    // Start from an accessible locator for the <iframe> element itself, then
    // step inside. Same result as frameLocator, without a CSS selector.
    const iframe = page.getByTitle('Newsletter');
    await expect(iframe).toBeVisible();
    await expect(iframe.contentFrame().getByRole('heading')).toHaveText('Newsletter');
  });

  test('nested frames chain one step per document', async ({ page }) => {
    await serveFrames(page);
    await page.setContent(`
      <p role="status">Ready</p>
      <iframe title="Outer" src="/frames/outer"></iframe>
    `);

    await page
      .getByTitle('Outer')
      .contentFrame()
      .getByTitle('Inner')
      .contentFrame()
      .getByRole('button', { name: 'Ping' })
      .click();
    await expect(page.getByRole('status')).toHaveText('Pong');
  });

  test('page.frame finds a frame by URL when you need the Frame object', async ({ page }) => {
    await serveFrames(page);
    await page.setContent(`<iframe title="Outer" src="/frames/outer"></iframe>`);
    // Wait on content inside the inner frame, so its document has loaded.
    const innerFrame = page.getByTitle('Outer').contentFrame().getByTitle('Inner').contentFrame();
    await expect(innerFrame.getByRole('button', { name: 'Ping' })).toBeVisible();

    // Frame (not FrameLocator) gives you url(), evaluate(), parentFrame().
    // Prefer FrameLocator for actions; it waits and re-resolves.
    const inner = page.frame({ url: /\/frames\/inner$/ });
    expect(inner?.parentFrame()?.url()).toMatch(/\/frames\/outer$/);
  });

  test('open shadow roots are pierced by role and text locators', async ({ page }) => {
    await page.setContent(`
      <p role="status">Ready</p>
      <div id="host"></div>
      <script>
        const root = document.getElementById('host').attachShadow({ mode: 'open' });
        root.innerHTML = '<button type="button" class="action">Shadow action</button>';
        root.querySelector('button').onclick = () => {
          document.querySelector('[role=status]').textContent = 'Shadow clicked';
        };
      </script>
    `);

    // No special API. getByRole and CSS locators walk into open shadow roots.
    await page.getByRole('button', { name: 'Shadow action' }).click();
    await expect(page.getByRole('status')).toHaveText('Shadow clicked');
    await expect(page.locator('.action')).toHaveCount(1);

    // Bad: XPath does not pierce shadow roots, so this finds nothing.
    await expect(page.locator('xpath=//button[@class="action"]')).toHaveCount(0);
  });

  test('closed shadow roots are out of reach', async ({ page }) => {
    await page.setContent(`
      <div id="host"></div>
      <script>
        const host = document.getElementById('host');
        const root = host.attachShadow({ mode: 'closed' });
        root.innerHTML = '<button type="button">Hidden action</button>';
        host.dataset.ready = 'true';
      </script>
    `);

    // A closed root hides its tree from page scripts, and from Playwright.
    // Test the component through its public surface, or ask the team to open
    // the root in test builds.
    await expect(page.locator('#host')).toHaveAttribute('data-ready', 'true');
    await expect(page.getByRole('button', { name: 'Hidden action' })).toHaveCount(0);
  });
});
