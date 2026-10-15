
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Context = {
  params: Promise<{ id: string }>;
};

function validQuantity(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value < 10000000000 &&
    Math.abs(value * 100 - Math.round(value * 100)) < 0.000001
  );
}

function validId(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

// PATCH /api/items/:id
// Edit an existing item.
export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;

  if (!validId(id)) {
    return NextResponse.json({ error: "Invalid item ID." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: Record<string, unknown>;

  try {
    const input: unknown = await request.json();
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("Invalid body");
    }
    body = input as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request." },
      { status: 400 }
    );
  }

  const barcode =
    typeof body.barcode === "string" ? body.barcode.trim() : "";
  const name =
    typeof body.name === "string" ? body.name.trim() : "";
  const unit =
    typeof body.unit === "string" ? body.unit.trim() : "";

  const quantity = body.quantity_on_hand;
  const threshold = body.low_stock_threshold;
  const originalQuantity = body.original_quantity_on_hand;

  if (
    !barcode || !name || !unit ||
    barcode.length > 100 ||
    name.length > 150 ||
    unit.length > 30 ||
    !validQuantity(quantity) ||
    !validQuantity(threshold) ||
    !validQuantity(originalQuantity)
  ) {
    return NextResponse.json(
      { error: "Invalid item details or quantities." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("items")
    .update({
      barcode,
      name,
      unit,
      quantity_on_hand: quantity,
      low_stock_threshold: threshold,
    })
    .eq("id", id)
    .eq("is_active", true)
    // Prevent overwriting stock changed since the page loaded.
    .eq("quantity_on_hand", originalQuantity)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        error: error.code === "23505"
          ? "This barcode is already used."
          : error.message,
      },
      { status: error.code === "23505" ? 409 : 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      {
        error: "Item not found, archived, or stock changed. Refresh and retry.",
      },
      { status: 409 }
    );
  }

  return NextResponse.json({ item: data });
}

// DELETE /api/items/:id
// Archive instead of permanently deleting.
export async function DELETE(_request: Request, context: Context) {
  const { id } = await context.params;

  if (!validId(id)) {
    return NextResponse.json({ error: "Invalid item ID." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Avoid archiving an item that is currently on an active trip.
  const { data: activeTrips, error: checkError } = await supabase
    .from("trip_items")
    .select("id, trips!inner(status)")
    .eq("item_id", id)
    .eq("trips.status", "out")
    .limit(1);

  if (checkError) {
    return NextResponse.json(
      { error: checkError.message },
      { status: 500 }
    );
  }

  if (activeTrips && activeTrips.length > 0) {
    return NextResponse.json(
      { error: "Cannot archive an item on an active trip." },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("items")
    .update({ is_active: false })
    .eq("id", id)
    .eq("is_active", true)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Item not found or already archived." },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
