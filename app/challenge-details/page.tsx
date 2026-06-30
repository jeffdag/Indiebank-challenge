import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Brain,
  BrainCircuit,
  Briefcase,
  Cpu,
  ChevronRight,
  CheckCircle2,
  Eye,
  ExternalLink,
  FileCode2,
  Layers,
  Palette,
  Send,
  Sparkles,
  Type,
  UserRound,
  Wallet,
  XCircle,
} from "lucide-react";

import { Reveal } from "@/components/landing/reveal";
import { FlowDiagram } from "@/components/landing/flow-diagram";
import { CodeBlock } from "@/components/landing/code-block";
import { SystemDiagram } from "@/components/landing/system-diagram";
import { JobsFlowDiagram } from "@/components/landing/jobs-flow-diagram";

const KYB_ACTORS = [
  {
    icon: Briefcase,
    eyebrow: "Operator",
    title: "Yes — KYB required.",
    body: "The operator is the legal entity that holds and moves money. Dakota requires a verified customer record before you can be issued a USD account or hold a wallet. In the sandbox we approve KYB with a single API call; in production it's a hosted form your user fills in.",
    points: [
      "Creates a Dakota customer (business)",
      "Provisions a treasury wallet on Ethereum",
      "Provisions a USD on-ramp account",
    ],
    tone: "accent" as const,
  },
  {
    icon: UserRound,
    eyebrow: "Worker / contractor",
    title: "No KYB. Ever.",
    body: "A worker is a recipient on the operator's customer — a bank destination, not a balance. They don't hold money, don't sign in to Dakota, don't have an identity record on the platform. They're just a place you send money to.",
    points: [
      "Recipient + fiat_us destination + off-ramp",
      "All three created on the operator's customer",
      "Add one and it's payable instantly",
    ],
    tone: "ink" as const,
  },
  {
    icon: Eye,
    eyebrow: "Freelancer (IndieBank user)",
    title: "Logs in, but has no Dakota customer.",
    body: "Freelancers sign in to IndieBank to submit work and see their earnings. They don't get a Dakota customer record — when an operator pays them, we lazily provision a recipient on the operator's customer using their saved bank info.",
    points: [
      "Supabase auth only — IndieBank-side",
      "Bank info stored on profile",
      "Recipient is created on first pay",
    ],
    tone: "ink" as const,
  },
];

const PROD_DIFFERENCES = [
  {
    title: "KYB is a real hosted form",
    body: "Instead of one simulate call, Dakota returns an application_url that you redirect the operator to. They fill in real business details. Status flips when the webhook fires.",
    docs: "https://docs.dakota.xyz",
    docLabel: "Onboarding & KYB",
  },
  {
    title: "Wallet payouts need a signed key",
    body: "Sandbox uses the SDK helpers, but production payouts move USDC out of your wallet — they must be signed by the signer key associated with the wallet's signer group. You hold that key in a KMS or HSM.",
    docs: "https://docs.dakota.xyz",
    docLabel: "Wallets & signers",
  },
  {
    title: "Settlement is webhook-driven",
    body: "In sandbox we fire ach_outbound_settled ourselves so the demo shows a complete lifecycle. In production, Dakota's partner bank settles ACH in 1–3 business days and posts a webhook when it lands.",
    docs: "https://docs.dakota.xyz",
    docLabel: "Webhooks",
  },
  {
    title: "Compliance policies enforce in-line",
    body: "Same code path. Same API. Sandbox and production share the policy engine — every payout is checked against the rules you've set before Dakota submits it to the rail.",
    docs: "https://docs.dakota.xyz",
    docLabel: "Compliance policies",
  },
];

const KYB_CODE = `// app/api/onboarding/route.ts
// 1) Create the operator's Dakota customer (idempotent).
const created = await dakota.customers.create({
  name: displayName,
  customer_type: "business",
  external_id: \`indiebank_\${user.id}\`,
});
const customerId = created.id;
const applicationId = created.application_id;

// 2) Approve KYB in the sandbox.
//    In PRODUCTION you'd redirect the operator to \`application.application_url\`
//    and wait for the \`customer.kyb_status.updated\` webhook instead.
await dakota.sandbox.simulateOnboarding({
  type: "kyb_approve",
  applicant_id: applicationId,
  simulation_id: \`sim_kyb_\${user.id}\`,
});

// 3) Poll until KYB lands as active (sandbox flips in ~1s).
for (let i = 0; i < 8; i++) {
  await sleep(300);
  const c = await dakota.customers.get(customerId);
  if (c.kyb_status === "active") break;
}`;

