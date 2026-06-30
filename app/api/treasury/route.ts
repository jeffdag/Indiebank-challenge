import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDakotaClient } from "@/lib/dakota";
import { takeAtMost } from "@/lib/list-helpers";

// GET /api/treasury - Aggregate treasury view: balances per account, in-flight tx, payout volume.
export async function GET() {
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
      .select("dakota_customer_id, business_name, dakota_wallet_id, dakota_wallet_address")
      .eq("id", user.id)
      .single();

    if (!profile?.dakota_customer_id) {
      return NextResponse.json({
        businessName: null,
        totalBalance: 0,
        walletBalance: { amountUsd: 0, address: null, balances: [] },
        accounts: [],
        inFlight: { count: 0, amount: 0 },
        inbound: { count: 0, amount: 0 },
        payouts: { count: 0, amount: 0 },
        topRecipients: [],
      });
    }

    const dakota = getDakotaClient();

    // Live on-chain wallet balance. Bypass the SDK for this one call — the
    // 1.3.x SDK's getBalances() drops the wrapper fields (total_amount_usd,
    // address), and 1.4.x returns only the balances array. We need the full
    // response shape, so go straight to the REST endpoint.
    //
    // Failures here used to silently return $0, which produced the confusing
    // "$0 balance but 7 inbound deposits" state. Now we surface the error
    // via `walletBalanceError` so the UI can show "couldn't load balance"
    // instead of an incorrect zero.
    const apiBase =
      process.env.DAKOTA_ENV === "production"
        ? "https://api.platform.dakota.xyz"
        : "https://api.platform.sandbox.dakota.xyz";
    type WalletBalanceResult = {
      amountUsd: number;
      address: string | null;
      balances: { asset: string; network: string; amountUsd: number }[];
      error?: string | null;
    };
    const fetchWalletBalance = async (): Promise<WalletBalanceResult> => {
      if (!profile.dakota_wallet_id || !process.env.DAKOTA_API_KEY) {
        return {
          amountUsd: 0,
          address: profile.dakota_wallet_address ?? null,
          balances: [],
        };
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const r = await fetch(
          `${apiBase}/wallets/${profile.dakota_wallet_id}/balances`,
          {
            headers: { "x-api-key": process.env.DAKOTA_API_KEY },
            signal: controller.signal,
          }
        );
        if (!r.ok) {
          const text = await r.text().catch(() => "");
          throw new Error(
            `wallet balances HTTP ${r.status}: ${text.slice(0, 200)}`
          );
        }
        const resp = (await r.json()) as {
          address?: string;
          total_amount_usd?: string;
          balances?: {
            amount_usd?: string;
            asset?: { id?: string; network_id?: string };
          }[];
        };
        return {
          amountUsd: parseFloat(resp.total_amount_usd ?? "0"),
          address: resp.address ?? profile.dakota_wallet_address ?? null,
          balances: (resp.balances ?? []).map((b) => ({
            asset: b.asset?.id ?? "USDC",
            network: b.asset?.network_id ?? "ethereum-sepolia",
            amountUsd: parseFloat(b.amount_usd ?? "0"),
          })),
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("wallet balances fetch failed:", msg);
        return {
          amountUsd: 0,
          address: profile.dakota_wallet_address ?? null,
          balances: [],
          error: msg,
        };
      } finally {
        clearTimeout(timeout);
      }
    };
    const walletBalancePromise = fetchWalletBalance();

    // Single source of truth for dashboard + treasury stats. Pulls in
    // both one-off transactions (your payouts + ACH inbound) AND wallet
    // transactions (on-chain crypto deposits). All "lifetime" because for
    // the demo we want every event visible — there's no advantage to a
    // 30d window when the activity is days old.
    const walletId = profile.dakota_wallet_id as string | null;
    const [oneOff, walletIn, walletBalance, paymentAmountsRes] =
      await Promise.all([
        takeAtMost(dakota.transactions.list({ limit: 25 }), 25),
        walletId
          ? takeAtMost(
              dakota.transactions.list({
                transaction_type: "wallet",
                wallet_id: walletId,
                direction: "in",
                limit: 15,
              } as Parameters<typeof dakota.transactions.list>[0]),
              15
            )
          : Promise.resolve([] as unknown[]),
        walletBalancePromise,
        supabase
          .from("payment_amounts")
          .select("dakota_transaction_id, amount")
          .eq("user_id", user.id),
      ]);

    const cachedAmount = new Map<string, string>(
      (paymentAmountsRes.data ?? []).map(
        (r: { dakota_transaction_id: string; amount: string }) => [
          r.dakota_transaction_id,
          r.amount,
        ]
      )
    );

    let inFlightAmount = 0;
    let inFlightCount = 0;
    let payoutAmount = 0;
    let payoutCount = 0;
    let inboundAmount = 0;
    let inboundCount = 0;

    // One-off transactions for this customer (outbound payouts + ACH inbound).
    const mine = oneOff.filter(
      (t) =>
        (t as { customer_id?: string }).customer_id ===
        profile.dakota_customer_id
    );

    mine.forEach((tx) => {
      const amount =
        parseFloat((tx as { amount?: string }).amount ?? "0") ||
        parseFloat(cachedAmount.get(tx.id) ?? "0") ||
        0;
      const sourceAsset = (tx as { source_asset?: string }).source_asset;
      const destAsset = (tx as { destination_asset?: string }).destination_asset;
      const status = (tx.status || "").toLowerCase();

      if (status === "pending" || status === "processing") {
        inFlightAmount += amount;
        inFlightCount++;
      }

      // Dakota's live API returns "Success" for completed one-off tx.
      const isCompleted = status === "completed" || status === "success";
      if (isCompleted) {
        if (sourceAsset === "USDC" && destAsset === "USD") {
          payoutAmount += amount;
          payoutCount++;
        } else if (destAsset === "USDC") {
          inboundAmount += amount;
          inboundCount++;
        }
      }
    });

    // Wallet inbound transactions (on-chain USDC deposits — both simulated
    // ach_inbound and real testnet sends).
    walletIn.forEach((tx) => {
      const t = tx as { amount?: string; status?: string };
      const amount = parseFloat(t.amount ?? "0") || 0;
      const status = (t.status || "").toLowerCase();
      const isCompleted = status === "completed" || status === "success";
      if (isCompleted) {
        inboundAmount += amount;
        inboundCount++;
      }
    });

    return NextResponse.json({
      businessName: profile.business_name ?? null,
      totalBalance: walletBalance.amountUsd,
      walletBalance,
      accounts: [] as never[],
      inFlight: { count: inFlightCount, amount: inFlightAmount },
      inbound: { count: inboundCount, amount: inboundAmount },
      payouts: { count: payoutCount, amount: payoutAmount },
      topRecipients: [] as { name: string; amount: number; count: number }[],
    });
  } catch (error) {
    console.error("Treasury fetch error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch treasury";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
