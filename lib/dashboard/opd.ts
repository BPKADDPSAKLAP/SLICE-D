import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getSelectedFiscalYear } from "@/lib/auth/fiscal-year";

export type MonthlyStatus = "belum_input" | "draft" | "submitted" | "sesuai" | "selisih";

export interface MonthlyReconRow {
  month: number; // 1-12
  label: string; // "Januari".."Desember"
  /** null only when status is "belum_input" (no recon_headers row at all). */
  lraManual: number | null;
  status: MonthlyStatus;
}

export interface OpdDashboardSummary {
  totalLraManual: number;
  totalPeriods: number;
  countSesuai: number;
  countSelisih: number;
  countBelumInput: number;
  countDraft: number;
  countSubmitted: number;
}

export type OpdDashboardData =
  | {
      state: "ready";
      opd: { namaOpd: string; kodeOpd: string | null };
      fiscalYear: number;
      months: MonthlyReconRow[];
      summary: OpdDashboardSummary;
    }
  /** profiles.opd_id is null on an opd-role account — data inconsistency, not a query we can run. */
  | { state: "invalid_profile" }
  /** No fiscal year cookie (e.g. lost/expired) — never guessed, must be re-selected at login. */
  | { state: "no_fiscal_year" }
  | { state: "error"; message: string };

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

type ReconSummaryStatusRow = {
  reporting_month: number | null;
  lra_manual: number | null;
  status_opd: string | null;
  status_b1: string | null;
  status_b2: string | null;
  status_c1: string | null;
  status_c2: string | null;
};

/**
 * The one place the 5-way status rule lives. Never recomputes
 * B1-C4 themselves — those come pre-calculated from recon_summary
 * (tolerance 0.01 already applied in the view). This only maps the
 * view's per-row values to a single status per spec:
 *
 * 1. no row at all              -> belum_input (handled by the caller,
 *                                   this function only sees rows that exist)
 * 2. status_opd = DRAFT          -> draft
 * 3. SUBMITTED, not all 4 of
 *    status_b1..c2 available     -> submitted
 * 4. SUBMITTED, all 4 available,
 *    all 4 = SESUAI              -> sesuai
 * 5. SUBMITTED, all 4 available,
 *    at least 1 = SELISIH        -> selisih
 */
function deriveStatus(row: ReconSummaryStatusRow): MonthlyStatus {
  if (row.status_opd === "DRAFT") return "draft";

  const results = [row.status_b1, row.status_b2, row.status_c1, row.status_c2];
  const allAvailable = results.every((s) => s === "SESUAI" || s === "SELISIH");

  if (!allAvailable) return "submitted";
  return results.includes("SELISIH") ? "selisih" : "sesuai";
}

/**
 * Everything the OPD Dashboard needs, in one server-side call.
 * `opdId` must come from the authenticated profile (profiles.opd_id
 * via requireOpd()/getCurrentProfile() in the page) — never from a
 * URL, search param, or form field. Both queries run through
 * lib/supabase/server.ts (RLS-governed, anon/publishable key); no
 * service-role client is used or needed here — RLS on recon_summary
 * already returns only this OPD's own rows, and the Admin-owned
 * columns (lra_sistem, keterangan_*, etc.) come back NULL for an OPD
 * caller rather than erroring, which is why deriveStatus() only ever
 * reads status_b1..c2, never the raw admin figures.
 */
export async function getOpdDashboardData(
  opdId: string | null
): Promise<OpdDashboardData> {
  if (!opdId) {
    return { state: "invalid_profile" };
  }

  const fiscalYear = await getSelectedFiscalYear();
  if (!fiscalYear) {
    return { state: "no_fiscal_year" };
  }

  const supabase = await createClient();

  const [opdResult, reconResult] = await Promise.all([
    supabase
      .from("opd_master")
      .select("nama_opd, kode_opd")
      .eq("id", opdId)
      .single(),
    supabase
      .from("recon_summary")
      .select(
        "reporting_month, lra_manual, status_opd, status_b1, status_b2, status_c1, status_c2"
      )
      .eq("opd_id", opdId)
      .eq("fiscal_year", fiscalYear),
  ]);

  if (opdResult.error || !opdResult.data) {
    return { state: "error", message: "Gagal memuat identitas OPD." };
  }
  if (reconResult.error) {
    return { state: "error", message: "Gagal memuat data rekonsiliasi." };
  }

  const rowsByMonth = new Map<number, ReconSummaryStatusRow>();
  for (const row of reconResult.data ?? []) {
    if (row.reporting_month !== null) {
      rowsByMonth.set(row.reporting_month, row);
    }
  }

  const months: MonthlyReconRow[] = MONTH_LABELS.map((label, idx) => {
    const month = idx + 1;
    const row = rowsByMonth.get(month);

    if (!row) {
      return { month, label, lraManual: null, status: "belum_input" };
    }

    return {
      month,
      label,
      lraManual: row.lra_manual,
      status: deriveStatus(row),
    };
  });

  const summary: OpdDashboardSummary = {
    totalLraManual: months.reduce((sum, m) => sum + (m.lraManual ?? 0), 0),
    totalPeriods: months.length,
    countSesuai: months.filter((m) => m.status === "sesuai").length,
    countSelisih: months.filter((m) => m.status === "selisih").length,
    countBelumInput: months.filter((m) => m.status === "belum_input").length,
    countDraft: months.filter((m) => m.status === "draft").length,
    countSubmitted: months.filter((m) => m.status === "submitted").length,
  };

  return {
    state: "ready",
    opd: { namaOpd: opdResult.data.nama_opd, kodeOpd: opdResult.data.kode_opd },
    fiscalYear,
    months,
    summary,
  };
}
