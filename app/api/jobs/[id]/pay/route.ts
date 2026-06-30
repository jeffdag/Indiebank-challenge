import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOperator, apiErrorResponse } from "@/lib/auth";
import { getDakotaClient } from "@/lib/dakota";
import { settleSandboxPayout } from "@/lib/dakota-settle";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/jobs/[id]/pay — operator pays an approved job.
 *
 * Flow:
 *   1. Read the freelancer profile (bank info + maybe cached Dakota ids).
 *   2. If we already provisioned a recipient/destination/offramp for this
 *      freelancer under this operator, reuse them. Otherwise create them on
 *      the operator's customer and cache them on the freelancer profile.
 *   3. Submit a USDC → USD ACH transaction.
 *   4. Cache amount in payment_amounts (Dakota omits it until quoted).
 *   5. Sandbox-only: auto-settle so the demo shows a completed lifecycle.
 *   6. Mark the job as paid + link the dakota_transaction_id.
 *
 * Amount = freelancer.hourly_rate_usd × submission.hours_worked.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const operator = await requireOperator();
    const { id: jobId } = await params;

    if (!operator.dakota_customer_id) {
      return NextResponse.json(
        { error: "Complete operator onboarding before paying" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: job } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single();
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    if (job.status !== "approved") {
      return NextResponse.json(
        { error: `Job is "${job.status}" — only approved jobs can be paid` },
        { status: 400 }
      );
    }
    if (!job.assigned_to) {
      return NextResponse.json({ error: "Job has no assignee" }, { status: 400 });
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

    const { data: freelancer } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, role, hourly_rate_usd, bank_name, routing_number, account_number, account_holder_name, account_type, street1, city, region, postal_code, address_country, dakota_recipient_id, dakota_destination_id, dakota_offramp_account_id, provisioned_by_user_id"
      )
      .eq("id", job.assigned_to)
      .single();
    if (!freelancer || freelancer.role !== "freelancer") {
      return NextResponse.json(
        { error: "Assignee is not a freelancer" },
        { status: 400 }
      );
    }
    if (!(Number(freelancer.hourly_rate_usd) > 0)) {
      return NextResponse.json(
        { error: "Freelancer hourly rate is not set" },
        { status: 400 }
      );
    }
    if (
      !freelancer.account_number ||
      !freelancer.routing_number ||
      !freelancer.account_holder_name
    ) {
      return NextResponse.json(
        {
          error:
            "Freelancer hasn't added bank info — ask them to set it up in Settings",
        },
        { status: 400 }
      );
    }

    const rate = Number(freelancer.hourly_rate_usd);
    const hours = Number(submission.hours_worked);
    const amountNum = Math.round(rate * hours * 100) / 100;
    const amount = amountNum.toFixed(2);

    const dakota = getDakotaClient();

    // Lazy-provision recipient + destination + offramp for this freelancer on
    // this operator's customer if we haven't already (or if a different
    // operator did the provisioning, in which case we re-provision since
    // those ids live on a different customer).
    let recipientId = freelancer.dakota_recipient_id;
    let destinationId = freelancer.dakota_destination_id;
    let offrampId = freelancer.dakota_offramp_account_id;
    const cachedByMe = freelancer.provisioned_by_user_id === operator.id;

    if (!cachedByMe || !recipientId || !destinationId) {
      const displayName =
        freelancer.full_name?.trim() ||
        freelancer.email?.split("@")[0] ||
        "Freelancer";

      const recipient = await dakota.recipients.create(
        operator.dakota_customer_id,
        {
          name: displayName.slice(0, 60),
          address: {
            street1: freelancer.street1 ?? "123 Worker St",
            city: freelancer.city ?? "Austin",
            region: freelancer.region ?? "Texas",
            postal_code: freelancer.postal_code ?? "73301",
            country: freelancer.address_country ?? "US",
          },
        }
      );
      recipientId = recipient.id;

      const destination = await dakota.destinations.create(recipient.id, {
        destination_type: "fiat_us",
        name: `${displayName.slice(0, 30)} Bank`,
        bank_name: freelancer.bank_name ?? "Bank",
        account_holder_name: freelancer.account_holder_name.slice(0, 22),
        account_number: freelancer.account_number,
        aba_routing_number: freelancer.routing_number,
        account_type: freelancer.account_type ?? "checking",
      } as Parameters<typeof dakota.destinations.create>[1]);
      destinationId =
        (destination as { destination_id?: string }).destination_id ||
        (destination as { id?: string }).id ||
        null;

      const offramp = await dakota.accounts.create({
        account_type: "offramp",
        fiat_destination_id: destinationId,
        source_asset: "USDC",
        source_network_id: "ethereum-sepolia",
        destination_asset: "USD",
        rail: "ach",
        capabilities: ["ach"],
      } as Parameters<typeof dakota.accounts.create>[0]);
      offrampId = offramp.id;

      await supabase
        .from("profiles")
        .update({
          dakota_recipient_id: recipientId,
          dakota_destination_id: destinationId,
          dakota_offramp_account_id: offrampId,
          provisioned_by_user_id: operator.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", freelancer.id);
    }

    if (!destinationId) {
      return NextResponse.json(
        { error: "Failed to resolve destination id" },
        { status: 500 }
      );
    }

    const tx = await dakota.transactions.create({
      customer_id: operator.dakota_customer_id,
      source_asset: "USDC",
      source_network_id: "ethereum-sepolia",
      destination_id: destinationId,
      destination_asset: "USD",
      destination_payment_rail: "ach",
      amount,
      payment_reference: `Job ${job.id.replace(/[^A-Za-z0-9]/g, "").slice(0, 14)}`,
    } as Parameters<typeof dakota.transactions.create>[0]);

    await supabase.from("payment_amounts").upsert(
      {
        dakota_transaction_id: tx.id,
        user_id: operator.id,
        amount,
        currency: "USD",
      },
      { onConflict: "dakota_transaction_id" }
    );

    const settle = await settleSandboxPayout(dakota, tx.id, amount);
    if (!settle.ok) {
      console.warn("Auto-settle skipped:", settle.reason);
    }

    const { error: updErr, data: updated } = await supabase
      .from("jobs")
      .update({
        status: "paid",
        paid_dakota_transaction_id: tx.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .select("id, status")
      .single();
    if (updErr) {
      console.error("Failed to mark job paid:", updErr, "jobId:", jobId);
      return NextResponse.json(
        { error: `Payment sent but job state not updated: ${updErr.message}` },
        { status: 500 }
      );
    }
    if (!updated) {
      console.error("Job paid update matched 0 rows. jobId:", jobId);
      return NextResponse.json(
        { error: "Payment sent but job row not updated" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      transaction_id: tx.id,
      status: tx.status,
      amount,
      hours,
      rate,
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
