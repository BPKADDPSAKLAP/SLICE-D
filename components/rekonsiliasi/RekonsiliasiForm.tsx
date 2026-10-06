"use client";

import { useActionState, useState } from "react";
import { Button, Input, Card, CardBody } from "@/components/ui";
import { ReconStatusBadge } from "@/components/dashboard";
import { formatRupiah } from "@/lib/format";
import {
  saveDraftAction,
  submitAction,
  type ReconActionState,
} from "@/lib/rekonsiliasi/actions";
import type { ReconFieldValues } from "@/lib/rekonsiliasi/opd";

export interface RekonsiliasiFormProps {
  month: number;
  status: "belum_input" | "draft" | "submitted";
  initialValues: ReconFieldValues | null;
  submittedAt: string | null;
}

interface FieldConfig {
  name: "lra_manual" | "spj_fungsional" | "saldo_spj_fungsional" | "rekening_koran";
  label: string;
  key: keyof ReconFieldValues;
}

const FIELDS: FieldConfig[] = [
  { name: "lra_manual", label: "LRA Manual", key: "lraManual" },
  { name: "spj_fungsional", label: "SPJ Fungsional", key: "spjFungsional" },
  {
    name: "saldo_spj_fungsional",
    label: "Sisa Saldo SPJ Fungsional",
    key: "saldoSpjFungsional",
  },
  { name: "rekening_koran", label: "Rekening Koran", key: "rekeningKoran" },
];

const initialReconActionState: ReconActionState = { error: null, message: null };

function toInputDefault(value: number | undefined | null): string {
  return value === undefined || value === null ? "" : String(value);
}

/**
 * Small live "= Rp ..." preview under each amount field. The input
 * itself stays a plain numeric field (type=number) so it's directly
 * typeable/validated by the browser; formatRupiah() (lib/format.ts,
 * Phase 3C.1) is only used for this read-only preview, never to
 * reformat the field's own value or to change what's submitted.
 */
function AmountField({
  field,
  defaultValue,
  readOnly,
  error,
}: {
  field: FieldConfig;
  defaultValue: string;
  readOnly: boolean;
  error?: string;
}) {
  const [preview, setPreview] = useState(() => {
    const n = Number(defaultValue);
    return defaultValue !== "" && Number.isFinite(n) ? formatRupiah(n) : null;
  });

  return (
    <div>
      <Input
        label={field.label}
        name={field.name}
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        defaultValue={defaultValue}
        disabled={readOnly}
        readOnly={readOnly}
        error={error}
        onChange={(e) => {
          const raw = e.target.value;
          const n = Number(raw);
          setPreview(raw !== "" && Number.isFinite(n) && n >= 0 ? formatRupiah(n) : null);
        }}
      />
      {preview && !error && (
        <p className="mt-1 text-xs text-muted">≈ {preview}</p>
      )}
    </div>
  );
}

export function RekonsiliasiForm({
  month,
  status,
  initialValues,
  submittedAt,
}: RekonsiliasiFormProps) {
  const [draftState, draftFormAction, draftPending] = useActionState<
    ReconActionState,
    FormData
  >(saveDraftAction, initialReconActionState);
  const [submitState, submitFormAction, submitPending] = useActionState<
    ReconActionState,
    FormData
  >(submitAction, initialReconActionState);

  const [lastAction, setLastAction] = useState<"draft" | "submit" | null>(null);

  const readOnly = status === "submitted";
  const anyPending = draftPending || submitPending;
  // Each useActionState hook keeps its own state independently, so
  // after both actions have been tried at least once, the "other"
  // hook's state is stale. lastAction (set on click, before the
  // action itself runs) picks the right one to display instead of
  // guessing from message/error presence. The authoritative flip to
  // read-only after a successful submit comes from the server
  // re-rendering this page with status="submitted" (see key on the
  // call site in app/opd/rekonsiliasi/page.tsx), not from this state.
  const activeState =
    lastAction === "submit" ? submitState : lastAction === "draft" ? draftState : null;

  return (
    <Card>
      <CardBody className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ReconStatusBadge status={status} />
          {readOnly && submittedAt && (
            <p className="text-xs text-muted">
              Disubmit pada {new Date(submittedAt).toLocaleString("id-ID")}
            </p>
          )}
        </div>

        {activeState?.error && (
          <p
            role="alert"
            className="rounded-[var(--radius-control)] bg-red-bg px-3 py-2 text-xs font-medium text-red"
          >
            {activeState.error}
          </p>
        )}
        {activeState?.message && !activeState.error && (
          <p
            role="status"
            className="rounded-[var(--radius-control)] bg-green-bg px-3 py-2 text-xs font-medium text-green"
          >
            {activeState.message}
          </p>
        )}

        <form className="flex flex-col gap-5">
          <input type="hidden" name="reporting_month" value={month} />

          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((field) => (
              <AmountField
                key={field.name}
                field={field}
                defaultValue={toInputDefault(initialValues?.[field.key])}
                readOnly={readOnly}
                error={activeState?.fieldErrors?.[field.name]}
              />
            ))}
          </div>

          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                formAction={draftFormAction}
                variant="secondary"
                disabled={anyPending}
                loading={draftPending}
                onClick={() => setLastAction("draft")}
              >
                Simpan Draft
              </Button>
              <Button
                type="submit"
                formAction={submitFormAction}
                disabled={anyPending}
                loading={submitPending}
                onClick={() => setLastAction("submit")}
              >
                Submit Rekonsiliasi
              </Button>
            </div>
          )}
        </form>

        {status === "belum_input" && !readOnly && (
          <p className="text-xs text-muted">
            Belum ada data untuk periode ini. Isi form di atas lalu simpan sebagai draft,
            atau langsung submit jika sudah final.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
