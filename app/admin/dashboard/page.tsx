import { PageHeader } from "@/components/layout";
import { EmptyState } from "@/components/ui";

/**
 * PHASE 3B: shell only. requireAdmin() already ran in
 * app/admin/layout.tsx before this page renders — see spec §9. Real
 * content (OPD monitoring grid, reconciliation status) is a later
 * phase; no dummy statistics are shown in the meantime (spec §15).
 */
export default function AdminDashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Dashboard Admin"
        subtitle="Ringkasan monitoring rekonsiliasi seluruh OPD."
      />
      <EmptyState
        title="Belum ada data"
        description="Data rekonsiliasi akan tampil di sini setelah modul rekonsiliasi tersedia."
      />
    </>
  );
}
