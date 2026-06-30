// This file is the type-safety gate. `pnpm typecheck` (wired into CI) fails if any
// directive below is wrong, so the i18next typing cannot silently rot:
//   - a real key that stops compiling fails the check
//   - a bad key that stops erroring leaves @ts-expect-error "unused", which also
//     fails the check
import i18n from './i18n';

const { t } = i18n;

// Real keys must compile.
t('save');
t('search.label');
t('greeting', { name: 'Jag' });
t('sidebar.home', { ns: 'navigation' });

// Bad keys must error.
// @ts-expect-error - 'doesNotExist' is not a key in the common namespace
t('doesNotExist');
// @ts-expect-error - 'search.nope' is not a key under search
t('search.nope');
// @ts-expect-error - 'sidebar.missing' is not a key in navigation
t('sidebar.missing', { ns: 'navigation' });