const WORKER_CODE = `// app/api/workers/route.ts — no KYB call here.
// A worker is just a recipient + bank destination + off-ramp on the
// OPERATOR's customer. They never become a Dakota customer themselves.

const recipient = await dakota.recipients.create(profile.dakota_customer_id, {
  name: name.trim(),
  address: { /* mailing address — required by Dakota */ },
});

const destination = await dakota.destinations.create(recipient.id, {
  destination_type: "fiat_us",
  name: \`\${name.trim()} Bank\`,
  bank_name: bankName,
  account_holder_name: name.trim().substring(0, 22),
  account_number: accountNumber,
  aba_routing_number: routingNumber,
  account_type: accountType,
});

const offramp = await dakota.accounts.create({
  account_type: "offramp",
  fiat_destination_id: destination.destination_id,
  source_asset: "USDC",
  source_network_id: "ethereum-sepolia",
  destination_asset: "USD",
  rail: "ach",
  capabilities: ["ach"],
});`;

const PAY_CODE = `// app/api/workers/[id]/pay/route.ts
// Create the USDC → USD ACH one-off transaction.
const tx = await dakota.transactions.create({
  customer_id: profile.dakota_customer_id,
  source_asset: "USDC",
  source_network_id: "ethereum-sepolia",
  destination_id: destinationId,
  destination_asset: "USD",
  destination_payment_rail: "ach",
  amount,
  payment_reference: "Salary",
});

// SANDBOX-ONLY: nudge the lifecycle to settled so the demo shows a complete
// flow on screen. In production this is a no-op — the partner bank settles
// ACH on its own timeline (1–3 business days) and Dakota posts a webhook.
if (process.env.DAKOTA_ENV !== "production") {
  await dakota.sandbox.simulateInbound({
    simulation_id: \`settle_\${tx.id}_\${Date.now()}\`,
    type: "ach_outbound_settled",
    one_off_transaction_id: tx.id,
    amount,
    currency: "USD",
  });
}`;

const AI_REVIEW_CODE = `// lib/agents/review-job.ts
// Pulls the submitted artifact, asks OpenAI for a structured verdict.

const result = await generateObject({
  model: openai(process.env.OPENAI_MODEL ?? "gpt-4o-mini"),
  schema: ReviewSchema,                   // Zod schema, .nullable() not .optional()
  system: STRICT_SPEC_REVIEWER_PROMPT,
  messages: [{
    role: "user",
    content: [
      { type: "text", text: brief + submission },
      // If the deliverable is an image, pass it as a vision input.
      // If text/markdown/code, inline the body (capped at ~120KB).
      ...(file ? [{ type: "image", image: new URL(file.url) }] : []),
    ],
  }],
});

// result.object is { decision, feedback, checklist[] } — typed by Zod.
return result.object;`;

