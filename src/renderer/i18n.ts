import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import languages from "@/commons/languages";

let initialized: Promise<typeof i18n> | undefined;

export function initializeI18n() {
  if (initialized !== undefined) {
    return initialized;
  }
  initialized = i18n
    .use(initReactI18next)
    .init({
      resources: Object.fromEntries(
        Object.entries(languages).map(([locale, translation]) => [locale, { translation }]),
      ),
      fallbackLng: "ja",
      lng: "ja",
      interpolation: {
        escapeValue: false,
      },
    })
    .then(() => i18n);
  return initialized;
}
