import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './locales/fr.json';
import en from './locales/en.json';
import ar from './locales/ar.json';
import tr from './locales/tr.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import ms from './locales/ms.json';
import ur from './locales/ur.json';
import id from './locales/id.json';
import bn from './locales/bn.json';
import ru from './locales/ru.json';
import pt from './locales/pt.json';
import de from './locales/de.json';
import it from './locales/it.json';
import es from './locales/es.json';

const SUPPORTED_LANGUAGES = ['fr', 'en', 'ar', 'tr', 'ja', 'ko', 'ms', 'ur', 'id', 'bn', 'ru', 'pt', 'de', 'it', 'es'];
const RTL_LANGS = new Set(['ar', 'ur']);

async function detectLangFromIP() {
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 3000);
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    clearTimeout(tid);
    const data = await res.json();
    const lang = data.languages?.split(',')[0]?.split('-')[0];
    if (lang && SUPPORTED_LANGUAGES.includes(lang)) return lang;
  } catch {}
  return 'en';
}

const saved = localStorage.getItem('lang');
const initialLng = (saved && SUPPORTED_LANGUAGES.includes(saved)) ? saved : 'en';

// Apply RTL direction on initial load for saved RTL languages
if (RTL_LANGS.has(initialLng)) {
  document.documentElement.dir = 'rtl';
  document.documentElement.lang = initialLng;
}

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
    ar: { translation: ar },
    tr: { translation: tr },
    ja: { translation: ja },
    ko: { translation: ko },
    ms: { translation: ms },
    ur: { translation: ur },
    id: { translation: id },
    bn: { translation: bn },
    ru: { translation: ru },
    pt: { translation: pt },
    de: { translation: de },
    it: { translation: it },
    es: { translation: es },
  },
  lng: initialLng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

// Auto-detect from IP only if user has never chosen a language manually
if (!saved || !SUPPORTED_LANGUAGES.includes(saved)) {
  detectLangFromIP().then(lang => {
    localStorage.setItem('lang', lang);
    i18n.changeLanguage(lang);
    document.documentElement.dir = RTL_LANGS.has(lang) ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  });
}

export default i18n;
