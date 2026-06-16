import { test, expect } from '@playwright/test';

test.describe('36-file-uploads-downloads: setInputFiles, waitForEvent(download), clipboard', () => {
  test('upload a single file via input[type=file]', async ({ page }) => {
    await page.goto('/cards/01');

    await page.evaluate(() => {
      const form = document.createElement('form');
      form.innerHTML = `
        <label for="file-upload">Upload file</label>
        <input id="file-upload" type="file" data-testid="file-input" />
        <output data-testid="file-name"></output>
      `;
      document.body.appendChild(form);

      const input = form.querySelector('#file-upload') as HTMLInputElement;
      const output = form.querySelector('[data-testid="file-name"]')!;
      input.addEventListener('change', () => {
        output.textContent = input.files?.[0]?.name ?? 'no file';
      });
    });

    await page.getByTestId('file-input').setInputFiles({
      name: 'test-document.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Hello, Playwright file upload!'),
    });

    await expect(page.getByTestId('file-name')).toHaveText('test-document.txt');
  });

  test('upload multiple files', async ({ page }) => {
    await page.goto('/cards/01');

    await page.evaluate(() => {
      const form = document.createElement('form');
      form.innerHTML = `
        <label for="multi-upload">Upload files</label>
        <input id="multi-upload" type="file" multiple data-testid="multi-file-input" />
        <output data-testid="multi-file-count"></output>
      `;
      document.body.appendChild(form);

      const input = form.querySelector('#multi-upload') as HTMLInputElement;
      const output = form.querySelector('[data-testid="multi-file-count"]')!;
      input.addEventListener('change', () => {
        output.textContent = String(input.files?.length ?? 0);
      });
    });

    await page.getByTestId('multi-file-input').setInputFiles([
      { name: 'file1.txt', mimeType: 'text/plain', buffer: Buffer.from('File 1') },
      { name: 'file2.csv', mimeType: 'text/csv', buffer: Buffer.from('a,b,c') },
    ]);

    await expect(page.getByTestId('multi-file-count')).toHaveText('2');
  });

  test('download a file and verify its content', async ({ page }) => {
    await page.goto('/cards/01');

    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.textContent = 'Download CSV';
      btn.setAttribute('data-testid', 'download-btn');
      btn.addEventListener('click', () => {
        const blob = new Blob(['id,name\n1,Alice\n2,Bob'], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'users.csv';
        a.click();
        URL.revokeObjectURL(url);
      });
      document.body.appendChild(btn);
    });

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('download-btn').click(),
    ]);

    expect(download.suggestedFilename()).toBe('users.csv');
    expect(download.url()).toContain('blob:');

    const tempPath = await download.path();
    expect(tempPath).toBeTruthy();
  });

  test('read clipboard content', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.goto('/cards/01');

    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.textContent = 'Copy';
      btn.setAttribute('data-testid', 'copy-btn');
      btn.addEventListener('click', () => {
        void navigator.clipboard.writeText('Copied from test');
      });
      document.body.appendChild(btn);

      const output = document.createElement('output');
      output.setAttribute('data-testid', 'clipboard-output');
      document.body.appendChild(output);

      document.addEventListener('paste', (e) => {
        const text = e.clipboardData?.getData('text/plain') ?? '';
        output.textContent = text;
      });
    });

    await page.getByTestId('copy-btn').click();

    const clipboardText = await page.evaluate(() =>
      navigator.clipboard.readText(),
    );
    expect(clipboardText).toBe('Copied from test');
  });
});
