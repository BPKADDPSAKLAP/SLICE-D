import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/**
 * Purely presentational "belum ada data" / placeholder panel. Used by
 * ModulePlaceholder (components/layout) for whole placeholder pages,
 * and reusable later for genuine empty states (e.g. an OPD with no
 * reconciliation rows yet) once real data-fetching pages exist.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-[var(--radius-surface)] border border-dashed border-line bg-white px-6 py-16 text-center",
        className
      )}
    >
      {icon && <div className="text-muted">{icon}</div>}
      <div className="max-w-sm">
        <p className="text-sm font-semibold text-navy">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-muted">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
