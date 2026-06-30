"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  Building2,
  Landmark,
  PiggyBank,
  Sparkles,
  UserRound,
} from "lucide-react";

/**
 * IndieBank value-flow diagram.
 *
 * Two inbound channels → Dakota auto-convert (USD only) → USDC treasury →
 * fan-out to worker payouts. The "story" is the color flip at the Dakota node:
 * green dots (USDC) emerge from white-ish dots (USD). USDC payers bypass the
 * convert step and feed treasury directly.
 *
 * Implementation: an SVG `viewBox="0 0 100 60"` overlay carries the paths +
 * animated dots (via <animateMotion> — declarative, cheap, never re-renders).
 * Node labels are HTML positioned absolutely on top of the SVG so we can keep
 * the rich typography + hover affordances of Tailwind.
 *
 * Interactions:
 *  - Hover a node → its paths brighten, a tooltip-style description slides in
 *    underneath the diagram.
 *  - Click a node → it stays "pinned" so mobile users can read details.
 */

type NodeId =
  | "usd-in"
  | "usdc-in"
  | "dakota"
  | "treasury"
  | "w1"
  | "w2"
  | "w3";

interface NodeDef {
  id: NodeId;
  // Single coordinate system, 0–100 on both axes. The SVG uses viewBox
  // "0 0 100 100" with preserveAspectRatio="none" so these values map 1:1 to
  // HTML left/top percentages on the container.
  x: number;
  y: number;
  label: string;
  sub: string;
  body: string;
  kind: "inbound" | "transform" | "store" | "outbound";
}

const NODES: NodeDef[] = [
  {
    id: "usd-in",
    x: 11,
    y: 22,
    label: "USD payer",
    sub: "ACH / Wire",
    body: "Any US-based payer sends USD to your routing + account number. Inbound is auto-converted to USDC inside Dakota and credited to your treasury.",
    kind: "inbound",
  },
  {
    id: "usdc-in",
    x: 11,
    y: 78,
    label: "USDC payer",
    sub: "on-chain",
    body: "Any wallet sends USDC to your treasury address — Ethereum mainnet or supported L2s. Settles in seconds, 24/7, no banking days.",
    kind: "inbound",
  },
  {
    id: "dakota",
    x: 40,
    y: 22,
    label: "Dakota",
    sub: "USD → USDC",
    body: "Dakota's regulated banking partner receives the ACH inbound, mints USDC at par, and routes it to your treasury wallet — no manual step, no FX fee.",
    kind: "transform",
  },
  {
    id: "treasury",
    x: 58,
    y: 50,
    label: "Treasury",
    sub: "USDC wallet",
    body: "A single balance you control. Holds USDC, programmable, compliance-policy-enforced, visible to every operator on your team.",
    kind: "store",
  },
  {
    id: "w1",
    x: 86,
    y: 18,
    label: "Worker 1",
    sub: "US bank · ACH",
    body: "Your team gets paid USDC → USD ACH. They see plain dollars hit their bank in 1–3 business days. They never touch crypto.",
    kind: "outbound",
  },
  {
    id: "w2",
    x: 86,
    y: 50,
    label: "Worker 2",
    sub: "US bank · ACH",
    body: "Same flow, same destination type. Run them as a batch or as one-offs from the Workers screen.",
    kind: "outbound",
  },
  {
    id: "w3",
    x: 86,
    y: 82,
    label: "Worker 3",
    sub: "US bank · ACH",
    body: "Compliance policies block off-policy transactions in-line before they settle — your audit trail stays clean.",
    kind: "outbound",
  },
];

interface PathDef {
  id: string;
  d: string;
  // "in" = USD into Dakota, "convert" = Dakota → treasury (now USDC),
  // "usdc-in" = bypass straight to treasury, "out" = treasury → worker (USDC,
  // ends as USD at the worker — story told by node icon).
  kind: "in" | "convert" | "usdc-in" | "out";
  endpoints: [NodeId, NodeId];
}

