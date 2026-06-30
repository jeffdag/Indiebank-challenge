import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type ProfileRole = "operator" | "freelancer";

export interface SessionProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: ProfileRole;
  hourly_rate_usd: string | null;
  dakota_customer_id: string | null;
  dakota_recipient_id: string | null;
  dakota_destination_id: string | null;
  dakota_offramp_account_id: string | null;
}

/** Get the currently logged-in profile (null if no session). */
export async function getCurrentProfile(): Promise<SessionProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, email, full_name, role, hourly_rate_usd, dakota_customer_id, dakota_recipient_id, dakota_destination_id, dakota_offramp_account_id"
    )
    .eq("id", user.id)
    .single();
  return (data as SessionProfile) ?? null;
}

/**
 * Server-component helper for operator-only pages. Redirects to /login if no
 * session, or /dashboard if signed in as a freelancer.
 */
export async function gateOperatorPage(): Promise<SessionProfile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const p = profile as SessionProfile;
  if (p.role !== "operator") redirect("/dashboard");
  return p;
}

/** Throws a Response if the API caller is not an operator. */
export async function requireOperator(): Promise<SessionProfile> {
  const profile = await getCurrentProfile();
  if (!profile) {
    throw apiError("Unauthorized", 401);
  }
  if (profile.role !== "operator") {
    throw apiError("Operator role required", 403);
  }
  return profile;
}

/** Throws a Response if the API caller is not a freelancer. */
export async function requireFreelancer(): Promise<SessionProfile> {
  const profile = await getCurrentProfile();
  if (!profile) {
    throw apiError("Unauthorized", 401);
  }
  if (profile.role !== "freelancer") {
    throw apiError("Freelancer role required", 403);
  }
  return profile;
}

export async function requireAnyAuth(): Promise<SessionProfile> {
  const profile = await getCurrentProfile();
  if (!profile) throw apiError("Unauthorized", 401);
  return profile;
}

class ApiHttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function apiError(message: string, status: number) {
  return new ApiHttpError(message, status);
}

/** Use in route handlers' catch blocks. */
export function apiErrorResponse(err: unknown): Response {
  if (err instanceof ApiHttpError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  const message = err instanceof Error ? err.message : "Internal error";
  return Response.json({ error: message }, { status: 500 });
}
