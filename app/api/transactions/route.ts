import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDakotaClient } from "@/lib/dakota";
import { takeAtMost } from "@/lib/list-helpers";

// GET /api/transactions - list the operator's customer transactions.
//
// Query params:
//   limit (default 25) — caps both the one-off slice we scan and the wallet
//     inbound slice. Client paginates / "load more" on top of this.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("dakota_customer_id, dakota_wallet_id")
      .eq("id", user.id)
      .single();
    if (!profile?.dakota_customer_id) {
      return NextResponse.json({ transactions: [] });
    }

    const dakota = getDakotaClient();
    // Dakota's `transactions.list()` defaults to one_off (your payouts).
    // On-chain crypto inbound (simulated deposits, faucet sends, etc.)
    // lives under transaction_type=wallet and has to be fetched separately.
    // The customer_id filter is unreliable in sandbox so we list a bounded
    // recent slice and filter client-side.
    const url = new URL(request.url);
    const limitParam = parseInt(url.searchParams.get("limit") ?? "25", 10);
    const limit =
      Number.isFinite(limitParam) && limitParam > 0
        ? Math.min(limitParam, 100)
        : 25;

    const walletId = profile.dakota_wallet_id as string | null;
    const [oneOff, walletIn, { data: cachedAmounts }] = await Promise.all([
      takeAtMost(dakota.transactions.list({ limit }), limit),
      walletId
        ? takeAtMost(
            dakota.transactions.list({
              transaction_type: "wallet",
              wallet_id: walletId,
              direction: "in",
              limit: Math.ceil(limit / 2),
            } as Parameters<typeof dakota.transactions.list>[0]),
            Math.ceil(limit / 2)
          )
        : Promise.resolve([]),
      supabase
        .from("payment_amounts")
        .select("dakota_transaction_id, amount")
        .eq("user_id", user.id),
    ]);

    // Filter the one-off slice to this customer.
    const oneOffMine = oneOff.filter(
      (t) =>
        (t as { customer_id?: string }).customer_id === profile.dakota_customer_id
    );

    // Cached amounts (Dakota strips amount on pending one-off responses).
    const amountById = new Map<string, string>(
      (cachedAmounts ?? []).map((row) => [row.dakota_transaction_id, row.amount])
    );

    const oneOffMapped = oneOffMine.map((tx) => ({
      id: tx.id,
      status: tx.status,
      amount:
        (tx as { amount?: string }).amount ??
        amountById.get(tx.id) ??
        "0",
      sourceAsset: (tx as { source_asset?: string }).source_asset ?? "USDC",
      destinationAsset:
        (tx as { destination_asset?: string }).destination_asset ?? "USD",
      destinationId:
        (tx as { destination_id?: string }).destination_id ?? null,
      createdAt: tx.created_at,
      transactionType:
        (tx as { transaction_type?: string }).transaction_type ?? "one_off",
    }));

    // Wallet inbound transactions (on-chain USDC deposits).
    // Live shape: { id, amount, asset, from, to, network_id, status,
    //               created_at, transaction_hash, transaction_type }.
    // Source is the on-chain sender; we display as "USD inbound" so the
    // dashboard renders them green (Income) without special-casing every
    // asset.
    const walletMapped = (walletIn as unknown[]).map((tx) => {
      const t = tx as {
        id: string;
        amount?: string;
        asset?: string;
        from?: string;
        status?: string;
        created_at?: number | string;
        confirmed_at?: number;
      };
      const status = (t.status || "").toLowerCase();
      return {
        id: t.id,
        // Normalize Dakota's "Success" → "completed" for consistency with
        // one-off transactions.
        status: status === "success" ? "completed" : t.status ?? "completed",
        amount: t.amount ?? "0",
        sourceAsset: "USD",
        destinationAsset: t.asset ?? "USDC",
        destinationId: t.from ?? null,
        createdAt: t.confirmed_at ?? t.created_at ?? Date.now() / 1000,
        transactionType: "wallet_deposit",
      };
    });

    const merged = [...oneOffMapped, ...walletMapped].sort((a, b) => {
      const aTs =
        typeof a.createdAt === "number"
          ? a.createdAt
          : new Date(a.createdAt).getTime() / 1000;
      const bTs =
        typeof b.createdAt === "number"
          ? b.createdAt
          : new Date(b.createdAt).getTime() / 1000;
      return bTs - aTs;
    });

    return NextResponse.json({ transactions: merged });
  } catch (error) {
    console.error("Transactions list error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to load transactions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
