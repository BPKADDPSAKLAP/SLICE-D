import { type SelectHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label?: string;
  error?: string;
  placeholder?: string;
  options: SelectOption[];
}

/**
 * Pure presentational select. Options come from the caller (e.g. a
 * Server Component fetching `fiscal_years` or `opd_master`) — this
 * component has no knowledge of Supabase or what the options mean.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, placeholder, options, id, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={selectId}
            className="text-xs font-semibold uppercase tracking-wide text-muted"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "h-10 rounded-[var(--radius-control)] border border-line bg-white px-3 text-sm text-foreground outline-none transition focus:border-blue-dark focus:ring-2 focus:ring-blue-mid/30",
            error && "border-red focus:border-red focus:ring-red/20",
            className
          )}
          aria-invalid={!!error}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";
