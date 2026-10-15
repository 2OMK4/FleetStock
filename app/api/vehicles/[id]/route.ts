
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Context = {
  params: Promise<{ id: string }>;
};

// PATCH /api/vehicles/:id
export async function PATCH(
  request: Request,
  context: Context
) {
  const { id } = await context.params;

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
  ) {
    return NextResponse.json(
      { error: "Invalid vehicle ID." },
      { status: 400 }
    );
  }

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

  let body: Record<string, unknown>;

  try {
    const input: unknown = await request.json();

    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("Invalid body");
    }

    body = input as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const registration =
    typeof body.registration === "string"
      ? body.registration.trim()
      : "";

  const name =
    typeof body.name === "string"
      ? body.name.trim()
      : "";

  const type =
    typeof body.type === "string"
      ? body.type.trim()
      : "";

  if (
    !registration ||
    !name ||
    !type ||
    registration.length > 40 ||
    name.length > 100 ||
    type.length > 50
  ) {
    return NextResponse.json(
      { error: "Invalid vehicle information." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("vehicles")
    .update({ registration, name, type })
    .eq("id", id)
    .select()
    .maybeSingle();

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

  if (!data) {
    return NextResponse.json(
      { error: "Vehicle not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ vehicle: data });
}
