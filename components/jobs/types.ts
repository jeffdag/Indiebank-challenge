import type { JobStatus } from "./job-status-badge";

export type { JobStatus };

export interface Job {
  id: string;
  created_by: string;
  assigned_to: string | null;
  title: string;
  requirements: string;
  design_url: string | null;
  estimated_hours: string | null;
  status: JobStatus;
  last_submission_id: string | null;
  paid_dakota_transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobSubmission {
  id: string;
  job_id: string;
  submitted_by: string | null;
  hours_worked: string;
  deliverables_url: string | null;
  notes: string | null;
  agent_decision: "approve" | "request_revisions" | null;
  agent_feedback: string | null;
  agent_checklist:
    | { item: string; passed: boolean; note: string | null }[]
    | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface FreelancerOption {
  id: string;
  email: string | null;
  full_name: string | null;
  hourly_rate_usd: string | null;
  account_last4: string | null;
  dakota_recipient_id: string | null;
}
