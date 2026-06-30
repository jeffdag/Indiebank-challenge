"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShieldCheck, Lock, Loader2, Info } from "lucide-react";
import { toast } from "sonner";

interface PolicyRule {
  id: string;
  ruleType: "approval_threshold" | "amount_threshold" | "address_list";
  action: "allow" | "deny";
  definition: Record<string, unknown>;
  createdAt: number;
}

interface Policy {
  id: string;
  name: string;
  description: string | null;
  version: number;
  createdAt: number;
  updatedAt: number;
  rules: PolicyRule[];
}

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

// Build a deduplication key for a policy. Two policies with the same rule
// type + same key parameters are functionally identical even if Dakota
// gave them different IDs/versions. Demo accounts accumulate duplicates
// from re-runs, so we collapse them to one row each.
function policySignature(p: Policy): string {
  const rule = p.rules[0];
  if (!rule) return `noop:${p.name}`;
  if (rule.ruleType === "amount_threshold") {
    return `amount_threshold:${rule.action}:${rule.definition.min_amount ?? 0}:${
      rule.definition.threshold ?? 0
    }`;
  }
  if (rule.ruleType === "approval_threshold") {
    return `approval_threshold:${rule.definition.threshold ?? 0}`;
  }
  if (rule.ruleType === "address_list") {
    const addrs = (rule.definition.addresses as string[] | undefined) ?? [];
    return `address_list:${rule.action}:${addrs.length}`;
  }
  return `${rule.ruleType}:${p.name}`;
}

// Keep the most recent (highest createdAt) of each functional duplicate
// and cap the table at MAX_VISIBLE so the page stays scannable.
const MAX_VISIBLE_POLICIES = 5;
function dedupePolicies(policies: Policy[]): {
  visible: Policy[];
  hiddenCount: number;
} {
  const bySig = new Map<string, Policy>();
  for (const p of policies) {
    const sig = policySignature(p);
    const existing = bySig.get(sig);
    if (!existing || p.createdAt > existing.createdAt) bySig.set(sig, p);
  }
  const unique = Array.from(bySig.values()).sort(
    (a, b) => b.createdAt - a.createdAt
  );
  return {
    visible: unique.slice(0, MAX_VISIBLE_POLICIES),
    hiddenCount: Math.max(0, unique.length - MAX_VISIBLE_POLICIES),
  };
}

// Translate a policy + first rule into one human-readable sentence the
// operator can actually understand without reading Dakota docs.
function describePolicy(p: Policy): string {
  const rule = p.rules[0];
  if (!rule) return p.description ?? p.name;

  if (rule.ruleType === "amount_threshold") {
    const minAmount = Number(rule.definition.min_amount ?? 0);
    const threshold = Number(rule.definition.threshold ?? 0);
    const verb = rule.action === "deny" ? "Block" : "Allow";
    if (threshold === 0) {
      return `${verb} any payout ≥ ${formatUsd(minAmount)} (hard limit, no override).`;
    }
    return `${verb} any payout ≥ ${formatUsd(minAmount)} unless ${threshold} approver${
      threshold === 1 ? "" : "s"
    } sign off.`;
  }

  if (rule.ruleType === "approval_threshold") {
    const threshold = Number(rule.definition.threshold ?? 0);
    return `Require ${threshold} approver${threshold === 1 ? "" : "s"} on every payout.`;
  }

  if (rule.ruleType === "address_list") {
    const addresses = (rule.definition.addresses as string[] | undefined) ?? [];
    const verb = rule.action === "deny" ? "Block" : "Allow only";
    return `${verb} payouts to ${addresses.length} specific address${
      addresses.length === 1 ? "" : "es"
    }.`;
  }

  return p.description ?? p.name;
}

