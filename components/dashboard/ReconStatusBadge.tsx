import { Badge, type BadgeProps } from "@/components/ui";
import type { MonthlyStatus } from "@/lib/dashboard/opd";

const STATUS_META: Record<MonthlyStatus, { label: string; tone: BadgeProps["tone"] }> = {
  belum_input: { label: "Belum Input", tone: "neutral" },
  draft: { label: "Draft", tone: "warning" },
  submitted: { label: "Submitted", tone: "info" },
  sesuai: { label: "Sesuai", tone: "success" },
  selisih: { label: "Selisih", tone: "danger" },
};

export function ReconStatusBadge({ status }: { status: MonthlyStatus }) {
  const meta = STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
