"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardBody, CardFooter, Input, Button, Badge } from "@/components/ui";
import { formatRupiah } from "@/lib/format";
import {
  saveAdminValues,
  verifyRecon,
  type CekSelisihDetail,
  type AdminValuesInput,
  type BStatus,
} from "@/lib/cek-selisih/admin";

export interface AdminVerifikasiFormProps {
  initialDetail: CekSelisihDetail;
}

interface FieldState {
  lraSistem: string;
  saldoLaporanPenutupanKas: string;
  saldoSpjFungsionalSistem: string;
  keteranganB1: string;
  keteranganB2: string;
  keteranganC1: string;
  keteranganC2: string;
}

function toFieldState(detail: CekSelisihDetail): FieldState {
  return {
    lraSistem: detail.lraSistem === null ? "" : String(detail.lraSistem),
    saldoLaporanPenutupanKas:
      detail.saldoLaporanPenutupanKas === null ? "" : String(detail.saldoLaporanPenutupanKas),
    saldoSpjFungsionalSistem:
      detail.saldoSpjFungsionalSistem === null ? "" : String(detail.saldoSpjFungsionalSistem),
    keteranganB1: detail.keteranganB1 ?? "",
    keteranganB2: detail.keteranganB2 ?? "",
    keteranganC1: detail.keteranganC1 ?? "",
    keteranganC2: detail.keteranganC2 ?? "",
  };
}

function parseNumeric(raw: string): number | null | typeof NaN {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : NaN;
}

function toInput(fields: FieldState): AdminValuesInput {
  return {
    lraSistem: parseNumeric(fields.lraSistem) as number | null,
    saldoSpjFungsionalSistem: parseNumeric(fields.saldoSpjFungsionalSistem) as number | null,
    saldoLaporanPenutupanKas: parseNumeric(fields.saldoLaporanPenutupanKas) as number | null,
    keteranganB1: fields.keteranganB1.trim() === "" ? null : fields.keteranganB1,
    keteranganB2: fields.keteranganB2.trim() === "" ? null : fields.keteranganB2,
    keteranganC1: fields.keteranganC1.trim() === "" ? null : fields.keteranganC1,
    keteranganC2: fields.keteranganC2.trim() === "" ? null : fields.keteranganC2,
  };
}

function hasNegative(fields: FieldState): boolean {
  return [fields.lraSistem, fields.saldoLaporanPenutupanKas, fields.saldoSpjFungsionalSistem].some(
    (raw) => {
      const n = parseNumeric(raw);
      return typeof n === "number" && n < 0;
    }
  );
}

function hasInvalidNumber(fields: FieldState): boolean {
  return [fields.lraSistem, fields.saldoLaporanPenutupanKas, fields.saldoSpjFungsionalSistem].some(
    (raw) => Number.isNaN(parseNumeric(raw))
  );
}

function hasEmptyNumber(fields: FieldState): boolean {
  return [fields.lraSistem, fields.saldoLaporanPenutupanKas, fields.saldoSpjFungsionalSistem].some(
    (raw) => raw.trim() === ""
  );
}

function StatusTone({ status }: { status: BStatus }) {
  if (status === "SESUAI") return <Badge tone="success">Sesuai</Badge>;
  if (status === "SELISIH") return <Badge tone="danger">Selisih</Badge>;
  return <Badge tone="neutral">—</Badge>;
}

function ReadOnlyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="h-10 rounded-[var(--radius-control)] border border-line bg-soft px-3 py-2 text-sm text-foreground">
        {value}
      </p>
    </div>
  );
}

function KeteranganField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={2}
        className="w-full rounded-[var(--radius-control)] border border-line bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-blue-dark focus:ring-2 focus:ring-blue-mid/30 disabled:bg-soft disabled:text-muted"
      />
    </div>
  );
}

/**
 * Pure editing/review UI. Every number shown as "Selisih"/"Status"
 * comes straight from props (originally recon_summary) — this
 * component never computes B1-C2 itself. Mutations go through
 * saveAdminValues/verifyRecon (Server Actions); identity (reconId)
 * is fixed data from the server, never re-derived from client input.
 */
