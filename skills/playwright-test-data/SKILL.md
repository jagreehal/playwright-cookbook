---
name: playwright-test-data
description: >-
  Creates, seeds, and tears down Playwright test data that stays unique under
  parallel workers. Use this skill when adding factories, namespacing records,
  or cleaning up after tests. Do not use for isolation policy
  (playwright-test-isolation) or auth storageState (playwright-auth).
---

# Playwright Test Data

Bad test data strategy is the root of most "fails in CI only" issues. This skill defines deterministic, parallel-safe data patterns.

## Critical rules

- Every mutable entity tests create is uniquely namespaced.
- Fixtures create and teardown data in the same scope.
- Log identifiers/seeds so a failure is reproducible.

## Workflow

1. Doctor the consuming repo: find how data is seeded today (API, UI, SQL) and whether workers collide on emails or slugs.
2. Add factories keyed by `workerIndex` or a unique suffix. Teardown in the same fixture.
3. Validate with `npx playwright test` using more than one worker.

## Non-Negotiables

1. Every mutable entity created by tests must be uniquely namespaced.
2. Worker-scoped shared data must use `testInfo.workerIndex` or `testInfo.parallelIndex`.
3. Data creation and cleanup belong in fixtures, not `beforeAll`/`afterAll`.
4. Random data is allowed only when seedable or logged for replay.
5. Tests must not depend on pre-existing production-like shared records.

## Factory Pattern

```ts
type UserInput = { role?: 'admin' | 'member' };

type TestUser = { email: string; password: string; id?: string };

export function buildUser(input: UserInput, runId: string, laneIndex: number): TestUser {
  const role = input.role ?? 'member';
  return {
    email: `${role}-${runId}-lane${laneIndex}@test.dev`,
    password: 'pw-Strong-1234',
  };
}
```

## Fixture Pattern (Create + Teardown)

```ts
import { test as base } from '@playwright/test';

type Fixtures = { testUser: { id: string; email: string; password: string } };

export const test = base.extend<Fixtures>({
  testUser: async ({}, use, testInfo) => {
    const runId = process.env.CI_PIPELINE_ID ?? Date.now().toString();
    const email = `user-${runId}-w${testInfo.workerIndex}@test.dev`;

    const created = await api.createUser({ email, password: 'pw-Strong-1234' });
    await use(created);
    await api.deleteUser(created.id);
  },
});
```

## Determinism Rules

- Freeze time for time-sensitive tests when possible.
- Seed pseudo-random generators and log seed in CI output.
- Prefer explicit IDs from mocks when testing UI flows.
- Use `parallelIndex` rather than `workerIndex` when reusing pre-created accounts or cached state after a worker restart.

## Anti-Patterns

- Static email like `user@test.dev` shared across workers.
- Global records created once and mutated by many tests.
- Cleanup only in `afterAll`, causing cross-test leakage mid-run.
- Test data generated inside specs with ad-hoc helpers.

## Cross-References

- Isolation policy: `playwright-test-isolation`
- Fixture design: `playwright-fixtures`
- Auth bootstrap data: `playwright-auth`
- CI sharding interactions: `playwright-ci`

## Validation

- Run `npx playwright test` with more than one worker. Expect a pass.
- Every test-created record is uniquely namespaced and torn down in the same fixture.
