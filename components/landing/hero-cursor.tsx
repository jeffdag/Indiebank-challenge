"use client";

import { useEffect, useRef } from "react";

/**
 * Soft accent blob that follows the cursor inside the hero. Sets CSS
 * variables on its own element via rAF so we don't trigger React renders.
 * On touch devices / reduced motion, stays parked at the resting position.
 */
export function HeroCursor() {
  const blobRef = useRef<HTMLDivElement | null>(null);
  const parentRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const blob = blobRef.current;
    const parent = parentRef.current;
    if (!blob || !parent) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const setInitial = () => {
      const rect = parent.getBoundingClientRect();
      target.current = { x: rect.width * 0.65, y: rect.height * 0.35 };
      current.current = { ...target.current };
      blob.style.setProperty("--cx", `${current.current.x}px`);
      blob.style.setProperty("--cy", `${current.current.y}px`);
    };
    setInitial();

    const onMove = (e: PointerEvent) => {
      const rect = parent.getBoundingClientRect();
      target.current.x = e.clientX - rect.left;
      target.current.y = e.clientY - rect.top;
    };

    const tick = () => {
      // Lerp toward the target — gives the blob a slight lag, more organic.
      current.current.x += (target.current.x - current.current.x) * 0.08;
      current.current.y += (target.current.y - current.current.y) * 0.08;
      blob.style.setProperty("--cx", `${current.current.x}px`);
      blob.style.setProperty("--cy", `${current.current.y}px`);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    parent.addEventListener("pointermove", onMove);
    window.addEventListener("resize", setInitial);
    return () => {
      parent.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", setInitial);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div ref={parentRef} className="pointer-events-auto absolute inset-0">
      <div ref={blobRef} className="hero-cursor-blob" />
    </div>
  );
}
