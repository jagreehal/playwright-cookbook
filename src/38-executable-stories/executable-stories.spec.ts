import { test, expect } from '@playwright/test';
import { story } from 'executable-stories-playwright';

// This cookbook wires the executable-stories reporter in playwright.config.ts,
// so it runs on every `pnpm test`. A spec only appears in the generated docs
// once it calls story.init. This card adds that call plus given/when/then
// markers to a normal Playwright test, and the run writes a BDD-style HTML
// report to docs/user-stories.html. Same test(), same assertions.

// Record a video for every test in this file. The cookbook config keeps video
// only on failure, so override it here to capture a walkthrough on success too.
// The reporter collects Playwright's video and screenshot attachments on its
// own, copies them into the report output, and dedupes them — so the report is
// portable without any manual file handling, and without story.video() /
// story.screenshot() calls that would render the same media twice.
test.use({ video: 'on' });

test.describe('38-executable-stories: BDD markers that generate living docs', () => {
  test('a registered user logs in and reaches the dashboard', async ({
    page,
  }, testInfo) => {
    // testInfo is the second argument of Playwright's callback. story.init reads
    // it to link this scenario to the test. tags become labels in the report.
    story.init(testInfo, { tags: ['e2e', 'auth'] });

    // Marker-only style: name the step, then write the Playwright code under it.
    story.given('a registered user on the login page');
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();

    story.when('they submit valid credentials');
    await page.getByLabel('Username').fill('testuser');
    await page.getByLabel('Password').fill('password');
    await Promise.all([
      page.waitForURL(/protected/),
      page.getByRole('button', { name: 'Log in' }).click(),
    ]);

    story.then('the dashboard greets them by name');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByTestId('dashboard-message')).toContainText('testuser');

    // Attach the screenshot as a Playwright attachment. The reporter persists it
    // into the report (base64-inlined for small files) and shows it once.
    await testInfo.attach('dashboard', {
      body: await page.screenshot(),
      contentType: 'image/png',
    });

    story.note(
      'Card 11 makes the same assertions. story.init and the markers are the only additions.',
    );
  });

  test('a wrong password is rejected with an error', async ({
    page,
  }, testInfo) => {
    story.init(testInfo, { tags: ['e2e', 'auth', 'negative'] });

    story.given('a registered user on the login page');
    await page.goto('/login');

    story.when('they submit a wrong password');
    await page.getByLabel('Username').fill('testuser');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Log in' }).click();

    story.then('they stay on the login page and see an error');
    await expect(page).toHaveURL(/login/);
    await expect(page.getByTestId('login-error')).toContainText(/invalid/i);

    await testInfo.attach('login-error', {
      body: await page.screenshot(),
      contentType: 'image/png',
    });

    story.json({
      label: 'Submitted credentials',
      value: { username: 'testuser', password: '***' },
    });
  });
});
