"use client";

import Link from "next/link";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import FleetNavbar from "@/components/FleetNavbar";
import { getUnitKey } from "@/components/i18n/helpers";

export type DashboardItem = {
  id: string;
  barcode: string;
  name: string;
  unit: string;
  quantity_on_hand: number;
  low_stock_threshold: number;
};

export type DashboardRecentTrip = {
  id: string;
  status: string;
  departed_at: string;
  vehicle_name: string | null;
  vehicle_registration: string | null;
};

type DashboardProps = {
  items?: DashboardItem[];
  recentTrips?: DashboardRecentTrip[];
  totalVehicles?: number;
  activeTrips?: number;
  completedTrips?: number;
  error?: boolean;
};

function StatCard({
  title,
  value,
  description,
  href,
}: {
  title: string;
  value: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
    >
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{description}</p>
    </Link>
  );
}

export default function DashboardClient({
  items = [],
  recentTrips = [],
  totalVehicles = 0,
  activeTrips = 0,
  completedTrips = 0,
  error = false,
}: DashboardProps) {
  const t = useTranslations("dashboard");
  const common = useTranslations("common");
  const units = useTranslations("units");
  const vehicles = useTranslations("vehicles");
  const trips = useTranslations("trips");
  const inventory = useTranslations("inventory");
  const format = useFormatter();
  const locale = useLocale();
  const arrow = locale === "ar" ? "←" : "→";

  const formatNumber = (value: number) =>
    format.number(value, { maximumFractionDigits: 2 });

  const formatDate = (value: string) =>
    format.dateTime(new Date(value), {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Muscat",
    });

  const unitName = (value: string) => {
    const key = getUnitKey(value);
    return key ? units(key) : value;
  };

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <FleetNavbar />
        <div className="mx-auto max-w-5xl p-8">
          <div className="rounded-xl border bg-white p-6">
            <h1 className="text-2xl font-bold">{t("unavailableTitle")}</h1>
            <p className="mt-2 text-red-600">{t("unavailableDescription")}</p>
            <Link href="/inventory" className="mt-4 inline-block text-blue-600">
              {t("goToInventory")}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const lowStockItems = items.filter(
    (item) => item.quantity_on_hand <= item.low_stock_threshold,
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <FleetNavbar />

      <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        {/* Welcome */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              {t("eyebrow")}
            </p>
            <h1 className="mt-1 text-3xl font-bold">{t("title")}</h1>
            <p className="mt-2 text-slate-500">{t("description")}</p>
          </div>

          <Link
            href="/trips/new"
            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            + {t("newTrip")}
          </Link>
        </div>

        {/* Statistics */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t("inventoryItems")}
            value={formatNumber(items.length)}
            description={t("inventoryDescription")}
            href="/inventory"
          />
          <StatCard
            title={t("registeredVehicles")}
            value={formatNumber(totalVehicles)}
            description={t("vehiclesDescription")}
            href="/vehicles"
          />
          <StatCard
            title={t("activeTrips")}
            value={formatNumber(activeTrips)}
            description={t("activeDescription")}
            href="/trips"
          />
          <StatCard
            title={t("completedTrips")}
            value={formatNumber(completedTrips)}
            description={t("completedDescription")}
            href="/trips"
          />
        </section>

        {/* Alerts */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">{t("lowStockAlerts")}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {t("lowStockDescription")}
              </p>
            </div>
            <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700">
              {t("alertCount", { count: lowStockItems.length })}
            </span>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="mt-5 rounded-lg bg-green-50 p-5 text-green-700">
              {t("noAlerts")}
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-4">{common("barcodeShort")}</th>
                    <th className="p-4">{common("item")}</th>
                    <th className="p-4">{trips("available")}</th>
                    <th className="p-4">{inventory("threshold")}</th>
                    <th className="p-4">{common("status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-4 font-mono" dir="ltr">{item.barcode}</td>
                      <td className="p-4 font-medium">{item.name}</td>
                      <td className="p-4">
                        {formatNumber(item.quantity_on_hand)} {unitName(item.unit)}
                      </td>
                      <td className="p-4">
                        {formatNumber(item.low_stock_threshold)} {unitName(item.unit)}
                      </td>
                      <td className="p-4">
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                          {item.quantity_on_hand === 0
                            ? t("outOfStock")
                            : t("lowStock")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-5">
            <Link href="/inventory" className="text-sm font-semibold text-blue-600 hover:underline">
              {t("viewInventory")} <span aria-hidden="true">{arrow}</span>
            </Link>
          </div>
        </section>

        {/* Recent trips */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">{t("recentTrips")}</h2>
              <p className="mt-1 text-sm text-slate-500">{t("recentDescription")}</p>
            </div>
            <Link href="/trips" className="text-sm font-semibold text-blue-600 hover:underline">
              {t("viewHistory")} <span aria-hidden="true">{arrow}</span>
            </Link>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-4">{common("vehicle")}</th>
                  <th className="p-4">{vehicles("registration")}</th>
                  <th className="p-4">{trips("departed")}</th>
                  <th className="p-4">{common("status")}</th>
                </tr>
              </thead>
              <tbody>
                {recentTrips.map((trip) => (
                  <tr key={trip.id} className="border-t">
                    <td className="p-4 font-medium">
                      {trip.vehicle_name ?? t("unknownVehicle")}
                    </td>
                    <td className="p-4 font-mono" dir="ltr">
                      {trip.vehicle_registration ?? "—"}
                    </td>
                    <td className="p-4">{formatDate(trip.departed_at)}</td>
                    <td className="p-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          trip.status === "out"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {trip.status === "out" ? t("onTrip") : t("completed")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentTrips.length === 0 && (
              <p className="p-6 text-center text-slate-500">{t("noTrips")}</p>
            )}
          </div>
        </section>

        {/* Quick actions */}
        <section>
          <h2 className="mb-4 text-xl font-bold">{t("quickActions")}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Link href="/inventory" className="rounded-xl border bg-white p-5 shadow-sm hover:border-blue-300">
              <h3 className="font-semibold">{t("manageInventory")}</h3>
              <p className="mt-2 text-sm text-slate-500">
                {t("manageInventoryDescription")}
              </p>
            </Link>
            <Link href="/vehicles" className="rounded-xl border bg-white p-5 shadow-sm hover:border-blue-300">
              <h3 className="font-semibold">{t("manageVehicles")}</h3>
              <p className="mt-2 text-sm text-slate-500">
                {t("manageVehiclesDescription")}
              </p>
            </Link>
            <Link href="/trips" className="rounded-xl border bg-white p-5 shadow-sm hover:border-blue-300">
              <h3 className="font-semibold">{t("manageTrips")}</h3>
              <p className="mt-2 text-sm text-slate-500">
                {t("manageTripsDescription")}
              </p>
            </Link>
          </div>
        </section>

        <footer className="border-t py-5 text-center text-sm text-slate-400">
          {t("footer")}
        </footer>
      </div>
    </main>
  );
}
