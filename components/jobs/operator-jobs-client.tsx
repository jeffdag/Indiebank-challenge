"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JobStatusBadge } from "./job-status-badge";
import { JobDetail } from "./job-detail";
import { NewJobDrawer } from "./new-job-drawer";
import type { FreelancerOption, Job } from "./types";

export function OperatorJobsClient() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [freelancers, setFreelancers] = useState<FreelancerOption[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newJobOpen, setNewJobOpen] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const [jobsRes, frRes] = await Promise.all([
        fetch("/api/jobs", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/freelancers", { cache: "no-store" }).then((r) => r.json()),
      ]);
      setJobs(jobsRes.jobs ?? []);
      setFreelancers(frRes.freelancers ?? []);
    } catch {
      toast.error("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  return (
    <div className="space-y-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Operator</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
            Jobs
          </h1>
          <p className="mt-1.5 text-[13.5px] text-[var(--color-ink-3)]">
            Post jobs, review submissions with AI, release payouts.
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white/65 px-2.5 py-1 text-[10.5px] font-medium uppercase tracking-[0.1em] text-[var(--color-ink-3)] backdrop-blur">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
            Reviews powered by Vercel AI SDK · OpenAI
          </p>
        </div>
        <Button onClick={() => setNewJobOpen(true)}>
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          New job
        </Button>

        <NewJobDrawer
          open={newJobOpen}
          onOpenChange={setNewJobOpen}
          freelancers={freelancers}
          onCreated={() => {
            loadAll();
            router.refresh();
          }}
        />
      </div>

      <div className="glass overflow-hidden rounded-[var(--radius-xl)] p-0">
        <div className="grid grid-cols-[1fr_200px_130px_100px_60px] gap-3 border-b border-black/[0.06] px-5 py-3 text-[10.5px] font-medium uppercase tracking-[0.1em] text-[var(--color-ink-3)]">
          <span>Title</span>
          <span>Assignee</span>
          <span>Status</span>
          <span className="text-right">Hours</span>
          <span></span>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 px-5 py-8 text-[12.5px] text-[var(--color-ink-3)]">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading…
          </div>
        ) : !jobs || jobs.length === 0 ? (
          <div className="px-5 py-14 text-center text-[12.5px] text-[var(--color-ink-3)]">
            No jobs yet. Post your first job above.
          </div>
        ) : (
          jobs.map((j) => {
            const assignee =
              freelancers.find((f) => f.id === j.assigned_to) ?? null;
            const isOpen = openId === j.id;
            return (
              <div
                key={j.id}
                className="border-b border-black/[0.06] last:border-b-0"
              >
                <div
                  className="grid cursor-pointer grid-cols-[1fr_200px_130px_100px_60px] items-center gap-3 px-5 py-3.5 transition-colors hover:bg-black/[0.025]"
                  onClick={() => setOpenId(isOpen ? null : j.id)}
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-medium text-[var(--color-ink)]">
                      {j.title}
                    </div>
                    <div className="truncate text-[11.5px] text-[var(--color-ink-3)]">
                      {j.requirements}
                    </div>
                  </div>
                  <div className="truncate text-[12.5px] text-[var(--color-ink-2)]">
                    {assignee
                      ? assignee.full_name ?? assignee.email
                      : "Unassigned"}
                  </div>
                  <div>
                    <JobStatusBadge status={j.status} />
                  </div>
                  <div className="text-right text-[12.5px] tabular-nums text-[var(--color-ink-2)]">
                    {j.estimated_hours ?? "—"}
                  </div>
                  <div className="text-right">
                    {isOpen ? (
                      <ChevronDown className="ml-auto h-4 w-4 text-[var(--color-ink-3)]" />
                    ) : (
                      <ChevronRight className="ml-auto h-4 w-4 text-[var(--color-ink-3)]" />
                    )}
                  </div>
                </div>
                {isOpen && (
                  <div className="border-t border-black/[0.06] bg-white/35 px-5 py-5 backdrop-blur">
                    <JobDetail
                      job={j}
                      assignee={assignee}
                      role="operator"
                      onMutated={loadAll}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

