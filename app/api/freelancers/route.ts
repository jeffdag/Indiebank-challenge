import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOperator, apiErrorResponse } from "@/lib/auth";

export const runtime = "nodejs";

/** GET /api/freelancers — operator lists freelancers (for the assignee picker). */
export async function GET() {
  try {
    await requireOperator();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, email, full_name, hourly_rate_usd, account_last4, dakota_recipient_id"
      )
      .eq("role", "freelancer")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return NextResponse.json({ freelancers: data ?? [] });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
