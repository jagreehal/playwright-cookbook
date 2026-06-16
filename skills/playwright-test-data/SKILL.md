---
name: playwright-test-data
description: Use when creating, seeding, and cleaning test data for Playwright suites, especially under parallel execution. Defines deterministic factories, per-worker namespacing, and teardown discipline.
---

# Playwright Test Data

Bad test data strategy is the root of most "fails in CI only" issues. This skill defines deterministic, parallel-safe data patterns.

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

## Quick Quality Checklist

- Every test-created record is uniquely namespaced.
- Worker-scoped fixtures include `testInfo.workerIndex` or `testInfo.parallelIndex`.
- Fixtures create and teardown data in the same scope.
- Failures are reproducible from logged identifiers/seeds.
- No test depends on mutable shared baseline records.
