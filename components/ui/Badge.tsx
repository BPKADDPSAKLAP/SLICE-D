import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Purely visual status pill. Tone names are generic (success/danger/
 * warning/neutral/info) on purpose — the mapping from a business
 * status (e.g. "SESUAI" -> success, "VERIFIED" -> info) is decided by
 * the caller in components/rekonsiliasi or components/dashboard, not
 * here. Keeps this component swappable without touching workflow code.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap",
  {
    variants: {
      tone: {
        success: "text-green bg-green-bg",
        danger: "text-red bg-red-bg",
        warning: "text-gold bg-gold-bg",
        neutral: "text-muted bg-soft",
        info: "text-navy bg-blue-mid/15",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
