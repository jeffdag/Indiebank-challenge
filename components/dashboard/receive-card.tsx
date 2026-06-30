"use client";

import { useState } from "react";
import {
  ArrowDownLeft,
  Check,
  Copy,
  Loader2,
  Share2,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { TREASURY_BANK_NAME } from "@/lib/utils";

interface OnrampInfo {
  bankName: string | null;
  routingNumber: string | null;
  accountNumber: string | null;
  accountHolderName: string | null;
  accountType: string | null;
}

interface WalletInfo {
  address: string;
  network: string;
}

interface Props {
  hasOnramp: boolean;
  onramp: OnrampInfo | null;
  wallet: WalletInfo | null;
  onCopy: (label: string, value: string | null | undefined) => void;
  /** Optional sandbox-only simulate-deposit hook. Omit on pages that don't expose it. */
  simulating?: boolean;
  onSimulateDeposit?: () => void | Promise<void>;
}

type Channel = "usd" | "usdc";

/**
 * Receive money — a neobank-style card with a tab switcher between the USD
 * ACH rail and the on-chain USDC rail. Each panel features:
 *
 *   - A featured value (account number for USD; address + faux QR for USDC)
 *   - Per-row copy interactions
 *   - A status footer with the one-liner about settlement behaviour
 */
export function ReceiveCard({
  hasOnramp,
  onramp,
  wallet,
  onCopy,
  simulating,
  onSimulateDeposit,
}: Props) {
  const [channel, setChannel] = useState<Channel>("usd");

  return (
    <div className="glass overflow-hidden rounded-[var(--radius-2xl)] p-6 sm:p-7">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Receive</p>
          <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.014em] text-[var(--color-ink)]">
            Share your details, get paid
          </h2>
          <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-[var(--color-ink-3)]">
            Two rails, one balance. USD lands as ACH and auto-converts.
            USDC settles on-chain in seconds.
          </p>
        </div>

        {/* Tab switcher (mobile + desktop) */}
        <div className="inline-flex rounded-full border border-black/[0.06] bg-white/65 p-1 backdrop-blur-md">
          <TabButton
            active={channel === "usd"}
            onClick={() => setChannel("usd")}
            icon={
              <span className="grid size-4 place-items-center rounded-full bg-[var(--color-ink)] text-[8px] font-bold text-white">
                $
              </span>
            }
            label="USD"
          />
          <TabButton
            active={channel === "usdc"}
            onClick={() => setChannel("usdc")}
            icon={
              <span className="grid size-4 place-items-center rounded-full bg-[var(--color-accent)] text-[8px] font-bold text-[var(--color-accent-ink)]">
                ₵
              </span>
            }
            label="USDC"
          />
        </div>
      </div>

      {/* Panels */}
      {channel === "usd" ? (
        <div className="mt-6">
          <UsdFeatured
            onramp={onramp}
            hasOnramp={hasOnramp}
            onCopy={onCopy}
            simulating={simulating}
            onSimulateDeposit={onSimulateDeposit}
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
          <UsdcPanel wallet={wallet} onCopy={onCopy} />
          <UsdcFeatured wallet={wallet} onCopy={onCopy} />
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────── Sub-components ───────────────────────── */

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-[background-color,color,box-shadow] duration-[180ms] " +
        (active
          ? "bg-[var(--color-ink)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_6px_14px_-8px_rgba(20,20,40,0.4)]"
          : "text-[var(--color-ink-2)] hover:text-[var(--color-ink)]")
      }
    >
      {icon}
      {label}
    </button>
  );
}

/* ───────────────────────────── USD card ─────────────────────────────── */

function UsdFeatured({
  onramp,
  hasOnramp,
  onCopy,
  simulating,
  onSimulateDeposit,
}: {
  onramp: OnrampInfo | null;
  hasOnramp: boolean;
  onCopy: (label: string, value: string | null | undefined) => void;
  simulating?: boolean;
  onSimulateDeposit?: () => void | Promise<void>;
}) {
  if (!hasOnramp) {
    return (
      <EmptyPanel
        title="USD account not provisioned"
        body="Finish onboarding to get your routing + account number."
      />
    );
  }
  return (
    <div className="relative h-full overflow-hidden rounded-[var(--radius-2xl)] bg-[var(--color-ink)] p-5 text-white shadow-[0_18px_42px_-12px_rgba(20,20,40,0.35)]">
      {/* Subtle accent corner glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-60"
        style={{
          background:
            "radial-gradient(circle, rgba(215,254,3,0.4) 0%, rgba(215,254,3,0) 60%)",
          filter: "blur(20px)",
        }}
      />

      <div className="relative flex items-center justify-between">
        <span className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-white/55">
          USD account
        </span>
        <span className="rounded-full border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[9.5px] font-medium uppercase tracking-[0.12em] text-white/75">
          ACH · Wire
        </span>
      </div>

      <div className="relative mt-5">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-white/50">
          Account number
        </p>
        <button
          onClick={() => onCopy("Account number", onramp?.accountNumber)}
          className="mt-1.5 flex items-baseline gap-2 text-left"
        >
          <span className="font-mono text-[26px] font-medium leading-tight tracking-[0.04em] text-white tabular-nums">
            {formatAccountNumber(onramp?.accountNumber)}
          </span>
          <Copy
            className="h-3.5 w-3.5 text-white/35 transition-colors group-hover:text-white"
            strokeWidth={2}
          />
        </button>
      </div>

      <div className="relative mt-5 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-white/45">
            Routing
          </p>
          <p className="mt-0.5 font-mono text-[13px] tabular-nums text-white">
            {onramp?.routingNumber ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-white/45">
            Bank
          </p>
          <p className="mt-0.5 text-[13px] text-white">{TREASURY_BANK_NAME}</p>
        </div>
      </div>

      <div className="relative mt-5 flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-[var(--color-accent)] [box-shadow:0_0_8px_rgba(215,254,3,0.8)]" />
        <span className="text-[11px] text-white/70">
          {onramp?.accountHolderName ?? "Account"}
        </span>
      </div>

      {onSimulateDeposit && (
        <div className="relative mt-5 border-t border-white/[0.08] pt-4">
          <Button
            size="sm"
            onClick={onSimulateDeposit}
            disabled={simulating}
            className="w-full"
          >
            {simulating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ArrowDownLeft className="h-3 w-3" strokeWidth={2} />
            )}
            Deposit to account
          </Button>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────── USDC panels ──────────────────────────── */

function UsdcPanel({
  wallet,
  onCopy,
}: {
  wallet: WalletInfo | null;
  onCopy: (label: string, value: string | null | undefined) => void;
}) {
  if (!wallet) {
    return (
      <EmptyPanel
        title="Account wallet not provisioned"
        body="Finish onboarding to receive USDC on-chain."
      />
    );
  }
  return (
    <div
      className="relative h-full overflow-hidden rounded-[var(--radius-2xl)] p-5"
      style={{
        background: "#152448",
        color: "#ffffff",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.08), 0 18px 42px -12px rgba(20,30,80,0.4)",
      }}
    >
      {/* Soft USDC-blue corner glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-70"
        style={{
          background:
            "radial-gradient(circle, rgba(80,150,255,0.5) 0%, rgba(80,150,255,0) 60%)",
          filter: "blur(20px)",
        }}
      />

      <div className="relative flex items-center justify-between">
        <span
          className="text-[10.5px] font-medium uppercase tracking-[0.14em]"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          USDC wallet
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[9.5px] font-medium uppercase tracking-[0.12em]"
          style={{
            color: "rgba(255,255,255,0.78)",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          On-chain
        </span>
      </div>

      <div className="relative mt-5">
        <p
          className="text-[10.5px] font-medium uppercase tracking-[0.1em]"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          Address
        </p>
        <button
          onClick={() => onCopy("Wallet address", wallet.address)}
          className="group/addr mt-1.5 flex w-full items-center gap-2 text-left"
        >
          <span
            className="break-all font-mono text-[14px] font-medium leading-snug tracking-[0.02em]"
            style={{ color: "#ffffff" }}
          >
            {wallet.address}
          </span>
          <Copy
            className="h-3.5 w-3.5 shrink-0 transition-colors group-hover/addr:!text-white"
            style={{ color: "rgba(255,255,255,0.35)" }}
            strokeWidth={2}
          />
        </button>
      </div>

      <div className="relative mt-5 grid grid-cols-2 gap-x-3 gap-y-4">
        {[
          { label: "Network", value: wallet.network },
          { label: "Asset", value: "USDC" },
          { label: "Settles", value: "On-chain · seconds" },
          { label: "Availability", value: "24/7" },
        ].map((row) => (
          <div key={row.label}>
            <p
              className="text-[10px] font-medium uppercase tracking-[0.1em]"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              {row.label}
            </p>
            <p className="mt-0.5 text-[13px]" style={{ color: "#ffffff" }}>
              {row.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsdcFeatured({
  wallet,
  onCopy,
}: {
  wallet: WalletInfo | null;
  onCopy: (label: string, value: string | null | undefined) => void;
}) {
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-4 overflow-hidden rounded-[var(--radius-2xl)] border border-black/[0.06] bg-white/85 p-6 backdrop-blur-md">
      {/* Lime accent corner */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(215,254,3,0.35) 0%, rgba(215,254,3,0) 60%)",
          filter: "blur(20px)",
        }}
      />

      {wallet?.address ? (
        <div className="relative rounded-[var(--radius-md)] bg-white p-2.5 shadow-[inset_0_0_0_1px_rgba(10,10,10,0.06)]">
          <QRCodeSVG
            value={wallet.address}
            size={148}
            level="M"
            fgColor="var(--color-ink)"
            bgColor="#ffffff"
            imageSettings={{
              src:
                "data:image/svg+xml;utf8," +
                encodeURIComponent(
                  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
                    '<rect width="24" height="24" rx="6" fill="#D7FE03"/>' +
                    '<text x="12" y="17" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="14" fill="#0A0A0A">₵</text>' +
                    "</svg>"
                ),
              height: 28,
              width: 28,
              excavate: true,
            }}
          />
        </div>
      ) : (
        <div className="grid h-[168px] w-[168px] place-items-center rounded-[var(--radius-md)] bg-white shadow-[inset_0_0_0_1px_rgba(10,10,10,0.06)] text-[11px] text-[var(--color-ink-3)]">
          No address yet
        </div>
      )}

      <div className="relative w-full text-center">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-[var(--color-ink-3)]">
          {wallet?.network ?? "—"}
        </p>
        <p className="mt-1 font-mono text-[12px] text-[var(--color-ink-2)]">
          {wallet?.address ? shortAddress(wallet.address) : "—"}
        </p>
      </div>

      {wallet?.address && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onCopy("Wallet address", wallet.address)}
        >
          <Share2 className="h-3 w-3" strokeWidth={2} />
          Copy address
        </Button>
      )}
    </div>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-black/[0.12] bg-white/45 p-8 text-center text-[12.5px] text-[var(--color-ink-3)]">
      <Check className="h-4 w-4 text-[var(--color-ink-4)]" strokeWidth={2} />
      <p className="font-medium text-[var(--color-ink-2)]">{title}</p>
      <p>{body}</p>
    </div>
  );
}

/* ───────────────────────────── formatting helpers ───────────────────── */

function formatAccountNumber(n: string | null | undefined): string {
  if (!n) return "—";
  // Group in 4s for readability, like a card number.
  return n.replace(/(.{4})/g, "$1 ").trim();
}

function shortAddress(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}