export function AdminVerifikasiForm({ initialDetail }: AdminVerifikasiFormProps) {
  const router = useRouter();
  const [detail, setDetail] = useState(initialDetail);
  const [fields, setFields] = useState<FieldState>(() => toFieldState(initialDetail));
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; message: string } | null>(
    null
  );
  const [isSaving, startSave] = useTransition();
  const [isVerifying, startVerify] = useTransition();

  const busy = isSaving || isVerifying;
  const canEdit = detail.statusOpd === "SUBMITTED" && detail.statusAdmin !== "VERIFIED";

  function updateField<K extends keyof FieldState>(key: K, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    setFeedback(null);
    if (hasInvalidNumber(fields)) {
      setFeedback({ tone: "danger", message: "Nilai harus berupa angka." });
      return;
    }
    if (hasNegative(fields)) {
      setFeedback({ tone: "danger", message: "Nilai tidak boleh negatif." });
      return;
    }
    startSave(async () => {
      const result = await saveAdminValues(detail.reconId, toInput(fields));
      if (!result.ok) {
        setFeedback({ tone: "danger", message: result.error });
        return;
      }
      setDetail(result.detail);
      setFields(toFieldState(result.detail));
      setFeedback({ tone: "success", message: "Nilai Admin berhasil disimpan." });
      router.refresh();
    });
  }

  function handleVerify() {
    setFeedback(null);
    if (hasEmptyNumber(fields) || hasInvalidNumber(fields)) {
      setFeedback({
        tone: "danger",
        message: "LRA Sistem, Sisa Saldo Laporan Penutupan Kas, dan Sisa Saldo SPJ Fungsional Sistem wajib diisi dengan angka valid sebelum verifikasi.",
      });
      return;
    }
    if (hasNegative(fields)) {
      setFeedback({ tone: "danger", message: "Nilai tidak boleh negatif." });
      return;
    }
    startVerify(async () => {
      const result = await verifyRecon(detail.reconId, toInput(fields));
      if (!result.ok) {
        setFeedback({ tone: "danger", message: result.error });
        return;
      }
      setDetail(result.detail);
      setFields(toFieldState(result.detail));
      setFeedback({
        tone: "success",
        message: `Rekonsiliasi ${detail.bulanLabel ?? ""} ${detail.fiscalYear} berhasil diverifikasi.`,
      });
      router.refresh();
    });
  }

  if (detail.statusOpd !== "SUBMITTED") {
    return (
      <Card>
        <CardBody className="text-sm text-muted">
          OPD belum melakukan submit rekonsiliasi untuk periode ini. Admin belum dapat mengisi
          atau memverifikasi.
        </CardBody>
      </Card>
    );
  }

  const readOnly = !canEdit || busy;

  return (
    <div className="flex flex-col gap-4">
      {feedback && (
        <p
          role="alert"
          className={
            feedback.tone === "success"
              ? "rounded-[var(--radius-control)] bg-green-bg px-3 py-2 text-sm font-medium text-green"
              : "rounded-[var(--radius-control)] bg-red-bg px-3 py-2 text-sm font-medium text-red"
          }
        >
          {feedback.message}
        </p>
      )}

      {detail.statusAdmin === "VERIFIED" && (
        <p className="rounded-[var(--radius-control)] bg-blue-mid/10 px-3 py-2 text-xs text-navy">
          Rekonsiliasi ini sudah <strong>VERIFIED</strong>
          {detail.verifiedAt
            ? ` pada ${new Date(detail.verifiedAt).toLocaleString("id-ID")}`
            : ""}
          . Nilai Admin tidak dapat diubah lagi dari halaman ini.
        </p>
      )}

      {/* B1 */}
      <Card>
        <CardHeader className="text-sm font-bold text-navy">
          B1 — LRA Sistem vs SPJ Fungsional
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Input
            label="LRA Sistem"
            type="number"
            min={0}
            step="0.01"
            value={fields.lraSistem}
            onChange={(e) => updateField("lraSistem", e.target.value)}
            disabled={readOnly}
          />
          <ReadOnlyValue label="SPJ Fungsional" value={formatRupiah(detail.spjFungsional)} />
          <ReadOnlyValue
            label="Selisih"
            value={detail.selisihB1 === null ? "—" : formatRupiah(detail.selisihB1)}
          />
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Status</p>
            <div>
              <StatusTone status={detail.statusB1} />
            </div>
          </div>
          <div className="sm:col-span-2">
            <KeteranganField
              label="Keterangan B1"
              value={fields.keteranganB1}
              onChange={(v) => updateField("keteranganB1", v)}
              disabled={readOnly}
            />
          </div>
        </CardBody>
      </Card>

      {/* B2 */}
      <Card>
        <CardHeader className="text-sm font-bold text-navy">
          B2 — LRA Sistem vs LRA Manual
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <ReadOnlyValue
            label="LRA Sistem"
            value={fields.lraSistem.trim() === "" ? "—" : formatRupiah(Number(fields.lraSistem))}
          />
          <ReadOnlyValue label="LRA Manual" value={formatRupiah(detail.lraManual)} />
          <ReadOnlyValue
            label="Selisih"
            value={detail.selisihB2 === null ? "—" : formatRupiah(detail.selisihB2)}
          />
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Status</p>
            <div>
              <StatusTone status={detail.statusB2} />
            </div>
          </div>
          <div className="sm:col-span-2">
            <KeteranganField
              label="Keterangan B2"
              value={fields.keteranganB2}
              onChange={(v) => updateField("keteranganB2", v)}
              disabled={readOnly}
            />
          </div>
        </CardBody>
      </Card>

      {/* C1 */}
      <Card>
        <CardHeader className="text-sm font-bold text-navy">
          C1 — Sisa Saldo SPJ Fungsional vs Penutupan Kas
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <ReadOnlyValue
            label="Sisa Saldo SPJ Fungsional"
            value={formatRupiah(detail.saldoSpjFungsional)}
          />
          <Input
            label="Sisa Saldo Laporan Penutupan Kas"
            type="number"
            min={0}
            step="0.01"
            value={fields.saldoLaporanPenutupanKas}
            onChange={(e) => updateField("saldoLaporanPenutupanKas", e.target.value)}
            disabled={readOnly}
          />
          <ReadOnlyValue
            label="Selisih"
            value={detail.selisihC1 === null ? "—" : formatRupiah(detail.selisihC1)}
          />
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Status</p>
            <div>
              <StatusTone status={detail.statusC1} />
            </div>
          </div>
          <div className="sm:col-span-2">
            <KeteranganField
              label="Keterangan C1"
              value={fields.keteranganC1}
              onChange={(v) => updateField("keteranganC1", v)}
              disabled={readOnly}
            />
          </div>
        </CardBody>
      </Card>

      {/* C2 */}
      <Card>
        <CardHeader className="text-sm font-bold text-navy">
          C2 — Sisa Saldo SPJ Fungsional Sistem vs Rekening Koran
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Sisa Saldo SPJ Fungsional Sistem"
            type="number"
            min={0}
            step="0.01"
            value={fields.saldoSpjFungsionalSistem}
            onChange={(e) => updateField("saldoSpjFungsionalSistem", e.target.value)}
            disabled={readOnly}
          />
          <ReadOnlyValue label="Rekening Koran" value={formatRupiah(detail.rekeningKoran)} />
          <ReadOnlyValue
            label="Selisih"
            value={detail.selisihC2 === null ? "—" : formatRupiah(detail.selisihC2)}
          />
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Status</p>
            <div>
              <StatusTone status={detail.statusC2} />
            </div>
          </div>
          <div className="sm:col-span-2">
            <KeteranganField
              label="Keterangan C2"
              value={fields.keteranganC2}
              onChange={(v) => updateField("keteranganC2", v)}
              disabled={readOnly}
            />
          </div>
        </CardBody>
        {canEdit && (
          <CardFooter>
            <Button variant="secondary" loading={isSaving} disabled={busy} onClick={handleSave}>
              Simpan
            </Button>
            <Button loading={isVerifying} disabled={busy} onClick={handleVerify}>
              Verifikasi
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
