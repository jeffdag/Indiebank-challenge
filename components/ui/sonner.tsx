"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { Check, Info, AlertTriangle, X, Loader2 } from "lucide-react";

/**
 * IndieBank toasts — dark glass surface, white type, lime check on success.
 *
 * Sonner sets the toast background via its own CSS variables; classNames alone
 * are not enough to override the default white. We point every variant's
 * --*-bg / --*-text / --*-border at our dark palette so the surface follows
 * us regardless of theme detection.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      gap={10}
      offset={20}
      duration={3800}
      visibleToasts={4}
      style={
        {
          // Default + per-variant surface colors
          "--normal-bg": "rgba(20,20,24,0.94)",
          "--normal-text": "#ffffff",
          "--normal-border": "rgba(255,255,255,0.08)",
          "--success-bg": "rgba(20,20,24,0.94)",
          "--success-text": "#ffffff",
          "--success-border": "rgba(255,255,255,0.08)",
          "--info-bg": "rgba(20,20,24,0.94)",
          "--info-text": "#ffffff",
          "--info-border": "rgba(255,255,255,0.08)",
          "--warning-bg": "rgba(20,20,24,0.94)",
          "--warning-text": "#ffffff",
          "--warning-border": "rgba(255,255,255,0.08)",
          "--error-bg": "rgba(20,20,24,0.94)",
          "--error-text": "#ffffff",
          "--error-border": "rgba(255,255,255,0.08)",
          "--border-radius": "14px",
          "--font-family": "var(--font-urbanist), sans-serif",
        } as React.CSSProperties
      }
      icons={{
        success: (
          <span className="grid size-5 place-items-center rounded-full bg-[#D7FE03] text-[#0A0A0A] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
            <Check className="h-2.5 w-2.5" strokeWidth={3} />
          </span>
        ),
        info: (
          <span className="grid size-5 place-items-center rounded-full bg-white/[0.10] text-white">
            <Info className="h-3 w-3" strokeWidth={2} />
          </span>
        ),
        warning: (
          <span className="grid size-5 place-items-center rounded-full bg-amber-400/20 text-amber-300">
            <AlertTriangle className="h-3 w-3" strokeWidth={2.25} />
          </span>
        ),
        error: (
          <span className="grid size-5 place-items-center rounded-full bg-red-500/25 text-red-300">
            <X className="h-3 w-3" strokeWidth={2.5} />
          </span>
        ),
        loading: (
          <span className="grid size-5 place-items-center rounded-full bg-white/[0.10] text-white">
            <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.25} />
          </span>
        ),
      }}
      toastOptions={{
        classNames: {
          toast: [
            "!shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_52px_-12px_rgba(0,0,0,0.45),0_6px_16px_-6px_rgba(0,0,0,0.25)]",
            "![backdrop-filter:blur(20px)_saturate(160%)] [-webkit-backdrop-filter:blur(20px)_saturate(160%)]",
          ].join(" "),
          title: "!text-[12.5px] !font-medium !tracking-[-0.005em]",
          description: "!text-[11.5px] !text-white/60 !mt-0.5",
          actionButton:
            "!bg-[#D7FE03] !text-[#0A0A0A] !rounded-full !h-7 !px-3 !text-[11.5px] !font-medium hover:!bg-[#c4ec00]",
          cancelButton:
            "!bg-white/[0.08] !text-white/80 !rounded-full !h-7 !px-3 !text-[11.5px] !font-medium hover:!bg-white/[0.14]",
          closeButton:
            "!bg-white/[0.08] !text-white/60 !border-0 hover:!bg-white/[0.14] hover:!text-white",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
