"use client";

import {
  BrainCircuit,
  Database,
  Landmark,
  Layers,
  Lock,
  ShieldCheck,
  UserRound,
} from "lucide-react";

/**
 * System architecture diagram — left column of actors, middle column the
 * IndieBank Next.js server, right column external services. SVG paths
 * connect actors to the server and the server to its dependencies.
 *
 * 0–100 on both axes, preserveAspectRatio="none", container is aspect-[2/1]
 * with counter-stretched dots for the moving signal pings.
 */
export function SystemDiagram() {
  return (
    <div className="glass overflow-hidden rounded-[var(--radius-2xl)] p-5 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">System architecture</p>
          <h3 className="mt-2 text-[19px] font-semibold tracking-[-0.014em] text-[var(--color-ink)]">
            Three actors, one server, three external rails.
          </h3>
        </div>
        <Legend />
      </div>

      <div className="relative mt-6 aspect-[2/1] w-full">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          <defs>
            <filter
              id="sys-dot-shadow"
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

          {/* paths — actor → server (left half), server → service (right half) */}
          {PATHS.map((p) => (
            <path
              key={p.id}
              id={p.id}
              d={p.d}
              fill="none"
              stroke={
                p.kind === "external"
                  ? "rgba(180,220,0,0.4)"
                  : "rgba(10,10,10,0.18)"
              }
              strokeWidth={0.5}
              strokeDasharray={p.kind === "external" ? "1.6 1.2" : undefined}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* signal pings */}
          {PATHS.flatMap((p) => {
            const color =
              p.kind === "external" ? "#d7fe03" : "#0a0a0a";
            return Array.from({ length: 2 }).map((_, i) => (
              <ellipse
                key={`${p.id}-${i}`}
                rx="0.55"
                ry="1.1"
                fill={color}
                filter="url(#sys-dot-shadow)"
              >
                <animateMotion
                  dur="3s"
                  begin={`-${i * 1.5}s`}
                  repeatCount="indefinite"
                >
                  <mpath href={`#${p.id}`} />
                </animateMotion>
              </ellipse>
            ));
          })}
        </svg>

        {/* HTML node overlays */}
        {NODES.map((n) => (
          <Node key={n.id} node={n} />
        ))}
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
  tone: "actor" | "server" | "service-accent" | "service";
}

const NODES: NodeDef[] = [
  {
    id: "op",
    x: 10,
    y: 22,
    label: "Operator",
    sub: "Browser",
    icon: UserRound,
    tone: "actor",
  },
  {
    id: "fr",
    x: 10,
    y: 78,
    label: "Freelancer",
    sub: "Browser",
    icon: UserRound,
    tone: "actor",
  },
  {
    id: "app",
    x: 50,
    y: 50,
    label: "IndieBank",
    sub: "Next.js · server",
    icon: Layers,
    tone: "server",
  },
  {
    id: "dakota",
    x: 88,
    y: 20,
    label: "Dakota",
    sub: "Money rails",
    icon: Landmark,
    tone: "service-accent",
  },
  {
    id: "openai",
    x: 88,
    y: 50,
    label: "OpenAI",
    sub: "Vercel AI SDK",
    icon: BrainCircuit,
    tone: "service-accent",
  },
  {
    id: "supa",
    x: 88,
    y: 80,
    label: "Supabase",
    sub: "Auth · DB · Storage",
    icon: Database,
    tone: "service",
  },
];

const PATHS = [
  // actors → server (internal, ink-colored)
  { id: "sp-op", d: "M 16 24 C 26 26, 36 38, 46 48", kind: "internal" },
  { id: "sp-fr", d: "M 16 76 C 26 74, 36 62, 46 52", kind: "internal" },
  // server → external services (lime, dashed)
  { id: "sp-dk", d: "M 54 47 C 64 38, 76 26, 84 22", kind: "external" },
  { id: "sp-ai", d: "M 54 50 C 64 50, 76 50, 84 50", kind: "external" },
  { id: "sp-sb", d: "M 54 53 C 64 62, 76 76, 84 78", kind: "external" },
];

function Node({ node: n }: { node: NodeDef }) {
  const Icon = n.icon;
  const cls =
    n.tone === "server"
      ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_24px_-10px_rgba(20,20,40,0.4)]"
      : n.tone === "service-accent"
        ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_8px_18px_-8px_rgba(180,220,0,0.55)]"
        : "border-black/[0.08] bg-white/85 text-[var(--color-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_18px_-10px_rgba(20,20,40,0.18)] [backdrop-filter:blur(14px)] [-webkit-backdrop-filter:blur(14px)]";
  const iconPuck =
    n.tone === "server"
      ? "bg-white/10 text-white"
      : n.tone === "service-accent"
        ? "bg-[var(--color-accent-ink)] text-[var(--color-accent)]"
        : "bg-black/[0.05] text-[var(--color-ink)]";
  const subColor =
    n.tone === "server"
      ? "text-white/55"
      : n.tone === "service-accent"
        ? "text-[var(--color-accent-ink)]/65"
        : "text-[var(--color-ink-3)]";

  return (
    <div
      className={
        "absolute -translate-x-1/2 -translate-y-1/2 select-none rounded-full border px-3 py-2 " +
        cls
      }
      style={{ left: `${n.x}%`, top: `${n.y}%` }}
    >
      <div className="flex items-center gap-2">
        <span className={`grid size-7 place-items-center rounded-full ${iconPuck}`}>
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
        <span className="flex flex-col text-left leading-tight">
          <span className="text-[11.5px] font-semibold tracking-[-0.005em]">
            {n.label}
          </span>
          <span
            className={`text-[9.5px] font-medium uppercase tracking-[0.08em] ${subColor}`}
          >
            {n.sub}
          </span>
        </span>
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--color-ink-3)]">
      <span className="inline-flex items-center gap-1.5">
        <span
          className="inline-block h-[2px] w-5 rounded-full bg-[var(--color-ink)]/40"
          aria-hidden
        />
        Internal traffic
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          className="inline-block h-[2px] w-5 rounded-full bg-[var(--color-accent)] shadow-[0_0_6px_rgba(215,254,3,0.6)]"
          aria-hidden
        />
        External service
      </span>
    </div>
  );
}

/* `Lock` and `ShieldCheck` imported but only referenced via this export so the
 * tree-shaker doesn't drop them — we still ship them via the JSON examples
 * inline elsewhere in this file's caller. */
export const _icons = { Lock, ShieldCheck };
