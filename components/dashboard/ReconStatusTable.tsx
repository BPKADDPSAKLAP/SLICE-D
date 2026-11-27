import { TableRoot, Table, THead, TBody, TR, TH, TD } from "@/components/ui";
import { ReconStatusBadge } from "./ReconStatusBadge";
import { formatRupiah } from "@/lib/format";
import type { MonthlyReconRow } from "@/lib/dashboard/opd";

export interface ReconStatusTableProps {
  months: MonthlyReconRow[];
}

/**
 * Renders whatever `months` it's given — always expects exactly 12
 * rows (Januari-Desember) already synthesized by
 * lib/dashboard/opd.ts, "belum_input" months included. Does not
 * query Supabase and does not know what a fiscal year or an OPD is.
 */
export function ReconStatusTable({ months }: ReconStatusTableProps) {
  return (
    <TableRoot>
      <Table>
        <THead>
          <TR>
            <TH>Periode</TH>
            <TH className="text-right">LRA Manual</TH>
            <TH>Status</TH>
          </TR>
        </THead>
        <TBody>
          {months.map((m) => (
            <TR key={m.month}>
              <TD>{m.label}</TD>
              <TD className="text-right tabular-nums">
                {m.lraManual === null ? "—" : formatRupiah(m.lraManual)}
              </TD>
              <TD>
                <ReconStatusBadge status={m.status} />
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </TableRoot>
  );
}
