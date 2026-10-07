"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/permissions";

export type ReconOverallStatus =
  | "belum_input"
  | "draft"
  | "menunggu_cek"
  | "sesuai"
  | "selisih";

export interface CekSelisihListItem {
  opdId: string;
  namaOpd: string;
  kodeOpd: string | null;
  reconId: string | null;
  statusOpd: "DRAFT" | "SUBMITTED" | null;
  statusAdmin: "PENDING" | "VERIFIED" | null;
  overallStatus: ReconOverallStatus;
}

export interface CekSelisihFilters {
  fiscalYear: number;
  reportingMonth: number;
  status?: ReconOverallStatus;
}

export type CekSelisihListResult =
  | { ok: true; items: CekSelisihListItem[] }
  | { ok: false; error: string };

export type BStatus = "SESUAI" | "SELISIH" | null;

export interface CekSelisihDetail {
  reconId: string;
  opdId: string;
  namaOpd: string;
  kodeOpd: string | null;
  fiscalYear: number;
  reportingMonth: number;
  bulanLabel: string | null;
  noSurat: string | null;
  tanggalRekon: string | null;
  petugasRekonNamaSnapshot: string | null;
  statusOpd: "DRAFT" | "SUBMITTED";
  statusAdmin: "PENDING" | "VERIFIED";
  submittedAt: string | null;
  verifiedAt: string | null;

  // OPD-owned — read-only here, never edited from this screen.
  lraManual: number;
  spjFungsional: number;
  saldoSpjFungsional: number;
  rekeningKoran: number;

  // Admin-owned — editable. null only when Admin hasn't saved yet.
  lraSistem: number | null;
  saldoSpjFungsionalSistem: number | null;
  saldoLaporanPenutupanKas: number | null;
  keteranganB1: string | null;
  keteranganB2: string | null;
  keteranganC1: string | null;
  keteranganC2: string | null;

  // Computed by recon_summary — never recalculated here.
  selisihB1: number | null;
  statusB1: BStatus;
  selisihB2: number | null;
  statusB2: BStatus;
  selisihC1: number | null;
  statusC1: BStatus;
  selisihC2: number | null;
  statusC2: BStatus;
}

export type CekSelisihDetailResult =
  | { ok: true; detail: CekSelisihDetail }
  | { ok: false; error: string };

export interface AdminValuesInput {
  lraSistem: number | null;
  saldoSpjFungsionalSistem: number | null;
  saldoLaporanPenutupanKas: number | null;
  keteranganB1: string | null;
  keteranganB2: string | null;
  keteranganC1: string | null;
  keteranganC2: string | null;
}

export type MutationResult =
  | { ok: true; detail: CekSelisihDetail }
  | { ok: false; error: string };

type ReconSummaryRow = {
  recon_id: string | null;
  opd_id: string | null;
  nama_opd: string | null;
  kode_opd: string | null;
  fiscal_year: number | null;
  reporting_month: number | null;
  bulan_label: string | null;
  status_opd: string | null;
  status_admin: string | null;
  no_surat: string | null;
  tanggal_rekon: string | null;
  petugas_rekon_nama_snapshot: string | null;
  submitted_at: string | null;
  verified_at: string | null;
  lra_manual: number | null;
  spj_fungsional: number | null;
  saldo_spj_fungsional: number | null;
  rekening_koran: number | null;
  lra_sistem: number | null;
  saldo_spj_fungsional_sistem: number | null;
  saldo_laporan_penutupan_kas: number | null;
  keterangan_b1: string | null;
  keterangan_b2: string | null;
  keterangan_c1: string | null;
  keterangan_c2: string | null;
  selisih_b1: number | null;
  status_b1: string | null;
  selisih_b2: number | null;
  status_b2: string | null;
  selisih_c1: number | null;
  status_c1: string | null;
  selisih_c2: number | null;
  status_c2: string | null;
};

function toBStatus(value: string | null): BStatus {
  return value === "SESUAI" || value === "SELISIH" ? value : null;
}

