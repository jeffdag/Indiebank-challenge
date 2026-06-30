import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { getCurrentProfile } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getCurrentProfile();
  const role = profile?.role ?? "operator";

  return (
    <div className="flex h-screen font-sans antialiased">
      <Sidebar user={user} role={role} />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-8 py-10 nm-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
