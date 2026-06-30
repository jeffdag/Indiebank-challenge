import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import type { Job } from "@/components/jobs/types";

export const dynamic = "force-dynamic";

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default async function EarningsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "freelancer") redirect("/dashboard");

  const rate = profile.hourly_rate_usd ? Number(profile.hourly_rate_usd) : null;
  const supabase = await createClient();

  // All jobs assigned to me — earnings are derived from rate × hours_worked on
  // the linked submission. We compute it instead of trusting the cached amount
  // (which is only present after pay).
  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .eq("assigned_to", profile.id)
    .order("updated_at", { ascending: false });

  const jobList = (jobs ?? []) as Job[];
  const submissionIds = jobList
    .map((j) => j.last_submission_id)
    .filter((id): id is string => Boolean(id));

  const submissionMap: Record<string, { hours_worked: string }> = {};
  if (submissionIds.length > 0) {
    const { data: subs } = await supabase
      .from("job_submissions")
      .select("id, hours_worked")
      .in("id", submissionIds);
    for (const s of subs ?? []) {
      submissionMap[s.id] = { hours_worked: String(s.hours_worked) };
    }
  }

  let paid = 0;
  let pending = 0;
  const rows = jobList
    .map((j) => {
      const sub = j.last_submission_id ? submissionMap[j.last_submission_id] : null;
      const hours = sub ? Number(sub.hours_worked) : null;
      const amount = hours != null && rate != null ? hours * rate : null;
      if (amount != null) {
        if (j.status === "paid") paid += amount;
        else if (j.status === "approved") pending += amount;
      }
      return { job: j, hours, amount };
    })
    .filter((r) => r.hours != null);

  return (
    <div className="space-y-9">
      <div>
        <p className="eyebrow">Earnings</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
          Payouts from completed jobs
        </h1>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Hourly rate" value={rate != null ? `$${rate}/h` : "—"} />
        <Stat label="Paid" value={formatUsd(paid)} accent="success" />
        <Stat label="Approved · pending pay" value={formatUsd(pending)} />
      </div>

      <div className="glass overflow-hidden rounded-[var(--radius-xl)] p-0">
        <div className="grid grid-cols-[1fr_100px_120px_120px] gap-3 border-b border-black/[0.06] px-4 py-2.5 text-[10.5px] uppercase tracking-[0.08em] text-[var(--color-ink-3)]">
          <span>Job</span>
          <span className="text-right">Hours</span>
          <span>Status</span>
          <span className="text-right">Amount</span>
        </div>
        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-[12.5px] text-[var(--color-ink-3)]">
            No submitted jobs yet.
          </div>
        ) : (
          rows.map(({ job: j, hours, amount }) => (
            <div
              key={j.id}
              className="grid grid-cols-[1fr_100px_120px_120px] items-center gap-3 border-b border-black/[0.06] px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium text-[var(--color-ink)]">
                  {j.title}
                </div>
                <div className="truncate text-[11.5px] text-[var(--color-ink-3)]">
                  {new Date(j.updated_at).toLocaleString()}
                </div>
              </div>
              <div className="text-right text-[12.5px] text-[var(--color-ink-2)] tabular-nums">
                {hours}
              </div>
              <div>
                <JobStatusBadge status={j.status} />
              </div>
              <div className="text-right text-[13px] text-[var(--color-ink)] tabular-nums">
                {amount != null ? formatUsd(amount) : "—"}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "success";
}) {
  return (
    <div className="glass rounded-[var(--radius-lg)] px-5 py-4">
      <p className="eyebrow">{label}</p>
      <p
        className={
          "mt-1.5 text-[22px] font-semibold tracking-[-0.012em] tabular-nums " +
          (accent === "success"
            ? "text-[var(--color-success)]"
            : "text-[var(--color-ink)]")
        }
      >
        {value}
      </p>
    </div>
  );
}
