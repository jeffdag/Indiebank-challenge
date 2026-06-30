import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "group/badge inline-flex h-[22px] w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2.5 py-0 text-[10.5px] font-medium tracking-[0.02em] whitespace-nowrap transition-colors duration-[160ms] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default:
          "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]",
        secondary:
          "border-black/[0.08] bg-white/65 text-[var(--color-ink)] backdrop-blur",
        outline:
          "border-black/[0.14] bg-transparent text-[var(--color-ink-2)]",
        destructive:
          "border-[var(--color-danger)]/25 bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
        success:
          "border-[var(--color-success)]/25 bg-[var(--color-success-soft)] text-[var(--color-success)]",
        warning:
          "border-[var(--color-warning)]/25 bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
        ghost:
          "border-transparent text-[var(--color-ink-3)] hover:bg-black/[0.04] hover:text-[var(--color-ink)]",
        link: "border-transparent text-[var(--color-ink)] underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
