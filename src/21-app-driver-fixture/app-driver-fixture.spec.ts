import { test as base, expect } from '@playwright/test';
import { AppDriver } from '../e2e-patterns/AppDriver';
import { makePerson } from '../swapi/builders';

const test = base.extend<{ app: AppDriver }>({
  app: async ({ page, request }, use) => {
    await page.route('**/swapi.dev/api/people/1/**', (route) =>
      route.fulfill({
        json: makePerson({
          name: 'Luke Skywalker',
          height: '172',
          mass: '77',
          url: 'https://swapi.dev/api/people/1/',
        }),
      }),
    );
    await use(new AppDriver(page, request));
  },
});

test.describe('21-app-driver-fixture: App driver fixture and test.step', () => {
  test('app.person.open returns PersonPage', async ({ app }) => {
    const personPage = await test.step('Open person 1', async () => {
      return app.person.open('1');
    });

    await personPage.assertLoaded();
    await expect(personPage.name).toHaveText('Luke Skywalker');
  });

  test('test.step wraps flow for report', async ({ app }) => {
    await test.step('Open person and assert name', async () => {
      const personPage = await app.person.open('1');
      await personPage.assertLoaded();
      await expect(personPage.name).toHaveText('Luke Skywalker');
    });
  });

  test('composed fixture: extend AppDriver with test-specific helper', async ({
    app,
  }) => {
    const personPage = await app.person.open('1');

    const verifyPerson = async (expectedName: string) => {
      await expect(personPage.name).toHaveText(expectedName);
    };

    await verifyPerson('Luke Skywalker');
  });

  test('app.auth.loginAs: login and navigate to protected page', async ({
    app,
  }) => {
    const dashboard = await app.auth.loginAs('testuser', 'password');

    await dashboard.assertLoaded();
    await expect(app.page).toHaveURL(/protected/);
    await expect(dashboard.dashboardMessage).toContainText('testuser');
  });

  test('app.auth.loginAs with admin credentials', async ({ app }) => {
    const dashboard = await app.auth.loginAs('admin', 'adminpass');

    await expect(app.page).toHaveURL(/protected/);
    await expect(dashboard.heading).toBeVisible();
    await expect(dashboard.dashboardMessage).toContainText('admin');
  });
});
