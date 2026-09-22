import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import ar from './locales/ar.json'
import en from './locales/en.json'
import vi from './locales/vi.json'

export const RTL_LANGUAGES = ['ar']

export function applyDocumentDirection(lang: string) {
  const dir = RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr'
  document.documentElement.dir = dir
  document.documentElement.lang = lang

  // index.html can only carry one language, and Vite names the project in it
  // by default — the tab read "frontend" on the live site. Set it here so it
  // follows whichever language the visitor is reading, and so a bookmark is
  // saved under the club's name.
  const t = i18n.getFixedT(lang)
  document.title = `${t('common.clubName')} — ${t('common.clubSubtitle')}`
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: ar },
      en: { translation: en },
      vi: { translation: vi },
    },
    fallbackLng: 'ar',
    supportedLngs: ['ar', 'en', 'vi'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })

applyDocumentDirection(i18n.resolvedLanguage ?? 'ar')
i18n.on('languageChanged', applyDocumentDirection)

export default i18n
