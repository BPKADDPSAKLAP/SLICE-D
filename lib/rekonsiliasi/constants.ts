import type { SelectOption } from "@/components/ui";

/**
 * Deliberately its own tiny module with zero server-only dependencies
 * (no "server-only", no next/headers, no Supabase client). Anything
 * imported here is safe from both Server and Client Components.
 *
 * Local to this module on purpose: lib/dashboard/opd.ts (Phase 3C.1,
 * already shipped/tagged) has its own identical list but doesn't
 * export it, and that file isn't touched here to avoid any risk to
 * an already-reviewed/tagged phase. Twelve static strings is a small,
 * safe duplication versus modifying shipped code for this.
 */
export const MONTH_LABELS = [
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
] as const;

export function monthLabel(month: number): string {
  return MONTH_LABELS[month - 1] ?? String(month);
}

export const MONTH_OPTIONS: SelectOption[] = MONTH_LABELS.map(
  (label, idx) => ({ value: String(idx + 1), label })
);
