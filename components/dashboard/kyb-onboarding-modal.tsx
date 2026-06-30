"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  ShieldCheck,
  Sparkles,
  Wallet,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasCustomer: boolean;
  busy: boolean;
  onStart: () => void;
}

export function KybOnboardingModal({
  open,
  onOpenChange,
  hasCustomer,
  busy,
  onStart,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-3 p-5 sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="grid size-7 place-items-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_3px_8px_-3px_rgba(180,220,0,0.55)]">
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} />
            </div>
            <DialogTitle className="text-[15px] font-semibold tracking-[-0.012em]">
              {hasCustomer ? "Finish KYB" : "Verify your business"}
            </DialogTitle>
          </div>
          <DialogDescription className="mt-1 text-[12px] leading-relaxed text-[var(--color-ink-3)]">
            KYB (Know Your Business) is required before money can move. In
            sandbox we auto-approve it.
          </DialogDescription>
        </DialogHeader>

        {/* Sandbox flow diagram — compact */}
        <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-1.5">
          <Step icon={Building2} label="Customer" />
          <Connector />
          <Step icon={Sparkles} label="KYB approve" accent />
          <Connector />
          <Step icon={Wallet} label="Provision" />
        </div>

        <p className="text-[11px] leading-relaxed text-[var(--color-ink-3)]">
          Production submits docs + beneficial owners; verdict in 1–2 days.{" "}
          <a
            href="https://docs.dakota.xyz/guides/onboarding"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 font-medium text-[var(--color-ink)] underline decoration-[var(--color-accent)] decoration-[2px] underline-offset-2 hover:no-underline"
          >
            Docs
            <ArrowUpRight className="h-2.5 w-2.5" strokeWidth={2} />
          </a>
        </p>

        <DialogFooter className="mt-1 gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Later
          </Button>
          <Button size="sm" onClick={onStart} disabled={busy}>
            {busy ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ArrowRight className="h-3 w-3" strokeWidth={2} />
            )}
            {hasCustomer ? "Approve KYB" : "Start"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Step({
  icon: Icon,
  label,
  accent,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  accent?: boolean;
}) {
  return (
    <div
      className={
        "flex flex-col items-center justify-center gap-1 rounded-[var(--radius-sm)] border px-1.5 py-2 text-center " +
        (accent
          ? "border-[var(--color-accent)] bg-[var(--color-accent)]/[0.12]"
          : "border-black/[0.08] bg-white/65")
      }
    >
      <span
        className={
          "grid size-5 place-items-center rounded-full " +
          (accent
            ? "bg-[var(--color-accent-ink)] text-[var(--color-accent)]"
            : "bg-black/[0.05] text-[var(--color-ink)]")
        }
      >
        <Icon className="h-2.5 w-2.5" strokeWidth={2} />
      </span>
      <span className="text-[10.5px] font-medium leading-tight text-[var(--color-ink)]">
        {label}
      </span>
    </div>
  );
}

function Connector() {
  return (
    <div className="flex items-center justify-center text-[var(--color-ink-3)]">
      <ArrowRight className="h-3 w-3" strokeWidth={1.75} />
    </div>
  );
}