// Paths use the same 0–100 coordinate system as the nodes. Each path's
// endpoints visually land just outside the nearest node pill (~5 units of
// padding so the dot doesn't appear to clip the node).
const PATHS: PathDef[] = [
  {
    id: "p-usd-in",
    // USD payer (11,22) → Dakota (40,22). Horizontal.
    d: "M 17 22 C 24 22, 30 22, 35 22",
    kind: "in",
    endpoints: ["usd-in", "dakota"],
  },
  {
    id: "p-convert",
    // Dakota (40,22) → Treasury (58,50). Diagonal curve down-right.
    d: "M 43 26 C 48 34, 52 42, 55 47",
    kind: "convert",
    endpoints: ["dakota", "treasury"],
  },
  {
    id: "p-usdc-in",
    // USDC payer (11,78) → Treasury (58,50). Sweep up.
    d: "M 17 78 C 30 78, 44 70, 55 55",
    kind: "usdc-in",
    endpoints: ["usdc-in", "treasury"],
  },
  {
    id: "p-out-w1",
    // Treasury (58,50) → W1 (86,18). Up and right.
    d: "M 61 47 C 70 35, 76 24, 81 20",
    kind: "out",
    endpoints: ["treasury", "w1"],
  },
  {
    id: "p-out-w2",
    // Treasury (58,50) → W2 (86,50). Straight across.
    d: "M 61 50 C 70 50, 74 50, 81 50",
    kind: "out",
    endpoints: ["treasury", "w2"],
  },
  {
    id: "p-out-w3",
    // Treasury (58,50) → W3 (86,82). Down and right.
    d: "M 61 53 C 70 65, 76 76, 81 80",
    kind: "out",
    endpoints: ["treasury", "w3"],
  },
];

// Dot color + count per path. USDC = accent lime; USD-in = ink (so it reads
// as "dollars" not crypto); outbound = lime (still USDC on the wire) — the
// "becomes USD" moment is told by the worker node label.
const DOT_STYLES: Record<
  PathDef["kind"],
  { color: string; count: number; dur: number }
> = {
  in: { color: "#0a0a0a", count: 3, dur: 3.4 },
  convert: { color: "#d7fe03", count: 2, dur: 2.4 },
  "usdc-in": { color: "#d7fe03", count: 3, dur: 3.6 },
  out: { color: "#d7fe03", count: 2, dur: 2.6 },
};

