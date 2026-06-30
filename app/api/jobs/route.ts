import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAnyAuth, requireOperator, apiErrorResponse } from "@/lib/auth";

export const runtime = "nodejs";

/** GET /api/jobs — list jobs visible to the caller (RLS handles scope). */
export async function GET() {
  try {
    await requireAnyAuth();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return NextResponse.json({ jobs: data ?? [] });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

/** POST /api/jobs — operator creates a job, optionally assigning a freelancer. */
export async function POST(request: NextRequest) {
  try {
    const operator = await requireOperator();
    const body = await request.json();

    const title = String(body.title ?? "").trim();
    const requirements = String(body.requirements ?? "").trim();
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    if (!requirements) {
      return NextResponse.json(
        { error: "requirements is required" },
        { status: 400 }
      );
    }
    const designUrl = body.design_url ? String(body.design_url) : null;
    const estimatedHours =
      body.estimated_hours != null && body.estimated_hours !== ""
        ? Number(body.estimated_hours)
        : null;
    const assignedTo = body.assigned_to ? String(body.assigned_to) : null;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("jobs")
      .insert({
        created_by: operator.id,
        assigned_to: assignedTo,
        title,
        requirements,
        design_url: designUrl,
        estimated_hours: estimatedHours,
        status: assignedTo ? "assigned" : "open",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ job: data });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
