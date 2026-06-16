import type { Page } from '@playwright/test';

export function personPageLocators(page: Page) {
  return {
    heading: page.getByRole('heading', { name: 'Person' }),
    name: page.getByTestId('person-name'),
    height: page.getByTestId('person-height'),
    mass: page.getByTestId('person-mass'),
    // Semantic-first: the element has role="alert". (person-name/height/mass
    // stay on getByTestId — they are <dd> elements with no usable role.)
    error: page.getByRole('alert'),
    loading: page.getByText('Loading…'),
    // Semantic-first: the element is <button>Edit</button> with an accessible name.
    editButton: page.getByRole('button', { name: 'Edit' }),
  };
}

export function personCardLocator(page: Page, personId: string) {
  return page.getByTestId(`person-card:${personId}`);
}
