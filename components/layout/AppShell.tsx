"use client";

import { type ReactNode, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Drawer } from "@/components/ui";
import { IconMenu } from "@/components/ui/icons";
import type { NavItemConfig } from "./navigation";

export interface AppShellProps {
  navItems: NavItemConfig[];
  brand: ReactNode;
  /** Rendered in the topbar's left slot, next to the mobile menu button. */
  contextLabel: ReactNode;
  /** Rendered in the topbar's right slot (fiscal year, user, role, logout). */
  topbarActions?: ReactNode;
  children: ReactNode;
}

/**
 * The one place that assembles Sidebar + Topbar + content into a full
 * page. app/admin/layout.tsx and app/opd/layout.tsx are thin callers
 * that resolve the current user (requireAdmin/requireOpd) and pass in
 * role-specific nav items + topbar content; this component itself
 * has no idea what a "role" or a "profile" is — see spec §12.
 */
export function AppShell({
  navItems,
  brand,
  contextLabel,
  topbarActions,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const items = navItems.map((item) => ({
    ...item,
    active: pathname === item.href || pathname.startsWith(`${item.href}/`),
  }));

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar brand={brand} items={items} />
      </div>

      {/* Mobile sidebar (drawer), reuses the same Sidebar + nav config */}
      <Drawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        side="left"
        className="max-w-72"
        bodyClassName="p-0"
      >
        <Sidebar
          brand={brand}
          items={items}
          className="h-full w-full border-none"
        />
      </Drawer>

      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar
          title={
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Buka menu navigasi"
                className="grid h-9 w-9 place-items-center rounded-[var(--radius-control)] text-navy hover:bg-soft lg:hidden"
              >
                <IconMenu />
              </button>
              {contextLabel}
            </div>
          }
          actions={topbarActions}
        />
        <main className="flex-1 overflow-x-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
