import { Badge, type BadgeProps } from "@/components/ui";
import type { ReconOverallStatus } from "@/lib/cek-selisih/admin";

/**
 * Tone/label mapping lives here (component-level decision, not in
 * Badge.tsx or in the data layer — same convention as
 * components/dashboard/ReconStatusBadge). Labels are Admin-specific:
 * the same underlying SUBMITTED+PENDING state reads "Menunggu Cek"
 * here, vs "Submitted" on the OPD side — different audience, same data.
 */
const STATUS_META: Record<ReconOverallStatus, { label: string; tone: BadgeProps["tone"] }> = {
  belum_input: { label: "Belum Input", tone: "neutral" },
  draft: { label: "Draft", tone: "warning" },
  menunggu_cek: { label: "Menunggu Cek", tone: "info" },
  sesuai: { label: "Sesuai", tone: "success" },
  selisih: { label: "Selisih", tone: "danger" },
};

export function OverallStatusBadge({ status }: { status: ReconOverallStatus }) {
  const meta = STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
