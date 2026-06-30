import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        // glass field — soft bg, hairline border, accent ring on focus
        "h-10 w-full min-w-0 rounded-[var(--radius-sm)] border border-black/[0.08] bg-white/65 px-3 py-2 text-[13.5px] text-[var(--color-ink)] backdrop-blur-md transition-[border-color,box-shadow,background-color] duration-[160ms] outline-none",
        "placeholder:text-[var(--color-ink-4)]",
        "hover:border-black/15",
        "focus-visible:border-[var(--color-accent)] focus-visible:bg-white/90 focus-visible:shadow-[0_0_0_3px_rgba(215,254,3,0.35)]",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-[12.5px] file:font-medium file:text-[var(--color-ink)] file:mr-2",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-55",
        "aria-invalid:border-[var(--color-danger)] aria-invalid:shadow-[0_0_0_3px_rgba(229,72,77,0.18)]",
        className
      )}
      {...props}
    />
  );
}

export { Input };
