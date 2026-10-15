
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Validate vehicle information.
function validateVehicle(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  const input = body as Record<string, unknown>;

  const registration =
    typeof input.registration === "string"
      ? input.registration.trim()
      : "";

  const name =
    typeof input.name === "string"
      ? input.name.trim()
      : "";

  const type =
    typeof input.type === "string"
      ? input.type.trim()
      : "";

  if (
    !registration ||
    !name ||
    !type ||
    registration.length > 40 ||
    name.length > 100 ||
    type.length > 50
  ) {
    return null;
  }

  return { registration, name, type };
}

// GET /api/vehicles
export async function GET() {
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

  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .order("name");

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ vehicles: data });
}

// POST /api/vehicles
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request." },
      { status: 400 }
    );
  }

  const vehicle = validateVehicle(body);

  if (!vehicle) {
    return NextResponse.json(
      { error: "Please enter valid vehicle details." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("vehicles")
    .insert(vehicle)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      {
        error:
          error.code === "23505"
            ? "This registration number already exists."
            : error.message,
      },
      { status: error.code === "23505" ? 409 : 500 }
    );
  }

  return NextResponse.json(
    { vehicle: data },
    { status: 201 }
  );
}
