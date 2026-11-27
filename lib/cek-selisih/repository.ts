import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * Persistence layer for Admin "Cek Selisih" runs (Phase 3C.4A).
 *
 * Scope is the database ONLY: no Google Drive, no Apps Script, no
 * Excel/SheetJS, no prototype processor, no UI. Those are separate
 * layers added in later phases; this module just stores/reads the
 * metadata (period, version, status, Drive file IDs, summary).
 *
 * Authorization: Admin-only, enforced by the database (RLS policies +
 * is_admin() inside the version functions) — the Supabase server
 * client below is the caller's own authenticated session, never the
 * service-role client. Callers (future Server Actions / pages) should
 * still call requireAdmin() first for a friendly redirect; this module
 * does not replace that, and does not depend on it for safety.
 *
 * Version lifecycle:
 *   createRun()   -> next version number, staged as SUPERSEDED
 *                    (current ACTIVE run is untouched)
 *   activateRun() -> ONE database function call: previous ACTIVE ->
 *                    SUPERSEDED and this run -> ACTIVE, atomically.
 * Superseding the previous ACTIVE run is deliberately NOT exposed as a
 * standalone call: it only ever happens as part of activateRun(), so
 * a period can never be left half-switched.
 */

type RunRow = Database["public"]["Tables"]["cek_selisih_runs"]["Row"];

export type CekSelisihRunStatus = "ACTIVE" | "SUPERSEDED";

export interface CekSelisihRun {
  id: string;
  fiscalYear: number;
  reportingMonth: number;
  version: number;
  status: CekSelisihRunStatus;
  lraManualFileId: string | null;
  lraProgramFileId: string | null;
  resultFileId: string | null;
  totalSp2d: number;
  totalLraProgram: number;
  totalSelisih: number;
  jumlahRekening: number;
  jumlahSesuai: number;
  jumlahSelisih: number;
  jumlahTransaksi: number;
  catatan: string | null;
  uploadedBy: string;
  createdAt: string;
}

export type RepoResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface CreateRunInput {
  fiscalYear: number;
  reportingMonth: number;
  lraManualFileId?: string;
  lraProgramFileId?: string;
  resultFileId?: string;
  totalSp2d?: number;
  totalLraProgram?: number;
  totalSelisih?: number;
  jumlahRekening?: number;
  jumlahSesuai?: number;
  jumlahSelisih?: number;
  jumlahTransaksi?: number;
  catatan?: string;
}

/** Fields updateRunSummary may change. Identity (period, version,
 *  uploader) and status are intentionally not here. */
export interface RunSummaryPatch {
  lraManualFileId?: string | null;
  lraProgramFileId?: string | null;
  resultFileId?: string | null;
  totalSp2d?: number;
  totalLraProgram?: number;
  totalSelisih?: number;
  jumlahRekening?: number;
  jumlahSesuai?: number;
  jumlahSelisih?: number;
  jumlahTransaksi?: number;
  catatan?: string | null;
}

function mapRun(row: RunRow): CekSelisihRun {
  return {
    id: row.id,
    fiscalYear: row.fiscal_year,
    reportingMonth: row.reporting_month,
    version: row.version,
    status: row.status === "ACTIVE" ? "ACTIVE" : "SUPERSEDED",
    lraManualFileId: row.lra_manual_file_id,
    lraProgramFileId: row.lra_program_file_id,
    resultFileId: row.result_file_id,
    totalSp2d: row.total_sp2d,
    totalLraProgram: row.total_lra_program,
    totalSelisih: row.total_selisih,
    jumlahRekening: row.jumlah_rekening,
    jumlahSesuai: row.jumlah_sesuai,
    jumlahSelisih: row.jumlah_selisih,
    jumlahTransaksi: row.jumlah_transaksi,
    catatan: row.catatan,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  };
}

/**
 * Raw database errors are never returned to callers. P0001 is the one
 * code passed through: it is only raised by the messages we wrote
 * ourselves in the migration (Indonesian, no internals).
 */
