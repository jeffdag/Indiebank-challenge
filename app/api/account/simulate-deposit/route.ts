import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDakotaClient } from "@/lib/dakota";

// POST /api/account/simulate-deposit - sandbox ACH inbound into the operator's
// on-ramp account. Sandbox amount cap is $2 (confirmed empirically).
export async function POST(request: NextRequest) {
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
      .select(
        "dakota_customer_id, dakota_wallet_address, dakota_onramp_account_id"
      )
      .eq("id", user.id)
      .single();

    if (!profile?.dakota_customer_id) {
      return NextResponse.json(
        { error: "Complete onboarding first" },
        { status: 400 }
      );
    }

    const dakota = getDakotaClient();
    // Prefer the cached onramp account ID; only iterate accounts.list as
    // a fallback for profiles provisioned before we added the cache.
    let acct: unknown = null;
    if (profile.dakota_onramp_account_id) {
      try {
        acct = await dakota.accounts.get(profile.dakota_onramp_account_id);
      } catch (err) {
        console.warn("cached onramp account fetch failed:", err);
      }
    }

    if (!acct) {
      const myWallet = (profile.dakota_wallet_address ?? "").toLowerCase();
      if (myWallet) {
        for await (const a of dakota.accounts.list({
          account_type: "onramp",
          limit: 100,
        })) {
          const acctWallet = (
            (a as { destination?: { crypto_address?: string } }).destination
              ?.crypto_address ?? ""
          ).toLowerCase();
          if (acctWallet && acctWallet === myWallet) {
            acct = a;
            const foundId = (a as { id?: string }).id;
            if (foundId) {
              await supabase
                .from("profiles")
                .update({
                  dakota_onramp_account_id: foundId,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", user.id);
            }
            break;
          }
        }
      }
    }

    if (!acct) {
      return NextResponse.json(
        { error: "No on-ramp account yet. Re-run onboarding." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const amount: string = body.amount ?? "2.00";

    const result = await dakota.sandbox.simulateInbound({
      simulation_id: `sim_dep_${user.id}_${Date.now()}`,
      type: "ach_inbound",
      account_id: (acct as { id?: string }).id ?? "",
      amount,
      currency: "USD",
    } as Parameters<typeof dakota.sandbox.simulateInbound>[0]);

    return NextResponse.json({
      success: true,
      amount,
      simulation: { id: result.id, state: result.state },
    });
  } catch (error) {
    console.error("Simulate deposit error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to simulate deposit";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
