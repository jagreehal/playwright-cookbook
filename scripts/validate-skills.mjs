#!/usr/bin/env node
/**
 * Mechanical gate for the published skill pack.
 *
 * Skills must be executable in any Playwright repo. Cookbook paths, card
 * numbers, and this repo's ports/scripts belong in cards, not in SKILL.md.
 *
 * Usage: node scripts/validate-skills.mjs
 */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillsDir = path.join(root, 'skills');

const COOKBOOK_MARKERS = [
  { name: 'src/NN-* card path', pattern: /src\/\d{2}-/ },
  { name: 'apps/web cookbook path', pattern: /apps\/web/ },
  { name: 'localhost:9321 cookbook port', pattern: /localhost:9321/ },
  { name: 'Card N cookbook reference', pattern: /Card \d+/ },
];

const REQUIRED_DESCRIPTION_CLAUSES = ['Use this skill when', 'Do not use'];

const parseFrontmatter = (source) => {
  if (!source.startsWith('---\n')) {
    return { error: 'missing YAML frontmatter' };
  }
  const end = source.indexOf('\n---\n', 4);
  if (end === -1) {
    return { error: 'unclosed YAML frontmatter' };
  }
  const block = source.slice(4, end);
  const fields = {};
  let currentKey;
  for (const line of block.split('\n')) {
    const match = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (match) {
      currentKey = match[1];
      const raw = match[2].trim();
      fields[currentKey] =
        raw === '>' || raw === '>-' || raw === '|' || raw === '|-'
          ? ''
          : raw.replace(/^['"]|['"]$/g, '');
      continue;
    }
    if (currentKey && /^\s+\S/.test(line)) {
      fields[currentKey] = `${fields[currentKey] ?? ''} ${line.trim()}`.trim();
    }
  }
  return { fields, body: source.slice(end + 5) };
};

const failures = [];

const skillDirs = (await readdir(skillsDir, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && entry.name !== 'scripts')
  .map((entry) => entry.name)
  .sort();

if (skillDirs.length === 0) {
  console.error('validate-skills: no skill directories found');
  process.exit(1);
}

for (const dir of skillDirs) {
  const skillPath = path.join(skillsDir, dir, 'SKILL.md');
  let source;
  try {
    source = await readFile(skillPath, 'utf8');
  } catch {
    failures.push(`${dir}: missing SKILL.md`);
    continue;
  }

  const parsed = parseFrontmatter(source);
  if (parsed.error) {
    failures.push(`${dir}: ${parsed.error}`);
    continue;
  }

  const { fields, body } = parsed;
  if (fields.name !== dir) {
    failures.push(`${dir}: frontmatter name "${fields.name ?? ''}" does not match directory`);
  }

  const description = fields.description ?? '';
  if (description.length === 0) {
    failures.push(`${dir}: empty description`);
  } else if (description.length > 1024) {
    failures.push(`${dir}: description is ${description.length} chars (max 1024)`);
  }

  for (const clause of REQUIRED_DESCRIPTION_CLAUSES) {
    if (!description.includes(clause)) {
      failures.push(`${dir}: description missing "${clause}"`);
    }
  }

  for (const marker of COOKBOOK_MARKERS) {
    if (marker.pattern.test(source)) {
      failures.push(`${dir}: cookbook marker (${marker.name})`);
    }
  }

  for (const heading of ['## Workflow', '## Validation']) {
    if (!body.includes(heading)) {
      failures.push(`${dir}: missing ${heading}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`validate-skills: FAIL (${failures.length})`);
  for (const failure of failures) {
    console.error(`  ${failure}`);
  }
  process.exit(1);
}

console.log(`validate-skills: PASS (${skillDirs.length} skills)`);