function safeError(
  error: { code?: string; message: string },
  fallback: string
): string {
  switch (error.code) {
    case "42501":
      return "Anda tidak memiliki akses ke data Cek Selisih.";
    case "23514":
      return "Data ringkasan tidak valid atau tidak konsisten.";
    case "23505":
      return "Versi run bentrok dengan data yang sudah ada. Silakan coba lagi.";
    case "23503":
      return "Tahun anggaran tidak terdaftar.";
    case "P0001":
      return error.message;
    default:
      return fallback;
  }
}

function isValidPeriod(fiscalYear: number, reportingMonth: number): boolean {
  return (
    Number.isInteger(fiscalYear) &&
    Number.isInteger(reportingMonth) &&
    reportingMonth >= 1 &&
    reportingMonth <= 12
  );
}

function isNonNegativeInt(n: number): boolean {
  return Number.isInteger(n) && n >= 0;
}

/** Light pre-check only — the database constraints are the real guard. */
function validateSummary(p: RunSummaryPatch): string | null {
  for (const v of [p.totalSp2d, p.totalLraProgram, p.totalSelisih]) {
    if (v !== undefined && !Number.isFinite(v)) return "Nilai total harus berupa angka.";
  }
  for (const v of [p.jumlahRekening, p.jumlahSesuai, p.jumlahSelisih]) {
    if (v !== undefined && !isNonNegativeInt(v)) {
      return "Jumlah rekening harus bilangan bulat tidak negatif.";
    }
  }
  if (p.jumlahTransaksi !== undefined && !isNonNegativeInt(p.jumlahTransaksi)) {
    return "Jumlah transaksi harus bilangan bulat tidak negatif.";
  }
  return null;
}

type ServerClient = Awaited<ReturnType<typeof createClient>>;

