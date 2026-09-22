import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TopbarProps {
  title?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * Generic topbar shell — a slot for a title/breadcrumb and a slot for
 * actions (e.g. "Ganti Tahun Anggaran", user menu). No auth or
 * routing logic lives here; the caller decides what goes in each slot.
 */
export function Topbar({ title, actions, className }: TopbarProps) {
  return (
    <header
      className={cn(
        "flex h-16 items-center justify-between border-b border-line bg-white px-6",
        className
      )}
    >
      <div className="text-sm font-semibold text-navy">{title}</div>
      <div className="flex items-center gap-3">{actions}</div>
    </header>
  );
}
