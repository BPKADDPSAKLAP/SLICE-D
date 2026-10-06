import { PageHeader } from "@/components/layout";
import { EmptyState } from "@/components/ui";
import { OpdIdentityCard } from "@/components/dashboard";
import { PeriodSelect, RekonsiliasiForm } from "@/components/rekonsiliasi";
import { requireOpd } from "@/lib/permissions";
import { getOpdReconPeriod } from "@/lib/rekonsiliasi/opd";

function parseMonth(raw: string | undefined): number {
  const n = Number(raw);
  if (Number.isInteger(n) && n >= 1 && n <= 12) return n;
  return new Date().getMonth() + 1;
}

/**
 * PHASE 3C.2: requireOpd() already ran in app/opd/layout.tsx before
 * this page renders — calling it again here (like
 * app/opd/dashboard/page.tsx does) is the same RLS-protected read of
 * the caller's own profiles row, not a second authorization system.
 * The only thing read from the URL is which month to display
 * (?bulan=1-12); opd_id and fiscal_year always come from the session
 * (profile.opd_id, getSelectedFiscalYear()), here and in every
 * Server Action this page calls.
 */
export default async function OpdRekonsiliasiPage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string }>;
}) {
  const profile = await requireOpd();
  const { bulan } = await searchParams;
  const month = parseMonth(bulan);

  const data = await getOpdReconPeriod(profile.opd_id, month);

  if (data.state === "invalid_profile") {
    return (
      <>
        <PageHeader eyebrow="OPD" title="Rekonsiliasi OPD" />
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
        <PageHeader eyebrow="OPD" title="Rekonsiliasi OPD" />
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
        <PageHeader eyebrow="OPD" title="Rekonsiliasi OPD" />
        <EmptyState title="Terjadi kesalahan" description={data.message} />
      </>
    );
  }

  const { opd, fiscalYear, record } = data;
  const status = record.status;

  return (
    <>
      <PageHeader
        eyebrow="OPD"
        title="Rekonsiliasi OPD"
        subtitle="Input data rekonsiliasi bulanan OPD Anda."
      />

      <div className="flex flex-col gap-4">
        <OpdIdentityCard
          namaOpd={opd.namaOpd}
          kodeOpd={opd.kodeOpd}
          fiscalYear={fiscalYear}
        />

        <PeriodSelect month={month} />

        <RekonsiliasiForm
          key={`${month}-${status}-${"reconId" in record ? record.reconId : "new"}`}
          month={month}
          status={status}
          initialValues={"values" in record ? record.values : null}
          submittedAt={"submittedAt" in record ? record.submittedAt : null}
        />
      </div>
    </>
  );
}
