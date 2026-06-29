import 'i18next';

import type { defaultNS, resources } from './i18n';

// This is the declaration that makes t() key-safe across the app. i18next reads
// CustomTypeOptions to type every t('...') call against the default-language
// resources. A key that is not in the JSON becomes a compile error.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: (typeof resources)['en'];
  }
}