function mapDetail(row: ReconSummaryRow): CekSelisihDetail {
  return {
    reconId: row.recon_id as string,
    opdId: row.opd_id as string,
    namaOpd: row.nama_opd ?? "",
    kodeOpd: row.kode_opd,
    fiscalYear: row.fiscal_year as number,
    reportingMonth: row.reporting_month as number,
    bulanLabel: row.bulan_label,
    noSurat: row.no_surat,
    tanggalRekon: row.tanggal_rekon,
    petugasRekonNamaSnapshot: row.petugas_rekon_nama_snapshot,
    statusOpd: (row.status_opd as "DRAFT" | "SUBMITTED") ?? "DRAFT",
    statusAdmin: (row.status_admin as "PENDING" | "VERIFIED") ?? "PENDING",
    submittedAt: row.submitted_at,
    verifiedAt: row.verified_at,
    lraManual: row.lra_manual ?? 0,
    spjFungsional: row.spj_fungsional ?? 0,
    saldoSpjFungsional: row.saldo_spj_fungsional ?? 0,
    rekeningKoran: row.rekening_koran ?? 0,
    lraSistem: row.lra_sistem,
    saldoSpjFungsionalSistem: row.saldo_spj_fungsional_sistem,
    saldoLaporanPenutupanKas: row.saldo_laporan_penutupan_kas,
    keteranganB1: row.keterangan_b1,
    keteranganB2: row.keterangan_b2,
    keteranganC1: row.keterangan_c1,
    keteranganC2: row.keterangan_c2,
    selisihB1: row.selisih_b1,
    statusB1: toBStatus(row.status_b1),
    selisihB2: row.selisih_b2,
    statusB2: toBStatus(row.status_b2),
    selisihC1: row.selisih_c1,
    statusC1: toBStatus(row.status_c1),
    selisihC2: row.selisih_c2,
    statusC2: toBStatus(row.status_c2),
  };
}

/**
 * The one place the 5-way overall status (list view) is derived.
 * Never recomputes B1-C2 — only reads status_b1..c2, already computed
 * by recon_summary with its 0.01 tolerance.
 *
 *  no recon_headers row               -> belum_input
 *  status_opd = DRAFT                  -> draft
 *  status_opd = SUBMITTED, status_admin
 *    != VERIFIED                       -> menunggu_cek
 *  status_admin = VERIFIED, all 4
 *    of status_b1..c2 = SESUAI         -> sesuai
 *  status_admin = VERIFIED, otherwise  -> selisih
 */
function deriveOverallStatus(row: ReconSummaryRow | undefined): ReconOverallStatus {
  if (!row || !row.status_opd) return "belum_input";
  if (row.status_opd === "DRAFT") return "draft";
  if (row.status_admin !== "VERIFIED") return "menunggu_cek";

  const results = [row.status_b1, row.status_b2, row.status_c1, row.status_c2];
  return results.every((s) => s === "SESUAI") ? "sesuai" : "selisih";
}

const RECON_SUMMARY_COLUMNS =
  "recon_id, opd_id, nama_opd, kode_opd, fiscal_year, reporting_month, bulan_label, " +
  "status_opd, status_admin, no_surat, tanggal_rekon, petugas_rekon_nama_snapshot, " +
  "submitted_at, verified_at, lra_manual, spj_fungsional, saldo_spj_fungsional, " +
  "rekening_koran, lra_sistem, saldo_spj_fungsional_sistem, saldo_laporan_penutupan_kas, " +
  "keterangan_b1, keterangan_b2, keterangan_c1, keterangan_c2, " +
  "selisih_b1, status_b1, selisih_b2, status_b2, selisih_c1, status_c1, selisih_c2, status_c2";

/**
 * List of all active OPDs for a given period, each with its overall
 * reconciliation status. OPDs with no recon_headers row for the
 * period are still listed (as "belum_input"), never omitted or shown
 * as if already reconciled (spec requirement).
 */
