import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDakotaClient } from "@/lib/dakota";
import { settleSandboxPayout } from "@/lib/dakota-settle";

interface BatchItem {
  recipientId: string;
  amount: string;
}

interface BatchResult {
  recipientId: string;
  ok: boolean;
  transactionId?: string;
  status?: string;
  amount?: string;
  error?: string;
}

// POST /api/workers/pay-batch - run a payroll batch.
// Body: { payments: [{ recipientId, amount }] }
// Resolves each worker's fiat_us destination, then transactions.create.
// Caches the submitted amount in Supabase (Dakota strips amount from
// pending one-off responses — see payment_amounts migration).
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const payments: BatchItem[] = Array.isArray(body.payments)
      ? body.payments
      : [];
    if (payments.length === 0) {
      return NextResponse.json(
        { error: "payments array is required" },
        { status: 400 }
      );
    }

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

    // Run sequentially: keeps the demo deterministic and avoids hammering
    // the sandbox. Parallel would be faster but the batch sizes here are
    // small (typically 1–20 workers).
    const results: BatchResult[] = [];
    for (const item of payments) {
      const { recipientId, amount } = item;
      if (!recipientId || !amount) {
        results.push({
          recipientId: recipientId ?? "",
          ok: false,
          error: "recipientId and amount required",
        });
        continue;
      }

      try {
        const destinations = await dakota.destinations
          .list(recipientId)
          .toArray();
        const bank = destinations.find((d) => d.destination_type === "fiat_us");
        if (!bank) {
          results.push({
            recipientId,
            ok: false,
            error: "Worker has no bank destination",
          });
          continue;
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
          payment_reference: "Payroll",
        } as Parameters<typeof dakota.transactions.create>[0]);

        // Cache amount for display (Dakota omits it on pending tx).
        await supabase.from("payment_amounts").upsert(
          {
            dakota_transaction_id: tx.id,
            user_id: user.id,
            amount,
            currency: "USD",
          },
          { onConflict: "dakota_transaction_id" }
        );

        // Sandbox-only: advance to settled. No-op in production.
        const settle = await settleSandboxPayout(dakota, tx.id, amount);
        if (!settle.ok) {
          console.warn(
            `Auto-settle skipped for ${tx.id}:`,
            settle.reason
          );
        }

        results.push({
          recipientId,
          ok: true,
          transactionId: tx.id,
          status: tx.status,
          amount,
        });
      } catch (err) {
        results.push({
          recipientId,
          ok: false,
          error: err instanceof Error ? err.message : "Payment failed",
        });
      }
    }

    const succeeded = results.filter((r) => r.ok).length;
    const failed = results.length - succeeded;
    return NextResponse.json({
      success: failed === 0,
      succeeded,
      failed,
      results,
    });
  } catch (error) {
    console.error("Batch pay error:", error);
    const message =
      error instanceof Error ? error.message : "Batch payment failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
