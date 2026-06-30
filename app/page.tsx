import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Coins,
  Eye,
  Layers,
  Send,
  ShieldCheck,
  Sparkles,
  Timer,
  UserRound,
  Wallet,
  Zap,
} from "lucide-react";

import { Reveal } from "@/components/landing/reveal";
import { StatCounter } from "@/components/landing/stat-counter";
import { PaymentTicker } from "@/components/landing/payment-ticker";
import { HeroCursor } from "@/components/landing/hero-cursor";
import { FlowDiagram } from "@/components/landing/flow-diagram";

const STEPS = [
  {
    n: "01",
    icon: Wallet,
    title: "Spin up your money account",
    body: "Sign up, finish a one-click KYB in the sandbox, and we provision your USD account, USDC wallet, and rule engine in seconds. No paperwork, no waiting.",
  },
  {
    n: "02",
    icon: Send,
    title: "Post the gig, set the brief",
    body: "Write the requirements like you would in a doc. The AI agent reads them, watches every submission against them, and only ships when the work matches.",
  },
  {
    n: "03",
    icon: Zap,
    title: "Pay in dollars, hold in stables",
    body: "Approve a submission and one click fires a USDC → USD ACH payout. Your contractor sees plain dollars hit their bank. You stay in stables.",
  },
];

const PERSONAS = [
  {
    icon: Briefcase,
    eyebrow: "Indie operator",
    title: "Run a one-person company with a real treasury.",
    points: [
      "USD bank account on day one — no LLC theater",
      "Post jobs, AI verifies the work before you pay",
      "Stablecoin balance you actually control",
    ],
    cta: "Open an operator account",
    href: "/signup",
  },
  {
    icon: UserRound,
    eyebrow: "Freelancer",
    title: "Submit work. Get paid in dollars. Anywhere.",
    points: [
      "Set your hourly rate once at signup",
      "Submit hours + a link. The agent reviews it.",
      "ACH direct deposit to your local bank",
    ],
    cta: "Get paid as a freelancer",
    href: "/signup",
  },
  {
    icon: BrainCircuit,
    eyebrow: "AI-first review",
    title: "Hire an agent that actually reads the work.",
    points: [
      "Reads requirements + the submitted artifact",
      "Returns a verdict + a checklist, every time",
      "Blocks payment until the work passes",
    ],
    cta: "See the AI reviewer",
    href: "/login",
  },
];

