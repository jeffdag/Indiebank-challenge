import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAnyAuth, apiErrorResponse } from "@/lib/auth";

export const runtime = "nodejs";

/** GET /api/jobs/[id]/submissions — RLS gates visibility per role. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAnyAuth();
    const { id } = await params;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("job_submissions")
      .select("*")
      .eq("job_id", id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return NextResponse.json({ submissions: data ?? [] });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
