
"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import FleetNavbar from "@/components/FleetNavbar";
import { useTranslations } from "next-intl";
import { classifyApiError, getVehicleTypeKey } from "@/components/i18n/helpers";

type Vehicle = {
  id: string;
  registration: string;
  name: string;
  type: string;
  created_at: string;
};

const emptyForm = {
  registration: "",
  name: "",
  type: "",
};

export default function VehiclesPage() {
  const t = useTranslations("vehicles");
  const common = useTranslations("common");
  const types = useTranslations("vehicleTypes");
  const errors = useTranslations("errors");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Retrieve vehicles from API
  const loadVehicles = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/vehicles", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(errors(classifyApiError(result.error, "loadVehicles")));
      }

      setVehicles(result.vehicles);
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
    void loadVehicles();
  }, [loadVehicles]);

  // Open form for a new vehicle
  function openAddForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  // Open form with existing vehicle details
  function openEditForm(vehicle: Vehicle) {
    setForm({
      registration: vehicle.registration,
      name: vehicle.name,
      type: vehicle.type,
    });

    setEditingId(vehicle.id);
    setError("");
    setSuccess("");
    setShowForm(true);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  // Create or edit vehicle
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const isEditing = editingId !== null;

    try {
      const url = isEditing
        ? `/api/vehicles/${editingId}`
        : "/api/vehicles";

      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(errors(classifyApiError(result.error, "saveVehicle")));
      }

      await loadVehicles();
      closeForm();

      setSuccess(
        isEditing
          ? t("updated")
          : t("added")
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : errors("generic")
      );
    } finally {
      setSaving(false);
    }
  }

  // Search vehicles
  const filteredVehicles = vehicles.filter((vehicle) =>
    `${vehicle.registration} ${vehicle.name} ${vehicle.type}`
      .toLowerCase()
      .includes(search.toLowerCase().trim())
  );

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">

  <div className="-mx-6 -mt-6 mb-8">
    <FleetNavbar />
  </div>

  <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              {t("title")}
            </h1>

            <p className="mt-1 text-slate-500">
              {t("description")}
            </p>
          </div>

          <button
            onClick={showForm ? closeForm : openAddForm}
            className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
          >
            {showForm ? common("cancel") : `+ ${t("addVehicle")}`}
          </button>
        </header>

        {/* Total vehicles */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            {t("total")}
          </p>

          <p className="mt-2 text-3xl font-bold">
            {vehicles.length}
          </p>
        </div>

        {/* Messages */}
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

        {/* Add / Edit Form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-xl border bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-semibold">
              {editingId ? t("editVehicle") : t("newVehicle")}
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                {t("registration")}
                <input
                  required
                  maxLength={40}
                  placeholder={t("registrationExample")}
                  value={form.registration}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      registration: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border p-3"
                />
              </label>

              <label className="block text-sm">
                {t("vehicleName")}
                <input
                  required
                  maxLength={100}
                  placeholder={t("nameExample")}
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border p-3"
                />
              </label>

              <label className="block text-sm sm:col-span-2">
                {t("vehicleType")}
                <select
                  required
                  value={form.type}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      type: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border p-3"
                >
                  <option value="">{t("selectType")}</option>
                  <option value="Van">{types("van")}</option>
                  <option value="Truck">{types("truck")}</option>
                  <option value="Pickup">{types("pickup")}</option>
                  <option value="SUV">{types("suv")}</option>
                  {form.type &&
                    !["Van", "Truck", "Pickup", "SUV"].includes(form.type) && (
                      <option value={form.type}>{form.type}</option>
                    )}
                </select>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving
                  ? common("saving")
                  : editingId
                    ? common("saveChanges")
                    : t("addVehicle")}
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={closeForm}
                className="rounded-lg border px-6 py-3 hover:bg-slate-100"
              >
                {common("cancel")}
              </button>
            </div>
          </form>
        )}

        {/* Vehicles table */}
        <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b p-5">
            <h2 className="text-xl font-semibold">
              {t("registered")}
            </h2>

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
                  <th className="p-4">{t("registration")}</th>
                  <th className="p-4">{t("vehicleName")}</th>
                  <th className="p-4">{t("vehicleType")}</th>
                  <th className="p-4">{common("actions")}</th>
                </tr>
              </thead>

              <tbody>
                {filteredVehicles.map((vehicle) => (
                  <tr
                    key={vehicle.id}
                    className="border-t hover:bg-slate-50"
                  >
                    <td className="p-4 font-mono font-medium">
                      {vehicle.registration}
                    </td>

                    <td className="p-4">
                      {vehicle.name}
                    </td>

                    <td className="p-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">
                        {(() => { const key = getVehicleTypeKey(vehicle.type); return key ? types(key) : vehicle.type; })()}
                      </span>
                    </td>

                    <td className="p-4">
                      <button
                        type="button"
                        onClick={() => openEditForm(vehicle)}
                        className="rounded-lg bg-blue-50 px-4 py-2 font-medium text-blue-700 hover:bg-blue-100"
                      >
                        {common("edit")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {loading && (
              <p className="p-6 text-center text-slate-500">
                {t("loading")}
              </p>
            )}

            {!loading && filteredVehicles.length === 0 && (
              <p className="p-6 text-center text-slate-500">
                {t("noVehicles")}
              </p>
            )}
          </div>
        </section>

      </div>
    </main>
  );
}
