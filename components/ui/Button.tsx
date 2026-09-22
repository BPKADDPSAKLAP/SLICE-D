import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Pure presentational button. Knows nothing about auth, Supabase, or
 * what happens on click — callers pass onClick / a Server Action via
 * `formAction` / `type="submit"`. Redesigning buttons app-wide means
 * editing only this file.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-mid/40",
  {
    variants: {
      variant: {
        primary: "bg-navy text-white hover:bg-navy-2",
        secondary:
          "bg-white text-navy border border-line hover:bg-soft",
        ghost: "bg-transparent text-navy hover:bg-soft",
        danger: "bg-red text-white hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-[var(--radius-control)]",
        md: "h-10 px-4 rounded-[var(--radius-control)]",
        lg: "h-11 px-5 text-base rounded-[var(--radius-control)]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? "Memproses…" : children}
      </button>
    );
  }
);
Button.displayName = "Button";
