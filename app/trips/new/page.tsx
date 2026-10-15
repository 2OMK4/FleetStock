
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import FleetNavbar from "@/components/FleetNavbar";
import { useLocale, useTranslations } from "next-intl";
import { classifyApiError, getUnitKey } from "@/components/i18n/helpers";

type Item = {
  id: string;
  barcode: string;
  name: string;
  unit: string;
  quantity_on_hand: number;
};

type Vehicle = {
  id: string;
  registration: string;
  name: string;
  type: string;
};

type Trip = {
  id: string;
  vehicle_id: string;
  status: string;
  departed_at: string;
  vehicles: {
    registration: string;
    name: string;
  } | null;
};

type TripLine = {
  barcode: string;
  name: string;
  unit: string;
  quantity: number;
};

export default function NewTripPage() {
  const t = useTranslations("trips");
  const common = useTranslations("common");
  const errors = useTranslations("errors");
  const units = useTranslations("units");
  const locale = useLocale();
  const numberFormat = new Intl.NumberFormat(locale === "ar" ? "ar-OM" : "en-GB", {maximumFractionDigits: 2});
  const dateFormat = new Intl.DateTimeFormat(locale === "ar" ? "ar-OM" : "en-GB", {dateStyle:"medium", timeStyle:"short", timeZone:"Asia/Muscat"});
  function displayUnit(unit: string) {
    const key = getUnitKey(unit);
    return key ? units(key) : unit;
  }
  const [items, setItems] = useState<Item[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);

  const [vehicleId, setVehicleId] = useState("");
  const [barcode, setBarcode] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [lines, setLines] = useState<TripLine[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadData() {
    setLoading(true);

    try {
      const responses = await Promise.all([
        fetch("/api/items", { cache: "no-store" }),
        fetch("/api/vehicles", { cache: "no-store" }),
        fetch("/api/trips", { cache: "no-store" }),
      ]);

      const results = await Promise.all(
        responses.map((response) => response.json())
      );

      for (let i = 0; i < responses.length; i++) {
        if (!responses[i].ok) {
          throw new Error(errors(classifyApiError(results[i].error, "loadTripData")));
        }
      }

      setItems(results[0].items);
      setVehicles(results[1].vehicles);
      setTrips(results[2].trips);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : errors("loadTripData")
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const activeTrips = trips.filter((trip) => trip.status === "out");

  const busyVehicleIds = new Set(
    activeTrips.map((trip) => trip.vehicle_id)
  );

  const foundItem = items.find(
    (item) =>
      item.barcode.toLowerCase() === barcode.trim().toLowerCase()
  );

  function addLine() {
    setError("");
    setSuccess("");

    if (!foundItem) {
      setError(errors("barcodeNotFound"));
      return;
    }

    const amount = Number(quantity);

    if (
      !quantity.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001
    ) {
      setError(errors("positiveQuantity"));
      return;
    }

    if (amount > foundItem.quantity_on_hand) {
      setError(
        errors("notEnoughStock", { amount: numberFormat.format(foundItem.quantity_on_hand), unit: displayUnit(foundItem.unit) })
      );
      return;
    }

    if (
      lines.some(
        (line) =>
          line.barcode.toLowerCase() === foundItem.barcode.toLowerCase()
      )
    ) {
      setError(errors("duplicateTripItem"));
      return;
    }

    setLines([
      ...lines,
      {
        barcode: foundItem.barcode,
        name: foundItem.name,
        unit: foundItem.unit,
        quantity: amount,
      },
    ]);

    setBarcode("");
    setQuantity("1");
  }

  function removeLine(value: string) {
    setLines(lines.filter((line) => line.barcode !== value));
  }

  async function handleStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setError("");
    setSuccess("");

    if (!vehicleId) {
      setError(errors("selectVehicle"));
      return;
    }

    if (lines.length === 0) {
      setError(errors("addTripItem"));
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle_id: vehicleId,
          items: lines.map((line) => ({
            barcode: line.barcode,
            quantity: line.quantity,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(errors(classifyApiError(result.error, "startTrip")));
      }

      setLines([]);
      setVehicleId("");
      setBarcode("");
      setQuantity("1");

      await loadData();

      setSuccess(t("startSuccess", { tripId: result.trip_id }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : errors("startTrip")
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">

  <div className="-mx-6 -mt-6 mb-8">
    <FleetNavbar />
  </div>

  <div className="mx-auto max-w-7xl space-y-6">

        <header>
          <h1 className="text-3xl font-bold">{t("startTitle")}</h1>
          <p className="mt-1 text-slate-500">
            {t("startDescription")}
          </p>
        </header>

        {loading && (
          <p className="text-slate-500">{t("loadingData")}</p>
        )}

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

        <form onSubmit={handleStart} className="space-y-6">

          {/* Vehicle selection */}
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">
              {t("stepSelectVehicle")}
            </h2>

            <select
              required
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full rounded-lg border p-3"
            >
              <option value="">{t("chooseVehicle")}</option>

              {vehicles.map((vehicle) => (
                <option
                  key={vehicle.id}
                  value={vehicle.id}
                  disabled={busyVehicleIds.has(vehicle.id)}
                >
                  {vehicle.name} — {vehicle.registration}
                  {busyVehicleIds.has(vehicle.id) ? ` (${t("onTrip")})` : ""}
                </option>
              ))}
            </select>
          </section>

          {/* Barcode and quantity */}
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">
              {t("stepAddItems")}
            </h2>

            {/* Optional selector uses live inventory data; typing a barcode still works. */}
            <label className="mb-4 block text-sm">
              {t("selectInventoryItem")}
              <select
                value={foundItem?.barcode ?? ""}
                onChange={(e) => {
                  setBarcode(e.target.value);
                  setError("");
                }}
                className="mt-1 w-full rounded-lg border p-3"
              >
                <option value="">{t("chooseInventoryItem")}</option>
                {[...items]
                  .sort((a, b) => a.name.localeCompare(b.name, locale))
                  .map((item) => {
                    const added = lines.some(
                      (line) =>
                        line.barcode.toLowerCase() === item.barcode.toLowerCase()
                    );
                    const unavailable = item.quantity_on_hand <= 0;
                    return (
                      <option
                        key={item.id}
                        value={item.barcode}
                        disabled={added || unavailable}
                      >
                        {item.name} — {item.barcode} — {t("available")}: {numberFormat.format(item.quantity_on_hand)} {displayUnit(item.unit)}
                        {added ? ` (${t("alreadyAdded")})` : ""}
                        {unavailable ? ` (${t("outOfStock")})` : ""}
                      </option>
                    );
                  })}
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block text-sm sm:col-span-2">
                {common("barcode")}
                <input
                  type="text"
                  maxLength={100}
                  placeholder={t("barcodeExample")}
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="mt-1 w-full rounded-lg border p-3"
                />
              </label>

              <label className="block text-sm">
                {common("quantity")}
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="mt-1 w-full rounded-lg border p-3"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={addLine}
              className="mt-4 rounded-lg border border-blue-600 px-5 py-2 font-medium text-blue-600 hover:bg-blue-50"
            >
              {t("addToTrip")}
            </button>
          </section>

          {/* Selected items */}
          <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
            <div className="border-b p-5">
              <h2 className="text-xl font-semibold">
                {t("stepItemsToTake", { count: lines.length })}
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-4">{common("barcodeShort")}</th>
                    <th className="p-4">{common("item")}</th>
                    <th className="p-4">{common("quantity")}</th>
                    <th className="p-4">{common("actions")}</th>
                  </tr>
                </thead>

                <tbody>
                  {lines.map((line) => (
                    <tr key={line.barcode} className="border-t">
                      <td className="p-4 font-mono">{line.barcode}</td>
                      <td className="p-4">{line.name}</td>
                      <td className="p-4">
                        {numberFormat.format(line.quantity)} {displayUnit(line.unit)}
                      </td>
                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() => removeLine(line.barcode)}
                          className="text-red-600 hover:underline"
                        >
                            {common("remove")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {lines.length === 0 && (
                <p className="p-6 text-center text-slate-500">
                  {t("noItems")}
                </p>
              )}
            </div>
          </section>

          <button
            type="submit"
            disabled={saving || loading || lines.length === 0}
            className="w-full rounded-lg bg-blue-600 px-6 py-4 text-lg font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? t("startingTrip") : t("startAndDeduct")}
          </button>
        </form>

        {/* Active trips */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">
              {t("currentlyActive")} ({numberFormat.format(activeTrips.length)})
          </h2>

          {activeTrips.length === 0 ? (
            <p className="text-slate-500">{t("noActive")}</p>
          ) : (
            <div className="space-y-3">
              {activeTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
                >
                  <div>
                    <p className="font-semibold">
                      {trip.vehicles?.name ?? common("vehicle")}
                      {" — "}
                      {trip.vehicles?.registration}
                    </p>
                    <p className="text-sm text-slate-500">
                      {t("departed")}: {dateFormat.format(new Date(trip.departed_at))}
                    </p>
                  </div>

                  <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
                    {t("out")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
