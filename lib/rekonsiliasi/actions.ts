"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireOpd } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getSelectedFiscalYear } from "@/lib/auth/fiscal-year";
import { monthLabel } from "@/lib/rekonsiliasi/constants";

export type ReconActionState = {
  error: string | null;
  message: string | null;
  fieldErrors?: Partial<
    Record<"lra_manual" | "spj_fungsional" | "saldo_spj_fungsional" | "rekening_koran", string>
  >;
};

const AMOUNT_FIELDS = [
  "lra_manual",
  "spj_fungsional",
  "saldo_spj_fungsional",
  "rekening_koran",
] as const;
type AmountField = (typeof AMOUNT_FIELDS)[number];

const monthSchema = z.coerce.number().int().min(1).max(12);

type ParsedAmount =
  | { ok: true; value: number }
  | { ok: false; empty: true }
  | { ok: false; empty: false };

/**
 * Deliberately does NOT use `if (!value)` — that would treat an
 * explicitly-entered 0 as missing, which spec forbids. Empty vs.
 * "not a valid non-negative number" are distinguished so Draft (empty
 * allowed) and Submit (empty rejected) can each apply their own rule
 * from the same parse.
 */
function parseAmount(raw: FormDataEntryValue | null): ParsedAmount {
  if (raw === null || String(raw).trim() === "") {
    return { ok: false, empty: true };
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    return { ok: false, empty: false };
  }
  return { ok: true, value };
}

/**
 * Re-validates session + role + opd_id + fiscal year (including
 * active/open_for_entry) from scratch — this Server Action is a
 * separate request context from the page that rendered the form, so
 * nothing about identity is trusted from the submitted FormData
 * except reporting_month and the four amount fields themselves.
 *
 * Creates the one Supabase client used for the rest of the action
 * (both the fiscal_years check here and the header/values writes in
 * the caller), rather than each call site creating its own.
 */
async function resolveContext(formData: FormData) {
  const profile = await requireOpd();

  if (!profile.opd_id) {
    return {
      error:
        "Akun Anda belum terhubung ke OPD manapun. Hubungi administrator." as const,
    };
  }

  const fiscalYear = await getSelectedFiscalYear();
  if (!fiscalYear) {
    return {
      error:
        "Tahun anggaran tidak ditemukan pada sesi Anda. Silakan keluar dan login kembali." as const,
    };
  }

  const monthParsed = monthSchema.safeParse(formData.get("reporting_month"));
  if (!monthParsed.success) {
    return { error: "Periode bulan tidak valid." as const };
  }

  const supabase = await createClient();

  // REVISION 1: mutations (Simpan Draft / Submit) additionally require
  // the fiscal year to be active AND open_for_entry — checked here so
  // both actions share one place for this rule. Note: RLS
  // (fiscal_years_select_active_public) already hides inactive years
  // from a non-admin caller entirely, so `!fiscalYearRow` covers
  // "inactive" too; open_for_entry is a plain column check on top of
  // that, unaffected by RLS.
  const { data: fiscalYearRow, error: fiscalYearError } = await supabase
    .from("fiscal_years")
    .select("active, open_for_entry")
    .eq("year", fiscalYear)
    .maybeSingle();

  if (fiscalYearError) {
    return { error: "Gagal memeriksa status tahun anggaran." as const };
  }
  if (!fiscalYearRow || !fiscalYearRow.active || !fiscalYearRow.open_for_entry) {
    return {
      error: "Tahun anggaran tidak sedang dibuka untuk input rekonsiliasi." as const,
    };
  }

  return {
    supabase,
    opdId: profile.opd_id,
    fiscalYear,
    month: monthParsed.data,
  };
}

/**
 * Finds the recon_headers row for opd+fiscal_year+month, creating one
 * (status_opd defaults to DRAFT) if it doesn't exist yet. Returns an
 * error if the existing row is already SUBMITTED — the database
 * trigger enforces this too, but failing here first avoids a raw
 * Postgres exception message reaching the user.
 */
async function findOrCreateDraftHeader(
  supabase: Awaited<ReturnType<typeof createClient>>,
  opdId: string,
  fiscalYear: number,
  month: number
): Promise<{ reconId: string } | { error: string }> {
  const { data: existing, error: findError } = await supabase
    .from("recon_headers")
    .select("id, status_opd")
    .eq("opd_id", opdId)
    .eq("fiscal_year", fiscalYear)
    .eq("reporting_month", month)
    .maybeSingle();

  if (findError) {
    return { error: "Gagal memeriksa data rekonsiliasi yang sudah ada." };
  }

  if (existing?.status_opd === "SUBMITTED") {
    return {
      error: "Rekonsiliasi periode ini sudah disubmit dan tidak dapat diubah.",
    };
  }

  if (existing) {
    return { reconId: existing.id };
  }

  const { data: created, error: insertError } = await supabase
    .from("recon_headers")
    .insert({
      opd_id: opdId,
      fiscal_year: fiscalYear,
      reporting_month: month,
      status_opd: "DRAFT",
    })
    .select("id")
    .single();

  if (insertError || !created) {
    return { error: "Gagal membuat data rekonsiliasi baru." };
  }

  return { reconId: created.id };
}

