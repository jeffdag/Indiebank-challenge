import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOperator, apiErrorResponse } from "@/lib/auth";
import { reviewSubmission } from "@/lib/agents/review-job";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/jobs/[id]/review — operator runs the AI reviewer on the latest
 * submission. Persists the verdict and transitions the job to "approved"
 * or "revisions_requested".
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireOperator();
    const { id: jobId } = await params;
    const supabase = await createClient();

    const { data: job } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single();
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    if (!job.last_submission_id) {
      return NextResponse.json(
        { error: "No submission to review yet" },
        { status: 400 }
      );
    }

    const { data: submission } = await supabase
      .from("job_submissions")
      .select("*")
      .eq("id", job.last_submission_id)
      .single();
    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    // Don't persist "reviewing" — if the AI call fails (timeout, missing
    // API key, rate limit) we'd orphan the job in that state. The drawer's
    // staged loader is purely client-side; the server only writes the
    // final verdict. Status stays at the previous value (submitted /
    // revisions_requested) until the AI returns, so retries Just Work.
    const result = await reviewSubmission({
      title: job.title,
      requirements: job.requirements,
      designUrl: job.design_url,
      estimatedHours: job.estimated_hours,
      hoursWorked: String(submission.hours_worked),
      deliverablesUrl: submission.deliverables_url,
      notes: submission.notes,
    });

    const reviewedAt = new Date().toISOString();
    const { error: updSubErr } = await supabase
      .from("job_submissions")
      .update({
        agent_decision: result.decision,
        agent_feedback: result.feedback,
        agent_checklist: result.checklist,
        reviewed_at: reviewedAt,
      })
      .eq("id", submission.id);
    if (updSubErr) throw new Error(updSubErr.message);

    const nextStatus =
      result.decision === "approve" ? "approved" : "revisions_requested";
    const { error: updJobErr } = await supabase
      .from("jobs")
      .update({ status: nextStatus, updated_at: reviewedAt })
      .eq("id", jobId);
    if (updJobErr) throw new Error(updJobErr.message);

    return NextResponse.json({
      decision: result.decision,
      feedback: result.feedback,
      checklist: result.checklist,
      job_status: nextStatus,
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
