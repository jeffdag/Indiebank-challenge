import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOperator, apiErrorResponse } from "@/lib/auth";

export const runtime = "nodejs";

/** POST /api/jobs/[id]/assign — operator picks a freelancer for the job. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireOperator();
    const { id } = await params;
    const body = await request.json();
    const assigneeId = String(body.assigned_to ?? "").trim();
    if (!assigneeId) {
      return NextResponse.json(
        { error: "assigned_to is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: assignee } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", assigneeId)
      .single();
    if (!assignee || assignee.role !== "freelancer") {
      return NextResponse.json(
        { error: "assignee is not a freelancer" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("jobs")
      .update({
        assigned_to: assigneeId,
        status: "assigned",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ job: data });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
