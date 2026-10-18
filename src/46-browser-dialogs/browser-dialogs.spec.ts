import { expect, test } from '@playwright/test';

// alert, confirm, prompt and beforeunload block the page until someone answers.
// Playwright answers for you: with no listener, it dismisses every dialog. A
// test that forgets the listener keeps running, and confirm() returns false.
test.describe('46-browser-dialogs: alert, confirm, prompt, beforeunload', () => {
  const dialogsHtml = `
    <p role="status">Ready</p>
    <button type="button" id="alert">Show alert</button>
    <button type="button" id="confirm">Delete account</button>
    <button type="button" id="prompt">Rename</button>
    <script>
      const status = document.querySelector('[role=status]');
      document.getElementById('alert').onclick = () => { alert('Heads up'); status.textContent = 'Alerted'; };
      document.getElementById('confirm').onclick = () => {
        status.textContent = confirm('Delete your account?') ? 'Deleted' : 'Kept';
      };
      document.getElementById('prompt').onclick = () => {
        const name = prompt('New name', 'Untitled');
        status.textContent = name === null ? 'Cancelled' : 'Renamed to ' + name;
      };
    </script>
  `;

  test('an unhandled confirm is dismissed, so the app takes the cancel path', async ({ page }) => {
    await page.setContent(dialogsHtml);

    // Bad: no dialog listener. Playwright auto-dismisses, confirm() returns
    // false, and the test sees "Kept" while you meant to test deletion.
    await page.getByRole('button', { name: 'Delete account' }).click();
    await expect(page.getByRole('status')).toHaveText('Kept');
  });

  test('accept a confirm and check its message', async ({ page }) => {
    await page.setContent(dialogsHtml);

    // Good: page.once handles the next dialog only, so a later surprise
    // dialog still gets the default dismiss instead of a stale accept.
    // Record what the dialog said and answer it. Assert after the click, so a
    // mismatch reports the values instead of leaving the dialog open.
    const seen: string[] = [];
    page.once('dialog', async (dialog) => {
      seen.push(dialog.type(), dialog.message());
      await dialog.accept();
    });
    await page.getByRole('button', { name: 'Delete account' }).click();
    await expect(page.getByRole('status')).toHaveText('Deleted');
    expect(seen).toEqual(['confirm', 'Delete your account?']);
  });

  test('alert has one button: accept or dismiss both close it', async ({ page }) => {
    await page.setContent(dialogsHtml);

    const seen: string[] = [];
    page.once('dialog', async (dialog) => {
      seen.push(dialog.type(), dialog.message());
      await dialog.dismiss();
    });
    await page.getByRole('button', { name: 'Show alert' }).click();
    await expect(page.getByRole('status')).toHaveText('Alerted');
    expect(seen).toEqual(['alert', 'Heads up']);
  });

  test('prompt: accept with text, or dismiss for null', async ({ page }) => {
    await page.setContent(dialogsHtml);

    let defaultValue = '';
    page.once('dialog', async (dialog) => {
      defaultValue = dialog.defaultValue();
      await dialog.accept('Quarterly report');
    });
    await page.getByRole('button', { name: 'Rename' }).click();
    await expect(page.getByRole('status')).toHaveText('Renamed to Quarterly report');
    expect(defaultValue).toBe('Untitled');

    page.once('dialog', (dialog) => dialog.dismiss());
    await page.getByRole('button', { name: 'Rename' }).click();
    await expect(page.getByRole('status')).toHaveText('Cancelled');
  });

  test('page.on answers every dialog for the rest of the test', async ({ page }) => {
    await page.setContent(dialogsHtml);

    // page.on suits a flow that raises several dialogs of the same kind.
    // Record what appeared so the test can assert on it afterwards.
    const seen: string[] = [];
    page.on('dialog', async (dialog) => {
      seen.push(dialog.message());
      await dialog.accept();
    });
    await page.getByRole('button', { name: 'Show alert' }).click();
    await page.getByRole('button', { name: 'Delete account' }).click();
    await expect(page.getByRole('status')).toHaveText('Deleted');
    expect(seen).toEqual(['Heads up', 'Delete your account?']);
  });

  test('beforeunload only fires when you ask close() to run it', async ({ page }) => {
    await page.setContent(`
      <label>Draft <input /></label>
      <script>
        window.addEventListener('beforeunload', (e) => { e.preventDefault(); e.returnValue = ''; });
      </script>
    `);
    // Chromium shows beforeunload only after a user gesture on the page.
    await page.getByLabel('Draft').fill('unsaved');

    const dialog = page.waitForEvent('dialog');
    // page.close() skips beforeunload by default. runBeforeUnload opts in.
    await page.close({ runBeforeUnload: true });
    const prompt = await dialog;
    expect(prompt.type()).toBe('beforeunload');
    await prompt.accept(); // accept = leave the page
    await expect.poll(() => page.isClosed()).toBe(true);
  });
});
