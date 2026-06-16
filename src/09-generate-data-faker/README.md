# Card 09: Generate Data with Faker Builders

## What This Pattern Solves

Fixtures (Cards 06 and 07) work but need maintenance when APIs change, and hand-written mocks (Card 03) are tedious. Many tests need "a person" with realistic data: names, numbers, and URLs that look real without being recorded. Faker generates that synthetic data, and a builder makes it deterministic and easy to customize.

## How It Works

1. Create a builder function (e.g., `makePerson()`) that uses Faker to generate realistic defaults
2. Seed Faker (`faker.seed(123)`) for deterministic results across test runs
3. Allow overrides for specific test cases: `makePerson({ name: 'Test User' })`
4. Use in route handlers to return synthetic, deterministic mock data
5. Tests are reproducible: the same seed gives the same data every time

This combines the **realism** of recorded data with the **flexibility** of hand-written mocks.

## Code Example

```typescript
import { faker } from '@faker-js/faker';
import type { SwapiPerson } from '../swapi/schema.js';

// Builder lives in src/swapi/builders.ts and is shared across cards.
export function makePerson(overrides: Partial<SwapiPerson> = {}): SwapiPerson {
  return {
    name: faker.person.fullName(),
    height: String(faker.number.int({ min: 120, max: 220 })),
    mass: String(faker.number.int({ min: 40, max: 150 })),
    url: faker.internet.url(),
    films: [],
    ...overrides, // Override specific fields
  };
}

test('seeded builder produces the same person every run', async ({ page }) => {
  faker.seed(123); // Deterministic output

  const person = makePerson({ name: 'Test' });

  await page.route('**/swapi.dev/api/people/1/**', (route) =>
    route.fulfill({ json: person }),
  );

  await page.goto('/cards/09');

  await expect(page.getByTestId('person-name')).toHaveText('Test');
  // For seed 123, the generated height and mass are fixed values.
  await expect(page.getByTestId('person-height')).toHaveText('219');
  await expect(page.getByTestId('person-mass')).toHaveText('116');
});
```

## Run This Example

```bash
pnpm test src/09-generate-data-faker
```

## Prerequisites

- **Card 03**: Understanding full mock payloads
- **Card 07**: Knowing why variations are valuable
- Concepts: Builder pattern, deterministic randomness, Faker.js

## Key Concepts

- **Faker**: Library for generating realistic fake data (names, emails, numbers, URLs)
- **Seeding**: `faker.seed(N)` makes Faker deterministic, so the same seed gives the same output
- **Builder pattern**: Function that creates objects with sensible defaults + overrides
- **Deterministic tests**: Seeding ensures tests pass/fail consistently
- **Realistic data**: Generated data looks like production data (good for visual testing)
- **Parallel worker warning**: `faker.seed()` is process-global state. Under parallel workers, each worker shares the same RNG. Use a unique seed per worker (e.g. `faker.seed(100 + testInfo.workerIndex)`) or use worker-scoped fixtures (Card 33) to isolate state.

## When to Use This Pattern

- When you need many variations of "a person" across tests
- When API responses have 10+ fields that are tedious to write by hand
- For visual regression tests that need realistic-looking data
- When you want tests independent of fixture files
- Skip it when testing against exact production data (use Card 06 fixtures)
- Skip it for tiny objects with two or three fields; write those inline

## Common Mistakes

1. **Forgetting to seed** (non-deterministic tests):
   ```typescript
   // ❌ WRONG - different data every run, flaky tests
   const person = makePerson();

   // ✓ CORRECT - seed for deterministic data
   faker.seed(123);
   const person = makePerson();
   ```

2. **Seeding in wrong place**:
   ```typescript
   // ❌ WRONG - seed inside builder (called multiple times)
   function makePerson() {
     faker.seed(123); // Seeds every call!
     return { name: faker.person.fullName() };
   }

   // ✓ CORRECT - seed once per test/file
   beforeEach(() => faker.seed(123));
   function makePerson() {
     return { name: faker.person.fullName() };
   }
   ```

3. **Not allowing overrides**:
   ```typescript
   // ❌ WRONG - can't customize for specific tests
   function makePerson() {
     return { name: faker.person.fullName(), height: '172' };
   }

   // ✓ CORRECT - accept overrides
   function makePerson(overrides?: Partial<Person>) {
     return {
       name: faker.person.fullName(),
       height: '172',
       ...overrides,
     };
   }
   ```

4. **Overusing Faker** (inappropriate randomness):
   - Don't use Faker for IDs that tests assert on
   - Don't use for enums/constants (use actual valid values)
   - Keep URLs, numbers, names faker-generated

## Flow Diagram

```mermaid
flowchart TB
    Seed[faker.seed 123]
    Builder[makePerson overrides]
    Faker[Faker generates realistic data]
    Merge[Merge defaults + overrides]
    Mock[Mock data object]
    Route[route.fulfill]
    Page[Page renders]
    Test[Test assertions]

    Seed --> Faker
    Faker --> Builder
    Builder --> Merge
    Merge --> Mock
    Mock --> Route
    Route --> Page
    Page --> Test

    Note1[Same seed = same data every run]
    Seed -.-> Note1
```

## Related Patterns

- **Previous**: Card 08 (Zod Validation), combine with schemas to validate generated data
- **Next**: Card 10 (Per-Test Overrides), use builders with the default plus override pattern
- **Alternative**: Card 06 (Record Fixtures), record real data instead of generating it
- **Alternative**: Card 03 (Full Mock), write by hand instead of generating
- **Complementary**: Card 07 (Patch Fixtures), similar override pattern
