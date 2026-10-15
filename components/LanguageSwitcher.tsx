
"use client";

import { Languages } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLanguage } from "@/components/LanguageProvider";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();
  const t = useTranslations("language");

  return (
    <button
      type="button"
      onClick={() => setLocale(locale === "en" ? "ar" : "en")}
      aria-label={t("label")}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      <Languages size={18} />

      <span>
        {t("switch")}
      </span>
    </button>
  );
}
