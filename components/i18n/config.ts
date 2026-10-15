
import en from "./messages/en.json";
import ar from "./messages/ar.json";

export const locales = ["en", "ar"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const messages = {
  en,
  ar,
};

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "ar";
}

export function getDirection(locale: Locale) {
  return locale === "ar" ? "rtl" : "ltr";
}