export async function getCekSelisihList(
  filters: CekSelisihFilters
): Promise<CekSelisihListResult> {
  await requireAdmin();
  const supabase = await createClient();

  const [opdResult, summaryResult] = await Promise.all([
    supabase
      .from("opd_master")
      .select("id, nama_opd, kode_opd")
      .eq("aktif", true)
      .order("urutan", { ascending: true, nullsFirst: false })
      .order("nama_opd", { ascending: true }),
    supabase
      .from("recon_summary")
      .select(RECON_SUMMARY_COLUMNS)
      .eq("fiscal_year", filters.fiscalYear)
      .eq("reporting_month", filters.reportingMonth)
      .returns<ReconSummaryRow[]>(),
  ]);

  if (opdResult.error) {
    return { ok: false, error: "Gagal memuat daftar OPD." };
  }
  if (summaryResult.error) {
    return { ok: false, error: "Gagal memuat data rekonsiliasi." };
  }

  const summaryByOpd = new Map<string, ReconSummaryRow>();
  for (const row of summaryResult.data ?? []) {
    if (row.opd_id) summaryByOpd.set(row.opd_id, row);
  }

  const items: CekSelisihListItem[] = (opdResult.data ?? []).map((opd) => {
    const row = summaryByOpd.get(opd.id);
    return {
      opdId: opd.id,
      namaOpd: opd.nama_opd,
      kodeOpd: opd.kode_opd,
      reconId: row?.recon_id ?? null,
      statusOpd: (row?.status_opd as "DRAFT" | "SUBMITTED" | null) ?? null,
      statusAdmin: (row?.status_admin as "PENDING" | "VERIFIED" | null) ?? null,
      overallStatus: deriveOverallStatus(row),
    };
  });

  const filtered = filters.status
    ? items.filter((item) => item.overallStatus === filters.status)
    : items;

  return { ok: true, items: filtered };
}

/** Full detail for one OPD/period, from recon_summary alone — as an
 *  admin caller, every column (including Admin-owned ones) comes back
 *  populated rather than null, so one query is enough. */
export async function getCekSelisihDetail(
  reconId: string
): Promise<CekSelisihDetailResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recon_summary")
    .select(RECON_SUMMARY_COLUMNS)
    .eq("recon_id", reconId)
    .returns<ReconSummaryRow[]>()
    .maybeSingle();

  if (error) return { ok: false, error: "Gagal memuat detail rekonsiliasi." };
  if (!data) return { ok: false, error: "Data rekonsiliasi tidak ditemukan." };

  return { ok: true, detail: mapDetail(data) };
}

function validateAdminValues(
  input: AdminValuesInput,
  { requireAll }: { requireAll: boolean }
): string | null {
  const numericEntries: [string, number | null][] = [
    ["LRA Sistem", input.lraSistem],
    ["Sisa Saldo SPJ Fungsional Sistem", input.saldoSpjFungsionalSistem],
    ["Sisa Saldo Laporan Penutupan Kas", input.saldoLaporanPenutupanKas],
  ];

  for (const [label, value] of numericEntries) {
    if (value === null) {
      if (requireAll) return `${label} wajib diisi dengan angka valid sebelum verifikasi.`;
      continue;
    }
    if (!Number.isFinite(value) || value < 0) {
      return `${label} harus berupa angka dan tidak boleh negatif.`;
    }
  }

  return null;
}

/** Loads the parent header's current status_opd/status_admin, the
 *  only two columns these workflows need to gate on before writing. */
async function loadHeaderStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  reconId: string
): Promise<
  | { ok: true; statusOpd: string; statusAdmin: string }
  | { ok: false; error: string }
> {
  const { data, error } = await supabase
    .from("recon_headers")
    .select("status_opd, status_admin")
    .eq("id", reconId)
    .maybeSingle();

  if (error) return { ok: false, error: "Gagal memeriksa status rekonsiliasi." };
  if (!data) return { ok: false, error: "Data rekonsiliasi tidak ditemukan." };

  return { ok: true, statusOpd: data.status_opd, statusAdmin: data.status_admin };
}

/**
 * Saves Admin's working values WITHOUT verifying (status_admin stays
 * as-is). Mirrors OPD's "Simpan Draft": partial values allowed, but
 * whatever IS provided must be a valid non-negative number.
 */