export function FlowDiagram() {
  const [hovered, setHovered] = useState<NodeId | null>(null);
  const [pinned, setPinned] = useState<NodeId | null>(null);
  const active = pinned ?? hovered;

  // Pause the SVG dot animations entirely if reduced-motion is set.
  const svgRef = useRef<SVGSVGElement | null>(null);
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      svgRef.current
    ) {
      svgRef.current.pauseAnimations();
    }
  }, []);

  const activeNode = NODES.find((n) => n.id === active) ?? null;

  // A path is "lit" when one of its endpoints is the active node.
  const pathIsLit = (p: PathDef) =>
    active ? p.endpoints.includes(active) : false;

  return (
    <div className="glass overflow-hidden rounded-[var(--radius-2xl)] p-5 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Money flow</p>
          <h2 className="mt-2 max-w-2xl text-[24px] font-semibold leading-tight tracking-[-0.018em] sm:text-[34px]">
            USD comes in.{" "}
            <span className="relative inline-block whitespace-nowrap">
              <span className="relative z-10">USDC moves it.</span>
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-1 -z-0 h-2.5 rounded-full bg-[var(--color-accent)]"
              />
            </span>{" "}
            USD lands again.
          </h2>
        </div>
        <Legend />
      </div>

      <div
        className="relative mt-6 aspect-[2/1] w-full"
        onMouseLeave={() => setHovered(null)}
      >
        {/* SVG: paths + animated dots.
         *
         * viewBox is 0–100 on both axes (matches the node coordinate system).
         * preserveAspectRatio="none" stretches it to fill the 2:1 container —
         * which means a `<circle>` would render as a horizontal ellipse. We
         * counter-stretch the dots below using `<ellipse rx="0.45" ry="0.9">`
         * so they appear circular after the 2× horizontal stretch.
         */}
        <svg
          ref={svgRef}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          <defs>
            <filter
              id="flow-dot-shadow"
              x="-100%"
              y="-100%"
              width="300%"
              height="300%"
            >
              {/* Slight asymmetric blur to compensate for the 2:1 stretch. */}
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
            {/* A tiny shimmer pulse used at the Dakota convert node. */}
            <radialGradient id="flow-ring" cx="50%" cy="50%" r="50%">
              <stop offset="40%" stopColor="rgba(215,254,3,0)" />
              <stop offset="100%" stopColor="rgba(215,254,3,0.55)" />
            </radialGradient>
          </defs>

          {/* Paths — drawn first so dots ride on top. */}
          {PATHS.map((p) => {
            const lit = pathIsLit(p);
            return (
              <g key={p.id}>
                <path
                  id={p.id}
                  d={p.d}
                  fill="none"
                  stroke={
                    lit
                      ? p.kind === "in"
                        ? "rgba(10,10,10,0.65)"
                        : "rgba(180,220,0,0.85)"
                      : p.kind === "in"
                        ? "rgba(10,10,10,0.18)"
                        : "rgba(180,220,0,0.32)"
                  }
                  strokeWidth={lit ? 0.7 : 0.5}
                  strokeDasharray={p.kind === "usdc-in" ? "1.6 1.2" : undefined}
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  style={{
                    transition:
                      "stroke 240ms var(--ease-apple), stroke-width 240ms var(--ease-apple)",
                  }}
                />
              </g>
            );
          })}

          {/* Convert "burst" at the Dakota node — soft pulsing ring.
           * Counter-stretched ellipse so it reads as a circle. */}
          <ellipse cx="40" cy="22" rx="2.5" ry="5" fill="url(#flow-ring)">
            <animate
              attributeName="rx"
              values="2;4.2;2"
              dur="2.6s"
              repeatCount="indefinite"
              calcMode="spline"
              keySplines="0.32 0.72 0 1; 0.32 0.72 0 1"
            />
            <animate
              attributeName="ry"
              values="4;8.4;4"
              dur="2.6s"
              repeatCount="indefinite"
              calcMode="spline"
              keySplines="0.32 0.72 0 1; 0.32 0.72 0 1"
            />
            <animate
              attributeName="opacity"
              values="0.9;0.1;0.9"
              dur="2.6s"
              repeatCount="indefinite"
            />
          </ellipse>

          {/* Animated dots — counter-stretched ellipses so they look circular
           * after the SVG's 2:1 horizontal stretch.
           */}
          {PATHS.flatMap((p) => {
            const style = DOT_STYLES[p.kind];
            return Array.from({ length: style.count }).map((_, i) => {
              const offset = (style.dur / style.count) * i;
              return (
                <ellipse
                  key={`${p.id}-${i}`}
                  rx="0.55"
                  ry="1.1"
                  fill={style.color}
                  filter="url(#flow-dot-shadow)"
                  opacity={pathIsLit(p) || !active ? 1 : 0.35}
                  style={{ transition: "opacity 240ms var(--ease-apple)" }}
                >
                  <animateMotion
                    dur={`${style.dur}s`}
                    begin={`-${offset}s`}
                    repeatCount="indefinite"
                  >
                    <mpath href={`#${p.id}`} />
                  </animateMotion>
                </ellipse>
              );
            });
          })}
        </svg>

        {/* HTML node overlays */}
        {NODES.map((n) => (
          <FlowNode
            key={n.id}
            node={n}
            active={active === n.id}
            dimmed={Boolean(active) && active !== n.id}
            onEnter={() => setHovered(n.id)}
            onClick={() =>
              setPinned((p) => (p === n.id ? null : n.id))
            }
          />
        ))}
      </div>

      {/* Detail panel under the diagram — slides between states. */}
      <div className="mt-6 min-h-[88px] rounded-[var(--radius-lg)] border border-black/[0.06] bg-white/55 p-5 backdrop-blur-md">
        {activeNode ? (
          <div key={activeNode.id} className="nm-fade-in-up">
            <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-ink-3)]">
              <KindDot kind={activeNode.kind} />
              {kindLabel(activeNode.kind)}
            </div>
            <div className="mt-1.5 text-[15px] font-semibold tracking-[-0.012em] text-[var(--color-ink)]">
              {activeNode.label}
              <span className="text-[var(--color-ink-3)]">
                {" "}— {activeNode.sub}
              </span>
            </div>
            <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-[var(--color-ink-2)]">
              {activeNode.body}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-[13px] text-[var(--color-ink-3)]">
            <Sparkles
              className="h-3.5 w-3.5 text-[var(--color-ink-2)]"
              strokeWidth={2}
            />
            <span>
              Hover a node to inspect that step. Click to pin it.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────── Sub-components ────────────────────────── */

function FlowNode({
  node: n,
  active,
  dimmed,
  onEnter,
  onClick,
}: {
  node: NodeDef;
  active: boolean;
  dimmed: boolean;
  onEnter: () => void;
  onClick: () => void;
}) {
  const Icon = iconFor(n);
  const isAccent = n.kind === "transform";

  return (
    <button
      type="button"
      onMouseEnter={onEnter}
      onFocus={onEnter}
      onClick={onClick}
      aria-pressed={active}
      aria-label={`${n.label} — ${n.sub}`}
      className={[
        "absolute -translate-x-1/2 -translate-y-1/2 select-none",
        "transition-[transform,opacity,box-shadow] duration-[240ms]",
        "[transition-timing-function:var(--ease-apple)]",
        active ? "scale-[1.06] z-20" : "z-10",
        dimmed ? "opacity-55" : "opacity-100",
      ].join(" ")}
      style={{ left: `${n.x}%`, top: `${n.y}%` }}
    >
      <div
        className={[
          "flex items-center gap-2 rounded-full border px-3 py-2",
          "[backdrop-filter:blur(14px)] [-webkit-backdrop-filter:blur(14px)]",
          isAccent
            ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_8px_18px_-8px_rgba(180,220,0,0.55)]"
            : "border-black/[0.08] bg-white/85 text-[var(--color-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_18px_-10px_rgba(20,20,40,0.18)]",
          active && !isAccent
            ? "border-[var(--color-accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_12px_24px_-10px_rgba(20,20,40,0.22),0_0_0_3px_rgba(215,254,3,0.35)]"
            : "",
        ].join(" ")}
      >
        <span
          className={[
            "grid size-7 place-items-center rounded-full",
            isAccent
              ? "bg-[var(--color-accent-ink)] text-[var(--color-accent)]"
              : "bg-black/[0.05] text-[var(--color-ink)]",
          ].join(" ")}
        >
          {isAccent ? (
            <DakotaMark />
          ) : (
            <Icon className="h-3.5 w-3.5" strokeWidth={2} />
          )}
        </span>
        <span className="flex flex-col text-left leading-tight">
          <span className="text-[11.5px] font-semibold tracking-[-0.005em]">
            {n.label}
          </span>
          <span
            className={[
              "text-[9.5px] font-medium uppercase tracking-[0.08em]",
              isAccent
                ? "text-[var(--color-accent-ink)]/65"
                : "text-[var(--color-ink-3)]",
            ].join(" ")}
          >
            {n.sub}
          </span>
        </span>
      </div>
    </button>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--color-ink-3)]">
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block size-2 rounded-full bg-[var(--color-ink)]" />
        USD
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block size-2 rounded-full bg-[var(--color-accent)] shadow-[0_0_6px_rgba(215,254,3,0.6)]" />
        USDC
      </span>
    </div>
  );
}

