import { Card, CardBody } from "@/components/ui";

export interface OpdIdentityCardProps {
  namaOpd: string;
  kodeOpd: string | null;
  fiscalYear: number;
}

export function OpdIdentityCard({
  namaOpd,
  kodeOpd,
  fiscalYear,
}: OpdIdentityCardProps) {
  return (
    <Card>
      <CardBody className="grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
            Nama OPD
          </p>
          <p className="mt-1 text-sm font-semibold text-navy">{namaOpd}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
            Kode OPD
          </p>
          <p className="mt-1 text-sm font-semibold text-navy">
            {kodeOpd ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
            Tahun Anggaran
          </p>
          <p className="mt-1 text-sm font-semibold text-navy">{fiscalYear}</p>
        </div>
      </CardBody>
    </Card>
  );
}
