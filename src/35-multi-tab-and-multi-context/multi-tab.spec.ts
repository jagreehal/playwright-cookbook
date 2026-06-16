import { test, expect } from '@playwright/test';
import { makePerson } from '../swapi/builders';

test.describe('35-multi-tab-and-multi-context: Multi-tab, popups, multiple auth roles', () => {
  test('open a new tab via link with target=_blank and switch between tabs', async ({
    page,
    context,
  }) => {
    await page.goto('/cards/01');

    await page.evaluate(() => {
      const link = document.createElement('a');
      link.href = '/cards/01';
      link.target = '_blank';
      link.textContent = 'Open in new tab';
      link.setAttribute('data-testid', 'new-tab-link');
      document.body.appendChild(link);
    });

    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.getByTestId('new-tab-link').click(),
    ]);

    await newPage.waitForLoadState();
    const pages = context.pages();
    expect(pages).toHaveLength(2);

    await expect(page.getByRole('heading', { name: 'Person' })).toBeVisible();
    await expect(newPage.getByRole('heading', { name: 'Person' })).toBeVisible();

    await newPage.close();
    expect(context.pages()).toHaveLength(1);
  });

  test('newPage: create a second tab manually and navigate independently', async ({
    page,
    context,
  }) => {
    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({
        json: makePerson({ name: 'Tab Luke' }),
      }),
    );

    await page.goto('/cards/01');
    await expect(page.getByTestId('person-name')).toHaveText('Tab Luke');

    const secondPage = await context.newPage();
    await secondPage.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({
        json: makePerson({ name: 'Second Tab Leia', height: '150', mass: '55' }),
      }),
    );
    await secondPage.goto('/cards/01');

    await expect(page.getByTestId('person-name')).toHaveText('Tab Luke');
    await expect(secondPage.getByTestId('person-name')).toHaveText('Second Tab Leia');
    await secondPage.close();
  });

  test('multiple contexts: simulate two users with separate auth states', async ({
    browser,
  }) => {
    const adminContext = await browser.newContext();
    const userContext = await browser.newContext();

    const adminPage = await adminContext.newPage();
    await adminPage.goto('/login');
    await adminPage.getByLabel('Username').fill('admin');
    await adminPage.getByLabel('Password').fill('adminpass');
    await Promise.all([
      adminPage.waitForURL(/protected/),
      adminPage.getByRole('button', { name: 'Log in' }).click(),
    ]);
    await expect(adminPage.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(adminPage.getByTestId('dashboard-message')).toContainText('admin');

    const userPage = await userContext.newPage();
    await userPage.goto('/login');
    await userPage.getByLabel('Username').fill('testuser');
    await userPage.getByLabel('Password').fill('password');
    await Promise.all([
      userPage.waitForURL(/protected/),
      userPage.getByRole('button', { name: 'Log in' }).click(),
    ]);
    await expect(userPage.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(userPage.getByTestId('dashboard-message')).toContainText('testuser');

    const adminAuth = await adminPage.evaluate(() => localStorage.getItem('user'));
    const userAuth = await userPage.evaluate(() => localStorage.getItem('user'));
    expect(adminAuth).toBe('admin');
    expect(userAuth).toBe('testuser');

    await adminContext.close();
    await userContext.close();
  });

  test('popup: window.open in the page opens a new page in the same context', async ({
    page,
    context,
  }) => {
    await page.goto('/cards/01');

    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.textContent = 'Open Popup';
      btn.setAttribute('data-testid', 'open-popup-btn');
      btn.addEventListener('click', () => {
        window.open('about:blank', 'popup', 'width=400,height=300');
      });
      document.body.appendChild(btn);
    });

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.getByTestId('open-popup-btn').click(),
    ]);

    expect(context.pages()).toHaveLength(2);
    await popup.close();
    expect(context.pages()).toHaveLength(1);
  });
});
