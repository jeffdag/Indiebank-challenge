/**
 * StatTile — square-ish stat card used in dashboard + treasury hero rows.
 * `tone="accent"` gives the lime-filled version (use sparingly: one per row).
 *
 * Pure presentation, no state — shared between routes so cards on different
 * pages look identical.
 */
export function StatTile({
  icon: Icon,
  tone,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone: "ink" | "accent";
  label: string;
  value: string;
  sub: string;
}) {
  const isAccent = tone === "accent";
  return (
    <div
      className={
        isAccent
          ? "relative overflow-hidden rounded-[var(--radius-2xl)] bg-[var(--color-accent)] p-5 text-[var(--color-accent-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_10px_24px_-10px_rgba(180,220,0,0.5)]"
          : "glass rounded-[var(--radius-2xl)] p-5"
      }
    >
      <div className="flex items-center justify-between">
        <span
          className={
            "inline-flex h-7 w-7 items-center justify-center rounded-full " +
            (isAccent
              ? "bg-[var(--color-accent-ink)] text-[var(--color-accent)]"
              : "bg-black/[0.05] text-[var(--color-ink)]")
          }
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
        <span
          className={
            "text-[10px] font-medium uppercase tracking-[0.1em] " +
            (isAccent
              ? "text-[var(--color-accent-ink)]/70"
              : "text-[var(--color-ink-3)]")
          }
        >
          {label}
        </span>
      </div>
      <p
        className={
          "mt-4 text-[22px] font-semibold tracking-[-0.018em] tabular-nums " +
          (isAccent
            ? "text-[var(--color-accent-ink)]"
            : "text-[var(--color-ink)]")
        }
      >
        {value}
      </p>
      <p
        className={
          "mt-0.5 text-[11.5px] " +
          (isAccent
            ? "text-[var(--color-accent-ink)]/65"
            : "text-[var(--color-ink-3)]")
        }
      >
        {sub}
      </p>
    </div>
  );
}
