import { PageHeader } from "@/components/layout";
import { EmptyState } from "@/components/ui";

/**
 * PHASE 3B: shell only. requireOpd() already ran in
 * app/opd/layout.tsx before this page renders — see spec §9. Scoping
 * to the signed-in OPD's own data (never another OPD's) is real
 * business logic for the reconciliation module, built in a later
 * phase; nothing is queried here yet.
 */
export default function OpdDashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="OPD"
        title="Dashboard OPD"
        subtitle="Ringkasan rekonsiliasi OPD Anda."
      />
      <EmptyState
        title="Belum ada data"
        description="Data rekonsiliasi OPD Anda akan tampil di sini setelah modul rekonsiliasi tersedia."
      />
    </>
  );
}
