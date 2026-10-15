
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogoutButton } from "@/components/logout-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const navigation = [
  { key: "dashboard", href: "/" },
  { key: "inventory", href: "/inventory" },
  { key: "vehicles", href: "/vehicles" },
  { key: "trips", href: "/trips" },
  { key: "startTrip", href: "/trips/new" },
] as const;

export default function FleetNavbar() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">

        <Link
          href="/"
          className="text-2xl font-bold text-blue-600 dark:text-blue-400"
        >
          FleetStock
        </Link>

        <div className="flex flex-wrap items-center gap-5">

          <nav className="flex flex-wrap items-center gap-5 text-sm font-medium">
            {navigation.map((link) => {
              const active = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`transition-colors ${
                    active
                      ? "font-semibold text-blue-600 dark:text-blue-400"
                      : "text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
                  }`}
                >
                  {t(link.key)}
                </Link>
              );
            })}
          </nav>
          
          <div className="flex items-center gap-2 border-slate-200 dark:border-slate-700">
              <LanguageSwitcher />
              <ThemeSwitcher />
              <LogoutButton />
          </div>


        </div>
      </div>
    </header>
  );
}
