"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { toast } from "sonner";
import {
  Sparkles,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  FileText,
  Clock,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { JobStatusBadge } from "./job-status-badge";
import type { Job, JobSubmission } from "./types";

const STEPS = [
  "Reading the job requirements",
  "Parsing the freelancer's submission",
  "Comparing against the checklist",
  "Drafting feedback",
  "Finalizing verdict",
];

export function AiReviewDrawer({
  open,
  onOpenChange,
  job,
  submission,
  onCompleted,
  /**
   * Only the latest submission can be re-analyzed (the backend always runs
   * against `job.last_submission_id`). For older submissions, the drawer is
   * read-only: it just renders the cached verdict, no Start/Re-run footer.
   */
  canRunReview = true,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  job: Job;
  submission: JobSubmission;
  onCompleted: () => void;
  canRunReview?: boolean;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const stopTimerRef = useRef<(() => void) | null>(null);

  const reviewed = Boolean(submission.agent_decision);

  useEffect(() => {
    if (open) {
      setRunning(false);
      setStepIdx(0);
    }
  }, [open, submission.id]);

  function startStaggeredTicker(holdAtLast = true) {
    setStepIdx(0);
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    STEPS.forEach((_, i) => {
      if (i === 0) return;
      const delay = 500 + i * 600 + Math.floor(Math.random() * 400) - 100;
      timeouts.push(
        setTimeout(() => {
          setStepIdx((cur) => {
            if (holdAtLast && i === STEPS.length - 1) {
              return STEPS.length - 1;
            }
            return Math.max(cur, i);
          });
        }, delay)
      );
    });
    stopTimerRef.current = () => {
      for (const t of timeouts) clearTimeout(t);
    };
  }

  async function startReview() {
    setRunning(true);
    startStaggeredTicker(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/review`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Review failed");

      const minDuration = 2500;
      const elapsed = performance.now() % 100000;
      await new Promise((r) =>
        setTimeout(r, Math.max(0, minDuration - elapsed))
      );

      stopTimerRef.current?.();
      setStepIdx(STEPS.length);
      toast.success(
        data.decision === "approve"
          ? "AI reviewer approved the work"
          : "AI reviewer requested revisions"
      );
      onCompleted();
      router.refresh();
    } catch (err) {
      stopTimerRef.current?.();
      toast.error(err instanceof Error ? err.message : "Review failed");
      setRunning(false);
      setStepIdx(0);
    }
  }

  const decision = submission.agent_decision;
  const showProgress = running && !reviewed;
  const showVerdict = reviewed;
  // Gate the Start / Re-run footer behind `canRunReview` so older submissions
  // are read-only (older subs aren't what the backend re-reviews).
  const showStart = canRunReview && !running && !reviewed;
  const showRerunFooter = canRunReview;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-[rgba(20,20,40,0.18)] supports-backdrop-filter:backdrop-blur-md data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup
          className={[
            "fixed inset-y-3 right-3 z-50 flex w-full max-w-[540px] flex-col gap-0",
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
                <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
              </div>
              <div className="flex flex-col leading-tight">
                <DialogPrimitive.Title className="text-[14px] font-semibold tracking-[-0.012em] text-[var(--color-ink)]">
                  AI Review
                </DialogPrimitive.Title>
                <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--color-ink-3)]">
                  Vercel AI SDK · OpenAI gpt-4o-mini
                </span>
              </div>
            </div>
            <DialogPrimitive.Close className="rounded-full p-1.5 text-[var(--color-ink-3)] transition-colors hover:bg-black/[0.05] hover:text-[var(--color-ink)]">
              <X className="h-4 w-4" strokeWidth={1.75} />
            </DialogPrimitive.Close>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <div className="space-y-4">
              {/* Job */}
              <SectionCard title="Job" icon={FileText}>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[14px] font-medium text-[var(--color-ink)]">
                      {job.title}
                    </p>
                    <JobStatusBadge status={job.status} />
                  </div>
                  <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-[var(--radius-sm)] border border-black/[0.06] bg-white/55 p-2.5 text-[11.5px] leading-relaxed text-[var(--color-ink-2)] backdrop-blur-md">
                    {job.requirements}
                  </pre>
                  {job.design_url && (
                    <a
                      href={job.design_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[12px] text-[var(--color-ink)] underline-offset-4 hover:underline"
                    >
                      Design reference
                      <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
                    </a>
                  )}
                </div>
              </SectionCard>

              {/* Submission */}
              <SectionCard title="Submission" icon={Clock}>
                <div className="space-y-2 text-[12.5px]">
                  <Row label="Hours">{submission.hours_worked}h</Row>
                  {submission.deliverables_url && (
                    <Row label="Deliverable">
                      <a
                        href={submission.deliverables_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 truncate text-[var(--color-ink)] underline-offset-4 hover:underline"
                      >
                        {shortenUrl(submission.deliverables_url)}
                        <ExternalLink
                          className="h-3 w-3 shrink-0"
                          strokeWidth={1.75}
                        />
                      </a>
                    </Row>
                  )}
                  {submission.notes && (
                    <Row label="Notes">
                      <span className="whitespace-pre-wrap text-[var(--color-ink-2)]">
                        {submission.notes}
                      </span>
                    </Row>
                  )}
                </div>
              </SectionCard>

              {/* Progress */}
              {showProgress && (
                <SectionCard title="Reviewer" icon={Sparkles}>
                  <ol className="space-y-2.5">
                    {STEPS.map((s, i) => {
                      const done = i < stepIdx;
                      const current = i === stepIdx;
                      return (
                        <li
                          key={i}
                          className="flex items-center gap-2.5 text-[12.5px]"
                        >
                          {done ? (
                            <span className="grid size-4 place-items-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-ink)]">
                              <Check className="h-2.5 w-2.5" strokeWidth={3} />
                            </span>
                          ) : current ? (
                            <Loader2
                              className="h-4 w-4 animate-spin text-[var(--color-ink)]"
                              strokeWidth={2}
                            />
                          ) : (
                            <span className="block size-4 rounded-full border border-black/[0.12]" />
                          )}
                          <span
                            className={
                              done
                                ? "text-[var(--color-ink-3)]"
                                : current
                                  ? "font-medium text-[var(--color-ink)]"
                                  : "text-[var(--color-ink-4)]"
                            }
                          >
                            {s}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </SectionCard>
              )}

              {/* Verdict */}
              {showVerdict && (
                <VerdictCard
                  decision={decision!}
                  feedback={submission.agent_feedback}
                  checklist={submission.agent_checklist}
                  reviewedAt={submission.reviewed_at}
                />
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-black/[0.06] px-5 py-4">
            {showStart && (
              <Button
                onClick={startReview}
                size="lg"
                className="w-full"
              >
                <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
                Start AI review
              </Button>
            )}
            {showProgress && (
              <Button
                disabled
                size="lg"
                variant="secondary"
                className="w-full"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Reviewing…
              </Button>
            )}
            {showVerdict &&
              showRerunFooter &&
              job.status === "revisions_requested" && (
                <Button
                  onClick={startReview}
                  size="lg"
                  variant="secondary"
                  className="w-full"
                >
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Re-run review
                </Button>
              )}
            {showVerdict && !showRerunFooter && (
              <p className="text-center text-[11.5px] text-[var(--color-ink-3)]">
                Read-only view of an older submission. Open the latest to
                re-analyze.
              </p>
            )}
            {showVerdict && job.status === "approved" && (
              <p className="text-center text-[12.5px] text-[var(--color-success)]">
                Ready to pay — close this drawer and click Pay on the job.
              </p>
            )}
            {showVerdict && job.status === "paid" && (
              <p className="text-center text-[12.5px] text-[var(--color-success)]">
                Already paid.
              </p>
            )}
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-black/[0.06] bg-white/55 p-4 backdrop-blur-md">
      <div className="mb-2.5 flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.1em] text-[var(--color-ink-3)]">
        <Icon className="h-3 w-3" strokeWidth={1.75} />
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[80px_1fr] gap-2">
      <span className="text-[var(--color-ink-3)]">{label}</span>
      <span className="min-w-0 text-[var(--color-ink)]">{children}</span>
    </div>
  );
}

function VerdictCard({
  decision,
  feedback,
  checklist,
  reviewedAt,
}: {
  decision: "approve" | "request_revisions";
  feedback: string | null;
  checklist:
    | { item: string; passed: boolean; note: string | null }[]
    | null;
  reviewedAt: string | null;
}) {
  const approved = decision === "approve";
  return (
    <div
      className={[
        "rounded-[var(--radius-lg)] border p-5",
        approved
          ? "border-[var(--color-accent)]/40 bg-[var(--color-accent)]/[0.10]"
          : "border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)]",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        {approved ? (
          <div className="grid size-9 place-items-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_6px_14px_-6px_rgba(180,220,0,0.55)]">
            <Check className="h-4 w-4" strokeWidth={2.5} />
          </div>
        ) : (
          <div className="grid size-9 place-items-center rounded-full bg-[var(--color-warning)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_6px_14px_-6px_rgba(201,138,4,0.55)]">
            <XCircle className="h-4 w-4" strokeWidth={2.25} />
          </div>
        )}
        <div>
          <div className="text-[15px] font-semibold text-[var(--color-ink)]">
            {approved ? "Approved" : "Revisions requested"}
          </div>
          {reviewedAt && (
            <div className="text-[10.5px] uppercase tracking-[0.08em] text-[var(--color-ink-3)]">
              {new Date(reviewedAt).toLocaleString()}
            </div>
          )}
        </div>
      </div>
      {feedback && (
        <p className="mt-4 whitespace-pre-wrap text-[12.5px] leading-relaxed text-[var(--color-ink-2)]">
          {feedback}
        </p>
      )}
      {checklist && checklist.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-black/[0.08] pt-3">
          {checklist.map((c, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-[12.5px]"
            >
              {c.passed ? (
                <CheckCircle2
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-success)]"
                  strokeWidth={2}
                />
              ) : (
                <XCircle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-warning)]"
                  strokeWidth={2}
                />
              )}
              <span className="min-w-0 text-[var(--color-ink-2)]">
                <span
                  className={
                    c.passed
                      ? ""
                      : "font-medium text-[var(--color-ink)]"
                  }
                >
                  {c.item}
                </span>
                {c.note && (
                  <span className="text-[var(--color-ink-3)]">
                    {" "}— {c.note}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    const tail = u.pathname.length > 25 ? "…" : u.pathname;
    return `${u.hostname}${tail}`;
  } catch {
    return url;
  }
}
