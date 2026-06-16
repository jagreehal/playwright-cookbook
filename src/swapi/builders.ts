import { faker } from '@faker-js/faker';
import type { SwapiPerson } from './schema';

export function makePerson(overrides: Partial<SwapiPerson> = {}): SwapiPerson {
  return {
    name: faker.person.fullName(),
    height: String(faker.number.int({ min: 120, max: 220 })),
    mass: String(faker.number.int({ min: 40, max: 150 })),
    url: faker.internet.url(),
    films: [],
    ...overrides,
  };
}