export async function saveDraftAction(
  _prevState: ReconActionState,
  formData: FormData
): Promise<ReconActionState> {
  const context = await resolveContext(formData);
  if ("error" in context && typeof context.error === "string") {
  return { error: context.error, message: null };
}
  const { supabase, opdId, fiscalYear, month } = context;

  const fieldErrors: ReconActionState["fieldErrors"] = {};
  const amounts: Record<AmountField, number> = {
    lra_manual: 0,
    spj_fungsional: 0,
    saldo_spj_fungsional: 0,
    rekening_koran: 0,
  };

  for (const field of AMOUNT_FIELDS) {
    const parsed = parseAmount(formData.get(field));
    if (parsed.ok) {
      amounts[field] = parsed.value;
    } else if (!parsed.empty) {
      // Draft allows a blank field, but a field that has *something*
      // invalid in it (negative, non-numeric) is always rejected.
      fieldErrors[field] = "Nilai harus berupa angka dan tidak boleh negatif.";
    }
    // parsed.empty === true on Draft: leave amounts[field] at 0 —
    // recon_opd_values columns are NOT NULL default 0, so an
    // untouched field is stored as 0 (itself a valid value per spec),
    // never as a fabricated non-zero number.
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      error: "Periksa kembali nilai yang Anda masukkan.",
      message: null,
      fieldErrors,
    };
  }

  const header = await findOrCreateDraftHeader(supabase, opdId, fiscalYear, month);
  if ("error" in header) {
    return { error: header.error, message: null };
  }

  const { error: upsertError } = await supabase.from("recon_opd_values").upsert(
    {
      recon_id: header.reconId,
      lra_manual: amounts.lra_manual,
      spj_fungsional: amounts.spj_fungsional,
      saldo_spj_fungsional: amounts.saldo_spj_fungsional,
      rekening_koran: amounts.rekening_koran,
    },
    { onConflict: "recon_id" }
  );

  if (upsertError) {
    return { error: "Gagal menyimpan draft. Silakan coba lagi.", message: null };
  }

  revalidatePath("/opd/rekonsiliasi");
  return { error: null, message: "Draft berhasil disimpan." };
}

export async function submitAction(
  _prevState: ReconActionState,
  formData: FormData
): Promise<ReconActionState> {
  const context = await resolveContext(formData);
  if ("error" in context && typeof context.error === "string") {
  return { error: context.error, message: null };
}
  const { supabase, opdId, fiscalYear, month } = context;

  const fieldErrors: ReconActionState["fieldErrors"] = {};
  const amounts: Record<AmountField, number> = {
    lra_manual: 0,
    spj_fungsional: 0,
    saldo_spj_fungsional: 0,
    rekening_koran: 0,
  };

  for (const field of AMOUNT_FIELDS) {
    const parsed = parseAmount(formData.get(field));
    if (parsed.ok) {
      amounts[field] = parsed.value;
    } else if (parsed.empty) {
      // Submit requires all four fields explicitly filled — 0 typed
      // in is fine (parsed.ok above), a blank field is not.
      fieldErrors[field] = "Wajib diisi.";
    } else {
      fieldErrors[field] = "Nilai harus berupa angka dan tidak boleh negatif.";
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      error: "Semua field wajib diisi dengan nilai yang valid sebelum submit.",
      message: null,
      fieldErrors,
    };
  }

  const header = await findOrCreateDraftHeader(supabase, opdId, fiscalYear, month);
  if ("error" in header) {
    return { error: header.error, message: null };
  }

  const now = new Date().toISOString();

  // Order matters (spec: values must be saved before the header is
  // marked SUBMITTED): this upsert happens first, while the header
  // row is still DRAFT, before the status update below.
  const { error: upsertError } = await supabase.from("recon_opd_values").upsert(
    {
      recon_id: header.reconId,
      lra_manual: amounts.lra_manual,
      spj_fungsional: amounts.spj_fungsional,
      saldo_spj_fungsional: amounts.saldo_spj_fungsional,
      rekening_koran: amounts.rekening_koran,
      submitted_at: now,
    },
    { onConflict: "recon_id" }
  );

  if (upsertError) {
    return { error: "Gagal menyimpan nilai rekonsiliasi.", message: null };
  }

  const { error: statusError } = await supabase
    .from("recon_headers")
    .update({ status_opd: "SUBMITTED", submitted_at: now })
    .eq("id", header.reconId);

  if (statusError) {
    // Values are already saved (upsert above succeeded) and
    // status_opd in the database is still DRAFT — this action never
    // returns a success message in this branch, so the UI cannot show
    // "Submitted" for a row that's actually still DRAFT. Revalidate
    // explicitly so the next render re-reads the true DB state (saved
    // values, status still DRAFT) and the form stays editable, ready
    // for the user to try Submit again.
    revalidatePath("/opd/rekonsiliasi");
    return {
      error:
        "Nilai tersimpan, tetapi gagal mengubah status menjadi Submitted. Silakan coba submit kembali.",
      message: null,
    };
  }

  revalidatePath("/opd/rekonsiliasi");
  return {
    error: null,
    message: `Rekonsiliasi ${monthLabel(month)} ${fiscalYear} berhasil disubmit.`,
  };
}
