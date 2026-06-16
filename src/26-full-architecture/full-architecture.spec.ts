/**
 * Card 26: Full Architecture example for large-scale Playwright suites.
 *
 * Every pattern from cards 01-25 composed into a single fixture file.
 *
 * What's demonstrated:
 *  - Spec imports test/expect from fixtures.ts, never from @playwright/test.
 *  - Spec never sets up routing or navigation: no `page.route`, no `page.goto`.
 *  - personPage fixture delivers a pre-loaded, pre-mocked PersonPage.
 *  - disableAnimations auto-fixture runs for every test without being requested.
 *  - capturePageErrors auto-fixture silently collects console/page errors.
 *  - loginAsDefaultUser flow fixture is a closure: call it, don't import it.
 *  - toast component fixture is lazy: only built when a test requests it.
 *  - personPage.openEditDialog() returns a container-rooted Modal: the page
 *    object owns the dialog locator and the construction, the spec just drives it.
 */

import { test, expect } from '../e2e-patterns/fixtures';

test.describe('26-full-architecture: Fixture composition for 1000-test suites', () => {
  test('page fixture delivers pre-loaded and pre-mocked PersonPage', async ({
    personPage,
  }) => {
    // No page.route(), no page.goto(), no construction: the fixture did it all.
    await personPage.assertLoaded();

    // Auto-fixture disableAnimations already ran, so no janky CSS transitions.
    // Auto-fixture capturePageErrors is silently watching for console errors.
  });

  test('edit flow: page object exposes a container-rooted Modal + toast component', async ({
    personPage,
    toast,
  }) => {
    // The page object owns the dialog locator and the container-rooted Modal.
    // The spec never sees `new Modal(...)` or knows how the dialog is rooted.
    // It asks for the modal and drives it. One injected fixture, full
    // autocomplete, the selector lives in exactly one place.
    const modal = await personPage.openEditDialog();

    await expect(modal.nameInput).toBeVisible();
    await modal.fillName('Architecture Leia');
    await modal.confirm();

    // Component fixture: toast is provided by the fixture, not constructed here.
    await toast.expectSuccess(/saved/i);
    await expect(personPage.name).toHaveText('Architecture Leia');
  });

  test('login flow as callable fixture: call it, do not import it', async ({
    page,
    loginAsDefaultUser,
  }) => {
    const dashboardPage = await loginAsDefaultUser();

    await expect(page).toHaveURL(/protected/);
    // Assert through the page object the flow returned, not raw locators.
    await expect(dashboardPage.heading).toBeVisible();
    await expect(dashboardPage.dashboardMessage).toContainText('testuser');
  });
});
