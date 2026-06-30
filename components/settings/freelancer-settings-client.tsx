"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";

interface BankSummary {
  bankName: string | null;
  accountType: string | null;
  last4: string | null;
}

export function FreelancerSettingsClient({
  email,
  userId,
  fullName,
  hourlyRate,
  hasBank,
  bank,
}: {
  email: string | null;
  userId: string;
  fullName: string | null;
  hourlyRate: string | null;
  hasBank: boolean;
  bank: BankSummary | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="space-y-9">
      <div>
        <p className="eyebrow">Account</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
          Settings
        </h1>
      </div>

      <ProfileSection
        email={email}
        userId={userId}
        fullName={fullName}
        hourlyRate={hourlyRate}
      />

      <BankSection hasBank={hasBank} bank={bank} />

      <section>
        <div className="mb-3">
          <h2 className="text-[15px] font-semibold tracking-[-0.012em] text-[var(--color-ink)]">
            Session
          </h2>
        </div>
        <div className="glass flex items-center justify-between rounded-[var(--radius-lg)] px-5 py-4">
          <div>
            <p className="text-[13.5px] font-medium text-[var(--color-ink)]">
              Sign out
            </p>
            <p className="text-[12.5px] text-[var(--color-ink-3)]">
              End this session and return to login.
            </p>
          </div>
          <Button onClick={handleSignOut} variant="destructive" size="sm">
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
            Sign out
          </Button>
        </div>
      </section>
    </div>
  );
}

function ProfileSection({
  email,
  userId,
  fullName,
  hourlyRate,
}: {
  email: string | null;
  userId: string;
  fullName: string | null;
  hourlyRate: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(fullName ?? "");
  const [rate, setRate] = useState(hourlyRate ?? "");
  const [saving, setSaving] = useState(false);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: name,
          hourly_rate_usd: rate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      toast.success("Profile updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <div className="mb-3">
        <h2 className="text-[15px] font-semibold tracking-[-0.012em] text-[var(--color-ink)]">
          Freelancer profile
        </h2>
        <p className="text-[12.5px] text-[var(--color-ink-3)]">
          Operators see your hourly rate when assigning jobs.
        </p>
      </div>
      <form
        onSubmit={onSave}
        className="glass space-y-4 rounded-[var(--radius-lg)] p-5"
      >
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Email"
            id="email"
            value={email ?? ""}
            disabled
          />
          <Field
            label="User ID"
            id="userId"
            value={userId}
            disabled
            mono
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ControlledField
            id="full_name"
            label="Display name"
            value={name}
            onChange={setName}
            placeholder="Jane Doe"
          />
          <ControlledField
            id="rate"
            label="Hourly rate (USD)"
            value={rate}
            onChange={setRate}
            type="number"
            min="1"
            step="0.01"
          />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
        </Button>
      </form>
    </section>
  );
}

function BankSection({
  hasBank,
  bank,
}: {
  hasBank: boolean;
  bank: BankSummary | null;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    try {
      const res = await fetch("/api/profile/bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success("Bank info saved — you can now be paid");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <div className="mb-3">
        <h2 className="text-[15px] font-semibold tracking-[-0.012em] text-[var(--color-ink)]">
          Payout bank
        </h2>
        <p className="text-[12.5px] text-[var(--color-ink-3)]">
          Where operators send your USDC → USD ACH payouts.
        </p>
      </div>

      {hasBank && bank && (
        <div className="mb-3 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-success)]/25 bg-[var(--color-success-soft)]">
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-ink-3)]">
              Linked
            </span>
            <span className="text-[13px] text-[var(--color-ink)]">
              {bank.bankName ?? "Bank"} ·{" "}
              {bank.accountType ?? ""} ••{bank.last4 ?? "----"}
            </span>
          </div>
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="glass space-y-4 rounded-[var(--radius-lg)] p-5"
      >
        <div className="grid grid-cols-2 gap-3">
          <BareField
            id="bank_name"
            label="Bank name"
            placeholder="Chase"
          />
          <BareField
            id="account_holder_name"
            label="Account holder"
            required
            placeholder="Jane Doe"
            hint="Max 22 characters"
            maxLength={22}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <BareField
            id="routing_number"
            label="ABA routing #"
            required
            placeholder="021000021"
            hint="9 digits. Sandbox test value: 021000021"
            pattern="\d{9}"
            inputMode="numeric"
            maxLength={9}
          />
          <BareField
            id="account_number"
            label="Account #"
            required
            placeholder="123456789"
            hint="6–17 digits. Sandbox: 123456789"
            pattern="\d{6,17}"
            inputMode="numeric"
            maxLength={17}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="account_type">Account type</Label>
            <Select name="account_type" defaultValue="checking">
              <SelectTrigger id="account_type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">Checking</SelectItem>
                <SelectItem value="savings">Savings</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <BareField
            id="country"
            label="Country"
            defaultValue="US"
            placeholder="US"
            hint="2-letter ISO code"
            maxLength={2}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <BareField
            id="street1"
            label="Street"
            required
            placeholder="123 Main St"
          />
          <BareField
            id="city"
            label="City"
            required
            placeholder="Austin"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <BareField
            id="region"
            label="State"
            required
            placeholder="TX"
            hint="2-letter state code"
            maxLength={2}
          />
          <BareField
            id="postal_code"
            label="Postal code"
            required
            placeholder="73301"
            hint="5 digits"
            pattern="\d{5}(-\d{4})?"
            inputMode="numeric"
            maxLength={10}
          />
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : hasBank ? (
            "Update bank info"
          ) : (
            "Save bank info"
          )}
        </Button>
        {hasBank && (
          <p className="text-[11.5px] text-[var(--color-ink-3)]">
            Updating bank info clears the cached Dakota recipient. The next
            payout re-provisions against the new info.
          </p>
        )}
      </form>
    </section>
  );
}

function Field({
  label,
  id,
  value,
  disabled,
  mono,
}: {
  label: string;
  id: string;
  value: string;
  disabled?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        disabled={disabled}
        className={mono ? "font-mono text-[12px]" : ""}
        readOnly
      />
    </div>
  );
}

function ControlledField({
  label,
  id,
  value,
  onChange,
  type,
  min,
  step,
  placeholder,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  min?: string;
  step?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        min={min}
        step={step}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function BareField({
  id,
  label,
  required,
  defaultValue,
  placeholder,
  hint,
  pattern,
  inputMode,
  maxLength,
}: {
  id: string;
  label: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
  pattern?: string;
  inputMode?: "text" | "numeric";
  maxLength?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        pattern={pattern}
        inputMode={inputMode}
        maxLength={maxLength}
      />
      {hint && (
        <p className="text-[11.5px] text-[var(--color-ink-3)]">{hint}</p>
      )}
    </div>
  );
}
