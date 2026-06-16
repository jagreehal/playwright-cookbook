#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STATUS=0

has_heading() {
  local pattern="$1"
  local file="$2"
  grep -Eq "$pattern" "$file"
}

check_heading() {
  local file="$1"
  local heading="$2"
  if ! has_heading "^## ${heading}$" "$file"; then
    echo "MISS: $(basename "$(dirname "$file")") -> ## ${heading}"
    STATUS=1
  fi
}

for file in "$ROOT"/playwright-*/SKILL.md; do
  if [[ ! -f "$file" ]]; then
    continue
  fi

  if ! has_heading '^---$' "$file"; then
    echo "MISS: $(basename "$(dirname "$file")") -> frontmatter delimiter"
    STATUS=1
  fi

  check_heading "$file" "Anti-Patterns"
  check_heading "$file" "Cross-References"
  check_heading "$file" "Quick Quality Checklist"
done

if [[ $STATUS -eq 0 ]]; then
  echo "skill-lint: PASS"
else
  echo "skill-lint: FAIL"
fi

exit $STATUS
