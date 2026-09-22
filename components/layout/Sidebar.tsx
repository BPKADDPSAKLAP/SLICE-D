import { type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface SidebarNavItem {
  label: string;
  href: string;
  icon?: ReactNode;
  active?: boolean;
}

export interface SidebarProps {
  brand: ReactNode;
  items: SidebarNavItem[];
  footer?: ReactNode;
  className?: string;
}

/**
 * Generic sidebar shell. Which links appear (admin's 6 sections vs
 * OPD's 2) is decided by the route-level layout (app/admin/layout.tsx,
 * app/opd/layout.tsx) that passes `items` in — this component has no
 * knowledge of roles or permissions.
 */
export function Sidebar({ brand, items, footer, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full w-64 shrink-0 flex-col border-r border-line bg-navy text-white",
        className
      )}
    >
      <div className="flex items-center gap-3 px-5 py-5">{brand}</div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 rounded-[var(--radius-control)] px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white",
              item.active && "bg-white/10 text-white"
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
      {footer && <div className="border-t border-white/10 px-4 py-4">{footer}</div>}
    </aside>
  );
}
