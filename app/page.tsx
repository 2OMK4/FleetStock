import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient, {
  type DashboardItem,
  type DashboardRecentTrip,
} from "@/components/dashboard/DashboardClient";

/** Supabase can infer a joined vehicle as either one row or an array. */
function firstVehicle(
  vehicles:
    | { name: string; registration: string }
    | { name: string; registration: string }[]
    | null,
) {
  return Array.isArray(vehicles) ? vehicles[0] ?? null : vehicles;
}

async function DashboardContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Keep authentication and all database reads on the server.
  const [
    inventoryResult,
    vehiclesResult,
    activeResult,
    completedResult,
    recentResult,
  ] = await Promise.all([
    supabase
      .from("items")
      .select("id, barcode, name, unit, quantity_on_hand, low_stock_threshold")
      .eq("is_active", true)
      .order("name"),
    supabase.from("vehicles").select("id", { count: "exact", head: true }),
    supabase
      .from("trips")
      .select("id", { count: "exact", head: true })
      .eq("status", "out"),
    supabase
      .from("trips")
      .select("id", { count: "exact", head: true })
      .eq("status", "returned"),
    supabase
      .from("trips")
      .select(`
        id,
        status,
        departed_at,
        vehicles (name, registration)
      `)
      .order("departed_at", { ascending: false })
      .limit(5),
  ]);

  const errors = [
    inventoryResult.error,
    vehiclesResult.error,
    activeResult.error,
    completedResult.error,
    recentResult.error,
  ].filter(Boolean);

  if (errors.length) {
    return <DashboardClient error />;
  }

  const items: DashboardItem[] = (inventoryResult.data ?? []).map((item) => ({
    id: item.id,
    barcode: item.barcode,
    name: item.name,
    unit: item.unit,
    quantity_on_hand: Number(item.quantity_on_hand),
    low_stock_threshold: Number(item.low_stock_threshold),
  }));

  const recentTrips: DashboardRecentTrip[] = (recentResult.data ?? []).map(
    (trip) => {
      const vehicle = firstVehicle(trip.vehicles);
      return {
        id: trip.id,
        status: trip.status,
        departed_at: trip.departed_at,
        vehicle_name: vehicle?.name ?? null,
        vehicle_registration: vehicle?.registration ?? null,
      };
    },
  );

  return (
    <DashboardClient
      items={items}
      recentTrips={recentTrips}
      totalVehicles={vehiclesResult.count ?? 0}
      activeTrips={activeResult.count ?? 0}
      completedTrips={completedResult.count ?? 0}
    />
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 p-8 text-slate-900">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="text-3xl font-bold text-blue-600">FleetStock</div>
            <div className="h-10 w-72 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  key={index}
                  className="h-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800"
                />
              ))}
            </div>
          </div>
        </main>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
