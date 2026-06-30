"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ReceiveCard } from "@/components/dashboard/receive-card";
import { KybOnboardingModal } from "@/components/dashboard/kyb-onboarding-modal";

interface OnrampInfo {
  accountId: string;
  bankName: string | null;
  routingNumber: string | null;
  accountNumber: string | null;
  accountHolderName: string | null;
  accountType: string | null;
  status?: string | null;
}

interface WalletInfo {
  walletId: string;
  address: string;
  network: string;
  networkId: string;
}

interface OnboardingState {
  customerId: string | null;
  kybStatus: string | null;
  applicationStatus?: string | null;
  onramp: OnrampInfo | null;
  wallet: WalletInfo | null;
}

interface Transaction {
  id: string;
  status: string;
  amount: string;
  sourceAsset: string;
  destinationAsset: string;
  destinationId: string | null;
  createdAt: number | string;
  transactionType?: string;
}

function formatDate(value: number | string) {
  let date: Date;
  if (typeof value === "number") {
    date = new Date(value < 10000000000 ? value * 1000 : value);
  } else {
    const parsed = Date.parse(value);
    date = Number.isNaN(parsed) ? new Date(Number(value) * 1000) : new Date(parsed);
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatUsd(amount: string | number) {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/**
 * Sparkline of last-N-days payment totals. Reuses the same buckets the bar
 * chart consumes so the two stay in sync without re-computing.
 */
function BalanceSparkline({
  buckets,
  max,
}: {
  buckets: { total: number }[];
  max: number;
}) {
  if (!buckets.length) return null;
  const W = 280;
  const H = 60;
  const stepX = W / Math.max(1, buckets.length - 1);
  const points = buckets.map((b, i) => {
    const x = i * stepX;
    const y = max > 0 ? H - (b.total / max) * (H - 8) - 4 : H - 4;
    return [x, y] as const;
  });
  // Smooth Catmull-Rom-ish line via cubic Bézier segments.
  const path = points
    .map(([x, y], i) => {
      if (i === 0) return `M ${x.toFixed(1)} ${y.toFixed(1)}`;
      const [px, py] = points[i - 1];
      const cx1 = px + stepX * 0.4;
      const cy1 = py;
      const cx2 = x - stepX * 0.4;
      const cy2 = y;
      return `C ${cx1.toFixed(1)} ${cy1.toFixed(1)}, ${cx2.toFixed(1)} ${cy2.toFixed(1)}, ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  // Area fill — close the path down to the baseline.
  const fillPath = `${path} L ${W} ${H} L 0 ${H} Z`;
  return (
    <div className="mt-5 -mx-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-14 w-full overflow-visible"
        aria-hidden
      >
        <defs>
          <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(215,254,3,0.45)" />
            <stop offset="100%" stopColor="rgba(215,254,3,0)" />
          </linearGradient>
        </defs>
        <path d={fillPath} fill="url(#spark-fill)" />
        <path
          d={path}
          fill="none"
          stroke="var(--color-accent-ink)"
          strokeOpacity="0.85"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* Today dot */}
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1][0]}
            cy={points[points.length - 1][1]}
            r="3"
            fill="var(--color-accent)"
            stroke="var(--color-accent-ink)"
            strokeWidth="1.2"
          />
        )}
      </svg>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 className="mt-1 text-[17px] font-semibold tracking-[-0.012em] text-[var(--color-ink)]">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-[13px] text-[var(--color-ink-3)]">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export default function DashboardPage() {
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [walletBalanceUsd, setWalletBalanceUsd] = useState(0);
  const [loading, setLoading] = useState(true);
  const [onboardingBusy, setOnboardingBusy] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const [kybModalOpen, setKybModalOpen] = useState(false);
  const [kybAutoOpened, setKybAutoOpened] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [oRes, tRes, trRes] = await Promise.all([
        fetch("/api/onboarding"),
        fetch("/api/transactions"),
        fetch("/api/treasury"),
      ]);
      if (oRes.ok) setOnboarding(await oRes.json());
      if (tRes.ok) {
        const d = await tRes.json();
        setTransactions(d.transactions ?? []);
      }
      if (trRes.ok) {
        const d = await trRes.json();
        setWalletBalanceUsd(d.walletBalance?.amountUsd ?? 0);
      }
    } catch (err) {
      console.error("refresh", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-open the KYB modal once when we know the operator isn't verified.
  // After they dismiss it, the persistent pill in the header is the way back in.
  useEffect(() => {
    if (loading) return;
    const kybActive = onboarding?.kybStatus === "active";
    if (!kybActive && !kybAutoOpened) {
      setKybModalOpen(true);
      setKybAutoOpened(true);
    }
  }, [loading, onboarding?.kybStatus, kybAutoOpened]);

  const runOnboarding = async () => {
    setOnboardingBusy(true);
    try {
      const res = await fetch("/api/onboarding", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Account ready", {
          description: data.onramp?.routingNumber
            ? `Routing ${data.onramp.routingNumber} · acct ${data.onramp.accountNumber}`
            : "KYB approved",
        });
        setKybModalOpen(false);
        await refresh();
      } else {
        toast.error("Onboarding failed", { description: data.error });
      }
    } catch (err) {
      toast.error("Onboarding failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setOnboardingBusy(false);
    }
  };

  const simulateDeposit = async () => {
    setSimulating(true);
    try {
      const res = await fetch("/api/account/simulate-deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: "2.00" }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Deposited ${formatUsd(data.amount)} to account`);
        // Poll ONLY /api/treasury (lightweight balance check) until the
        // wallet reflects the new deposit. Once detected, do a single full
        // refresh to update transactions table. This avoids hammering
        // Dakota with 4-5 parallel calls per tick.
        const startingBalance = walletBalanceUsd;
        let detected = false;
        for (let i = 0; i < 10; i++) {
          await new Promise((r) => setTimeout(r, 600));
          const trRes = await fetch("/api/treasury");
          if (!trRes.ok) continue;
          const d = await trRes.json();
          const next = d.walletBalance?.amountUsd ?? 0;
          if (next > startingBalance) {
            setWalletBalanceUsd(next);
            detected = true;
            toast.success(`Balance updated · +${formatUsd(data.amount)} USDC`, {
              description: `Now ${formatUsd(next)} in your account.`,
            });
            break;
          }
        }
        // Single refresh to pull in the new transaction row.
        if (detected) {
          await refresh();
        } else {
          // Polling timed out — the deposit posted but the balance hasn't
          // settled in 6s. Tell the user instead of leaving them guessing.
          toast.info("It will be confirmed in a few seconds");
        }
      } else {
        toast.error("Simulate deposit failed", { description: data.error });
      }
    } catch (err) {
      toast.error("Simulate deposit failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setSimulating(false);
    }
  };

  const copy = (label: string, value?: string | null) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2
          className="h-6 w-6 animate-spin text-[var(--color-ink-3)]"
          strokeWidth={1.75}
        />
      </div>
    );
  }

  const kyb = onboarding?.kybStatus ?? null;
  const isActive = kyb === "active";
  const hasOnramp = Boolean(onboarding?.onramp);

  // Split the balance into integer + cents so we can render the cents
  // smaller (matches the bank-style hero layout).
  const balanceParts = (() => {
    const n = Math.max(0, walletBalanceUsd);
    const [whole, cents = "00"] = n.toFixed(2).split(".");
    const wholeFmt = new Intl.NumberFormat("en-US").format(Number(whole));
    return { whole: `$${wholeFmt}`, cents: `.${cents}` };
  })();

  // 14-day payment activity (outbound USD volume per day) for the inline
  // SVG chart on the right side of the hero.
  const chart = (() => {
    const DAYS = 14;
    const buckets: { date: Date; total: number; count: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      buckets.push({ date: d, total: 0, count: 0 });
    }
    transactions.forEach((t) => {
      // Count all transaction volume — deposits + payouts, both rails.
      const ts =
        typeof t.createdAt === "number"
          ? t.createdAt * 1000
          : new Date(t.createdAt).getTime();
      const day = new Date(ts);
      day.setHours(0, 0, 0, 0);
      const idx = buckets.findIndex(
        (b) => b.date.getTime() === day.getTime()
      );
      if (idx >= 0) {
        buckets[idx].total += parseFloat(t.amount) || 0;
        buckets[idx].count += 1;
      }
    });
    const max = Math.max(...buckets.map((b) => b.total), 1);
    const totalAll = buckets.reduce((s, b) => s + b.total, 0);
    const countAll = buckets.reduce((s, b) => s + b.count, 0);
    return { buckets, max, totalAll, countAll };
  })();

  return (
    <div className="space-y-10">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">IndieBank · Sandbox</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
            Dashboard
          </h1>
        </div>
        {!isActive && (
          <button
            type="button"
            onClick={() => setKybModalOpen(true)}
            className="group inline-flex items-center gap-2 rounded-full border border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)] px-3 py-1.5 text-[11.5px] font-medium text-[var(--color-warning)] transition-colors hover:bg-[var(--color-warning)]/15"
          >
            <span className="grid size-4 place-items-center rounded-full bg-[var(--color-warning)]/15">
              <span className="size-1.5 animate-pulse rounded-full bg-[var(--color-warning)]" />
            </span>
            <span>Setup required · Complete KYB</span>
          </button>
        )}
      </div>

      {/* Hero — balance + activity line */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Total balance */}
        <div className="glass relative flex flex-col overflow-hidden rounded-[var(--radius-2xl)] p-6 sm:p-7 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">Total balance</p>
            <span className="rounded-full border border-black/[0.08] bg-white/65 px-2 py-0.5 text-[10px] font-medium tracking-[0.04em] text-[var(--color-ink-2)] backdrop-blur">
              USDC
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-0.5">
            <span className="text-[44px] font-semibold leading-none tracking-[-0.026em] text-[var(--color-ink)] tabular-nums sm:text-[52px]">
              {balanceParts.whole}
            </span>
            <span className="text-[22px] font-medium tracking-[-0.012em] text-[var(--color-ink-3)] tabular-nums">
              {balanceParts.cents}
            </span>
          </div>
        </div>

        {/* Activity — simple line chart */}
        <div className="glass flex flex-col rounded-[var(--radius-2xl)] p-6 sm:p-7 lg:col-span-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Activity</p>
              <p className="mt-1 text-[12px] text-[var(--color-ink-3)]">
                Last 14 days
              </p>
            </div>
            <div className="text-right">
              <p className="text-[18px] font-semibold tabular-nums text-[var(--color-ink)] tracking-[-0.014em]">
                {formatUsd(chart.totalAll)}
              </p>
              <p className="text-[10.5px] text-[var(--color-ink-3)]">
                {chart.countAll} transaction{chart.countAll === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <div className="mt-auto pt-2">
            <BalanceSparkline buckets={chart.buckets} max={chart.max} />
          </div>
        </div>

      </div>

      {/* Receive — neobank-style tabbed account details */}
      <section id="receive">
        <ReceiveCard
          hasOnramp={hasOnramp}
          onramp={onboarding?.onramp ?? null}
          wallet={onboarding?.wallet ?? null}
          onCopy={copy}
          simulating={simulating}
          onSimulateDeposit={simulateDeposit}
        />
      </section>

      {/* Transactions */}
      <section>
        <SectionHeader
          eyebrow="History"
          title="Activity"
          description="Every deposit and payment in your account."
        />

        {transactions.length === 0 ? (
          <div className="rounded-sm border border-dashed border-black/[0.08] bg-white/65 backdrop-blur-md px-5 py-8 text-center text-[13px] text-[var(--color-ink-3)]">
            No activity yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-sm border border-black/[0.06]">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-black/[0.06] bg-white/65 backdrop-blur-md text-[11px] uppercase tracking-wider text-[var(--color-ink-3)]">
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium">Date</th>
                  <th className="px-5 py-2.5 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06]">
                {transactions.slice(0, 12).map((tx) => {
                  const inbound = tx.sourceAsset === "USD";
                  const statusLabel =
                    tx.status.charAt(0).toUpperCase() +
                    tx.status.slice(1).replace(/_/g, " ");
                  return (
                    <tr
                      key={tx.id}
                      className="bg-white/65 backdrop-blur-md transition-colors hover:bg-white/45"
                    >
                      <td className="px-5 py-3 text-[var(--color-ink-2)]">
                        {statusLabel}
                      </td>
                      <td className="px-5 py-3 text-[var(--color-ink-3)]">
                        {formatDate(tx.createdAt)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono font-medium tabular-nums">
                        <span
                          className={
                            inbound
                              ? "text-[var(--color-success)]"
                              : "text-[var(--color-ink)]"
                          }
                        >
                          {inbound ? "+" : "-"}
                          {formatUsd(tx.amount)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* KYB onboarding modal */}
      <KybOnboardingModal
        open={kybModalOpen}
        onOpenChange={setKybModalOpen}
        hasCustomer={Boolean(onboarding?.customerId)}
        busy={onboardingBusy}
        onStart={runOnboarding}
      />
    </div>
  );
}
