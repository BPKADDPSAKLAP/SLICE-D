"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui";
import { MONTH_OPTIONS } from "@/lib/rekonsiliasi/constants";

export interface PeriodSelectProps {
  month: number;
  disabled?: boolean;
}

/**
 * Only ever navigates to ?bulan=<1-12> on this same page — never
 * carries opd_id or fiscal_year (those aren't in the URL at all,
 * they come from the session on the server for every render).
 */
export function PeriodSelect({ month, disabled }: PeriodSelectProps) {
  const router = useRouter();

  return (
    <Select
      label="Periode"
      value={String(month)}
      options={MONTH_OPTIONS}
      disabled={disabled}
      onChange={(e) => {
        router.push(`/opd/rekonsiliasi?bulan=${e.target.value}`);
      }}
      className="max-w-xs"
    />
  );
}
