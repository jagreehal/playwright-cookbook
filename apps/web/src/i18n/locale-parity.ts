import enCommon from './locales/en/common.json' with { type: 'json' };
import enNavigation from './locales/en/navigation.json' with { type: 'json' };
import frCommon from './locales/fr/common.json' with { type: 'json' };
import frNavigation from './locales/fr/navigation.json' with { type: 'json' };

function collectLeafPaths(
  value: unknown,
  prefix = '',
): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }

  const paths: string[] = [];
  for (const [key, nested] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (nested !== null && typeof nested === 'object' && !Array.isArray(nested)) {
      paths.push(...collectLeafPaths(nested, path));
    } else {
      paths.push(path);
    }
  }
  return paths;
}

function assertLocaleParity(
  namespace: string,
  base: unknown,
  other: unknown,
): void {
  const baseKeys = collectLeafPaths(base).sort();
  const otherKeys = collectLeafPaths(other).sort();

  const missingInOther = baseKeys.filter((key) => !otherKeys.includes(key));
  const extraInOther = otherKeys.filter((key) => !baseKeys.includes(key));

  if (missingInOther.length === 0 && extraInOther.length === 0) {
    return;
  }

  const lines = [`Locale key mismatch in "${namespace}":`];
  if (missingInOther.length > 0) {
    lines.push(`  missing in fr: ${missingInOther.join(', ')}`);
  }
  if (extraInOther.length > 0) {
    lines.push(`  extra in fr: ${extraInOther.join(', ')}`);
  }
  throw new Error(lines.join('\n'));
}

assertLocaleParity('common', enCommon, frCommon);
assertLocaleParity('navigation', enNavigation, frNavigation);
