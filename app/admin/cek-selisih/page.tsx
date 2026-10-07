import Link from "next/link";
import { PageHeader } from "@/components/layout";
import {
  Card,
  CardBody,
  TableRoot,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  Badge,
  Button,
  Select,
  EmptyState,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { getSelectedFiscalYear } from "@/lib/auth/fiscal-year";
import {
  getCekSelisihList,
  getCekSelisihDetail,
  type ReconOverallStatus,
} from "@/lib/cek-selisih/admin";
import { OverallStatusBadge, AdminVerifikasiForm } from "@/components/cek-selisih";

const MONTH_LABELS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const STATUS_FILTER_OPTIONS: { value: ReconOverallStatus; label: string }[] = [
  { value: "belum_input", label: "Belum Input" },
  { value: "draft", label: "Draft" },
  { value: "menunggu_cek", label: "Menunggu Cek" },
  { value: "sesuai", label: "Sesuai" },
  { value: "selisih", label: "Selisih" },
];

function isValidMonth(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= 12;
}

function isOverallStatus(value: string): value is ReconOverallStatus {
  return STATUS_FILTER_OPTIONS.some((opt) => opt.value === value);
}

interface PageSearchParams {
  tahun?: string;
  bulan?: string;
  status?: string;
  recon?: string;
}

export default async function AdminCekSelisihPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  const params = await searchParams;

  const supabase = await createClient();
  const { data: fiscalYearRows } = await supabase
    .from("fiscal_years")
    .select("year")
    .order("year", { ascending: false });

  const loginFiscalYear = await getSelectedFiscalYear();
  const parsedTahun = params.tahun ? Number(params.tahun) : NaN;
  const fiscalYear =
    Number.isInteger(parsedTahun) && (fiscalYearRows ?? []).some((r) => r.year === parsedTahun)
      ? parsedTahun
      : (loginFiscalYear ?? fiscalYearRows?.[0]?.year ?? null);

  const parsedBulan = params.bulan ? Number(params.bulan) : NaN;
  const reportingMonth = isValidMonth(parsedBulan) ? parsedBulan : new Date().getMonth() + 1;

  const statusFilter = params.status && isOverallStatus(params.status) ? params.status : undefined;

  if (!fiscalYear) {
    return (
      <>
        <PageHeader
          eyebrow="Admin"
          title="Cek Selisih"
          subtitle="Pemeriksaan hasil rekonsiliasi OPD yang sudah disubmit."
        />
        <EmptyState
          title="Belum ada tahun anggaran"
          description="Tambahkan tahun anggaran terlebih dahulu melalui Data Master."
        />
      </>
    );
  }

  const listResult = await getCekSelisihList({ fiscalYear, reportingMonth, status: statusFilter });

  const selectedReconId = params.recon ?? null;
  const detailResult = selectedReconId ? await getCekSelisihDetail(selectedReconId) : null;

  function buildHref(next: Partial<PageSearchParams>) {
    const merged: PageSearchParams = {
      tahun: String(fiscalYear),
      bulan: String(reportingMonth),
      status: statusFilter,
      recon: selectedReconId ?? undefined,
      ...next,
    };
    const qs = new URLSearchParams();
    if (merged.tahun) qs.set("tahun", merged.tahun);
    if (merged.bulan) qs.set("bulan", merged.bulan);
    if (merged.status) qs.set("status", merged.status);
    if (merged.recon) qs.set("recon", merged.recon);
    return `/admin/cek-selisih?${qs.toString()}`;
  }

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Cek Selisih"
        subtitle="Pemeriksaan hasil rekonsiliasi OPD yang sudah disubmit."
      />

      <div className="flex flex-col gap-4">
        <Card>
          <CardBody>
            <form method="get" className="grid gap-4 sm:grid-cols-4 sm:items-end">
              <Select
                label="Tahun Anggaran"
                name="tahun"
                defaultValue={String(fiscalYear)}
                options={(fiscalYearRows ?? []).map((r) => ({
                  value: String(r.year),
                  label: String(r.year),
                }))}
              />
              <Select
                label="Bulan"
                name="bulan"
                defaultValue={String(reportingMonth)}
                options={MONTH_LABELS.map((label, idx) => ({
                  value: String(idx + 1),
                  label,
                }))}
              />
              <Select
                label="Status"
                name="status"
                defaultValue={statusFilter ?? ""}
                options={[{ value: "", label: "Semua Status" }, ...STATUS_FILTER_OPTIONS]}
              />
              <Button type="submit">Terapkan Filter</Button>
            </form>
          </CardBody>
        </Card>

        {!listResult.ok ? (
          <EmptyState title="Terjadi kesalahan" description={listResult.error} />
        ) : listResult.items.length === 0 ? (
          <EmptyState
            title="Tidak ada OPD"
            description="Tidak ada OPD aktif yang cocok dengan filter saat ini."
          />
        ) : (
          <TableRoot>
            <Table>
              <THead>
                <TR>
                  <TH>Nama OPD</TH>
                  <TH>Bulan</TH>
                  <TH>Status OPD</TH>
                  <TH>Status Admin</TH>
                  <TH>Status Hasil</TH>
                  <TH className="text-right">Aksi</TH>
                </TR>
              </THead>
              <TBody>
                {listResult.items.map((item) => (
                  <TR key={item.opdId}>
                    <TD>{item.namaOpd}</TD>
                    <TD>{MONTH_LABELS[reportingMonth - 1]}</TD>
                    <TD>
                      {item.statusOpd ? (
                        <Badge tone={item.statusOpd === "SUBMITTED" ? "info" : "warning"}>
                          {item.statusOpd === "SUBMITTED" ? "Submitted" : "Draft"}
                        </Badge>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </TD>
                    <TD>
                      {item.statusAdmin ? (
                        <Badge tone={item.statusAdmin === "VERIFIED" ? "success" : "neutral"}>
                          {item.statusAdmin === "VERIFIED" ? "Verified" : "Pending"}
                        </Badge>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </TD>
                    <TD>
                      <OverallStatusBadge status={item.overallStatus} />
                    </TD>
                    <TD className="text-right">
                      {item.reconId ? (
                        <Link href={buildHref({ recon: item.reconId })}>
                          <Button variant="secondary" size="sm">
                            Lihat
                          </Button>
                        </Link>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableRoot>
        )}

        {selectedReconId && detailResult && (
          <div className="flex flex-col gap-3">
            {!detailResult.ok ? (
              <EmptyState title="Terjadi kesalahan" description={detailResult.error} />
            ) : (
              <>
                <Card>
                  <CardBody className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                        OPD
                      </p>
                      <p className="mt-1 text-sm font-semibold text-navy">
                        {detailResult.detail.namaOpd}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                        Tahun Anggaran / Bulan
                      </p>
                      <p className="mt-1 text-sm font-semibold text-navy">
                        {MONTH_LABELS[detailResult.detail.reportingMonth - 1]}{" "}
                        {detailResult.detail.fiscalYear}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                        Nomor Surat
                      </p>
                      <p className="mt-1 text-sm font-semibold text-navy">
                        {detailResult.detail.noSurat ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                        Tanggal Rekon
                      </p>
                      <p className="mt-1 text-sm font-semibold text-navy">
                        {detailResult.detail.tanggalRekon ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                        Status OPD
                      </p>
                      <Badge tone={detailResult.detail.statusOpd === "SUBMITTED" ? "info" : "warning"}>
                        {detailResult.detail.statusOpd === "SUBMITTED" ? "Submitted" : "Draft"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                        Status Admin
                      </p>
                      <Badge
                        tone={detailResult.detail.statusAdmin === "VERIFIED" ? "success" : "neutral"}
                      >
                        {detailResult.detail.statusAdmin === "VERIFIED" ? "Verified" : "Pending"}
                      </Badge>
                    </div>
                  </CardBody>
                </Card>

                <AdminVerifikasiForm initialDetail={detailResult.detail} />
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
