/**
 * The cookbook's table of contents — single source of truth for the homepage
 * index and card navigation. Add a card here and it appears everywhere.
 */
export interface CardEntry {
  /** Zero-padded card id, matches the route /cards/NN and the src/NN-* dir. */
  num: string;
  title: string;
}

export interface CardPart {
  /** Roman-ish part number shown as "PART 01". */
  part: string;
  title: string;
  /** One-line description of the part's territory. */
  summary: string;
  cards: CardEntry[];
}

export const PARTS: CardPart[] = [
  {
    part: '01',
    title: 'Network Mocking',
    summary: 'Make a test depend only on your code, never the internet.',
    cards: [
      { num: '01', title: 'First Browser Test' },
      { num: '02', title: 'Mock Your First API' },
      { num: '03', title: 'Full Mock Payload' },
      { num: '04', title: 'Mock Only What You Need' },
      { num: '05', title: 'Proxy to a Real API' },
      { num: '06', title: 'Record & Replay Fixtures' },
      { num: '07', title: 'Patch Fixtures for Edge Cases' },
      { num: '08', title: 'Validate with Zod Schemas' },
      { num: '09', title: 'Generate Data with Faker' },
      { num: '10', title: 'Per-Test Overrides' },
    ],
  },
  {
    part: '02',
    title: 'Locators & Structure',
    summary: 'Find elements by what the user sees; keep selectors in one place.',
    cards: [
      { num: '11', title: 'Login Flow' },
      { num: '12', title: 'Locators → Actions → Flows' },
      { num: '13', title: 'Scoped Queries' },
      { num: '14', title: 'Region Objects' },
    ],
  },
  {
    part: '03',
    title: 'Reliability',
    summary: 'Web-first waits, error guards, and screenshots that do not flake.',
    cards: [
      { num: '15', title: 'Done Signals & waitForApi' },
      { num: '16', title: 'Debug Unhandled Requests' },
      { num: '17', title: 'Accessibility with Axe' },
      { num: '18', title: 'Stability Techniques' },
    ],
  },
  {
    part: '04',
    title: 'Architecture, Auth & Data',
    summary: 'Fixtures, storage-state auth, and parallel-safe test data at scale.',
    cards: [
      { num: '19', title: 'Auth Storage State' },
      { num: '20', title: 'API Seeding & Cleanup' },
      { num: '21', title: 'App Driver Fixture' },
      { num: '22', title: 'Failure Artifacts' },
      { num: '23', title: 'API-Only Tests' },
      { num: '24', title: 'Parameterized Tests' },
      { num: '25', title: 'Default Conventions' },
      { num: '26', title: 'Full Architecture' },
    ],
  },
  {
    part: '05',
    title: 'Operations & Advanced',
    summary: 'Visual diffs, tracing, sharded CI, devices, and the long tail.',
    cards: [
      { num: '27', title: 'Visual Regression' },
      { num: '28', title: 'Component Testing' },
      { num: '29', title: 'Trace Viewer' },
      { num: '30', title: 'CI Sharding & Merge Reports' },
      { num: '31', title: 'Network HAR' },
      { num: '32', title: 'Mobile & Emulation' },
      { num: '33', title: 'Worker-Scoped Fixtures' },
      { num: '34', title: 'Retries & Soft Assertions' },
      { num: '35', title: 'Multi-Tab & Multi-Context' },
      { num: '36', title: 'File Uploads & Downloads' },
      { num: '37', title: 'Global Setup & Teardown' },
      { num: '38', title: 'Executable Stories' },
    ],
  },
];

/** Flat, ordered list of every card. */
export const ALL_CARDS: CardEntry[] = PARTS.flatMap((p) => p.cards);

/** Look up a card and its part by number, with prev/next for footer nav. */
export function cardContext(num: string) {
  const part = PARTS.find((p) => p.cards.some((c) => c.num === num));
  const idx = ALL_CARDS.findIndex((c) => c.num === num);
  return {
    part,
    card: ALL_CARDS[idx],
    prev: idx > 0 ? ALL_CARDS[idx - 1] : undefined,
    next: idx < ALL_CARDS.length - 1 ? ALL_CARDS[idx + 1] : undefined,
  };
}
