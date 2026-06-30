"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Settings,
  LogOut,
  LayoutDashboard,
  FileCheck2,
  Wallet,
  Sparkles,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { ProfileRole } from "@/lib/auth";

const operatorNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: FileCheck2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

const freelancerNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "My jobs", icon: FileCheck2 },
  { href: "/earnings", label: "Earnings", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  user,
  role,
}: {
  user: User;
  role: ProfileRole;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const navItems = role === "freelancer" ? freelancerNav : operatorNav;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const initials = user.email
    ? user.email.split("@")[0].slice(0, 2).toUpperCase()
    : "NP";

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col gap-3 p-3">
      {/* Soft charcoal glass panel — strong contrast against the light canvas */}
      <div className="glass-dark flex h-full flex-col overflow-hidden rounded-[var(--radius-2xl)]">
        {/* Logo */}
        <div className="relative flex h-16 items-center gap-2.5 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--color-accent)] text-[14px] font-bold tracking-tight text-[var(--color-accent-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_4px_10px_-4px_rgba(180,220,0,0.55)]">
            N
          </div>
          <span className="text-[15px] font-semibold tracking-[-0.012em] text-white">
            IndieBank
          </span>
          <span className="ml-auto rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-white/65 backdrop-blur">
            {role}
          </span>
        </div>

        <div className="relative mx-3 h-px bg-white/[0.06]" />

        {/* Nav */}
        <nav className="relative flex-1 p-3">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative my-0.5 flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2.5 text-[13px] font-medium transition-[background-color,color,transform] duration-[180ms]",
                  isActive
                    ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_4px_10px_-4px_rgba(180,220,0,0.45)]"
                    : "text-white/65 hover:bg-white/[0.06] hover:text-white"
                )}
              >
                <item.icon
                  className={cn(
                    "h-4 w-4 transition-transform",
                    isActive
                      ? "text-[var(--color-accent-ink)]"
                      : "text-white/55 group-hover:text-white"
                  )}
                  strokeWidth={1.75}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="my-3 h-px bg-white/[0.06]" />

          <Link
            href="/challenge-details"
            className={cn(
              "group relative my-0.5 flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2.5 text-[13px] font-medium transition-[background-color,color,transform] duration-[180ms]",
              pathname.startsWith("/challenge-details")
                ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_4px_10px_-4px_rgba(180,220,0,0.45)]"
                : "text-white/65 hover:bg-white/[0.06] hover:text-white"
            )}
          >
            <Sparkles
              className={cn(
                "h-4 w-4 transition-transform",
                pathname.startsWith("/challenge-details")
                  ? "text-[var(--color-accent-ink)]"
                  : "text-white/55 group-hover:text-white"
              )}
              strokeWidth={1.75}
            />
            <span>How we built it</span>
          </Link>
        </nav>

        <div className="relative mx-3 h-px bg-white/[0.06]" />

        {/* User */}
        <div className="relative p-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-white/[0.06] focus:outline-none">
              <Avatar size="sm" className="size-8">
                <AvatarFallback className="rounded-full bg-[var(--color-accent)] text-[11px] font-semibold text-[var(--color-accent-ink)]">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium text-white">
                  {user.email?.split("@")[0]}
                </p>
                <p className="truncate text-[11px] text-white/55">
                  {user.email}
                </p>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <Settings
                  className="mr-2 h-3.5 w-3.5 text-[var(--color-ink-3)]"
                  strokeWidth={1.75}
                />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                variant="destructive"
              >
                <LogOut className="mr-2 h-3.5 w-3.5" strokeWidth={1.75} />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </aside>
  );
}
