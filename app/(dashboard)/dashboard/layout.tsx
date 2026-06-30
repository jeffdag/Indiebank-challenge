import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";

export default async function DashboardHomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  // The operator dashboard fetches Dakota treasury data which freelancers
  // don't have. Send them straight to their jobs view.
  if (profile?.role === "freelancer") {
    redirect("/jobs");
  }
  return <>{children}</>;
}
