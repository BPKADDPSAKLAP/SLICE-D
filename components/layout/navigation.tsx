import { type ReactNode } from "react";
import {
  IconDashboard,
  IconReconciliation,
  IconScale,
  IconUpload,
  IconDatabase,
  IconMasterData,
} from "@/components/ui/icons";

export interface NavItemConfig {
  label: string;
  href: string;
  icon: ReactNode;
}

/**
 * Which links appear per role. Sidebar/AppShell only render whatever
 * list they're handed — they don't know these came from a role.
 * `active` state is computed at render time (AppShell, from the
 * current pathname), not stored here.
 *
 * Reminder (spec §5 / §12): this list controls sidebar *visibility*
 * only. It is not a security boundary — app/admin/layout.tsx and
 * app/opd/layout.tsx (requireAdmin/requireOpd) plus proxy.ts plus RLS
 * are what actually enforce access.
 */
export const adminNavItems: NavItemConfig[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: <IconDashboard /> },
  {
    label: "Rekonsiliasi",
    href: "/admin/rekonsiliasi",
    icon: <IconReconciliation />,
  },
  { label: "Cek Selisih", href: "/admin/cek-selisih", icon: <IconScale /> },
  {
    label: "Unggah Rekon",
    href: "/admin/unggah-rekon",
    icon: <IconUpload />,
  },
  { label: "Database", href: "/admin/database", icon: <IconDatabase /> },
  {
    label: "Data Master",
    href: "/admin/data-master",
    icon: <IconMasterData />,
  },
];

export const opdNavItems: NavItemConfig[] = [
  { label: "Dashboard", href: "/opd/dashboard", icon: <IconDashboard /> },
  {
    label: "Rekonsiliasi",
    href: "/opd/rekonsiliasi",
    icon: <IconReconciliation />,
  },
];
