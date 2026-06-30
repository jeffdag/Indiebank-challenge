"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * IndieBank buttons — pill-shaped, accent-led, soft glass for ghost.
 *
 * Variants:
 *  - default   accent fill + black ink (CTA). Use sparingly — one per surface.
 *  - secondary glass-light surface (no fill). Default for non-CTA actions.
 *  - ghost     transparent → tinted on hover. For nav and inline actions.
 *  - outline   1px line on transparent. Quiet alternative to secondary.
 *  - destructive low-opacity danger background.
 *  - link      no surface, underline on hover.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap font-medium outline-none select-none transition-[transform,box-shadow,background-color,color] duration-[160ms] [transition-timing-function:var(--ease-spring)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "rounded-full bg-[var(--color-accent)] text-[var(--color-accent-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-1px_0_rgba(10,10,10,0.08),0_8px_18px_-8px_rgba(180,220,0,0.55),0_2px_6px_-2px_rgba(20,20,40,0.08)] hover:-translate-y-px hover:bg-[#c4ec00] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.55),inset_0_-1px_0_rgba(10,10,10,0.1),0_14px_28px_-10px_rgba(180,220,0,0.7),0_4px_10px_-2px_rgba(20,20,40,0.1)]",
        secondary:
          "rounded-full bg-white/65 text-[var(--color-ink)] border border-black/[0.08] backdrop-blur-md hover:bg-white/90 hover:border-black/15",
        outline:
          "rounded-full border border-black/[0.12] bg-transparent text-[var(--color-ink)] hover:bg-white/55",
        ghost:
          "rounded-full bg-transparent text-[var(--color-ink-2)] hover:bg-black/[0.05] hover:text-[var(--color-ink)] aria-expanded:bg-black/[0.05] aria-expanded:text-[var(--color-ink)]",
        destructive:
          "rounded-full bg-[var(--color-danger-soft)] text-[var(--color-danger)] border border-[var(--color-danger)]/20 hover:bg-[var(--color-danger)]/15",
        link: "h-auto px-1 rounded-none bg-transparent text-[var(--color-ink)] underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 px-4 text-[13px] has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 px-2.5 text-[11.5px] [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 px-3 text-[12.5px] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 px-5 text-[14px]",
        icon: "size-9 rounded-full",
        "icon-xs": "size-7 rounded-full [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-full",
        "icon-lg": "size-11 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: ButtonProps) {
  if (asChild) {
    return (
      <Slot
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...(props as React.ComponentProps<typeof Slot>)}
      />
    );
  }

  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
