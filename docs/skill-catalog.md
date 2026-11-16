# Skill catalog contract

This is for people who edit skills in this repo. The published pack is [`skills/`](../skills/); consumers install it with `npx skills add jagreehal/playwright-cookbook` and never clone this cookbook.

Cookbook **cards** (`src/NN-*`) are the human workshop. Skills are the portable agent pack. Cards may name a skill. Skills never require a card.

Skills serve people writing tests with Playwright. Workflows for developing Playwright itself stay out. Port the idea only when it works in any test repo, and check each API against the installed version first.

## Standalone

An agent in someone else's Playwright repo must be able to execute the skill as written.

- No `src/NN-*`, `apps/web`, Card numbers, `localhost:9321`, or this repo's `pnpm` scripts.
- Examples use a generic `e2e/` layout.
- Commands are `npx playwright test`, or "the project's test script". Discover `testDir`, package manager, and `playwright.config.*` from the consuming repo.
- Cross-skill refs are skill names only (`playwright-fixtures`), never paths to another `SKILL.md`.
- This cookbook may appear once in [`skills/README.md`](../skills/README.md) as an optional worked example, not inside skill bodies.

## Frontmatter

```yaml
name: playwright-example   # lowercase kebab-case, matches the directory, ≤64 chars
description: >
  Third-person capability. Use this skill when [triggers]. Do not use when/for [near misses].
```

- Description ≤1024 characters.
- Near misses name the adjacent skill.
- All activation guidance lives in `description`. The body loads only after activation.

## Body

Keep the main file around 150 lines. Move bulky tables and rare branches to `references/` (one level deep). Required sections:

1. **Critical rules** — constraints, sequencing, safety. First thing after the title.
2. **Workflow** — numbered. Step 1 is always *doctor the consuming repo*: find Playwright config, existing `test`/`fixtures` import, package manager. Adapt; do not invent a parallel tree.
3. Domain sections as needed (examples, anti-patterns, resources).
4. **Validation** — prove in *that* repo. Run the focused test, expect a pass, capture the command and result. Do not tell the agent to clone this cookbook.
5. **Constraints** or anti-patterns that change execution.
6. Skill-specific checklist only. The shared quality bar lives in `playwright-architecture`.

Write for the next agent, cold, mid-task. Map launch/doctor/drive/evidence/cleanup onto Playwright work: start from their config, health-check (Playwright installed, config parses), apply the pattern to their files, run their tests as evidence, do not leave extra browsers or servers.

## Gate

```bash
pnpm validate:skills
```

Fails if any `skills/*/SKILL.md` contains cookbook path markers or a description missing `Use this skill when` / `Do not use`.
