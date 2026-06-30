"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts from 0 → `value` over `duration` once the element scrolls into view.
 * `prefix`/`suffix` wrap the number (e.g. `$`, `+`, `M`).
 */
export function StatCounter({
  value,
  duration = 1400,
  prefix = "",
  suffix = "",
  format = "integer",
  className = "",
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  format?: "integer" | "decimal-1" | "compact";
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [n, setN] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setN(value);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !startedRef.current) {
            startedRef.current = true;
            const start = performance.now();
            const tick = (t: number) => {
              const p = Math.min(1, (t - start) / duration);
              // ease-out cubic
              const eased = 1 - Math.pow(1 - p, 3);
              setN(value * eased);
              if (p < 1) requestAnimationFrame(tick);
              else setN(value);
            };
            requestAnimationFrame(tick);
            io.disconnect();
          }
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration]);

  const formatted = (() => {
    if (format === "decimal-1") return n.toFixed(1);
    if (format === "compact") {
      if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
      if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
      return Math.round(n).toString();
    }
    return Math.round(n).toLocaleString("en-US");
  })();

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
