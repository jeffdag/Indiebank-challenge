import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * The treasury bank name shown to users. Dakota's sandbox returns names like
 * "Lead Bank" or "ACME Bank" depending on tenant config — we override that
 * for branding consistency in the UI.
 */
export const TREASURY_BANK_NAME = "Alvarez Bank";