function KindDot({ kind }: { kind: NodeDef["kind"] }) {
  const cls =
    kind === "transform"
      ? "bg-[var(--color-accent)]"
      : kind === "store"
        ? "bg-[var(--color-ink)]"
        : "bg-[var(--color-ink-2)]";
  return <span className={`inline-block size-1.5 rounded-full ${cls}`} />;
}

function kindLabel(kind: NodeDef["kind"]) {
  switch (kind) {
    case "inbound":
      return "Inbound channel";
    case "transform":
      return "Auto-convert";
    case "store":
      return "Balance";
    case "outbound":
      return "Payout";
  }
}

function iconFor(n: NodeDef) {
  switch (n.id) {
    case "usd-in":
      return ArrowDownToLine;
    case "usdc-in":
      return ArrowDownToLine;
    case "treasury":
      return PiggyBank;
    case "dakota":
      return Building2;
    default:
      return UserRound;
  }
}

/** Minimalist Dakota wordmark substitute: a stylized "D" with the accent. */
function DakotaMark() {
  return (
    <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" aria-hidden>
      <path
        d="M3 2 L 3 12 L 7.5 12 C 10.5 12, 12 10, 12 7 C 12 4, 10.5 2, 7.5 2 Z"
        fill="currentColor"
        opacity="0.95"
      />
      <circle cx="7.5" cy="7" r="1.6" fill="var(--color-accent-ink)" />
    </svg>
  );
}

/* `Landmark` not used directly — re-exported only so tree-shaking notices. */
export const _icons = { Landmark };
