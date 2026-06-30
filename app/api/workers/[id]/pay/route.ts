import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDakotaClient } from "@/lib/dakota";
import { settleSandboxPayout } from "@/lib/dakota-settle";

// POST /api/workers/[id]/pay - Pay a worker by recipient id. Looks up the
// worker's fiat_us destination, then creates a USDC → USD ACH transaction.
// In sandbox, immediately fires ach_outbound_settled so the dashboard sees
// a completed lifecycle (production relies on the provider webhook instead).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: recipientId } = await params;
    const body = await request.json().catch(() => ({}));
    const amount: string = body.amount ?? "1.50";

    const { data: profile } = await supabase
      .from("profiles")
      .select("dakota_customer_id")
      .eq("id", user.id)
      .single();
    if (!profile?.dakota_customer_id) {
      return NextResponse.json(
        { error: "Complete onboarding first" },
        { status: 400 }
      );
    }

    const dakota = getDakotaClient();
    const destinations = await dakota.destinations.list(recipientId).toArray();
    const bank = destinations.find((d) => d.destination_type === "fiat_us");
    if (!bank) {
      return NextResponse.json(
        { error: "Worker has no bank destination" },
        { status: 400 }
      );
    }
    const destinationId =
      (bank as { destination_id?: string }).destination_id ||
      (bank as { id?: string }).id;

    const tx = await dakota.transactions.create({
      customer_id: profile.dakota_customer_id,
      source_asset: "USDC",
      source_network_id: "ethereum-sepolia",
      destination_id: destinationId,
      destination_asset: "USD",
      destination_payment_rail: "ach",
      amount,
      payment_reference: "Salary",
    } as Parameters<typeof dakota.transactions.create>[0]);

    // Cache the submitted amount: Dakota's GET/LIST response omits the
    // amount field for pending one-off transactions (it's only populated
    // post-quote). Without this, the dashboard would show $0 until ACH
    // settlement.
    await supabase.from("payment_amounts").upsert(
      {
        dakota_transaction_id: tx.id,
        user_id: user.id,
        amount,
        currency: "USD",
      },
      { onConflict: "dakota_transaction_id" }
    );

    // Sandbox-only: advance the payout to settled so the demo shows the
    // full lifecycle. No-op in production.
    const settle = await settleSandboxPayout(dakota, tx.id, amount);
    if (!settle.ok) {
      console.warn("Auto-settle skipped:", settle.reason);
    }

    return NextResponse.json({
      success: true,
      transaction: {
        id: tx.id,
        status: tx.status,
        amount: (tx as { amount?: string }).amount ?? amount,
        createdAt: tx.created_at,
      },
    });
  } catch (error) {
    console.error("Pay worker error:", error);
    const message =
      error instanceof Error ? error.message : "Payment failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