export default function ChallengeDetailsPage() {
  return (
    <div className="relative min-h-screen font-sans text-[var(--color-ink)] antialiased">
      {/* Floating glass nav — mirrors the landing */}
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
            <Link
              href="/"
              className="rounded-full px-3 py-1.5 transition-colors hover:bg-black/[0.04]"
            >
              Home
            </Link>
            <a
              href="#design"
              className="rounded-full px-3 py-1.5 transition-colors hover:bg-black/[0.04]"
            >
              Design
            </a>
            <a
              href="#architecture"
              className="rounded-full px-3 py-1.5 transition-colors hover:bg-black/[0.04]"
            >
              Architecture
            </a>
            <a
              href="#dakota"
              className="rounded-full px-3 py-1.5 transition-colors hover:bg-black/[0.04]"
            >
              Dakota usage
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/signup"
              className="btn-base btn-accent px-3.5 py-1.5 text-[12.5px]"
            >
              Open a bank
            </Link>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section className="relative mx-auto max-w-6xl px-6 pt-20 pb-12 sm:pt-28 sm:pb-16">
        <div className="chip nm-fade-in-up">
          <Cpu className="h-3 w-3 text-[var(--color-ink-2)]" strokeWidth={2} />
          Challenge details · for judges, developers, the curious
        </div>

        <h1 className="mt-5 max-w-4xl text-[40px] font-semibold leading-[1.04] tracking-[-0.024em] sm:text-[64px] nm-fade-in-up">
          How we built{" "}
          <span className="relative inline-block">
            <span className="relative z-10">IndieBank</span>
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-1 -z-0 h-2.5 rounded-full bg-[var(--color-accent)]"
            />
          </span>
          .
        </h1>

        <p className="mt-6 max-w-2xl text-[15.5px] leading-relaxed text-[var(--color-ink-3)] nm-fade-in-up">
          Three sections, top to bottom: the design choices we made and why,
          the architecture under the UI, and the exact Dakota SDK surface that
          moves real money.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3 nm-fade-in-up">
          <a
            href="#design"
            className="btn-base btn-accent h-11 gap-1.5 px-5 text-[13.5px]"
          >
            <Palette className="h-3.5 w-3.5" strokeWidth={2} />
            Start with design
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.25} />
          </a>
          <a
            href="https://dakota.xyz/agentic-build"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-base btn-ghost h-11 px-5 text-[13.5px]"
          >
            The Agentic Build challenge
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.25} />
          </a>
        </div>
      </section>

      {/* ────────────────────── 1. DESIGN ────────────────────── */}
      <section id="design" className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <Reveal>
          <p className="eyebrow">Section 1 · The design</p>
          <h2 className="mt-3 max-w-3xl text-[26px] font-semibold tracking-[-0.018em] sm:text-[40px]">
            One lime. One paper. One typeface.
          </h2>
          <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-[var(--color-ink-3)]">
            IndieBank is a banking app for people who run solo — founders,
            freelancers, one-person companies. The design had to feel{" "}
            <em>like a tool a designer would have made for themselves</em> —
            opinionated, confident, light, with no panel competing for
            attention. So we picked a single accent, a single surface
            material, and a single typeface, and built the whole product on
            top of those three constraints.
          </p>
        </Reveal>

        {/* Tokens grid */}
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {/* Lime accent */}
          <Reveal>
            <div className="glass glass-hover rounded-[var(--radius-2xl)] p-6">
              <div className="flex items-center justify-between">
                <span className="eyebrow">Accent</span>
                <span className="font-mono text-[11px] text-[var(--color-ink-3)]">
                  #D7FE03
                </span>
              </div>
              <div className="mt-4 grid h-28 w-full place-items-center rounded-[var(--radius-md)] bg-[var(--color-accent)] text-[var(--color-accent-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_8px_18px_-8px_rgba(180,220,0,0.45)]">
                <span className="text-[28px] font-semibold tracking-[-0.02em]">
                  $D7FE03
                </span>
              </div>
              <h3 className="mt-5 text-[15px] font-semibold tracking-[-0.012em] text-[var(--color-ink)]">
                Bright lime, used like a highlighter
              </h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--color-ink-3)]">
                One primary CTA per surface, the active nav item, the
                in-flight stat tile, the approved verdict. The accent is rare
                enough that when it appears, your eye snaps to it.
                Mandatory pairing: black text on accent fills.
              </p>
            </div>
          </Reveal>

          {/* Light glass */}
          <Reveal delay={90}>
            <div className="glass glass-hover relative rounded-[var(--radius-2xl)] p-6">
              <div className="flex items-center justify-between">
                <span className="eyebrow">Surface</span>
                <span className="font-mono text-[11px] text-[var(--color-ink-3)]">
                  .glass
                </span>
              </div>
              <div className="mt-4 grid h-28 w-full place-items-center rounded-[var(--radius-md)] bg-gradient-to-br from-white/85 to-white/55 [backdrop-filter:blur(20px)] [-webkit-backdrop-filter:blur(20px)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(10,10,10,0.04),0_14px_38px_-10px_rgba(20,20,40,0.12)]">
                <span className="text-[14px] font-medium text-[var(--color-ink-2)]">
                  Liquid paper
                </span>
              </div>
              <h3 className="mt-5 text-[15px] font-semibold tracking-[-0.012em] text-[var(--color-ink)]">
                Light glass — &quot;liquid paper&quot;
              </h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--color-ink-3)]">
                Every elevated surface uses one recipe: 72% white, 24px
                backdrop blur, a 1px white inner highlight, a layered drop
                shadow. Reads as a frosted paper card hovering over the
                canvas. Two large lime &quot;lava&quot; blobs drift behind so
                the glass has something to refract.
              </p>
            </div>
          </Reveal>

          {/* Urbanist */}
          <Reveal delay={180}>
            <div className="glass glass-hover rounded-[var(--radius-2xl)] p-6">
              <div className="flex items-center justify-between">
                <span className="eyebrow">Typeface</span>
                <span className="font-mono text-[11px] text-[var(--color-ink-3)]">
                  Urbanist
                </span>
              </div>
              <div className="mt-4 grid h-28 w-full content-center gap-1 rounded-[var(--radius-md)] border border-black/[0.06] bg-white/55 px-5 backdrop-blur">
                <p
                  className="text-[28px] font-semibold leading-none tracking-[-0.02em] text-[var(--color-ink)]"
                  style={{ fontFamily: "var(--font-urbanist), sans-serif" }}
                >
                  Aa
                </p>
                <p
                  className="text-[11.5px] text-[var(--color-ink-3)]"
                  style={{ fontFamily: "var(--font-urbanist), sans-serif" }}
                >
                  300 · 400 · 500 · 600 · 700
                </p>
              </div>
              <h3 className="mt-5 text-[15px] font-semibold tracking-[-0.012em] text-[var(--color-ink)]">
                Urbanist — geometric warmth
              </h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--color-ink-3)]">
                Self-hosted via next/font. Geometric enough to feel modern,
                round enough to feel friendly. Headlines run 500–600 with
                tight tracking; body sits at 13–13.5px with a 1.5 line-height
                so dense screens stay readable.
              </p>
            </div>
          </Reveal>
        </div>

        {/* Design principles */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Reveal>
            <div className="glass rounded-[var(--radius-xl)] p-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.05] text-[var(--color-ink)]">
                <Type className="h-4 w-4" strokeWidth={2} />
              </div>
              <h3 className="mt-4 text-[15px] font-semibold tracking-[-0.012em] text-[var(--color-ink)]">
                Generous radii, generous whitespace
              </h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-ink-3)]">
                Card corners run 24–28px. Pills are 999. Tables breathe at
                ~12px row height. The whole UI feels closer to a notebook than
                a spreadsheet — which is the point, because the user is a
                person, not a finance team.
              </p>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="glass rounded-[var(--radius-xl)] p-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.05] text-[var(--color-ink)]">
                <Palette className="h-4 w-4" strokeWidth={2} />
              </div>
              <h3 className="mt-4 text-[15px] font-semibold tracking-[-0.012em] text-[var(--color-ink)]">
                Inverted sidebar for contrast
              </h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-ink-3)]">
                The app shell uses a soft charcoal glass sidebar against the
                light canvas. Active nav still uses the lime fill — so the
                accent ties the two surfaces together without flooding either
                one.
              </p>
            </div>
          </Reveal>
          <Reveal delay={160}>
            <div className="glass rounded-[var(--radius-xl)] p-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.05] text-[var(--color-ink)]">
                <Sparkles className="h-4 w-4" strokeWidth={2} />
              </div>
              <h3 className="mt-4 text-[15px] font-semibold tracking-[-0.012em] text-[var(--color-ink)]">
                Apple-spring motion
              </h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-ink-3)]">
                Buttons spring at{" "}
                <code className="font-mono text-[11.5px] text-[var(--color-ink)]">
                  cubic-bezier(0.34, 1.56, 0.64, 1)
                </code>
                . Cards lift{" "}
                <code className="font-mono text-[11.5px] text-[var(--color-ink)]">
                  -translate-y-[1px]
                </code>{" "}
                on hover. Drawers slide in from the right at 320ms with the
                Apple ease. All motion respects{" "}
                <code className="font-mono text-[11.5px] text-[var(--color-ink)]">
                  prefers-reduced-motion
                </code>
                .
              </p>
            </div>
          </Reveal>
          <Reveal delay={240}>
            <div className="glass rounded-[var(--radius-xl)] p-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.05] text-[var(--color-ink)]">
                <FileCode2 className="h-4 w-4" strokeWidth={2} />
              </div>
              <h3 className="mt-4 text-[15px] font-semibold tracking-[-0.012em] text-[var(--color-ink)]">
                One drawer pattern for everything
              </h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-ink-3)]">
                AI review, &quot;Post a job&quot;, &quot;Add worker&quot; all
                share the same right-side glass drawer shape. Header with an
                accent icon puck, body in eyebrow-labeled sections, sticky
                footer with a ghost &quot;Cancel&quot; and an accent CTA. Add
                a new drawer once you know this shape and the muscle memory is
                already there.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ────────────────────── 2. ARCHITECTURE ────────────────────── */}
      <section id="architecture" className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <Reveal>
          <p className="eyebrow">Section 2 · Architecture</p>
          <h2 className="mt-3 max-w-3xl text-[26px] font-semibold tracking-[-0.018em] sm:text-[40px]">
            A Next.js server. Three external rails. One AI agent.
          </h2>
          <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-[var(--color-ink-3)]">
            The whole product lives in a single Next.js 16 app. Server
            components and route handlers do the heavy work; client components
            handle drawers, charts, and animations. Three external services
            sit behind the server — Dakota for money, OpenAI for AI review,
            Supabase for auth + DB + file storage.
          </p>
        </Reveal>

        <div className="mt-8">
          <Reveal delay={80}>
            <SystemDiagram />
          </Reveal>
        </div>

        {/* Stack details */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Layers,
              title: "Next.js 16 · App Router",
              body: "Server components by default. Route handlers under app/api/*. Server actions are kept light — the Dakota SDK only runs server-side, never in the browser.",
            },
            {
              icon: Eye,
              title: "Supabase",
              body: "Auth (email + password), Postgres with RLS, Storage for file uploads. Trigger handle_new_user inserts a profile row with role + hourly_rate from signup metadata.",
            },
            {
              icon: BrainCircuit,
              title: "OpenAI · gpt-4o-mini",
              body: "Wired through the Vercel AI SDK. generateObject + a Zod schema returns a typed verdict. Configurable via OPENAI_MODEL — swap to gpt-4o for richer reviews on long docs.",
            },
            {
              icon: Brain,
              title: "Dakota TS SDK",
              body: "@dakota-xyz/ts-sdk. One singleton client, server-only. Every customers/wallets/recipients/transactions call goes through it. Sandbox + production share the same call shape.",
            },
            {
              icon: Type,
              title: "Tailwind 4 · Base UI",
              body: "All tokens live in globals.css. Base UI primitives for Dialog/Select/Dropdown/Tabs/Tooltip. shadcn-like wrapper components in components/ui to keep the API ergonomic.",
            },
            {
              icon: Sparkles,
              title: "Sonner for toasts",
              body: "Glass-styled toasts via a custom theme. Success, warning, error, loading all pull from the same token palette as the rest of the UI.",
            },
          ].map((s, i) => (
            <Reveal key={s.title} delay={i * 70}>
              <div className="glass glass-hover rounded-[var(--radius-xl)] p-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.05] text-[var(--color-ink)]">
                  <s.icon className="h-4 w-4" strokeWidth={2} />
                </div>
                <h3 className="mt-4 text-[14.5px] font-semibold tracking-[-0.012em] text-[var(--color-ink)]">
                  {s.title}
                </h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--color-ink-3)]">
                  {s.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Jobs flow diagram */}
        <div className="mt-12">
          <Reveal>
            <p className="eyebrow">Feature spotlight</p>
            <h3 className="mt-2 max-w-3xl text-[20px] font-semibold tracking-[-0.014em] sm:text-[26px]">
              The freelance jobs feature — agent-in-the-loop payments.
            </h3>
            <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-[var(--color-ink-3)]">
              This is the one differentiator that takes IndieBank past
              &quot;another neobank.&quot; Operators post a brief, freelancers
              submit work + hours, and the AI agent reads the brief and the
              submitted artifact and returns a structured verdict
              (decision + per-requirement checklist + actionable feedback)
              before a single cent moves.
            </p>
          </Reveal>
          <div className="mt-6">
            <Reveal delay={100}>
              <JobsFlowDiagram />
            </Reveal>
          </div>
        </div>

        {/* AI code */}
        <div className="mt-10">
          <Reveal>
            <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
              <CodeBlock
                filename="lib/agents/review-job.ts"
                language="typescript"
                code={AI_REVIEW_CODE}
              />
              <div className="space-y-3 text-[13px] leading-relaxed text-[var(--color-ink-3)]">
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-accent)] bg-[var(--color-accent)]/[0.10] px-3 py-1 text-[11px] font-medium text-[var(--color-accent-ink)]">
                  <Sparkles className="h-3 w-3" strokeWidth={2.25} />
                  AI review · OpenAI
                </div>
                <p>
                  We use the Vercel AI SDK&apos;s{" "}
                  <code className="rounded-sm bg-black/[0.05] px-1.5 py-0.5 font-mono text-[11.5px] text-[var(--color-ink)]">
                    generateObject
                  </code>{" "}
                  with a Zod schema — the model is forced to return a typed
                  verdict, never free text. Multimodal: text submissions
                  (markdown, code, links) get inlined; image deliverables are
                  passed as vision inputs.
                </p>
                <p>
                  Trap we hit early: OpenAI&apos;s strict structured output
                  rejects{" "}
                  <code className="rounded-sm bg-black/[0.05] px-1.5 py-0.5 font-mono text-[11.5px] text-[var(--color-ink)]">
                    .optional()
                  </code>{" "}
                  fields in Zod. We use{" "}
                  <code className="rounded-sm bg-black/[0.05] px-1.5 py-0.5 font-mono text-[11.5px] text-[var(--color-ink)]">
                    .nullable()
                  </code>{" "}
                  everywhere instead.
                </p>
                <p>
                  Status state is never persisted server-side as{" "}
                  <code className="rounded-sm bg-black/[0.05] px-1.5 py-0.5 font-mono text-[11.5px] text-[var(--color-ink)]">
                    reviewing
                  </code>{" "}
                  — that&apos;s a client-only animation in the drawer. If the
                  AI call fails, the job stays at its previous status and the
                  operator can retry from the UI.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ────────────────────── 3. DAKOTA USAGE ────────────────────── */}
      <section id="dakota" className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <Reveal>
          <p className="eyebrow">Section 3 · Dakota usage</p>
          <h2 className="mt-3 max-w-3xl text-[26px] font-semibold tracking-[-0.018em] sm:text-[40px]">
            How money actually moves.
          </h2>
          <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-[var(--color-ink-3)]">
            Dakota&apos;s regulated banking + on-chain settlement is the
            money-movement layer. IndieBank is the indie-operator console on
            top. Below: the live flow, who needs KYB, the exact SDK calls,
            and what changes when{" "}
            <code className="font-mono text-[12px] text-[var(--color-ink)]">
              DAKOTA_ENV=production
            </code>
            .
          </p>
        </Reveal>

        <div className="mt-8">
          <Reveal>
            <FlowDiagram />
          </Reveal>
        </div>

        {/* KYB actor cards */}
        <div className="mt-12">
          <Reveal>
            <h3 className="text-[20px] font-semibold tracking-[-0.014em] text-[var(--color-ink)] sm:text-[26px]">
              Who actually needs KYB?
            </h3>
            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[var(--color-ink-3)]">
              KYB is per-customer in Dakota&apos;s model — and only the entity
              that holds and moves money counts as a customer. Workers and
              freelancers don&apos;t have Dakota customer records, so they
              don&apos;t go through KYB.
            </p>
          </Reveal>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {KYB_ACTORS.map((a, i) => (
              <Reveal key={a.eyebrow} delay={i * 110}>
                <div
                  className={
                    a.tone === "accent"
                      ? "relative h-full overflow-hidden rounded-[var(--radius-2xl)] bg-[var(--color-accent)] p-7 text-[var(--color-accent-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_10px_24px_-10px_rgba(180,220,0,0.5)]"
                      : "glass glass-hover relative h-full rounded-[var(--radius-2xl)] p-7"
                  }
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={
                        "text-[10.5px] font-medium uppercase tracking-[0.12em] " +
                        (a.tone === "accent"
                          ? "text-[var(--color-accent-ink)]/70"
                          : "text-[var(--color-ink-3)]")
                      }
                    >
                      {a.eyebrow}
                    </span>
                    <span
                      className={
                        "grid h-9 w-9 place-items-center rounded-full " +
                        (a.tone === "accent"
                          ? "bg-[var(--color-accent-ink)] text-[var(--color-accent)]"
                          : "bg-black/[0.05] text-[var(--color-ink)]")
                      }
                    >
                      <a.icon className="h-4 w-4" strokeWidth={2} />
                    </span>
                  </div>

                  <h4
                    className={
                      "mt-5 text-[18px] font-semibold leading-snug tracking-[-0.012em] " +
                      (a.tone === "accent"
                        ? "text-[var(--color-accent-ink)]"
                        : "text-[var(--color-ink)]")
                    }
                  >
                    {a.title}
                  </h4>
                  <p
                    className={
                      "mt-2 text-[13px] leading-relaxed " +
                      (a.tone === "accent"
                        ? "text-[var(--color-accent-ink)]/80"
                        : "text-[var(--color-ink-3)]")
                    }
                  >
                    {a.body}
                  </p>

                  <ul className="mt-4 space-y-2 text-[12.5px]">
                    {a.points.map((p) => (
                      <li
                        key={p}
                        className="flex items-start gap-2 leading-snug"
                      >
                        {a.tone === "accent" ? (
                          <CheckCircle2
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-accent-ink)]"
                            strokeWidth={2}
                          />
                        ) : a.eyebrow.startsWith("Worker") ? (
                          <XCircle
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-ink-3)]"
                            strokeWidth={2}
                          />
                        ) : (
                          <CheckCircle2
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-ink-3)]"
                            strokeWidth={2}
                          />
                        )}
                        <span
                          className={
                            a.tone === "accent"
                              ? "text-[var(--color-accent-ink)]"
                              : "text-[var(--color-ink-2)]"
                          }
                        >
                          {p}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Code walkthrough */}
        <div className="mt-16">
          <Reveal>
            <h3 className="text-[20px] font-semibold tracking-[-0.014em] text-[var(--color-ink)] sm:text-[26px]">
              The SDK calls that make it move.
            </h3>
            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[var(--color-ink-3)]">
              Every snippet below is verbatim from the running app, lightly
              simplified for clarity.
            </p>
          </Reveal>

          <div className="mt-8 space-y-10">
            <Reveal>
              <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
                <CodeBlock
                  filename="onboarding/route.ts"
                  language="typescript"
                  code={KYB_CODE}
                />
                <div className="space-y-3 text-[13px] leading-relaxed text-[var(--color-ink-3)]">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-accent)] bg-[var(--color-accent)]/[0.10] px-3 py-1 text-[11px] font-medium text-[var(--color-accent-ink)]">
                    <Sparkles className="h-3 w-3" strokeWidth={2.25} />
                    Operator KYB
                  </div>
                  <p>
                    We hit{" "}
                    <code className="rounded-sm bg-black/[0.05] px-1.5 py-0.5 font-mono text-[11.5px] text-[var(--color-ink)]">
                      customers.create
                    </code>{" "}
                    to mint a Dakota customer, then immediately approve KYB
                    with{" "}
                    <code className="rounded-sm bg-black/[0.05] px-1.5 py-0.5 font-mono text-[11.5px] text-[var(--color-ink)]">
                      sandbox.simulateOnboarding
                    </code>{" "}
                    — the sandbox shortcut that maps to the real KYB form in
                    production.
                  </p>
                  <p>
                    After KYB lands as{" "}
                    <code className="rounded-sm bg-black/[0.05] px-1.5 py-0.5 font-mono text-[11.5px] text-[var(--color-ink)]">
                      active
                    </code>
                    , we provision a wallet (signer → signer group → wallet)
                    and an on-ramp account whose crypto destination points at
                    the treasury wallet — all in the same request.
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal>
              <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
                <div className="space-y-3 text-[13px] leading-relaxed text-[var(--color-ink-3)] lg:order-1">
                  <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/65 px-3 py-1 text-[11px] font-medium text-[var(--color-ink-2)] backdrop-blur">
                    <XCircle className="h-3 w-3" strokeWidth={2.25} />
                    No KYB for workers
                  </div>
                  <p>
                    Adding a worker is three plain create-calls — no identity
                    verification, no application flow. The operator types the
                    worker&apos;s bank info into the right-side drawer, and we
                    attach all of it to the operator&apos;s customer.
                  </p>
                  <p>
                    The off-ramp is what actually makes the worker payable: it
                    binds the source asset (USDC on Ethereum Sepolia) to the
                    destination (their US bank via ACH).
                  </p>
                </div>
                <div className="lg:order-2">
                  <CodeBlock
                    filename="workers/route.ts"
                    language="typescript"
                    code={WORKER_CODE}
                  />
                </div>
              </div>
            </Reveal>

            <Reveal>
              <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
                <CodeBlock
                  filename="workers/[id]/pay/route.ts"
                  language="typescript"
                  code={PAY_CODE}
                />
                <div className="space-y-3 text-[13px] leading-relaxed text-[var(--color-ink-3)]">
                  <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/65 px-3 py-1 text-[11px] font-medium text-[var(--color-ink-2)] backdrop-blur">
                    <Wallet className="h-3 w-3" strokeWidth={2.25} />
                    Outbound + auto-settle
                  </div>
                  <p>
                    One{" "}
                    <code className="rounded-sm bg-black/[0.05] px-1.5 py-0.5 font-mono text-[11.5px] text-[var(--color-ink)]">
                      transactions.create
                    </code>{" "}
                    call kicks the USDC → USD ACH lifecycle. Sandbox auto-settle
                    fires{" "}
                    <code className="rounded-sm bg-black/[0.05] px-1.5 py-0.5 font-mono text-[11.5px] text-[var(--color-ink)]">
                      ach_outbound_settled
                    </code>{" "}
                    so the demo lifecycle completes on screen.
                  </p>
                  <p>
                    This is the single place we read{" "}
                    <code className="rounded-sm bg-black/[0.05] px-1.5 py-0.5 font-mono text-[11.5px] text-[var(--color-ink)]">
                      process.env.DAKOTA_ENV
                    </code>{" "}
                    — every other API call is identical between sandbox and
                    production.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        {/* Production differences */}
        <div className="mt-16">
          <Reveal>
            <h3 className="text-[20px] font-semibold tracking-[-0.014em] text-[var(--color-ink)] sm:text-[26px]">
              What changes in production.
            </h3>
            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[var(--color-ink-3)]">
              The API surface stays the same. The differences below are the
              four spots where the sandbox shortcut needs to come out.
            </p>
          </Reveal>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {PROD_DIFFERENCES.map((d, i) => (
              <Reveal key={d.title} delay={i * 80}>
                <div className="glass glass-hover h-full rounded-[var(--radius-xl)] p-6">
                  <h4 className="text-[15px] font-semibold tracking-[-0.012em] text-[var(--color-ink)]">
                    {d.title}
                  </h4>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-ink-3)]">
                    {d.body}
                  </p>
                  <a
                    href={d.docs}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--color-ink)] underline decoration-[var(--color-accent)] decoration-[3px] underline-offset-4 transition-colors hover:text-[var(--color-ink-2)]"
                  >
                    {d.docLabel} on docs.dakota.xyz
                    <ExternalLink className="h-3 w-3" strokeWidth={2} />
                  </a>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={120}>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-2xl)] border border-black/[0.06] bg-white/55 p-6 backdrop-blur-md">
              <div className="min-w-0">
                <p className="eyebrow">Docs</p>
                <p className="mt-1 text-[14px] text-[var(--color-ink)]">
                  The full SDK reference, webhook event catalog, and KYB
                  application flow live on{" "}
                  <a
                    href="https://docs.dakota.xyz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline decoration-[var(--color-accent)] decoration-[3px] underline-offset-4"
                  >
                    docs.dakota.xyz
                  </a>
                  .
                </p>
              </div>
              <a
                href="https://docs.dakota.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-base btn-accent h-10 px-4 text-[13px]"
              >
                <BookOpen className="h-3.5 w-3.5" strokeWidth={2} />
                docs.dakota.xyz
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.25} />
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA strip */}
      <section className="mx-auto max-w-6xl px-6 pb-24 sm:pb-32">
        <Reveal>
          <div className="glass-strong relative overflow-hidden rounded-[var(--radius-3xl)] p-10 sm:p-16">
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
              <p className="eyebrow">Try it yourself</p>
              <h2 className="mt-3 max-w-2xl text-[30px] font-semibold leading-[1.05] tracking-[-0.022em] sm:text-[44px]">
                Open the bank.
                <br />
                Walk the flow end-to-end.
              </h2>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  className="btn-base btn-accent h-12 gap-2 px-6 text-[14px]"
                >
                  Open my bank
                  <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
                </Link>
                <Link
                  href="/"
                  className="btn-base btn-ghost h-12 px-6 text-[14px]"
                >
                  Back to landing
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.25} />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

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

/* `Send` kept imported so future edits don't tree-shake it accidentally. */
export const _icons = { Send };
