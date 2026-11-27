import type { ReactNode } from "react";
import { requireOpd } from "@/lib/permissions";
import { getSelectedFiscalYear } from "@/lib/auth/fiscal-year";
import { AppShell, SidebarBrand, opdNavItems } from "@/components/layout";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Badge } from "@/components/ui";

/**
 * Every route under /opd renders through this layout, so requireOpd()
 * runs before any OPD page. OPD nav only shows Dashboard + Rekonsiliasi
 * (spec §4) — but that's visibility only; an OPD user hitting an
 * admin URL directly is still blocked by proxy.ts + this layout's own
 * role check + RLS, not by the sidebar simply omitting the link.
 */
export default async function OpdLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await requireOpd();
  const fiscalYear = await getSelectedFiscalYear();

  return (
    <AppShell
      navItems={opdNavItems}
      brand={<SidebarBrand />}
      contextLabel={
        <span className="text-sm font-semibold text-navy">Panel OPD</span>
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
              {profile.username || "Pengguna OPD"}
            </p>
            <p className="text-xs text-muted">OPD</p>
          </div>
          <LogoutButton />
        </>
      }
    >
      {children}
    </AppShell>
  );
}
