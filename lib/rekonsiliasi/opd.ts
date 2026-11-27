import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getSelectedFiscalYear } from "@/lib/auth/fiscal-year";

export interface ReconFieldValues {
  lraManual: number;
  spjFungsional: number;
  saldoSpjFungsional: number;
  rekeningKoran: number;
}

export type OpdReconRecord =
  | { status: "belum_input" }
  | {
      status: "draft" | "submitted";
      reconId: string;
      values: ReconFieldValues;
      submittedAt: string | null;
    };

export type OpdReconPeriodData =
  | {
      state: "ready";
      opd: { namaOpd: string; kodeOpd: string | null };
      fiscalYear: number;
      month: number;
      record: OpdReconRecord;
    }
  /** profiles.opd_id is null on this opd-role account — not a query we can run. */
  | { state: "invalid_profile" }
  /** No fiscal year cookie (lost/expired) — never guessed. */
  | { state: "no_fiscal_year" }
  | { state: "error"; message: string };

/**
 * Everything the Rekonsiliasi OPD page needs for one period, in one
 * server-side call. `opdId` must come from the authenticated profile
 * (profiles.opd_id via requireOpd()/getCurrentProfile() in the page)
 * — never from a URL, search param, or form field. Only queries
 * recon_headers and recon_opd_values, both through
 * lib/supabase/server.ts (RLS-governed, anon/publishable key).
 * recon_admin_values is never queried here — OPD has no RLS grant on
 * it at all, and this module has no reason to touch it regardless.
 */
export async function getOpdReconPeriod(
  opdId: string | null,
  month: number
): Promise<OpdReconPeriodData> {
  if (!opdId) {
    return { state: "invalid_profile" };
  }

  const fiscalYear = await getSelectedFiscalYear();
  if (!fiscalYear) {
    return { state: "no_fiscal_year" };
  }

  const supabase = await createClient();

  const [opdResult, headerResult] = await Promise.all([
    supabase.from("opd_master").select("nama_opd, kode_opd").eq("id", opdId).single(),
    supabase
      .from("recon_headers")
      .select("id, status_opd, submitted_at")
      .eq("opd_id", opdId)
      .eq("fiscal_year", fiscalYear)
      .eq("reporting_month", month)
      .maybeSingle(),
  ]);

  if (opdResult.error || !opdResult.data) {
    return { state: "error", message: "Gagal memuat identitas OPD." };
  }
  if (headerResult.error) {
    return { state: "error", message: "Gagal memuat data rekonsiliasi." };
  }

  const header = headerResult.data;
  const opd = { namaOpd: opdResult.data.nama_opd, kodeOpd: opdResult.data.kode_opd };

  if (!header) {
    return {
      state: "ready",
      opd,
      fiscalYear,
      month,
      record: { status: "belum_input" },
    };
  }

  const { data: values, error: valuesError } = await supabase
    .from("recon_opd_values")
    .select("lra_manual, spj_fungsional, saldo_spj_fungsional, rekening_koran")
    .eq("recon_id", header.id)
    .maybeSingle();

  if (valuesError) {
    return { state: "error", message: "Gagal memuat nilai rekonsiliasi." };
  }

  const status = header.status_opd === "SUBMITTED" ? "submitted" : "draft";

  return {
    state: "ready",
    opd,
    fiscalYear,
    month,
    record: {
      status,
      reconId: header.id,
      submittedAt: header.submitted_at,
      values: {
        lraManual: values?.lra_manual ?? 0,
        spjFungsional: values?.spj_fungsional ?? 0,
        saldoSpjFungsional: values?.saldo_spj_fungsional ?? 0,
        rekeningKoran: values?.rekening_koran ?? 0,
      },
    },
  };
}
