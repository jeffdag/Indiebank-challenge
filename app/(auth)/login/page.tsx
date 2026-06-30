"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="glass rounded-[var(--radius-2xl)] p-8">
      <div className="mb-6">
        <p className="eyebrow">IndieBank</p>
        <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
          Sign in
        </h1>
        <p className="mt-1 text-[13px] text-[var(--color-ink-3)]">
          Access your treasury console.
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="#"
              className="text-[11.5px] text-[var(--color-ink-3)] underline-offset-4 hover:text-[var(--color-ink)] hover:underline"
            >
              Forgot?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          size="lg"
          className="w-full"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 border-t border-black/[0.06] pt-4 text-center text-[12.5px] text-[var(--color-ink-3)]">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-[var(--color-ink)] underline-offset-4 hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
