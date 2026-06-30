"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Briefcase, Loader2, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "operator" | "freelancer";

export default function SignupPage() {
  const [role, setRole] = useState<Role>("operator");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }
    if (role === "freelancer" && !(Number(hourlyRate) > 0)) {
      setError("Hourly rate is required");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          hourly_rate_usd: role === "freelancer" ? hourlyRate : "",
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    window.location.replace("/dashboard");
  };

  return (
    <div className="glass rounded-[var(--radius-2xl)] p-8">
      <div className="mb-6">
        <p className="eyebrow">IndieBank</p>
        <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
          Create an account
        </h1>
        <p className="mt-1 text-[13px] text-[var(--color-ink-3)]">
          Sandbox tenant. Use any email; no verification required.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-danger)]/25 bg-[var(--color-danger-soft)] px-3 py-2.5 text-[12.5px] text-[var(--color-danger)]">
            <AlertCircle
              className="h-3.5 w-3.5 shrink-0"
              strokeWidth={1.75}
            />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>I am a…</Label>
          <div className="grid grid-cols-2 gap-2">
            <RoleTile
              active={role === "operator"}
              onClick={() => setRole("operator")}
              icon={Briefcase}
              label="Operator"
              hint="Run the treasury & post jobs"
            />
            <RoleTile
              active={role === "freelancer"}
              onClick={() => setRole("freelancer")}
              icon={UserRound}
              label="Freelancer"
              hint="Take on jobs & get paid"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            required
          />
        </div>

        {role === "freelancer" && (
          <div className="space-y-1.5 nm-fade-in-up">
            <Label htmlFor="rate">Hourly rate (USD)</Label>
            <Input
              id="rate"
              type="number"
              min="1"
              step="0.01"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="65.00"
              required
            />
            <p className="text-[11.5px] text-[var(--color-ink-3)]">
              Operators see this when assigning jobs. Editable later.
            </p>
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          size="lg"
          className="w-full"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            "Create account"
          )}
        </Button>

        <p className="text-center text-[11.5px] text-[var(--color-ink-3)]">
          By creating an account, you agree to the{" "}
          <Link
            href="#"
            className="text-[var(--color-ink)] underline-offset-4 hover:underline"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href="#"
            className="text-[var(--color-ink)] underline-offset-4 hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </form>

      <p className="mt-6 border-t border-black/[0.06] pt-4 text-center text-[12.5px] text-[var(--color-ink-3)]">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-[var(--color-ink)] underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

function RoleTile({
  active,
  onClick,
  icon: Icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-1.5 rounded-[var(--radius-md)] border p-3.5 text-left transition-[transform,background-color,border-color,box-shadow] duration-[180ms]",
        "[transition-timing-function:var(--ease-apple)] active:scale-[0.98]",
        active
          ? "border-[var(--color-accent)] bg-[var(--color-accent)]/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_4px_12px_-4px_rgba(180,220,0,0.35)]"
          : "border-black/[0.08] bg-white/55 backdrop-blur hover:border-black/15 hover:bg-white/80"
      )}
    >
      <div className="flex items-center gap-2">
        <Icon
          className={cn(
            "h-3.5 w-3.5",
            active ? "text-[var(--color-accent-ink)]" : "text-[var(--color-ink-2)]"
          )}
          strokeWidth={1.75}
        />
        <span className="text-[13.5px] font-medium text-[var(--color-ink)]">
          {label}
        </span>
      </div>
      <span className="text-[11.5px] text-[var(--color-ink-3)]">{hint}</span>
    </button>
  );
}
