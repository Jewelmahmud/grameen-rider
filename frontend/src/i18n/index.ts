import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en';
import bn from './bn';

const LANG_KEY = 'gr.lang';

export const storedLanguage = (): 'bn' | 'en' => {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return v === 'en' ? 'en' : 'bn';
  } catch {
    return 'bn';
  }
};

export const setLanguage = (lang: 'bn' | 'en') => {
  void i18n.changeLanguage(lang);
  document.documentElement.lang = lang;
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* ignore */
  }
};

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, bn: { translation: bn } },
  lng: storedLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});
document.documentElement.lang = storedLanguage();

/** Label for a vehicle type, falling back to the raw key for types an admin added. */
export const vehicleLabel = (_t: unknown, type: string): string =>
  i18n.t(`vehicle.${type}`, { defaultValue: type.replace(/_/g, ' ') });

export default i18n;
