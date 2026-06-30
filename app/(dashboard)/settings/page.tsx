import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OperatorSettingsClient } from "@/components/settings/operator-settings-client";
import { FreelancerSettingsClient } from "@/components/settings/freelancer-settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  if (profile.role === "operator") {
    return <OperatorSettingsClient />;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(
      "full_name, hourly_rate_usd, bank_name, account_type, account_last4, account_number, routing_number, account_holder_name"
    )
    .eq("id", profile.id)
    .single();

  const hasBank = Boolean(
    data?.account_number && data?.routing_number && data?.account_holder_name
  );

  return (
    <FreelancerSettingsClient
      email={profile.email}
      userId={profile.id}
      fullName={data?.full_name ?? null}
      hourlyRate={data?.hourly_rate_usd ?? null}
      hasBank={hasBank}
      bank={
        hasBank
          ? {
              bankName: data?.bank_name ?? null,
              accountType: data?.account_type ?? null,
              last4: data?.account_last4 ?? null,
            }
          : null
      }
    />
  );
}
