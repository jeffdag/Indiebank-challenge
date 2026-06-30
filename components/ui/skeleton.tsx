import { cn } from "@/lib/utils";

/**
 * Skeleton placeholder. Mirrors the layout of the real content so the
 * page renders immediately with shimmer-style boxes that fill in once
 * data arrives — feels ~3× faster than a centered spinner.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[var(--radius-xs)] bg-black/[0.06]",
        className
      )}
    />
  );
}
