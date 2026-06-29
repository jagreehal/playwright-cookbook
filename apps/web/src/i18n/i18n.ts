import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Static JSON imports are what make the setup type-safe: TypeScript sees the
// shape of the default-language namespaces at build time, and i18next.d.ts feeds
// that shape into CustomTypeOptions so t() keys are checked.
import common from './locales/en/common.json';
import navigation from './locales/en/navigation.json';
import frCommon from './locales/fr/common.json';
import frNavigation from './locales/fr/navigation.json';

export const defaultNS = 'common';

export const resources = {
  en: { common, navigation },
  fr: { common: frCommon, navigation: frNavigation },
} as const;

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  ns: ['common', 'navigation'],
  defaultNS,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default i18n;