const PROOFS = [
  { icon: ShieldCheck, label: "FDIC-grade rails under the hood" },
  { icon: BrainCircuit, label: "Every submission AI-reviewed" },
  { icon: Timer, label: "Pay in dollars in under 60 seconds" },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen font-sans text-[var(--color-ink)] antialiased">
      {/* Floating glass nav */}
      <header className="sticky top-3 z-30 mx-auto mt-3 max-w-6xl px-3">
        <nav className="glass flex items-center justify-between rounded-[var(--radius-pill)] px-4 py-2.5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-[var(--color-accent)] text-[13px] font-bold tracking-tight text-[var(--color-accent-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_4px_10px_-4px_rgba(180,220,0,0.55)]">
              I
            </div>
            <span className="text-[15px] font-semibold tracking-[-0.012em]">
              IndieBank
            </span>
          </Link>
          <div className="hidden items-center gap-1 text-[12.5px] text-[var(--color-ink-2)] sm:flex">
            <a
              href="#how"
              className="rounded-full px-3 py-1.5 transition-colors hover:bg-black/[0.04]"
            >
              How it works
            </a>
            <a
              href="#personas"
              className="rounded-full px-3 py-1.5 transition-colors hover:bg-black/[0.04]"
            >
              Who it&apos;s for
            </a>
            <a
              href="#built-on"
              className="rounded-full px-3 py-1.5 transition-colors hover:bg-black/[0.04]"
            >
              Money flow
            </a>
            <Link
              href="/challenge-details"
              className="rounded-full px-3 py-1.5 transition-colors hover:bg-black/[0.04]"
            >
              Challenge details
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-full px-3 py-1.5 text-[12.5px] text-[var(--color-ink-2)] transition-colors hover:bg-black/[0.04] hover:text-[var(--color-ink)] sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="btn-base btn-accent px-3.5 py-1.5 text-[12.5px]"
            >
              Open a bank
            </Link>
          </div>
        </nav>
      </header>

      {/* ───────────────────────── HERO ───────────────────────── */}
      <section className="relative mx-auto max-w-6xl px-6 pt-20 pb-16 sm:pt-28 sm:pb-24">
        <HeroCursor />

        {/* Trust chips */}
        <div className="relative flex flex-wrap items-center gap-2">
          {PROOFS.map((p, i) => (
            <div
              key={p.label}
              className="chip hero-word"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <p.icon
                className="h-3 w-3 text-[var(--color-ink-2)]"
                strokeWidth={2}
              />
              {p.label}
            </div>
          ))}
        </div>

        {/* Headline */}
        <h1 className="relative mt-7 max-w-4xl text-[44px] font-semibold leading-[1.02] tracking-[-0.028em] sm:text-[80px]">
          <span className="hero-word" style={{ animationDelay: "120ms" }}>
            The
          </span>{" "}
          <span className="hero-word" style={{ animationDelay: "180ms" }}>
            bank
          </span>{" "}
          <span className="hero-word" style={{ animationDelay: "240ms" }}>
            for
          </span>{" "}
          <span className="hero-word" style={{ animationDelay: "300ms" }}>
            people
          </span>
          <br />
          <span className="hero-word" style={{ animationDelay: "380ms" }}>
            who
          </span>{" "}
          <span className="hero-word" style={{ animationDelay: "440ms" }}>
            build
          </span>{" "}
          <span
            className="hero-word relative inline-block"
            style={{ animationDelay: "500ms" }}
          >
            <span className="relative z-10">solo.</span>
            {/* Drawn-in underline */}
            <svg
              aria-hidden
              viewBox="0 0 600 24"
              preserveAspectRatio="none"
              className="absolute inset-x-0 -bottom-1 h-3 w-full sm:h-4"
            >
              <path
                d="M4 16 C 120 4, 240 22, 360 12 S 580 6, 596 14"
                stroke="var(--color-accent)"
                strokeWidth="10"
                strokeLinecap="round"
                fill="none"
                className="underline-draw"
              />
            </svg>
          </span>
        </h1>

        {/* Subhead */}
        <p
          className="hero-word relative mt-7 max-w-xl text-[15.5px] leading-relaxed text-[var(--color-ink-3)] sm:text-[17px]"
          style={{ animationDelay: "620ms" }}
        >
          A money account, a stablecoin treasury, and an AI agent that reviews
          every freelancer&apos;s work before you ship the payout — all in one
          place, run by you alone.
        </p>

        {/* CTAs — buttons row, sandbox note stacks below */}
        <div
          className="hero-word relative mt-8 flex flex-col items-start gap-3"
          style={{ animationDelay: "700ms" }}
        >
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="btn-base btn-accent h-12 gap-2 px-6 text-[14px]"
            >
              Open my bank
              <ArrowUpRight className="h-4 w-4" strokeWidth={2.25} />
            </Link>
            <Link
              href="/login"
              className="btn-base btn-ghost h-12 px-6 text-[14px]"
            >
              Sign in
            </Link>
          </div>
          <span className="text-[12px] text-[var(--color-ink-3)]">
            Live sandbox · no card, no verification, no waiting list.
          </span>
        </div>

        {/* Scroll cue */}
        <div className="relative mt-20 hidden items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-3)] sm:flex">
          <span className="bob inline-flex items-center gap-2">
            <ArrowDown className="h-3 w-3" strokeWidth={2} />
            See it move
          </span>
        </div>
      </section>

      {/* ─────────────────── PAYMENT TICKER ─────────────────── */}
      <Reveal>
        <section className="mx-auto max-w-6xl px-3 sm:px-6">
          <div className="glass overflow-hidden rounded-[var(--radius-xl)] px-1">
            <div className="px-5 pt-4">
              <span className="eyebrow">Payouts shipping right now</span>
            </div>
            <PaymentTicker />
          </div>
        </section>
      </Reveal>

      {/* ─────────────────────── STATS ─────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <Reveal>
          <p className="eyebrow">The numbers</p>
          <h2 className="mt-3 max-w-3xl text-[28px] font-semibold tracking-[-0.018em] sm:text-[36px]">
            Made for the one-person company. Priced like it too.
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              value: 12_400_000,
              prefix: "$",
              format: "compact" as const,
              label: "Paid out to freelancers",
            },
            { value: 64, suffix: "+", label: "Countries we settle to" },
            {
              value: 99.4,
              suffix: "%",
              format: "decimal-1" as const,
              label: "AI reviews accepted",
            },
            { value: 90, suffix: " sec", label: "Median pay-flow time" },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 90}>
              <div className="glass glass-hover rounded-[var(--radius-xl)] p-6">
                <div className="text-[36px] font-semibold tracking-[-0.02em] text-[var(--color-ink)] sm:text-[44px]">
                  <StatCounter
                    value={s.value}
                    prefix={s.prefix}
                    suffix={s.suffix}
                    format={s.format}
                  />
                </div>
                <div className="mt-1 text-[12.5px] text-[var(--color-ink-3)]">
                  {s.label}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────────────────── HOW IT WORKS ───────────────────── */}
      <section
        id="how"
        className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32"
      >
        {/* Soft architectural grid behind */}
        <div
          aria-hidden
          className="dotgrid absolute inset-0 -z-10 opacity-50"
        />

        <Reveal>
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 max-w-3xl text-[28px] font-semibold tracking-[-0.018em] sm:text-[40px]">
            Three steps from signup to a settled payout.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 100}>
              <div className="glass glass-hover relative h-full rounded-[var(--radius-2xl)] p-7">
                <div className="absolute right-7 top-7 text-[44px] font-semibold leading-none tracking-[-0.02em] text-[var(--color-ink-4)]/80">
                  {s.n}
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-accent)] text-[var(--color-accent-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_8px_18px_-8px_rgba(180,220,0,0.55)]">
                  <s.icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <h3 className="mt-5 text-[19px] font-semibold tracking-[-0.012em] text-[var(--color-ink)]">
                  {s.title}
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--color-ink-3)]">
                  {s.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ──────────────────── PERSONAS ──────────────────── */}
      <section
        id="personas"
        className="mx-auto max-w-6xl px-6 py-24 sm:py-32"
      >
        <Reveal>
          <p className="eyebrow">Who it&apos;s for</p>
          <h2 className="mt-3 max-w-3xl text-[28px] font-semibold tracking-[-0.018em] sm:text-[40px]">
            One product. Three sides of the table.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {PERSONAS.map((p, i) => (
            <Reveal key={p.eyebrow} delay={i * 110}>
              <div className="glass glass-hover flex h-full flex-col rounded-[var(--radius-2xl)] p-7">
                <div className="flex items-center justify-between">
                  <span className="eyebrow">{p.eyebrow}</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.05] text-[var(--color-ink)]">
                    <p.icon className="h-4 w-4" strokeWidth={2} />
                  </div>
                </div>
                <h3 className="mt-5 text-[20px] font-semibold leading-snug tracking-[-0.012em] text-[var(--color-ink)]">
                  {p.title}
                </h3>
                <ul className="mt-4 space-y-2.5 text-[13.5px] text-[var(--color-ink-2)]">
                  {p.points.map((pt) => (
                    <li
                      key={pt}
                      className="flex items-start gap-2.5 leading-snug"
                    >
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent-ink)]"
                        fill="var(--color-accent)"
                        strokeWidth={2}
                      />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={p.href}
                  className="mt-6 inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--color-ink)] underline-offset-4 hover:underline"
                >
                  {p.cta}
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.25} />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ──────────────────── DIFFERENTIATORS ──────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <Reveal>
          <p className="eyebrow">What makes it different</p>
          <h2 className="mt-3 max-w-3xl text-[28px] font-semibold tracking-[-0.018em] sm:text-[36px]">
            Not a payroll tool with a chat bolted on.
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: BrainCircuit,
              title: "AI as the pre-flight check",
              body: "Before a single cent moves, an agent reads the brief, reads the work, and writes the verdict. You approve a sound recommendation, not a hope.",
            },
            {
              icon: Coins,
              title: "Stablecoins under the hood",
              body: "Your balance is USDC, 1:1 with dollars, on-chain. Send to a US bank as ACH or to a wallet on-chain — same balance.",
            },
            {
              icon: ShieldCheck,
              title: "Programmable guardrails",
              body: "Set rules that block payouts before they settle. \"No more than $5k to a new payee\". \"Pause weekends.\" Whatever your shape of risk.",
            },
            {
              icon: Layers,
              title: "One account, two rails",
              body: "Customers pay you in USD via ACH or USDC on-chain. We auto-convert. You get a single balance, one set of books.",
            },
            {
              icon: Eye,
              title: "Read-only by default",
              body: "Your contractors sign in to submit. They see what they need. No mucking with bank info, no double-entry, no chasing invoices.",
            },
            {
              icon: Sparkles,
              title: "Designed for one",
              body: "No team plans, no seats. Built for the founder who reviews their own pull requests and pays their own contractors.",
            },
          ].map((d, i) => (
            <Reveal key={d.title} delay={i * 70}>
              <div className="glass glass-hover rounded-[var(--radius-xl)] p-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.05] text-[var(--color-ink)]">
                  <d.icon className="h-4 w-4" strokeWidth={2} />
                </div>
                <h3 className="mt-4 text-[15.5px] font-semibold tracking-[-0.012em] text-[var(--color-ink)]">
                  {d.title}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-ink-3)]">
                  {d.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ──────────────────── FLOW DIAGRAM ──────────────────── */}
      <section id="built-on" className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <Reveal>
          <FlowDiagram />
        </Reveal>

      </section>

      {/* ──────────────────── FINAL CTA ──────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-24 sm:pb-32">
        <Reveal>
          <div className="glass-strong relative overflow-hidden rounded-[var(--radius-3xl)] p-10 sm:p-16">
            {/* Big radial accent in the corner */}
            <div
              aria-hidden
              className="pointer-events-none absolute -right-32 -top-32 h-[520px] w-[520px] rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(215,254,3,0.55) 0%, rgba(215,254,3,0) 60%)",
                filter: "blur(40px)",
              }}
            />

            <div className="relative">
              <p className="eyebrow">When you&apos;re ready</p>
              <h2 className="mt-3 max-w-2xl text-[34px] font-semibold leading-[1.05] tracking-[-0.022em] sm:text-[52px]">
                Open the bank.
                <br />
                Pay your first contractor tonight.
              </h2>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[var(--color-ink-3)]">
                Live sandbox, no card, no verification. Money account
                provisioned in under two minutes. AI reviewer included.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  className="btn-base btn-accent h-12 gap-2 px-6 text-[14px]"
                >
                  Open my bank
                  <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
                </Link>
                <Link
                  href="/login"
                  className="btn-base btn-ghost h-12 px-6 text-[14px]"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ──────────────────── FOOTER ──────────────────── */}
      <footer className="border-t border-black/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-3 px-6 py-7 text-[12px] text-[var(--color-ink-3)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-[6px] bg-[var(--color-accent)] text-[10px] font-bold text-[var(--color-accent-ink)]">
              I
            </div>
            <span>© IndieBank — live sandbox demo.</span>
          </div>
          <a
            href="https://dakota.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-[var(--color-ink)]"
          >
            Powered by Dakota
          </a>
        </div>
      </footer>
    </div>
  );
}
