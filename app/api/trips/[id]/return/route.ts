
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Context = {
  params: Promise<{ id: string }>;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// POST /api/trips/:id/return
export async function POST(request: Request, context: Context) {
  const { id } = await context.params;

  if (!uuidPattern.test(id)) {
    return NextResponse.json(
      { error: "Invalid trip ID." },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Please sign in first." },
      { status: 401 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON." },
      { status: 400 }
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const input = body as Record<string, unknown>;
  const returns = input.returns;

  if (
    !Array.isArray(returns) ||
    returns.length === 0 ||
    returns.length > 100
  ) {
    return NextResponse.json(
      { error: "Invalid return items." },
      { status: 400 }
    );
  }

  const validated: {
    trip_item_id: string;
    returned_quantity: number;
  }[] = [];

  const seen = new Set<string>();

  for (const value of returns as unknown[]) {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      return NextResponse.json(
        { error: "Invalid return entry." },
        { status: 400 }
      );
    }

    const entry = value as Record<string, unknown>;
    const itemId = entry.trip_item_id;
    const quantity = entry.returned_quantity;

    if (
      typeof itemId !== "string" ||
      !uuidPattern.test(itemId) ||
      typeof quantity !== "number" ||
      !Number.isFinite(quantity) ||
      quantity < 0 ||
      quantity > 9999999999.99 ||
      Math.abs(quantity * 100 - Math.round(quantity * 100)) > 0.000001
    ) {
      return NextResponse.json(
        { error: "Invalid returned quantity or item ID." },
        { status: 400 }
      );
    }

    if (seen.has(itemId.toLowerCase())) {
      return NextResponse.json(
        { error: "Duplicate trip item." },
        { status: 400 }
      );
    }

    seen.add(itemId.toLowerCase());

    validated.push({
      trip_item_id: itemId,
      returned_quantity: quantity,
    });
  }

  // PostgreSQL performs the complete return atomically.
  const { data, error } = await supabase.rpc("return_trip", {
    p_trip_id: id,
    p_returns: validated,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    trip_id: data,
    message: "Trip returned successfully.",
  });
}
