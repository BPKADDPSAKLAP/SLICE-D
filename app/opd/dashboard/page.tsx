import { PageHeader } from "@/components/layout";
import { EmptyState } from "@/components/ui";
import { requireOpd } from "@/lib/permissions";
import { getOpdDashboardData } from "@/lib/dashboard/opd";
import {
  OpdIdentityCard,
  DashboardMetricCard,
  ReconStatusTable,
} from "@/components/dashboard";
import { formatRupiah } from "@/lib/format";

/**
 * PHASE 3C.1: real Server Component. requireOpd() already ran in
 * app/opd/layout.tsx before this page renders — calling it again
 * here is not a second authorization system, it's the same guard
 * re-used to get the profile object back (Next.js layout props don't
 * pass data down to pages; this is one extra RLS-protected read of
 * the caller's own profiles row, not a new decision).
 *
 * All data comes from lib/dashboard/opd.ts — this file only renders
 * what that function returns. No Supabase calls here.
 */
export default async function OpdDashboardPage() {
  const profile = await requireOpd();
  const data = await getOpdDashboardData(profile.opd_id);

  if (data.state === "invalid_profile") {
    return (
      <>
        <PageHeader eyebrow="OPD" title="Dashboard OPD" />
        <EmptyState
          title="Akun belum terhubung ke OPD"
          description="Akun Anda belum dikaitkan dengan OPD manapun. Hubungi administrator."
        />
      </>
    );
  }

  if (data.state === "no_fiscal_year") {
    return (
      <>
        <PageHeader eyebrow="OPD" title="Dashboard OPD" />
        <EmptyState
          title="Tahun anggaran belum dipilih"
          description="Silakan keluar dan login kembali untuk memilih tahun anggaran."
        />
      </>
    );
  }

  if (data.state === "error") {
    return (
      <>
        <PageHeader eyebrow="OPD" title="Dashboard OPD" />
        <EmptyState title="Terjadi kesalahan" description={data.message} />
      </>
    );
  }

  const { opd, fiscalYear, months, summary } = data;

  return (
    <>
      <PageHeader
        eyebrow="OPD"
        title="Dashboard OPD"
        subtitle="Ringkasan rekonsiliasi OPD Anda."
      />

      <div className="flex flex-col gap-4">
        <OpdIdentityCard
          namaOpd={opd.namaOpd}
          kodeOpd={opd.kodeOpd}
          fiscalYear={fiscalYear}
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <DashboardMetricCard
            label="Total LRA Manual"
            value={formatRupiah(summary.totalLraManual)}
          />
          <DashboardMetricCard
            label="Total Periode"
            value={String(summary.totalPeriods)}
          />
          <DashboardMetricCard label="Sesuai" value={String(summary.countSesuai)} />
          <DashboardMetricCard
            label="Selisih"
            value={String(summary.countSelisih)}
          />
          <DashboardMetricCard
            label="Belum Input"
            value={String(summary.countBelumInput)}
          />
        </div>

        <ReconStatusTable months={months} />
      </div>
    </>
  );
}
