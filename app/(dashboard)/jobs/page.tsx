import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OperatorJobsClient } from "@/components/jobs/operator-jobs-client";
import { FreelancerJobsClient } from "@/components/jobs/freelancer-jobs-client";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  if (profile.role === "operator") {
    return <OperatorJobsClient />;
  }

  // For freelancers we check bank-info status server-side so the warning banner
  // shows on first render without an extra round-trip.
  const supabase = await createClient();
  const { data: full } = await supabase
    .from("profiles")
    .select("account_number, routing_number, account_holder_name")
    .eq("id", profile.id)
    .single();
  const hasBank = Boolean(
    full?.account_number && full.routing_number && full.account_holder_name
  );

  return <FreelancerJobsClient hasBank={hasBank} />;
}
