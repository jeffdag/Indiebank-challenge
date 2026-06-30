"use client";

import {
  Briefcase,
  Check,
  ClipboardList,
  Send,
  Sparkles,
  UserRound,
  Wallet,
  X,
} from "lucide-react";

/**
 * Linear-ish flow showing the freelance-jobs lifecycle:
 *
 *  Operator posts → Freelancer submits → AI reviews → Approved → Pay
 *                                                  ↘ Revisions ↩
 */
export function JobsFlowDiagram() {
  return (
    <div className="glass overflow-hidden rounded-[var(--radius-2xl)] p-5 sm:p-8">
      <div>
        <p className="eyebrow">Freelance jobs lifecycle</p>
        <h3 className="mt-2 text-[19px] font-semibold tracking-[-0.014em] text-[var(--color-ink)]">
          Post, review, ship — with an AI agent in the loop.
        </h3>
      </div>

      <div className="relative mt-6 aspect-[2.2/1] w-full">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          <defs>
            <filter
              id="jf-dot-shadow"
              x="-100%"
              y="-100%"
              width="300%"
              height="300%"
            >
              <feGaussianBlur stdDeviation="0.25 0.5" result="b" />
              <feOffset in="b" dy="0.6" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.35" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {PATHS.map((p) => (
            <path
              key={p.id}
              id={p.id}
              d={p.d}
              fill="none"
              stroke={
                p.kind === "happy"
                  ? "rgba(180,220,0,0.5)"
                  : p.kind === "revision"
                    ? "rgba(201,138,4,0.55)"
                    : "rgba(10,10,10,0.22)"
              }
              strokeWidth={0.55}
              strokeDasharray={p.kind === "revision" ? "1.4 1" : undefined}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* signal pings */}
          {PATHS.map((p) => {
            const color =
              p.kind === "happy"
                ? "#d7fe03"
                : p.kind === "revision"
                  ? "#c98a04"
                  : "#0a0a0a";
            return Array.from({ length: 2 }).map((_, i) => (
              <ellipse
                key={`${p.id}-${i}`}
                rx="0.55"
                ry="1.1"
                fill={color}
                filter="url(#jf-dot-shadow)"
              >
                <animateMotion
                  dur={p.kind === "revision" ? "4s" : "3s"}
                  begin={`-${i * 1.5}s`}
                  repeatCount="indefinite"
                >
                  <mpath href={`#${p.id}`} />
                </animateMotion>
              </ellipse>
            ));
          })}
        </svg>

        {/* HTML overlay */}
        {NODES.map((n) => (
          <Node key={n.id} node={n} />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-5 flex flex-wrap items-center gap-3 text-[11px] text-[var(--color-ink-3)]">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-[2px] w-5 rounded-full bg-[var(--color-accent)]"
            aria-hidden
          />
          Happy path
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-[2px] w-5 rounded-full bg-[var(--color-warning)]"
            aria-hidden
          />
          Revisions loop
        </span>
      </div>
    </div>
  );
}

interface NodeDef {
  id: string;
  x: number;
  y: number;
  label: string;
  sub: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone: "op" | "fr" | "ai" | "ok" | "warn" | "pay";
}

const NODES: NodeDef[] = [
  {
    id: "post",
    x: 10,
    y: 50,
    label: "Post job",
    sub: "Operator",
    icon: ClipboardList,
    tone: "op",
  },
  {
    id: "submit",
    x: 30,
    y: 50,
    label: "Submit work",
    sub: "Freelancer",
    icon: Send,
    tone: "fr",
  },
  {
    id: "review",
    x: 52,
    y: 50,
    label: "AI review",
    sub: "Vercel AI · OpenAI",
    icon: Sparkles,
    tone: "ai",
  },
  {
    id: "revise",
    x: 52,
    y: 88,
    label: "Revisions",
    sub: "Freelancer iterates",
    icon: X,
    tone: "warn",
  },
  {
    id: "approve",
    x: 74,
    y: 50,
    label: "Approved",
    sub: "Verdict + checklist",
    icon: Check,
    tone: "ok",
  },
  {
    id: "pay",
    x: 92,
    y: 50,
    label: "Pay",
    sub: "USDC → USD ACH",
    icon: Wallet,
    tone: "pay",
  },
];

const PATHS = [
  // straight horizontal chain (happy path)
  { id: "jf-1", d: "M 14 50 C 18 50, 23 50, 26 50", kind: "internal" },
  { id: "jf-2", d: "M 34 50 C 40 50, 44 50, 48 50", kind: "internal" },
  { id: "jf-3", d: "M 56 50 C 62 50, 66 50, 70 50", kind: "happy" },
  { id: "jf-4", d: "M 78 50 C 82 50, 86 50, 88 50", kind: "pay" },
  // revisions branch (down then back up)
  { id: "jf-rev-out", d: "M 53 55 C 53 65, 53 78, 53 84", kind: "revision" },
  { id: "jf-rev-back", d: "M 49 86 C 40 86, 32 70, 30 55", kind: "revision" },
];

function Node({ node: n }: { node: NodeDef }) {
  const Icon = n.icon;

  const styles = {
    op: {
      bg: "bg-white/85 border-black/[0.08] text-[var(--color-ink)]",
      puck: "bg-black/[0.05] text-[var(--color-ink)]",
      sub: "text-[var(--color-ink-3)]",
    },
    fr: {
      bg: "bg-white/85 border-black/[0.08] text-[var(--color-ink)]",
      puck: "bg-black/[0.05] text-[var(--color-ink)]",
      sub: "text-[var(--color-ink-3)]",
    },
    ai: {
      bg: "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_8px_18px_-8px_rgba(180,220,0,0.55)]",
      puck: "bg-[var(--color-accent-ink)] text-[var(--color-accent)]",
      sub: "text-[var(--color-accent-ink)]/65",
    },
    ok: {
      bg: "border-[var(--color-success)]/30 bg-[var(--color-success-soft)] text-[var(--color-ink)]",
      puck: "bg-[var(--color-success)] text-white",
      sub: "text-[var(--color-ink-3)]",
    },
    warn: {
      bg: "border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)] text-[var(--color-ink)]",
      puck: "bg-[var(--color-warning)] text-white",
      sub: "text-[var(--color-ink-3)]",
    },
    pay: {
      bg: "border-[var(--color-ink)] bg-[var(--color-ink)] text-white",
      puck: "bg-white/10 text-white",
      sub: "text-white/55",
    },
  }[n.tone];

  return (
    <div
      className={
        "absolute -translate-x-1/2 -translate-y-1/2 select-none rounded-full border px-3 py-2 " +
        "[backdrop-filter:blur(14px)] [-webkit-backdrop-filter:blur(14px)] " +
        styles.bg
      }
      style={{ left: `${n.x}%`, top: `${n.y}%` }}
    >
      <div className="flex items-center gap-2">
        <span className={`grid size-7 place-items-center rounded-full ${styles.puck}`}>
          <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
        </span>
        <span className="flex flex-col text-left leading-tight">
          <span className="text-[11.5px] font-semibold tracking-[-0.005em]">
            {n.label}
          </span>
          <span
            className={`text-[9.5px] font-medium uppercase tracking-[0.08em] ${styles.sub}`}
          >
            {n.sub}
          </span>
        </span>
      </div>
    </div>
  );
}

// Keep imports alive for tree-shaker
export const _icons = { Briefcase, UserRound };
