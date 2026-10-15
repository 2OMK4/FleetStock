
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Allow nonnegative quantities with up to 2 decimal places.
function validQuantity(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value < 10000000000 &&
    Math.abs(value * 100 - Math.round(value * 100)) < 0.000001
  );
}

// GET /api/items
// Retrieve all active inventory items.
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
    .from("items")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ items: data });
}

// POST /api/items
// Create a new inventory item.
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;

  try {
    const input: unknown = await request.json();

    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("Invalid request body");
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

  if (
    !barcode || !name || !unit ||
    barcode.length > 100 ||
    name.length > 150 ||
    unit.length > 30
  ) {
    return NextResponse.json(
      { error: "Please enter valid item details." },
      { status: 400 }
    );
  }

  if (!validQuantity(quantity) || !validQuantity(threshold)) {
    return NextResponse.json(
      { error: "Quantities must be nonnegative with at most 2 decimals." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("items")
    .insert({
      barcode,
      name,
      unit,
      quantity_on_hand: quantity,
      low_stock_threshold: threshold,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "This barcode already exists." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ item: data }, { status: 201 });
}