async function fetchRunById(
  supabase: ServerClient,
  id: string
): Promise<RepoResult<CekSelisihRun | null>> {
  const { data, error } = await supabase
    .from("cek_selisih_runs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return { ok: false, error: safeError(error, "Gagal memuat run Cek Selisih.") };
  return { ok: true, data: data ? mapRun(data) : null };
}

/** The ACTIVE run for a period, or null when none has been activated. */
export async function getActiveRun(
  fiscalYear: number,
  reportingMonth: number
): Promise<RepoResult<CekSelisihRun | null>> {
  if (!isValidPeriod(fiscalYear, reportingMonth)) {
    return { ok: false, error: "Periode tidak valid." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cek_selisih_runs")
    .select("*")
    .eq("fiscal_year", fiscalYear)
    .eq("reporting_month", reportingMonth)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (error) return { ok: false, error: safeError(error, "Gagal memuat run aktif.") };
  return { ok: true, data: data ? mapRun(data) : null };
}

/** Every version for a period, newest first (ACTIVE and SUPERSEDED). */
export async function listVersions(
  fiscalYear: number,
  reportingMonth: number
): Promise<RepoResult<CekSelisihRun[]>> {
  if (!isValidPeriod(fiscalYear, reportingMonth)) {
    return { ok: false, error: "Periode tidak valid." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cek_selisih_runs")
    .select("*")
    .eq("fiscal_year", fiscalYear)
    .eq("reporting_month", reportingMonth)
    .order("version", { ascending: false });

  if (error) return { ok: false, error: safeError(error, "Gagal memuat riwayat versi.") };
  return { ok: true, data: (data ?? []).map(mapRun) };
}

/** One run by id; data is null when it does not exist (or RLS hides it). */
export async function getRunById(
  id: string
): Promise<RepoResult<CekSelisihRun | null>> {
  const supabase = await createClient();
  return fetchRunById(supabase, id);
}

/**
 * Creates the next version for a period. The new run is STAGED as
 * SUPERSEDED — the current ACTIVE run keeps serving until
 * activateRun() is called for the new one. Version numbering and
 * uploaded_by (= the caller) are assigned by the database function,
 * not by this module, so concurrent creates cannot collide and the
 * uploader cannot be spoofed.
 */
export async function createRun(
  input: CreateRunInput
): Promise<RepoResult<CekSelisihRun>> {
  if (!isValidPeriod(input.fiscalYear, input.reportingMonth)) {
    return { ok: false, error: "Periode tidak valid." };
  }
  const summaryError = validateSummary(input);
  if (summaryError) return { ok: false, error: summaryError };

  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("create_cek_selisih_run", {
    p_fiscal_year: input.fiscalYear,
    p_reporting_month: input.reportingMonth,
    p_lra_manual_file_id: input.lraManualFileId,
    p_lra_program_file_id: input.lraProgramFileId,
    p_result_file_id: input.resultFileId,
    p_total_sp2d: input.totalSp2d,
    p_total_lra_program: input.totalLraProgram,
    p_total_selisih: input.totalSelisih,
    p_jumlah_rekening: input.jumlahRekening,
    p_jumlah_sesuai: input.jumlahSesuai,
    p_jumlah_selisih: input.jumlahSelisih,
    p_catatan: input.catatan,
    p_jumlah_transaksi: input.jumlahTransaksi,
  });

  if (error || !id) {
    return {
      ok: false,
      error: error ? safeError(error, "Gagal membuat run Cek Selisih.") : "Gagal membuat run Cek Selisih.",
    };
  }

  const created = await fetchRunById(supabase, id);
  if (!created.ok) return created;
  if (!created.data) return { ok: false, error: "Run dibuat tetapi tidak dapat dimuat kembali." };
  return { ok: true, data: created.data };
}

/**
 * Makes `id` the ACTIVE run of its period and supersedes the previous
 * ACTIVE run, as a single atomic database operation (one function
 * call = one transaction, serialised per period). Also the way to roll
 * back to an older version. Activating an already-ACTIVE run is a no-op.
 */
export async function activateRun(id: string): Promise<RepoResult<CekSelisihRun>> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("activate_cek_selisih_run", { p_id: id });
  if (error) return { ok: false, error: safeError(error, "Gagal mengaktifkan run Cek Selisih.") };

  const activated = await fetchRunById(supabase, id);
  if (!activated.ok) return activated;
  if (!activated.data) return { ok: false, error: "Run tidak ditemukan." };
  return { ok: true, data: activated.data };
}

/**
 * Updates file IDs, summary totals/counts and catatan of an existing
 * run (e.g. after the result JSON has been stored). Status, period,
 * version and uploader cannot be changed here (the last three are
 * also immutable at the database level).
 */
export async function updateRunSummary(
  id: string,
  patch: RunSummaryPatch
): Promise<RepoResult<CekSelisihRun>> {
  const summaryError = validateSummary(patch);
  if (summaryError) return { ok: false, error: summaryError };

  const update: Database["public"]["Tables"]["cek_selisih_runs"]["Update"] = {};
  if (patch.lraManualFileId !== undefined) update.lra_manual_file_id = patch.lraManualFileId;
  if (patch.lraProgramFileId !== undefined) update.lra_program_file_id = patch.lraProgramFileId;
  if (patch.resultFileId !== undefined) update.result_file_id = patch.resultFileId;
  if (patch.totalSp2d !== undefined) update.total_sp2d = patch.totalSp2d;
  if (patch.totalLraProgram !== undefined) update.total_lra_program = patch.totalLraProgram;
  if (patch.totalSelisih !== undefined) update.total_selisih = patch.totalSelisih;
  if (patch.jumlahRekening !== undefined) update.jumlah_rekening = patch.jumlahRekening;
  if (patch.jumlahSesuai !== undefined) update.jumlah_sesuai = patch.jumlahSesuai;
  if (patch.jumlahSelisih !== undefined) update.jumlah_selisih = patch.jumlahSelisih;
  if (patch.jumlahTransaksi !== undefined) update.jumlah_transaksi = patch.jumlahTransaksi;
  if (patch.catatan !== undefined) update.catatan = patch.catatan;

  if (Object.keys(update).length === 0) {
    return { ok: false, error: "Tidak ada perubahan untuk disimpan." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cek_selisih_runs")
    .update(update)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return { ok: false, error: safeError(error, "Gagal memperbarui ringkasan run.") };
  // RLS makes rows invisible to non-admins, so "no row" covers both
  // "does not exist" and "not allowed" without revealing which.
  if (!data) return { ok: false, error: "Run Cek Selisih tidak ditemukan." };
  return { ok: true, data: mapRun(data) };
}
