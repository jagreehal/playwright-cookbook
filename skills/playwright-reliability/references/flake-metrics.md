# Measuring Flakiness Across Runs

Two signals, and the second matters more:

- **Within a run:** a retry rescued the test. Playwright reports this as `flaky`.
- **Across runs:** the final verdict flips between runs, green in some and red in others. A retry never shows this, and it is what makes a red build ambiguous.

Three rules keep the numbers honest:

- Identify a test by project, file, and full title. The same title in two projects is two tests.
- Take the last attempt's status as the verdict. One row per retry inflates failure counts.
- Drop tests whose expected status is not `passed`. A `test.fail()` test records `failed` on purpose and would top every list.

Write a JSON report per CI run with `PLAYWRIGHT_JSON_OUTPUT_NAME=results.json npx playwright test --reporter=json`, then flatten it:

```js
import { readFileSync } from 'node:fs';

const rows = (suite, path = []) => [
  ...(suite.specs ?? []).flatMap((spec) =>
    spec.tests.map((test) => ({
      id: [test.projectName, spec.file, ...path, spec.title].join(' › '),
      expected: test.expectedStatus,
      verdict: test.results.at(-1).status,
      rescued: test.status === 'flaky',
    })),
  ),
  ...(suite.suites ?? []).flatMap((child) =>
    rows(child, child.file === child.title ? path : [...path, child.title]),
  ),
];

const report = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const results = report.suites.flatMap((suite) => rows(suite));
console.table(results.filter((r) => r.expected === 'passed'));
```

Store those rows per run. Rank by `min(failedRuns, passedRuns)`: that puts tests that truly flip above tests that always fail and tests that failed once.
