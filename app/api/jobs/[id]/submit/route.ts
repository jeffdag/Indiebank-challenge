import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireFreelancer, apiErrorResponse } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * POST /api/jobs/[id]/submit — freelancer submits work + hours.
 * Creates a fresh job_submissions row each time so revision history is kept.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const freelancer = await requireFreelancer();
    const { id: jobId } = await params;
    const body = await request.json();

    const hours = Number(body.hours_worked);
    if (!(hours > 0)) {
      return NextResponse.json(
        { error: "hours_worked must be positive" },
        { status: 400 }
      );
    }
    const deliverablesUrl = body.deliverables_url
      ? String(body.deliverables_url)
      : null;
    const notes = body.notes ? String(body.notes).slice(0, 4000) : null;

    const supabase = await createClient();

    const { data: job } = await supabase
      .from("jobs")
      .select("id, assigned_to, status")
      .eq("id", jobId)
      .single();
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    if (job.assigned_to !== freelancer.id) {
      return NextResponse.json(
        { error: "Job is not assigned to you" },
        { status: 403 }
      );
    }
    if (job.status === "approved" || job.status === "paid") {
      return NextResponse.json(
        { error: "Job is already approved or paid" },
        { status: 400 }
      );
    }

    const { data: submission, error: subErr } = await supabase
      .from("job_submissions")
      .insert({
        job_id: jobId,
        submitted_by: freelancer.id,
        hours_worked: hours,
        deliverables_url: deliverablesUrl,
        notes,
      })
      .select("*")
      .single();
    if (subErr) throw new Error(subErr.message);

    const { error: updErr } = await supabase
      .from("jobs")
      .update({
        status: "submitted",
        last_submission_id: submission.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    if (updErr) throw new Error(updErr.message);

    return NextResponse.json({ submission });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
