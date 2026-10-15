
"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import FleetNavbar from "@/components/FleetNavbar";
import { useLocale, useTranslations } from "next-intl";
import { classifyApiError, getUnitKey } from "@/components/i18n/helpers";

type TripItem = {
  id: string;
  item_id: string;
  barcode_snapshot: string;
  name_snapshot: string;
  unit_snapshot: string;
  taken_quantity: number;
  returned_quantity: number;
  used_quantity: number;
};

type Trip = {
  id: string;
  vehicle_id: string;
  status: "out" | "returned";
  departed_at: string;
  returned_at: string | null;
  vehicles: {
    registration: string;
    name: string;
    type: string;
  } | null;
  trip_items: TripItem[];
};

function useTripFormatting() {
  const locale = useLocale();
  const units = useTranslations("units");
  const numberFormatter = new Intl.NumberFormat(locale === "ar" ? "ar-OM" : "en-GB", {maximumFractionDigits: 2});
  const dateFormatter = new Intl.DateTimeFormat(locale === "ar" ? "ar-OM" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Muscat" });
  return {
    formatNumber: (value: number) => numberFormatter.format(Number(value)),
    formatDate: (value: string | null) => value ? dateFormatter.format(new Date(value)) : "—",
    displayUnit: (unit: string) => { const key = getUnitKey(unit); return key ? units(key) : unit; },
  };
}

// Form for returning one active trip.
function ReturnTripForm({
  trip,
  onReturned,
}: {
  trip: Trip;
  onReturned: () => Promise<void>;
}) {
  const t = useTranslations("trips");
  const common = useTranslations("common");
  const errors = useTranslations("errors");
  const { formatNumber, displayUnit } = useTripFormatting();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setError("");

    try {
      const returns = trip.trip_items.map((item) => {
        const raw = values[item.id]?.trim() ?? "";
        const quantity = Number(raw);

        if (
          raw === "" ||
          !Number.isFinite(quantity) ||
          quantity < 0 ||
          quantity > Number(item.taken_quantity) ||
          Math.abs(quantity * 100 - Math.round(quantity * 100)) >
            0.000001
        ) {
          throw new Error(
            errors("invalidReturnedQuantity", { name: item.name_snapshot })
          );
        }

        return {
          trip_item_id: item.id,
          returned_quantity: quantity,
        };
      });

      setSaving(true);

      const response = await fetch(
        `/api/trips/${trip.id}/return`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ returns }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(errors(classifyApiError(result.error, "returnTrip")));
      }

      await onReturned();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : errors("returnTrip")
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleReturn} className="mt-5 space-y-4">
      <h3 className="font-semibold">{t("recordReturned")}</h3>

      <p className="text-sm text-slate-500">
        {t("returnInstructions")}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3">{common("item")}</th>
              <th className="p-3">{t("taken")}</th>
              <th className="p-3">{t("returned")}</th>
              <th className="p-3">{t("used")}</th>
            </tr>
          </thead>

          <tbody>
            {trip.trip_items.map((item) => {
              const raw = values[item.id] ?? "";
              const quantity = Number(raw);
              const valid =
                raw.trim() !== "" &&
                Number.isFinite(quantity) &&
                quantity >= 0 &&
                quantity <= Number(item.taken_quantity);

              return (
                <tr key={item.id} className="border-t">
                  <td className="p-3">
                    <p className="font-medium">
                      {item.name_snapshot}
                    </p>
                    <p className="font-mono text-xs text-slate-500">
                      {item.barcode_snapshot}
                    </p>
                  </td>

                  <td className="p-3">
                    {formatNumber(item.taken_quantity)}{" "}
                    {displayUnit(item.unit_snapshot)}
                  </td>

                  <td className="p-3">
                    <input
                      required
                      type="number"
                      min="0"
                      max={item.taken_quantity}
                      step="0.01"
                      aria-label={t("returnedQuantityFor", {name: item.name_snapshot})}
                      value={raw}
                      onChange={(e) =>
                        setValues((previous) => ({
                          ...previous,
                          [item.id]: e.target.value,
                        }))
                      }
                      placeholder="0"
                      className="w-28 rounded-lg border p-2"
                    />
                  </td>

                  <td className="p-3 font-semibold text-blue-700">
                    {valid
                      ? `${formatNumber(
                          Number(item.taken_quantity) - quantity
                        )} ${displayUnit(item.unit_snapshot)}`
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-green-600 px-5 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {saving ? t("processingReturn") : t("completeReturn")}
      </button>
    </form>
  );
}

export default function TripsPage() {
  const t = useTranslations("trips");
  const common = useTranslations("common");
  const errors = useTranslations("errors");
  const { formatNumber, formatDate, displayUnit } = useTripFormatting();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadTrips = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/trips", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(errors(classifyApiError(result.error, "loadTrips")));
      }

      setTrips(result.trips);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : errors("loadTrips")
      );
    } finally {
      setLoading(false);
    }
  }, [errors]);

  useEffect(() => {
    void loadTrips();
  }, [loadTrips]);

  const activeTrips = trips.filter((trip) => trip.status === "out");
  const completedTrips = trips.filter(
    (trip) => trip.status === "returned"
  );

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">

  <div className="-mx-6 -mt-6 mb-8">
    <FleetNavbar />
  </div>

  <div className="mx-auto max-w-7xl space-y-6">

        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              {t("title")}
            </h1>
            <p className="mt-1 text-slate-500">
              {t("description")}
            </p>
          </div>

          <Link
            href="/trips/new"
            className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
          >
            {t("newTrip")}
          </Link>
        </header>

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
            {success}
          </div>
        )}

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-slate-500">{t("totalTrips")}</p>
            <p className="mt-2 text-3xl font-bold">
              {trips.length}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-slate-500">{t("currentlyOut")}</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">
              {activeTrips.length}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-slate-500">{t("completedTrips")}</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {completedTrips.length}
            </p>
          </div>
        </div>

        {loading && (
          <p className="text-slate-500">{t("loadingTrips")}</p>
        )}

        {/* Active Trips */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">
            {t("activeTrips")} ({formatNumber(activeTrips.length)})
          </h2>

          {!loading && activeTrips.length === 0 && (
            <div className="rounded-xl border bg-white p-6 text-slate-500">
              {t("noActive")}
            </div>
          )}

          {activeTrips.map((trip) => (
            <div
              key={trip.id}
              className="rounded-xl border bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">
                    {trip.vehicles?.name ?? common("vehicle")}
                    {" — "}
                    {trip.vehicles?.registration}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {t("departed")}: {formatDate(trip.departed_at)}
                  </p>
                </div>

                <span className="h-fit rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
                  {t("out")}
                </span>
              </div>

              <ReturnTripForm
                trip={trip}
                onReturned={async () => {
                  setSuccess(t("returnSuccess"));
                  await loadTrips();
                }}
              />
            </div>
          ))}
        </section>

        {/* Completed Trip History */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">
            {t("history")} ({formatNumber(completedTrips.length)})
          </h2>

          {!loading && completedTrips.length === 0 && (
            <div className="rounded-xl border bg-white p-6 text-slate-500">
              {t("noHistory")}
            </div>
          )}

          {completedTrips.map((trip) => (
            <div
              key={trip.id}
              className="overflow-hidden rounded-xl border bg-white shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <h3 className="font-semibold">
                    {trip.vehicles?.name ?? common("vehicle")}
                    {" — "}
                    {trip.vehicles?.registration}
                  </h3>

                  <p className="text-sm text-slate-500">
                    {t("departed")}: {formatDate(trip.departed_at)}
                  </p>

                  <p className="text-sm text-slate-500">
                    {t("returnDate")}: {formatDate(trip.returned_at)}
                  </p>
                </div>

                <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                  {t("completed")}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-4">{common("barcodeShort")}</th>
                      <th className="p-4">{common("item")}</th>
                      <th className="p-4">{t("taken")}</th>
                      <th className="p-4">{t("returned")}</th>
                      <th className="p-4">{t("used")}</th>
                    </tr>
                  </thead>

                  <tbody>
                    {trip.trip_items.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="p-4 font-mono">
                          {item.barcode_snapshot}
                        </td>

                        <td className="p-4">
                          {item.name_snapshot}
                        </td>

                        <td className="p-4">
                          {formatNumber(item.taken_quantity)}{" "}
                          {displayUnit(item.unit_snapshot)}
                        </td>

                        <td className="p-4">
                          {formatNumber(item.returned_quantity)}{" "}
                          {displayUnit(item.unit_snapshot)}
                        </td>

                        <td className="p-4 font-semibold text-blue-700">
                          {formatNumber(item.used_quantity)}{" "}
                          {displayUnit(item.unit_snapshot)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