export default function CompliancePage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [presetLabel, setPresetLabel] = useState("Block large payouts");
  const [name, setName] = useState("Block large payouts");
  const [description, setDescription] = useState(
    "Hard-stop any outbound payment above this amount."
  );
  const [amountUsd, setAmountUsd] = useState("10000");

  const fetchData = async () => {
    try {
      const res = await fetch("/api/compliance/policies");
      const data = await res.json();
      if (res.ok) {
        setPolicies(data.policies ?? []);
      } else {
        toast.error("Failed to load controls", { description: data.error });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error("Failed to load controls", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const createPolicy = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/compliance/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, amountUsd }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Control activated", {
          description: `${name} is now enforced on every outbound payment`,
        });
        setDialogOpen(false);
        await fetchData();
      } else {
        toast.error("Failed to activate control", { description: data.error });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error("Failed to activate control", { description: msg });
    } finally {
      setCreating(false);
    }
  };

  const openCreate = (preset: {
    label: string;
    name: string;
    description: string;
    amountUsd: string;
  }) => {
    setPresetLabel(preset.label);
    setName(preset.name);
    setDescription(preset.description);
    setAmountUsd(preset.amountUsd);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-10">
      {/* Page header */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-ink-3)]">
          IndieBank · Sandbox
        </p>
        <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-[var(--color-ink)]">
          Payment rules
        </h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[var(--color-ink-3)]">
          Guardrails for outbound payments. Built on Dakota&apos;s policy
          engine — every rule runs in-line before money moves. Add a rule
          here and it enforces on every payout, no code changes needed.
        </p>
      </div>

      {/* Active controls */}
      <section>
        <div className="mb-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-ink-3)]">
            Status
          </p>
          <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]">
            Active controls
          </h2>
        </div>

        {loading ? (
          <div className="overflow-hidden rounded-sm border border-black/[0.06] bg-white/65 backdrop-blur-md">
            <div className="border-b border-black/[0.06] bg-white/40 px-4 py-2">
              <Skeleton className="h-3 w-32" />
            </div>
            {[0, 1].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 border-b border-black/[0.06] px-4 py-3 last:border-0"
              >
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-10" />
              </div>
            ))}
          </div>
        ) : policies.length === 0 ? (
          <div className="rounded-sm border border-dashed border-black/[0.08] bg-white/65 backdrop-blur-md px-5 py-8 text-center text-[13px] text-[var(--color-ink-3)]">
            No controls active. Add one below to start enforcing.
          </div>
        ) : (
          (() => {
            const { visible, hiddenCount } = dedupePolicies(policies);
            return (
              <>
                <div className="overflow-hidden rounded-sm border border-black/[0.06] bg-white/65 backdrop-blur-md">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-black/[0.06] bg-white/40 text-left text-[10.5px] font-medium uppercase tracking-wider text-[var(--color-ink-3)]">
                        <th className="px-4 py-2.5 font-medium">Status</th>
                        <th className="px-4 py-2.5 font-medium">Control</th>
                        <th className="px-4 py-2.5 font-medium">Rule</th>
                        <th className="px-4 py-2.5 text-right font-medium">
                          Version
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((p) => (
                        <tr
                          key={p.id}
                          className="border-b border-black/[0.06] last:border-0"
                        >
                          <td className="px-4 py-3 align-top">
                            <span className="inline-flex items-center gap-1.5 rounded-sm bg-[var(--color-success)]/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-success)]">
                              <ShieldCheck
                                className="h-3 w-3"
                                strokeWidth={2}
                              />
                              Active
                            </span>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <p className="text-[13px] font-medium text-[var(--color-ink)]">
                              {describePolicy(p)}
                            </p>
                            <p className="mt-0.5 text-[11.5px] text-[var(--color-ink-3)]">
                              {p.name}
                              {p.description ? ` · ${p.description}` : ""}
                            </p>
                          </td>
                          <td className="px-4 py-3 align-top text-[12px] text-[var(--color-ink-3)]">
                            {p.rules[0]?.ruleType.replace(/_/g, " ") ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-right align-top font-mono text-[12px] text-[var(--color-ink-3)] tabular-nums">
                            v{p.version}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[11px] text-[var(--color-ink-4)]">
                  Enforced on every outbound payment. Removing a control
                  requires multi-sig endorsement (production: signed via your
                  HSM/KMS; demo: not wired).
                  {hiddenCount > 0
                    ? ` · ${hiddenCount} duplicate${
                        hiddenCount === 1 ? "" : "s"
                      } hidden (demo accounts accumulate dupes from re-runs).`
                    : ""}
                </p>
              </>
            );
          })()
        )}
      </section>

      {/* Add a control */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-ink-3)]">
              Library
            </p>
            <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]">
              Add a control
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {/* Block specific addresses — not wired (placeholder) */}
          <div className="flex cursor-not-allowed flex-col gap-2 rounded-sm border border-black/[0.06] bg-white/65 backdrop-blur-md/60 p-5 opacity-60">
            <div className="flex items-center gap-2 text-[var(--color-ink-2)]">
              <Lock className="h-3.5 w-3.5 text-[var(--color-ink-3)]" strokeWidth={2} />
              <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-ink-3)]">
                Address list
              </span>
            </div>
            <p className="text-[14px] font-medium text-[var(--color-ink-2)]">
              Block specific addresses
            </p>
            <p className="text-[12.5px] leading-relaxed text-[var(--color-ink-3)]">
              Hard-stop payouts to sanctioned / disallowed crypto addresses.
              Wires the same way as the amount control above.
            </p>
            <div className="mt-1 text-[11px] text-[var(--color-ink-3)]">Not wired in demo</div>
          </div>

          {/* Multi-sig — not wired */}
          <div className="flex cursor-not-allowed flex-col gap-2 rounded-sm border border-black/[0.06] bg-white/65 backdrop-blur-md/60 p-5 opacity-60">
            <div className="flex items-center gap-2 text-[var(--color-ink-2)]">
              <Lock className="h-3.5 w-3.5 text-[var(--color-ink-3)]" strokeWidth={2} />
              <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-ink-3)]">
                Approval threshold
              </span>
            </div>
            <p className="text-[14px] font-medium text-[var(--color-ink-2)]">
              Require multi-sig on every payout
            </p>
            <p className="text-[12.5px] leading-relaxed text-[var(--color-ink-3)]">
              N-of-M approvers must endorse a payout before it executes.
              Requires the signing flow (ECDSA P-256 over RFC 8785).
            </p>
            <div className="mt-1 text-[11px] text-[var(--color-ink-3)]">Not wired in demo</div>
          </div>
        </div>

        {/* Honest footer */}
        <div className="mt-4 flex items-start gap-2 rounded-sm border border-black/[0.06] bg-white/65 backdrop-blur-md px-4 py-3 text-[12px] text-[var(--color-ink-3)]">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-ink-4)]" strokeWidth={2} />
          <p className="leading-relaxed">
            <span className="text-[var(--color-ink-2)]">In production</span>, removing or
            modifying a control fires an endorsed-request to Dakota&apos;s
            policy engine (signed envelope, ECDSA P-256 over RFC 8785
            canonical JSON). This demo wires{" "}
            <span className="text-[var(--color-ink-2)]">create</span> but not{" "}
            <span className="text-[var(--color-ink-2)]">remove</span> — the controls above
            stay active for the lifetime of the customer.
          </p>
        </div>
      </section>

      {/* Activate dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-sm border-black/[0.08] bg-white/65 backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-[var(--color-ink)]">{presetLabel}</DialogTitle>
            <DialogDescription className="text-[var(--color-ink-3)]">
              This control will enforce on every outbound payment from your
              treasury, immediately and irrevocably (the demo doesn&apos;t
              wire the multi-sig remove flow).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[12px] text-[var(--color-ink-3)]">
                Control name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 rounded-sm border-black/[0.08] bg-white/55 text-[13px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="amount"
                className="text-[12px] text-[var(--color-ink-3)]"
              >
                Block payouts ≥ ($ USD)
              </Label>
              <Input
                id="amount"
                type="number"
                min="1"
                step="1"
                value={amountUsd}
                onChange={(e) => setAmountUsd(e.target.value)}
                className="h-9 rounded-sm border-black/[0.08] bg-white/55 font-mono text-[13px] tabular-nums"
              />
              <p className="text-[11px] text-[var(--color-ink-3)]">
                Any payment at or above this amount will be denied at the
                policy engine.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="description"
                className="text-[12px] text-[var(--color-ink-3)]"
              >
                Description (optional)
              </Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-9 rounded-sm border-black/[0.08] bg-white/55 text-[13px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              className="h-9 rounded-sm border border-black/[0.08] px-4 text-[12px] text-[var(--color-ink-3)] hover:bg-white/55 hover:text-[var(--color-ink)]"
            >
              Cancel
            </Button>
            <Button
              onClick={createPolicy}
              disabled={creating || !name || !amountUsd}
              className="h-9 rounded-sm bg-[var(--color-accent)] px-4 text-[12px] font-medium text-[var(--color-accent-ink)] hover:bg-[var(--color-accent)]"
            >
              {creating ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShieldCheck
                  className="mr-1.5 h-3.5 w-3.5"
                  strokeWidth={2}
                />
              )}
              Activate control
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
