"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  ExternalLink,
  Loader2,
  Send,
  Sparkles,
  X,
  ChevronRight,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { JobStatusBadge } from "./job-status-badge";
import { AiReviewDrawer } from "./ai-review-drawer";
import type { FreelancerOption, Job, JobSubmission } from "./types";

/**
 * Expanded job panel.
 *
 * Layout:
 *   ┌─────────────────────────────────────────────────────┐
 *   │ Top action card (operator only)                     │
 *   │   "Review the recent submission with AI Agent"      │
 *   │   [Analyze]   [Pay $X]                              │
 *   ├─────────────────────────────────────────────────────┤
 *   │ Job details (left)   │  Submission timeline (right) │
 *   │  Requirements         │   Today · 5.5h · ✓ Approved │
 *   │  Status, assignee     │   Yesterday · ✗ Revisions   │
 *   │  Design URL, hours    │   …                          │
 *   └─────────────────────────────────────────────────────┘
 *
 * Clicking any submission row opens the AI review drawer pre-loaded with
 * that submission. The latest can be re-analyzed; older ones are read-only
 * (just show the cached verdict).
 */
export function JobDetail({
  job,
  assignee,
  role,
  onMutated,
}: {
  job: Job;
  assignee: FreelancerOption | null;
  role: "operator" | "freelancer";
  onMutated: () => void;
}) {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<JobSubmission[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [drawerSubId, setDrawerSubId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/jobs/${job.id}/submissions`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setSubmissions(d.submissions ?? []);
      })
      .catch(() => {
        if (!cancelled) setSubmissions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [job.id, job.updated_at]);

  const latest = submissions?.[0] ?? null;
  const rate = assignee?.hourly_rate_usd ? Number(assignee.hourly_rate_usd) : null;
  const previewAmount =
    rate != null && latest ? rate * Number(latest.hours_worked) : null;

  const drawerSubmission = drawerSubId
    ? submissions?.find((s) => s.id === drawerSubId) ?? null
    : null;
  const isViewingLatest = drawerSubId === latest?.id;

  async function onPay() {
    setPaying(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Pay failed");
      toast.success(`Paid $${data.amount} (${data.hours}h × $${data.rate}/h)`);
      onMutated();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Pay failed");
    } finally {
      setPaying(false);
    }
  }

  const canAnalyze =
    role === "operator" &&
    latest &&
    (job.status === "submitted" ||
      job.status === "reviewing" ||
      job.status === "revisions_requested" ||
      job.status === "approved");

  const canPay =
    role === "operator" && job.status === "approved" && assignee?.id;

  return (
    <div className="space-y-5">
      {/* ── Action card ─────────────────────────────────────────────── */}
      {role === "operator" && latest && (canAnalyze || canPay) && (
        <ActionCard
          job={job}
          latest={latest}
          rate={rate}
          previewAmount={previewAmount}
          paying={paying}
          canAnalyze={Boolean(canAnalyze)}
          canPay={Boolean(canPay)}
          onAnalyze={() => setDrawerSubId(latest.id)}
          onPay={onPay}
        />
      )}
      {role === "operator" && job.status === "paid" && (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-success)]/25 bg-[var(--color-success-soft)] px-4 py-3 text-[12.5px] text-[var(--color-success)]">
          <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
          <span>
            Paid — see your dashboard for ACH settlement status.
          </span>
        </div>
      )}

      {/* ── 2-col: job summary + submission timeline ───────────────── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* Job summary */}
        <div className="space-y-3">
          <Field label="Requirements">
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-[var(--radius-sm)] border border-black/[0.06] bg-white/55 p-3 text-[12.5px] leading-relaxed text-[var(--color-ink-2)] backdrop-blur-md">
              {job.requirements}
            </pre>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <JobStatusBadge status={job.status} />
            </Field>
            {job.estimated_hours && (
              <Field label="Estimated hours">
                <span className="text-[13px] text-[var(--color-ink)]">
                  {job.estimated_hours}
                </span>
              </Field>
            )}
          </div>

          {assignee && (
            <Field label="Assignee">
              <span className="text-[13px] text-[var(--color-ink)]">
                {assignee.full_name ?? assignee.email}
                {rate != null && (
                  <span className="text-[var(--color-ink-3)]">
                    {" · "}${rate}/h
                  </span>
                )}
              </span>
            </Field>
          )}

          {job.design_url && (
            <Field label="Design / spec">
              <a
                href={job.design_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[12.5px] text-[var(--color-ink)] underline-offset-4 hover:underline"
              >
                {job.design_url}
                <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
              </a>
            </Field>
          )}
        </div>

        {/* Submission timeline */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h3 className="eyebrow">Submissions</h3>
            {submissions && submissions.length > 0 && (
              <span className="text-[11px] text-[var(--color-ink-4)]">
                {submissions.length}
              </span>
            )}
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-[12.5px] text-[var(--color-ink-3)]">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading…
            </div>
          ) : !submissions || submissions.length === 0 ? (
            <p className="rounded-[var(--radius-md)] border border-dashed border-black/[0.08] bg-white/45 px-4 py-6 text-center text-[12.5px] text-[var(--color-ink-3)]">
              No submissions yet.
            </p>
          ) : (
            <ol className="space-y-1.5">
              {submissions.map((s, i) => (
                <SubmissionRow
                  key={s.id}
                  submission={s}
                  isLatest={i === 0}
                  rate={rate}
                  onClick={() => setDrawerSubId(s.id)}
                />
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* Drawer — opens on row click or Analyze click.
       *  Freelancers see it read-only (no Run/Re-run button) so they can read
       *  the AI's revisions feedback on their own submission. */}
      {drawerSubmission && (
        <AiReviewDrawer
          open={Boolean(drawerSubId)}
          onOpenChange={(v) => {
            if (!v) setDrawerSubId(null);
          }}
          job={job}
          submission={drawerSubmission}
          canRunReview={role === "operator" && isViewingLatest}
          onCompleted={onMutated}
        />
      )}
    </div>
  );
}

/* ─────────────────────────── Action card ─────────────────────────── */

function ActionCard({
  job,
  latest,
  rate,
  previewAmount,
  paying,
  canAnalyze,
  canPay,
  onAnalyze,
  onPay,
}: {
  job: Job;
  latest: JobSubmission;
  rate: number | null;
  previewAmount: number | null;
  paying: boolean;
  canAnalyze: boolean;
  canPay: boolean;
  onAnalyze: () => void;
  onPay: () => void;
}) {
  const isApproved = job.status === "approved";
  // Show "Analyze" only if not yet approved/paid (review still needed)
  const showAnalyzeBtn = canAnalyze && !isApproved && job.status !== "paid";
  const hasVerdict = latest.agent_decision != null;

  // Headline depends on state
  const headline = isApproved
    ? "Latest submission approved"
    : hasVerdict && job.status === "revisions_requested"
      ? "Revisions requested — re-analyze when resubmitted"
      : hasVerdict
        ? "Re-analyze the latest submission"
        : "Review the recent submission with AI Agent";

  const subline = (() => {
    const parts: string[] = [];
    parts.push(`${latest.hours_worked}h worked`);
    if (rate != null && previewAmount != null) {
      parts.push(`$${previewAmount.toFixed(2)} at $${rate}/h`);
    }
    parts.push(timeAgo(latest.created_at));
    return parts.join(" · ");
  })();

  return (
    <div className="glass relative overflow-hidden rounded-[var(--radius-2xl)] p-5">
      {/* Soft lime corner glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full opacity-50"
        style={{
          background:
            "radial-gradient(circle, rgba(215,254,3,0.35) 0%, rgba(215,254,3,0) 60%)",
          filter: "blur(28px)",
        }}
      />

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_6px_14px_-6px_rgba(180,220,0,0.55)]">
            <Sparkles className="h-4 w-4" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold tracking-[-0.012em] text-[var(--color-ink)]">
              {headline}
            </p>
            <p className="text-[11.5px] text-[var(--color-ink-3)]">
              {subline}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showAnalyzeBtn && (
            <Button
              size="default"
              variant={hasVerdict ? "secondary" : "default"}
              onClick={onAnalyze}
            >
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
              {hasVerdict ? "Re-analyze" : "Analyze"}
            </Button>
          )}
          {canPay && (
            <Button
              size="default"
              onClick={onPay}
              disabled={paying}
            >
              {paying ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" strokeWidth={2} />
              )}
              {paying
                ? "Sending…"
                : previewAmount != null
                  ? `Pay $${previewAmount.toFixed(2)}`
                  : "Pay"}
            </Button>
          )}
          {isApproved && !canPay && (
            <span className="rounded-full bg-black/[0.05] px-2.5 py-1 text-[11px] font-medium text-[var(--color-ink-3)]">
              Awaiting assignee
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Submission row ─────────────────────────── */

function SubmissionRow({
  submission: s,
  isLatest,
  rate,
  onClick,
}: {
  submission: JobSubmission;
  isLatest: boolean;
  rate: number | null;
  onClick: () => void;
}) {
  const amount = rate != null ? rate * Number(s.hours_worked) : null;
  const decision = s.agent_decision;

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="group flex w-full items-start gap-3 rounded-[var(--radius-md)] border border-black/[0.06] bg-white/55 p-3 text-left backdrop-blur-md transition-[transform,background-color,border-color,box-shadow] duration-[180ms] hover:-translate-y-[1px] hover:border-black/[0.12] hover:bg-white/80 hover:shadow-[0_8px_18px_-10px_rgba(20,20,40,0.12)]"
      >
        {/* Vertical accent rail */}
        <span
          className={
            "mt-1 h-[34px] w-[3px] shrink-0 rounded-full " +
            (decision === "approve"
              ? "bg-[var(--color-success)]"
              : decision === "request_revisions"
                ? "bg-[var(--color-warning)]"
                : "bg-black/[0.10]")
          }
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[12.5px] font-medium text-[var(--color-ink)]">
              {timeAgo(s.created_at)}
            </span>
            {isLatest && (
              <span className="rounded-full bg-[var(--color-accent)]/15 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-accent-ink)]">
                Latest
              </span>
            )}
          </div>

          <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-[var(--color-ink-3)]">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" strokeWidth={2} />
              {s.hours_worked}h
            </span>
            {amount != null && (
              <>
                <span>·</span>
                <span className="tabular-nums">${amount.toFixed(2)}</span>
              </>
            )}
          </div>

          {decision && (
            <div className="mt-1.5 flex items-center gap-1.5">
              {decision === "approve" ? (
                <>
                  <Check
                    className="h-3 w-3 text-[var(--color-success)]"
                    strokeWidth={2.5}
                  />
                  <span className="text-[11.5px] font-medium text-[var(--color-success)]">
                    Approved
                  </span>
                </>
              ) : (
                <>
                  <X
                    className="h-3 w-3 text-[var(--color-warning)]"
                    strokeWidth={2.5}
                  />
                  <span className="text-[11.5px] font-medium text-[var(--color-warning)]">
                    Revisions
                  </span>
                </>
              )}
            </div>
          )}
          {!decision && (
            <p className="mt-1.5 text-[11px] italic text-[var(--color-ink-4)]">
              Not analyzed yet
            </p>
          )}
        </div>

        <ChevronRight
          className="mt-2 h-3.5 w-3.5 shrink-0 text-[var(--color-ink-4)] transition-colors group-hover:text-[var(--color-ink-2)]"
          strokeWidth={2}
        />
      </button>
    </li>
  );
}

/* ─────────────────────────── helpers ─────────────────────────── */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: day > 365 ? "numeric" : undefined,
  });
}
