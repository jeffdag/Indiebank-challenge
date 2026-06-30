import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Liquid-glass card — the default elevated surface.
 * Use `size="sm"` for tighter density in dense lists.
 */
function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "glass group/card flex flex-col gap-4 overflow-hidden text-[13.5px] text-[var(--color-ink)]",
        "py-5 px-5 data-[size=sm]:gap-3 data-[size=sm]:py-4 data-[size=sm]:px-4",
        "has-data-[slot=card-footer]:pb-0",
        "*:[img:first-child]:-mx-5 *:[img:first-child]:-mt-5 *:[img:first-child]:rounded-t-[var(--radius-xl)]",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min items-start gap-1.5 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]",
        className
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "text-[15px] leading-snug font-semibold tracking-[-0.012em] text-[var(--color-ink)] group-data-[size=sm]/card:text-[14px]",
        className
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-[12.5px] text-[var(--color-ink-3)]", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn(className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center -mx-5 -mb-5 mt-2 px-5 py-3 border-t border-black/[0.06] rounded-b-[var(--radius-xl)] bg-white/40 group-data-[size=sm]/card:-mx-4 group-data-[size=sm]/card:-mb-4 group-data-[size=sm]/card:px-4 group-data-[size=sm]/card:py-3",
        className
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
