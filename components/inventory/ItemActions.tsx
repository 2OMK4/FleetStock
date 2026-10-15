
"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { classifyApiError, getUnitKey, unitKeys } from "@/components/i18n/helpers";

type Item = {
  id: string;
  barcode: string;
  name: string;
  unit: string;
  quantity_on_hand: number;
  low_stock_threshold: number;
};

type Props = {
  item: Item;
  onUpdated: () => Promise<void>;
};

export default function ItemActions({ item, onUpdated }: Props) {
  const t = useTranslations("inventory");
  const common = useTranslations("common");
  const units = useTranslations("units");
  const errors = useTranslations("errors");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    barcode: item.barcode,
    name: item.name,
    unit: item.unit,
    quantity_on_hand: String(item.quantity_on_hand),
    low_stock_threshold: String(item.low_stock_threshold),
  });

  function openEdit() {
    setForm({
      barcode: item.barcode,
      name: item.name,
      unit: item.unit,
      quantity_on_hand: String(item.quantity_on_hand),
      low_stock_threshold: String(item.low_stock_threshold),
    });
    setError("");
    setEditing(true);
  }

  // Edit item
  async function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: form.barcode,
          name: form.name,
          unit: form.unit,
          quantity_on_hand: Number(form.quantity_on_hand),
          low_stock_threshold: Number(form.low_stock_threshold),
          original_quantity_on_hand: item.quantity_on_hand,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(errors(classifyApiError(result.error, "updateItem")));
      }

      setEditing(false);
      await onUpdated();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : errors("updateItem")
      );
    } finally {
      setSaving(false);
    }
  }

  // Archive item
  async function handleArchive() {
    const confirmed = window.confirm(
      t("archiveConfirm", { name: item.name })
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/items/${item.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(errors(classifyApiError(result.error, "archiveItem")));
      }

      await onUpdated();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : errors("archiveItem")
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={openEdit}
          className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
        >
          {common("edit")}
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={handleArchive}
          className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
          {common("archive")}
        </button>
      </div>

      {error && !editing && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-item-heading"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
          >
            <h2
              id="edit-item-heading"
              className="mb-4 text-xl font-bold"
            >
              {t("editItem")}
            </h2>

            <form onSubmit={handleEdit} className="space-y-4">
              <label className="block text-sm">
                {common("barcode")}
                <input
                  required
                  maxLength={100}
                  value={form.barcode}
                  onChange={(e) =>
                    setForm({ ...form, barcode: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border p-3"
                />
              </label>

              <label className="block text-sm">
                {t("itemName")}
                <input
                  required
                  maxLength={150}
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border p-3"
                />
              </label>

              <label className="block text-sm">
                {common("unit")}
                <select
                  required
                  value={form.unit}
                  onChange={(e) =>
                    setForm({ ...form, unit: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border p-3"
                >
                  {unitKeys.map((unitKey) => (
                    <option key={unitKey} value={unitKey}>
                      {units(unitKey)}
                    </option>
                  ))}
                  {/* Preserve older units if an item used a custom value. */}
                  {!getUnitKey(item.unit) && (
                    <option value={item.unit}>{item.unit}</option>
                  )}
                </select>
              </label>

              <label className="block text-sm">
                {t("quantityOnHand")}
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
                  className="mt-1 w-full rounded-lg border p-3"
                />
              </label>

              <label className="block text-sm">
                {t("threshold")}
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
                  className="mt-1 w-full rounded-lg border p-3"
                />
              </label>

              {error && (
                <p role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setEditing(false)}
                  className="rounded-lg border px-4 py-2"
                >
                  {common("cancel")}
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
                >
                  {saving ? common("saving") : common("saveChanges")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
