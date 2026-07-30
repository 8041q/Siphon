import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import en from './locales/en.json';
import pt from './locales/pt.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';

const resources = {
  en: { translation: en },
  pt: { translation: pt },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
};

const deviceLanguage = getLocales()[0]?.languageCode ?? 'en';
const supportedLanguages = ['en', 'pt', 'es', 'fr', 'de'];
const lng = supportedLanguages.includes(deviceLanguage) ? deviceLanguage : 'en';

i18n.use(initReactI18next).init({
  resources,
  fallbackLng: 'en',
  lng,
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
