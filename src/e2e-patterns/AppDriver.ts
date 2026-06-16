import type { APIRequestContext, Page } from '@playwright/test';
import { PersonPage } from './person/PersonPage';
import { DashboardPage } from './dashboard/DashboardPage';
import { loginAs } from './login/flow';

/**
 * High-level entry point for a test. Groups flows under named namespaces
 * (`app.person.open`, `app.auth.loginAs`) so specs read as intent, not setup.
 *
 * ## When to use AppDriver vs fixtures-based POM
 *
 * **AppDriver** fits smaller suites (roughly under 20–30 specs) or teams
 * new to Playwright fixtures. A single namespaced object keeps things
 * discoverable: all flows sit under `app.person.*`, `app.auth.*`, etc.
 * The trade-off is coarser dependency injection — one fixture carries
 * everything, and you lose auto-fixture support.
 *
 * **Fixtures-based** (`fixtures.ts`) scales better for larger suites
 * (50+ specs). Each concern is an independent fixture, so Playwright
 * builds only what each test requests. Auto-fixtures run invisibly
 * without tests requesting them. The trade-off is a steeper learning
 * curve and more wiring in the composition root.
 *
 * Choose AppDriver when you value dead-simple discovery and don't need
 * auto-fixtures. Choose fixtures-based when you need lazy construction,
 * auto-fixtures, and fine-grained dependency partitioning.
 */

/** Person-related flows the driver exposes. */
export interface PersonFlow {
  open(id: string): Promise<PersonPage>;
}

/** Auth-related flows the driver exposes. */
export interface AuthFlow {
  loginAs(username: string, password: string): Promise<DashboardPage>;
}

export class AppDriver {
  constructor(
    readonly page: Page,
    readonly request: APIRequestContext,
    /** Card page the person flow loads. Override per card under test. */
    readonly personUrl: string = '/cards/21',
  ) {}

  get person(): PersonFlow {
    return {
      open: (id: string) => PersonPage.open(this.page, id, this.personUrl),
    };
  }

  get auth(): AuthFlow {
    return {
      loginAs: (username: string, password: string) =>
        loginAs(this.page, username, password),
    };
  }
}
