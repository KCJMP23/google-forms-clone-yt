/**
 * i18n Configuration
 * Multi-language support for HIPAA-compliant survey platform
 * Supports English, Spanish, French, Chinese, Arabic with RTL
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from './locales/en.json';
import esTranslations from './locales/es.json';
import frTranslations from './locales/fr.json';
import zhTranslations from './locales/zh.json';
import arTranslations from './locales/ar.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', rtl: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', rtl: false },
  { code: 'fr', name: 'French', nativeName: 'Français', rtl: false },
  { code: 'zh', name: 'Chinese', nativeName: '中文', rtl: false },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

// Initialize i18n
i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n down to react-i18next
  .init({
    resources: {
      en: { translation: enTranslations },
      es: { translation: esTranslations },
      fr: { translation: frTranslations },
      zh: { translation: zhTranslations },
      ar: { translation: arTranslations },
    },
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

export default i18n;

/**
 * Get current language direction (LTR/RTL)
 */
export function getLanguageDirection(languageCode: string): 'ltr' | 'rtl' {
  const language = SUPPORTED_LANGUAGES.find(lang => lang.code === languageCode);
  return language?.rtl ? 'rtl' : 'ltr';
}

/**
 * Apply RTL styles when needed
 */
export function applyLanguageDirection(languageCode: string): void {
  const direction = getLanguageDirection(languageCode);
  document.documentElement.dir = direction;
  document.documentElement.lang = languageCode;
}
