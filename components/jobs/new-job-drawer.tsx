"use client";

import { useState } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { toast } from "sonner";
import { ClipboardList, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FreelancerOption } from "./types";

/**
 * Right-side drawer for posting a new job. Mirrors the AI review and
 * "Add worker" drawers — slide-in from the right, glass panel, sectioned
 * form with eyebrow labels, sticky footer CTA.
 */
export function NewJobDrawer({
  open,
  onOpenChange,
  freelancers,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  freelancers: FreelancerOption[];
  onCreated: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [title, setTitle] = useState("");
  const [requirements, setRequirements] = useState("");
  const [designUrl, setDesignUrl] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");

  const canSubmit = !loading && title.trim() && requirements.trim();

  async function onSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          requirements: requirements.trim(),
          design_url: designUrl || null,
          estimated_hours: estimatedHours || null,
          assigned_to: assignedTo || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success("Job posted");
      // Reset form
      setTitle("");
      setRequirements("");
      setDesignUrl("");
      setEstimatedHours("");
      setAssignedTo("");
      onOpenChange(false);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-[rgba(20,20,40,0.18)] supports-backdrop-filter:backdrop-blur-md data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup
          className={[
            "fixed inset-y-3 right-3 z-50 flex w-full max-w-[520px] flex-col gap-0",
            "rounded-[var(--radius-2xl)] border border-white/85 bg-white/88 text-[var(--color-ink)] outline-none",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(10,10,10,0.04),0_30px_60px_-20px_rgba(20,20,40,0.18),0_10px_24px_-10px_rgba(20,20,40,0.10)]",
            "[backdrop-filter:blur(28px)_saturate(170%)] [-webkit-backdrop-filter:blur(28px)_saturate(170%)]",
            "duration-300 [transition-timing-function:var(--ease-apple)]",
            "data-open:animate-in data-open:slide-in-from-right",
            "data-closed:animate-out data-closed:slide-out-to-right",
          ].join(" ")}
        >
          {/* Header */}
          <div className="flex h-14 items-center justify-between border-b border-black/[0.06] px-5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_4px_10px_-4px_rgba(180,220,0,0.55)]">
                <ClipboardList className="h-3.5 w-3.5" strokeWidth={2} />
              </div>
              <DialogPrimitive.Title className="text-[14px] font-semibold tracking-[-0.012em] text-[var(--color-ink)]">
                Post a job
              </DialogPrimitive.Title>
            </div>
            <DialogPrimitive.Close className="rounded-full p-1.5 text-[var(--color-ink-3)] transition-colors hover:bg-black/[0.05] hover:text-[var(--color-ink)]">
              <X className="h-4 w-4" strokeWidth={1.75} />
            </DialogPrimitive.Close>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <DialogPrimitive.Description className="text-[12.5px] leading-relaxed text-[var(--color-ink-3)]">
              Clear requirements → better AI reviews. The agent reads what you
              wrote here and checks every line item against what the
              freelancer submits.
            </DialogPrimitive.Description>

            <form
              className="mt-6 space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                onSubmit();
              }}
            >
              <Section title="Brief">
                <Field label="Title">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Build landing page hero"
                    autoFocus
                  />
                </Field>
                <Field
                  label="Requirements"
                  hint="Markdown supported. The AI agent verifies each requirement individually."
                >
                  <textarea
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    required
                    rows={7}
                    placeholder={`- Hero with H1 + CTA matching Figma\n- Tailwind only, no extra libs\n- Mobile-first responsive\n- Lighthouse perf > 90`}
                    className="field-input flex w-full px-3 py-2.5 text-[13px] leading-relaxed"
                  />
                </Field>
              </Section>

              <Section title="Optional context">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Design URL">
                    <Input
                      type="url"
                      value={designUrl}
                      onChange={(e) => setDesignUrl(e.target.value)}
                      placeholder="https://figma.com/…"
                    />
                  </Field>
                  <Field label="Estimated hours">
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={estimatedHours}
                      onChange={(e) => setEstimatedHours(e.target.value)}
                      placeholder="8"
                    />
                  </Field>
                </div>
              </Section>

              <Section title="Assignment">
                <Field
                  label="Assign to"
                  hint="Leave empty to post the job as open. You can still assign it later."
                >
                  <Select
                    value={assignedTo}
                    onValueChange={(v) => setAssignedTo(v ?? "")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pick a freelancer (or leave open)">
                        {(value) => {
                          if (!value)
                            return "Pick a freelancer (or leave open)";
                          const f = freelancers.find((x) => x.id === value);
                          if (!f) return value as string;
                          const label =
                            f.full_name ?? f.email ?? "Freelancer";
                          return f.hourly_rate_usd
                            ? `${label} · $${Number(
                                f.hourly_rate_usd
                              ).toFixed(2)}/h`
                            : label;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {freelancers.length === 0 ? (
                        <SelectItem value="__none__" disabled>
                          No freelancers signed up yet
                        </SelectItem>
                      ) : (
                        freelancers.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.full_name ?? f.email}
                            {f.hourly_rate_usd
                              ? ` · $${Number(f.hourly_rate_usd).toFixed(2)}/h`
                              : ""}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </Field>
              </Section>

              {/* hidden submit for Enter-to-submit */}
              <button type="submit" className="hidden" tabIndex={-1} />
            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-black/[0.06] px-5 py-4">
            <DialogPrimitive.Close
              render={(props) => (
                <Button
                  {...props}
                  variant="ghost"
                  size="default"
                  disabled={loading}
                >
                  Cancel
                </Button>
              )}
            />
            <Button onClick={onSubmit} disabled={!canSubmit} size="default">
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              )}
              Post job
            </Button>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/* ──────────────────────────── sub-components ───────────────────────── */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="eyebrow">{title}</p>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11.5px] font-medium text-[var(--color-ink-2)]">
        {label}
      </Label>
      {children}
      {hint && (
        <p className="text-[11px] leading-relaxed text-[var(--color-ink-3)]">
          {hint}
        </p>
      )}
    </div>
  );
}
