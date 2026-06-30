import { DakotaClient } from "@dakota-xyz/ts-sdk";

// Sandbox-only auto-settle for outbound USDC → USD ACH payouts.
//
// In production, ACH settlement is driven by the actual provider's webhook
// (1-3 business days). Dakota's sandbox does NOT auto-advance outbound
// transactions — they stay `pending` indefinitely unless you fire
// sandbox.simulateInbound type: "ach_outbound_settled" manually. This
// helper triggers that settlement so the dashboard shows a complete
// lifecycle on screen instead of a forever-pending row.
//
// Guarded by DAKOTA_ENV !== "production". In production this is a no-op
// — never simulate against real money movement.
export async function settleSandboxPayout(
  dakota: DakotaClient,
  oneOffTransactionId: string,
  amount: string
): Promise<{ ok: boolean; reason?: string }> {
  if (process.env.DAKOTA_ENV === "production") {
    return { ok: false, reason: "production: no-op" };
  }
  try {
    await dakota.sandbox.simulateInbound({
      simulation_id: `settle_${oneOffTransactionId}_${Date.now()}`,
      type: "ach_outbound_settled",
      one_off_transaction_id: oneOffTransactionId,
      amount,
      currency: "USD",
    } as Parameters<typeof dakota.sandbox.simulateInbound>[0]);
    return { ok: true };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown";
    return { ok: false, reason };
  }
}
