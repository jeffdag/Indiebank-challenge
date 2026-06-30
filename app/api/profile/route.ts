import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAnyAuth, apiErrorResponse } from "@/lib/auth";

export const runtime = "nodejs";

/** PATCH /api/profile — update own profile (rate, full name). */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAnyAuth();
    const body = await request.json();

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (typeof body.full_name === "string") patch.full_name = body.full_name;
    if (body.hourly_rate_usd != null && body.hourly_rate_usd !== "") {
      const r = Number(body.hourly_rate_usd);
      if (!(r > 0)) {
        return NextResponse.json(
          { error: "hourly_rate_usd must be positive" },
          { status: 400 }
        );
      }
      patch.hourly_rate_usd = r;
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", user.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ profile: data });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
