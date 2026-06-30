"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Loader2,
  Send,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { JobStatusBadge } from "./job-status-badge";
import { JobDetail } from "./job-detail";
import type { Job } from "./types";

const STORAGE_BUCKET = "job-deliverables";
const MAX_FILE_MB = 25;

export function FreelancerJobsClient({ hasBank }: { hasBank: boolean }) {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/jobs", { cache: "no-store" }).then((r) => r.json());
      setJobs(res.jobs ?? []);
    } catch {
      toast.error("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-7">
      <div>
        <p className="eyebrow">Freelancer</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
          My jobs
        </h1>
        <p className="mt-1.5 text-[13.5px] text-[var(--color-ink-3)]">
          Submit your work and respond to revisions.
        </p>
      </div>

      {!hasBank && (
        <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-warning)]/25 bg-[var(--color-warning-soft)] p-3.5 text-[12.5px] text-[var(--color-ink-2)]">
          <AlertCircle
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-warning)]"
            strokeWidth={2}
          />
          <div>
            You need to add bank info before operators can pay you.{" "}
            <Link
              href="/settings"
              className="font-medium text-[var(--color-ink)] underline-offset-4 hover:underline"
            >
              Add it in Settings →
            </Link>
          </div>
        </div>
      )}

      <div className="glass overflow-hidden rounded-[var(--radius-xl)] p-0">
        <div className="grid grid-cols-[1fr_130px_120px_180px] gap-3 border-b border-black/[0.06] px-5 py-3 text-[10.5px] font-medium uppercase tracking-[0.1em] text-[var(--color-ink-3)]">
          <span>Title</span>
          <span>Status</span>
          <span className="text-right">Hours est.</span>
          <span className="text-right">Action</span>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 px-5 py-8 text-[12.5px] text-[var(--color-ink-3)]">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading…
          </div>
        ) : !jobs || jobs.length === 0 ? (
          <div className="px-5 py-14 text-center text-[12.5px] text-[var(--color-ink-3)]">
            No jobs assigned to you yet.
          </div>
        ) : (
          jobs.map((j) => {
            const isOpen = openId === j.id;
            const canSubmit =
              j.status === "assigned" ||
              j.status === "revisions_requested" ||
              j.status === "submitted";
            return (
              <div
                key={j.id}
                className="border-b border-black/[0.06] last:border-b-0"
              >
                <div className="grid grid-cols-[1fr_130px_120px_180px] items-center gap-3 px-5 py-3.5 transition-colors hover:bg-black/[0.025]">
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-medium text-[var(--color-ink)]">
                      {j.title}
                    </div>
                    <div className="truncate text-[11.5px] text-[var(--color-ink-3)]">
                      {j.requirements}
                    </div>
                  </div>
                  <div>
                    <JobStatusBadge status={j.status} />
                  </div>
                  <div className="text-right text-[12.5px] tabular-nums text-[var(--color-ink-2)]">
                    {j.estimated_hours ?? "—"}
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    {canSubmit && <SubmitDialog job={j} onSubmitted={load} />}
                    <Button
                      size="icon-sm"
                      variant="secondary"
                      onClick={() => setOpenId(isOpen ? null : j.id)}
                      aria-label={isOpen ? "Collapse" : "Expand"}
                    >
                      {isOpen ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
                {isOpen && (
                  <div className="border-t border-black/[0.06] bg-white/35 px-5 py-5 backdrop-blur">
                    <JobDetail
                      job={j}
                      assignee={null}
                      role="freelancer"
                      onMutated={load}
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

function SubmitDialog({
  job,
  onSubmitted,
}: {
  job: Job;
  onSubmitted: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setUploadProgress(null);
    const fd = new FormData(e.currentTarget);
    const urlField = String(fd.get("deliverables_url") ?? "").trim();

    try {
      let deliverablesUrl: string | null = urlField || null;
      if (file) {
        if (file.size > MAX_FILE_MB * 1024 * 1024) {
          throw new Error(`File too large (max ${MAX_FILE_MB} MB)`);
        }
        setUploadProgress("Uploading…");
        const supabase = createClient();
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${job.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || undefined,
          });
        if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
        const { data: pub } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(path);
        deliverablesUrl = pub.publicUrl;
        setUploadProgress(null);
      }

      const res = await fetch(`/api/jobs/${job.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hours_worked: fd.get("hours_worked"),
          deliverables_url: deliverablesUrl,
          notes: fd.get("notes"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submit failed");
      toast.success("Submission received");
      setOpen(false);
      setFile(null);
      onSubmitted();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  }

  const isResubmit = job.status === "revisions_requested";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Send className="h-3.5 w-3.5" strokeWidth={1.75} />
            {isResubmit ? "Resubmit" : "Submit"}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit: {job.title}</DialogTitle>
          <DialogDescription>
            The operator will run an AI review against the requirements.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="hours_worked">Hours worked</Label>
            <Input
              id="hours_worked"
              name="hours_worked"
              type="number"
              min="0.25"
              step="0.25"
              required
              placeholder="6"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Deliverables</Label>

            {file ? (
              <div className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-black/[0.08] bg-white/65 px-3 py-2 text-[12.5px] text-[var(--color-ink)] backdrop-blur-md">
                <div className="min-w-0 flex-1 truncate">
                  <span>{file.name}</span>
                  <span className="text-[var(--color-ink-3)]">
                    {" "}· {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="rounded-full p-1 text-[var(--color-ink-3)] transition-colors hover:bg-black/[0.06] hover:text-[var(--color-ink)]"
                  aria-label="Remove file"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-dashed border-black/[0.14] bg-white/45 px-3 py-3.5 text-[12.5px] text-[var(--color-ink-2)] backdrop-blur-md transition-colors hover:border-black/25 hover:bg-white/75">
                <Upload className="h-3.5 w-3.5" strokeWidth={1.75} />
                <span>Click to upload a file (max {MAX_FILE_MB} MB)</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setFile(f);
                  }}
                />
              </label>
            )}

            <div className="flex items-center gap-2 py-1 text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-ink-4)]">
              <span className="h-px flex-1 bg-[var(--color-line)]" />
              or paste a link
              <span className="h-px flex-1 bg-[var(--color-line)]" />
            </div>
            <Input
              id="deliverables_url"
              name="deliverables_url"
              type="url"
              placeholder="https://github.com/... or preview link"
              disabled={Boolean(file)}
            />
            {uploadProgress && (
              <p className="text-[11.5px] text-[var(--color-ink-3)]">
                {uploadProgress}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              placeholder="What you built, any caveats, focus areas for review."
              className="field-input flex w-full px-3 py-2.5 text-[13px]"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Submit"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