export async function saveAdminValues(
  reconId: string,
  input: AdminValuesInput
): Promise<MutationResult> {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const header = await loadHeaderStatus(supabase, reconId);
  if (!header.ok) return { ok: false, error: header.error };
  if (header.statusOpd !== "SUBMITTED") {
    return {
      ok: false,
      error: "OPD belum submit rekonsiliasi bulan ini — belum dapat diisi Admin.",
    };
  }
  // Server-side lock (Revision 1): a verified row is final. Checked
  // here — after requireAdmin() + loadHeaderStatus() — regardless of
  // what the UI already disables, so this can't be bypassed by a
  // stale page, a replayed request, or any client that skips the
  // disabled-input/hidden-button state entirely.
  if (header.statusAdmin === "VERIFIED") {
    return {
      ok: false,
      error: "Rekonsiliasi ini sudah VERIFIED dan tidak dapat diubah.",
    };
  }

  const validationError = validateAdminValues(input, { requireAll: false });
  if (validationError) return { ok: false, error: validationError };

  const { error: upsertError } = await supabase.from("recon_admin_values").upsert(
    {
      recon_id: reconId,
      lra_sistem: input.lraSistem ?? 0,
      saldo_spj_fungsional_sistem: input.saldoSpjFungsionalSistem ?? 0,
      saldo_laporan_penutupan_kas: input.saldoLaporanPenutupanKas ?? 0,
      keterangan_b1: input.keteranganB1,
      keterangan_b2: input.keteranganB2,
      keterangan_c1: input.keteranganC1,
      keterangan_c2: input.keteranganC2,
      updated_by: profile.id,
    },
    { onConflict: "recon_id" }
  );

  if (upsertError) return { ok: false, error: "Gagal menyimpan nilai Admin." };

  const refreshed = await getCekSelisihDetail(reconId);
  if (!refreshed.ok) return { ok: false, error: refreshed.error };
  return { ok: true, detail: refreshed.detail };
}

/**
 * Verifies the reconciliation: saves Admin values (required complete
 * this time), THEN flips status_admin to VERIFIED. Values are written
 * first and status second — if the status update fails, the function
 * reports an error (never a bare "success") even though the values
 * did save, matching the OPD submit flow's same ordering discipline.
 * VERIFIED does not imply SESUAI — both outcomes are valid results of
 * a completed check.
 */
export async function verifyRecon(
  reconId: string,
  input: AdminValuesInput
): Promise<MutationResult> {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const header = await loadHeaderStatus(supabase, reconId);
  if (!header.ok) return { ok: false, error: header.error };
  if (header.statusOpd !== "SUBMITTED") {
    return {
      ok: false,
      error: "OPD belum submit rekonsiliasi bulan ini — Admin tidak dapat memverifikasi.",
    };
  }
  // Server-side lock (Revision 1): same rule as saveAdminValues above
  // — once VERIFIED, neither recon_admin_values, verified_at, nor
  // status_admin may change through this action again. No
  // unverify/revision workflow exists in this phase by design.
  if (header.statusAdmin === "VERIFIED") {
    return {
      ok: false,
      error: "Rekonsiliasi ini sudah VERIFIED dan tidak dapat diubah.",
    };
  }

  const validationError = validateAdminValues(input, { requireAll: true });
  if (validationError) return { ok: false, error: validationError };

  const { error: upsertError } = await supabase.from("recon_admin_values").upsert(
    {
      recon_id: reconId,
      lra_sistem: input.lraSistem as number,
      saldo_spj_fungsional_sistem: input.saldoSpjFungsionalSistem as number,
      saldo_laporan_penutupan_kas: input.saldoLaporanPenutupanKas as number,
      keterangan_b1: input.keteranganB1,
      keterangan_b2: input.keteranganB2,
      keterangan_c1: input.keteranganC1,
      keterangan_c2: input.keteranganC2,
      updated_by: profile.id,
    },
    { onConflict: "recon_id" }
  );

  if (upsertError) {
    return { ok: false, error: "Gagal menyimpan nilai Admin — verifikasi dibatalkan." };
  }

  const { error: statusError } = await supabase
    .from("recon_headers")
    .update({
      status_admin: "VERIFIED",
      verified_at: new Date().toISOString(),
      updated_by: profile.id,
      // verified_by intentionally not set: recon_headers has no such
      // column in the existing schema (spec: don't add one).
    })
    .eq("id", reconId);

  if (statusError) {
    return {
      ok: false,
      error:
        "Nilai Admin tersimpan, namun gagal mengubah status menjadi VERIFIED. Silakan coba verifikasi kembali.",
    };
  }

  const refreshed = await getCekSelisihDetail(reconId);
  if (!refreshed.ok) return { ok: false, error: refreshed.error };
  return { ok: true, detail: refreshed.detail };
}
