
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import ItemActions from "@/components/inventory/ItemActions";
import FleetNavbar from "@/components/FleetNavbar";
import { useLocale, useTranslations } from "next-intl";
import { classifyApiError, getUnitKey } from "@/components/i18n/helpers";

type Item = {
  id: string;
  barcode: string;
  name: string;
  unit: string;
  quantity_on_hand: number;
  low_stock_threshold: number;
};

const initialForm = {
  barcode: "",
  name: "",
  unit: "piece",
  quantity_on_hand: "0",
  low_stock_threshold: "5",
};

export default function InventoryPage() {
  const t = useTranslations("inventory");
  const common = useTranslations("common");
  const units = useTranslations("units");
  const errors = useTranslations("errors");
  const locale = useLocale();
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load inventory through our backend API.
  const loadItems = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/items", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(errors(classifyApiError(result.error, "loadInventory")));
      }

      setItems(result.items);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : errors("generic")
      );
    } finally {
      setLoading(false);
    }
  }, [errors]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  // Add a new item.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: form.barcode,
          name: form.name,
          unit: form.unit,
          quantity_on_hand: Number(form.quantity_on_hand),
          low_stock_threshold: Number(form.low_stock_threshold),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(errors(classifyApiError(result.error, "createItem")));
      }

      setForm(initialForm);
      setShowForm(false);
      await loadItems();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : errors("generic")
      );
    } finally {
      setSaving(false);
    }
  }

  // Filter items by name or barcode.
  const filteredItems = items.filter((item) =>
    `${item.name} ${item.barcode}`
      .toLowerCase()
      .includes(search.toLowerCase().trim())
  );

  const lowStockCount = items.filter(
    (item) => item.quantity_on_hand <= item.low_stock_threshold
  ).length;

  function formatQuantity(value: number) {
    return Number(value).toLocaleString(locale === "ar" ? "ar-OM" : "en-GB", {
      maximumFractionDigits: 2,
    });
  }

  function displayUnit(unit: string) {
    const key = getUnitKey(unit);
    return key ? units(key) : unit;
  }

  return (
  <main className="min-h-screen bg-slate-50 p-6 text-slate-900">

    <div className="-mx-6 -mt-6 mb-8">
      <FleetNavbar />
    </div>

    <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t("title")}</h1>
            <p className="mt-1 text-slate-500">
              {t("description")}
            </p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
          >
            {showForm ? common("cancel") : `+ ${t("addItem")}`}
          </button>
        </header>

        {/* Dashboard stats */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{t("totalItems")}</p>
            <p className="mt-2 text-3xl font-bold">{items.length}</p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{t("lowStockItems")}</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">
              {lowStockCount}
            </p>
          </div>
        </div>

        {/* Error messages */}
        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Add Item Form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-xl border bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-semibold">{t("newItem")}</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <input
                required
                maxLength={100}
                placeholder={common("barcode")}
                value={form.barcode}
                onChange={(e) =>
                  setForm({ ...form, barcode: e.target.value })
                }
                className="rounded-lg border p-3"
              />

              <input
                required
                maxLength={150}
                placeholder={t("itemName")}
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                className="rounded-lg border p-3"
              />

              <div>
                <label className="mb-1 block text-sm">{common("unit")}</label>
                <select
                  value={form.unit}
                  onChange={(e) =>
                    setForm({ ...form, unit: e.target.value })
                  }
                  className="w-full rounded-lg border p-3"
                >
                  <option value="piece">{units("piece")}</option>
                  <option value="meter">{units("meter")}</option>
                  <option value="pair">{units("pair")}</option>
                  <option value="box">{units("box")}</option>
                  <option value="kg">{units("kg")}</option>
                  <option value="liter">{units("liter")}</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm">
                  {t("quantityOnHand")}
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.quantity_on_hand}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      quantity_on_hand: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm">
                  {t("threshold")}
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.low_stock_threshold}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      low_stock_threshold: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border p-3"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? common("saving") : t("saveItem")}
            </button>
          </form>
        )}

        {/* Inventory Table */}
        <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b p-5">
            <h2 className="text-xl font-semibold">{t("stockItems")}</h2>

            <input
              type="search"
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border p-3 sm:w-72"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="p-4">{common("barcodeShort")}</th>
                  <th className="p-4">{t("itemName")}</th>
                  <th className="p-4">{common("unit")}</th>
                  <th className="p-4">{common("quantity")}</th>
                  <th className="p-4">{common("status")}</th>
                  <th className="p-4">{common("actions")}</th>
                </tr>
              </thead>

              <tbody>
                {filteredItems.map((item) => {
                  const low =
                    item.quantity_on_hand <= item.low_stock_threshold;

                  return (
                    <tr key={item.id} className="border-t hover:bg-slate-50">
                      <td className="p-4 font-mono">{item.barcode}</td>
                      <td className="p-4 font-medium">{item.name}</td>
                      <td className="p-4">{displayUnit(item.unit)}</td>
                      <td className="p-4">
                        {formatQuantity(item.quantity_on_hand)}
                      </td>
                      <td className="p-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            low
                              ? "bg-amber-100 text-amber-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {item.quantity_on_hand === 0
                            ? t("outOfStock")
                            : low
                              ? t("lowStock")
                              : t("inStock")}
                        </span>
                      </td>
                        <td className="p-4">
                            <ItemActions
                                item={item}
                             onUpdated={loadItems}
                            />
                        </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {loading && (
              <p className="p-6 text-center text-slate-500">
                {t("loading")}
              </p>
            )}

            {!loading && filteredItems.length === 0 && (
              <p className="p-6 text-center text-slate-500">
                {t("noItems")}
              </p>
            )}
          </div>
        </section>

      </div>
    </main>
  );
}
