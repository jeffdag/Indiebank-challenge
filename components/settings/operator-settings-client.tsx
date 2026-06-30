"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Loader2, LogOut } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";

interface OnrampDetails {
  accountId: string;
  bankName: string | null;
  routingNumber: string | null;
  accountNumber: string | null;
  accountHolderName: string | null;
  accountType: string | null;
  status: string | null;
}

interface OnboardingState {
  wallet?: {
    walletId: string;
    address: string;
    network: string;
    networkId: string;
  } | null;
  onramp?: OnrampDetails | null;
}

function Row({
  label,
  value,
  mono,
  copyable,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
}) {
  const copy = async () => {
    if (!copyable || value === "—") return;
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };
  return (
    <div className="flex items-center justify-between gap-4 border-b border-black/[0.06] px-5 py-3.5 last:border-b-0">
      <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-ink-3)]">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span
          className={
            mono
              ? "font-mono text-[12px] tabular-nums text-[var(--color-ink)]"
              : "text-[13px] text-[var(--color-ink)]"
          }
        >
          {value}
        </span>
        {copyable && value !== "—" ? (
          <button
            onClick={copy}
            className="rounded-full border border-black/[0.08] bg-white/55 p-1.5 text-[var(--color-ink-3)] backdrop-blur transition-colors hover:bg-white/90 hover:text-[var(--color-ink)]"
          >
            <Copy className="h-3 w-3" strokeWidth={1.75} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function OperatorSettingsClient() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data }, oRes] = await Promise.all([
        supabase.auth.getUser(),
        fetch("/api/onboarding"),
      ]);
      setUser(data.user);
      if (oRes.ok) setOnboarding(await oRes.json());
      setLoading(false);
    })();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-32" />
        </div>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-3">
            <div className="space-y-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-72" />
            </div>
            <div className="glass overflow-hidden rounded-[var(--radius-lg)] p-0">
              {[0, 1, 2].map((j) => (
                <div
                  key={j}
                  className="flex items-center justify-between border-b border-black/[0.06] px-5 py-3.5 last:border-0"
                >
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const bank = onboarding?.onramp;
  const wallet = onboarding?.wallet;

  return (
    <div className="space-y-9">
      <div>
        <p className="eyebrow">Account</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
          Settings
        </h1>
      </div>

      <section>
        <div className="mb-3">
          <h2 className="text-[15px] font-semibold tracking-[-0.012em] text-[var(--color-ink)]">
            Receive — USD (ACH/Wire)
          </h2>
          <p className="text-[12.5px] text-[var(--color-ink-3)]">
            Share these with any US-based payer. Dakota auto-converts inbound
            USD to USDC into your treasury.
          </p>
        </div>
        <div className="glass overflow-hidden rounded-[var(--radius-lg)] p-0">
          <Row label="Bank" value={bank?.bankName ?? "—"} />
          <Row
            label="Routing # (ABA)"
            value={bank?.routingNumber ?? "—"}
            mono
            copyable
          />
          <Row
            label="Account #"
            value={bank?.accountNumber ?? "—"}
            mono
            copyable
          />
          <Row label="Account holder" value={bank?.accountHolderName ?? "—"} />
          <Row label="Account type" value={bank?.accountType ?? "—"} />
        </div>
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-[15px] font-semibold tracking-[-0.012em] text-[var(--color-ink)]">
            Receive — USDC (on-chain)
          </h2>
          <p className="text-[12.5px] text-[var(--color-ink-3)]">
            Share this address with anyone in the world. USDC settles directly
            to your treasury wallet on-chain — 24/7, no banking days.
          </p>
        </div>
        <div className="glass overflow-hidden rounded-[var(--radius-lg)] p-0">
          <Row label="Network" value={wallet?.network ?? "—"} />
          <Row
            label="Wallet address"
            value={wallet?.address ?? "—"}
            mono
            copyable
          />
        </div>
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-[15px] font-semibold tracking-[-0.012em] text-[var(--color-ink)]">
            Operator
          </h2>
          <p className="text-[12.5px] text-[var(--color-ink-3)]">
            Your signed-in identity.
          </p>
        </div>
        <div className="glass overflow-hidden rounded-[var(--radius-lg)] p-0">
          <Row label="Email" value={user?.email ?? "—"} />
          <Row label="User ID" value={user?.id ?? "—"} mono />
        </div>
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-[15px] font-semibold tracking-[-0.012em] text-[var(--color-ink)]">
            Dakota
          </h2>
          <p className="text-[12.5px] text-[var(--color-ink-3)]">
            Integration environment for this app.
          </p>
        </div>
        <div className="glass overflow-hidden rounded-[var(--radius-lg)] p-0">
          <Row label="Environment" value="Sandbox" />
          <Row label="SDK" value="@dakota-xyz/ts-sdk" mono />
        </div>
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-[15px] font-semibold tracking-[-0.012em] text-[var(--color-ink)]">
            Session
          </h2>
        </div>
        <div className="glass flex items-center justify-between rounded-[var(--radius-lg)] px-5 py-4">
          <div>
            <p className="text-[13.5px] font-medium text-[var(--color-ink)]">
              Sign out
            </p>
            <p className="text-[12.5px] text-[var(--color-ink-3)]">
              End this session and return to login.
            </p>
          </div>
          <Button onClick={handleSignOut} variant="destructive" size="sm">
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
            Sign out
          </Button>
        </div>
      </section>
    </div>
  );
}
