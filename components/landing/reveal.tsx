"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fades + translates its children up when scrolled into view.
 * Uses IntersectionObserver — fires once, then disconnects.
 * Children are absolutely hidden before the observer fires, so a JS-disabled
 * client gets a static page (no flash of empty content because we still
 * render the markup).
 */
export function Reveal({
  children,
  className = "",
  delay,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number; // ms
  as?: keyof React.JSX.IntrinsicElements;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Build a dynamic component without losing types
  const Component = Tag as unknown as React.ElementType;
  return (
    <Component
      ref={ref as React.Ref<HTMLElement>}
      className={`reveal${visible ? " is-visible" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Component>
  );
}
