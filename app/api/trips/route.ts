
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/trips
export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Please sign in first." },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from("trips")
    .select(`
      id,
      vehicle_id,
      status,
      departed_at,
      returned_at,
      vehicles (
        registration,
        name,
        type
      ),
      trip_items (
        id,
        item_id,
        barcode_snapshot,
        name_snapshot,
        unit_snapshot,
        taken_quantity,
        returned_quantity,
        used_quantity
      )
    `)
    .order("departed_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ trips: data ?? [] });
}

// POST /api/trips
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;

  try {
    const input: unknown = await request.json();

    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("Invalid request");
    }

    body = input as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request." },
      { status: 400 }
    );
  }

  const vehicleId = body.vehicle_id;
  const items = body.items;

  if (
    typeof vehicleId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(vehicleId)
  ) {
    return NextResponse.json(
      { error: "Select a valid vehicle." },
      { status: 400 }
    );
  }

  if (!Array.isArray(items) || items.length < 1 || items.length > 100) {
    return NextResponse.json(
      { error: "Add between 1 and 100 items." },
      { status: 400 }
    );
  }

  const validatedItems: {
    barcode: string;
    quantity: number;
  }[] = [];

  const seen = new Set<string>();

  for (const entry of items as unknown[]) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return NextResponse.json(
        { error: "Invalid item." },
        { status: 400 }
      );
    }

    const item = entry as Record<string, unknown>;

    const barcode =
      typeof item.barcode === "string" ? item.barcode.trim() : "";

    const quantity = item.quantity;

    if (
      !barcode ||
      barcode.length > 100 ||
      typeof quantity !== "number" ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      quantity > 9999999999.99 ||
      Math.abs(quantity * 100 - Math.round(quantity * 100)) > 0.000001
    ) {
      return NextResponse.json(
        { error: "Invalid barcode or quantity." },
        { status: 400 }
      );
    }

    if (seen.has(barcode.toLowerCase())) {
      return NextResponse.json(
        { error: "Duplicate item in trip." },
        { status: 400 }
      );
    }

    seen.add(barcode.toLowerCase());
    validatedItems.push({ barcode, quantity });
  }

  // One database call performs the complete transaction.
  const { data, error } = await supabase.rpc("start_trip", {
    p_vehicle_id: vehicleId,
    p_items: validatedItems,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.code === "23505" ? 409 : 400 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      trip_id: data,
      message: "Trip started successfully.",
    },
    { status: 201 }
  );
}
