/**
 * Pure formatting helper, no side effects — safe to import from any
 * layer (data-access, presentational components, either server or
 * client). Not tied to Supabase or any specific feature.
 */
export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
