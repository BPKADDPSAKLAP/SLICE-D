import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/permissions";
import { getSelectedFiscalYear } from "@/lib/auth/fiscal-year";
import { AppShell, SidebarBrand, adminNavItems } from "@/components/layout";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Badge } from "@/components/ui";

/**
 * Every route under /admin renders through this layout, so
 * requireAdmin() runs before any admin page — this is the real
 * enforcement point (spec §3), not proxy.ts (UX-only redirect) and
 * not the client-rendered Sidebar (visibility only, spec §5).
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await requireAdmin();
  const fiscalYear = await getSelectedFiscalYear();

  return (
    <AppShell
      navItems={adminNavItems}
      brand={<SidebarBrand />}
      contextLabel={
        <span className="text-sm font-semibold text-navy">Panel Admin</span>
      }
      topbarActions={
        <>
          {fiscalYear && (
            <Badge tone="info" className="hidden sm:inline-flex">
              TA {fiscalYear}
            </Badge>
          )}
          <div className="hidden text-right leading-tight sm:block">
            <p className="text-sm font-semibold text-navy">
              {profile.username || "Administrator"}
            </p>
            <p className="text-xs text-muted">Admin</p>
          </div>
          <LogoutButton />
        </>
      }
    >
      {children}
    </AppShell>
  );
}
