import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes safely (later classes win on conflicts).
 * Used by every component in components/ui and components/layout so
 * class overrides from a parent never fight with a component's own
 * defaults. Pure presentation utility — no business logic here.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
