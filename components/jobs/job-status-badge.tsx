import { cn } from "@/lib/utils";

export type JobStatus =
  | "open"
  | "assigned"
  | "submitted"
  | "reviewing"
  | "revisions_requested"
  | "approved"
  | "paid";

const labels: Record<JobStatus, string> = {
  open: "Open",
  assigned: "Assigned",
  submitted: "Submitted",
  reviewing: "Reviewing…",
  revisions_requested: "Revisions",
  approved: "Approved",
  paid: "Paid",
};

/**
 * Single bright accent only on key states (paid/approved) — everything else
 * is a calm pastel chip so the lime stays scarce in the UI.
 */
const styles: Record<JobStatus, string> = {
  open: "border-black/[0.10] bg-white/65 text-[var(--color-ink-2)]",
  assigned:
    "border-[#1c64f2]/20 bg-[#1c64f2]/[0.07] text-[#1147a6]",
  submitted:
    "border-[#7c3aed]/20 bg-[#7c3aed]/[0.07] text-[#5b21b6]",
  reviewing:
    "border-[#7c3aed]/20 bg-[#7c3aed]/[0.07] text-[#5b21b6]",
  revisions_requested:
    "border-[var(--color-warning)]/25 bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
  approved:
    "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]",
  paid: "border-[var(--color-success)]/25 bg-[var(--color-success-soft)] text-[var(--color-success)]",
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.06em]",
        styles[status]
      )}
    >
      {labels[status]}
    </span>
  );
}
