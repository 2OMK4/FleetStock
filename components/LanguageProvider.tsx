
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { NextIntlClientProvider } from "next-intl";

import {
  defaultLocale,
  getDirection,
  isLocale,
  messages,
  type Locale,
} from "@/components/i18n/config";

type LanguageContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const LanguageContext = createContext<LanguageContextType | null>(
  null
);

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error(
      "useLanguage must be used inside LanguageProvider"
    );
  }

  return context;
}

export default function LanguageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [ready, setReady] = useState(false);

  // Load the saved preference after hydration.
  useEffect(() => {
    const saved = localStorage.getItem("fleetstock-language");

    if (isLocale(saved)) {
      setLocale(saved);
    }

    setReady(true);
  }, []);

  // Update direction, language, and saved preference.
  useEffect(() => {
    if (!ready) return;

    document.documentElement.lang = locale;
    document.documentElement.dir = getDirection(locale);

    localStorage.setItem("fleetstock-language", locale);
  }, [locale, ready]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider
        locale={locale}
        messages={messages[locale]}
        timeZone="Asia/Muscat"
      >
        {children}
      </NextIntlClientProvider>
    </LanguageContext.Provider>
  );
}
