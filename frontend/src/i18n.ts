import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enCommon from './locales/en/common.json'
import enNotesPage from './locales/en/notes-page.json'
import enSettingsPage from './locales/en/settings-page.json'

const enTranslation = {
  ...enCommon,
  ...enNotesPage,
  ...enSettingsPage,
}

void i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: enTranslation,
    },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export { i18n }
