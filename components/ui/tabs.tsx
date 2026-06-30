"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn("group/tabs flex gap-3 data-horizontal:flex-col", className)}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-full p-1 text-[var(--color-ink-3)] group-data-horizontal/tabs:h-9 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none data-[variant=line]:p-0",
  {
    variants: {
      variant: {
        default: "bg-white/60 backdrop-blur-md border border-black/[0.06]",
        line: "gap-3 bg-transparent border-b border-[var(--color-line)] rounded-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium whitespace-nowrap transition-[color,background-color,box-shadow] duration-[180ms] group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-[var(--color-ink)] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // default variant — pill on the selected tab
        "group-data-[variant=default]/tabs-list:data-active:bg-[var(--color-accent)] group-data-[variant=default]/tabs-list:data-active:text-[var(--color-accent-ink)] group-data-[variant=default]/tabs-list:data-active:shadow-[0_4px_10px_-4px_rgba(180,220,0,0.45)]",
        // line variant — underline
        "group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:px-1.5 group-data-[variant=line]/tabs-list:py-2",
        "after:absolute after:left-1.5 after:right-1.5 after:bottom-[-1px] after:h-[2px] after:bg-[var(--color-accent)] after:opacity-0 after:rounded-full after:transition-opacity",
        "group-data-[variant=line]/tabs-list:data-active:after:opacity-100 group-data-[variant=line]/tabs-list:data-active:text-[var(--color-ink)]",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-[13px] outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
