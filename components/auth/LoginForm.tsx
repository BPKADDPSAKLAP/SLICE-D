"use client";

import { useActionState } from "react";
import { Button, Input, Select, type SelectOption } from "@/components/ui";
import { loginAction, type LoginState } from "@/lib/auth/login";

export interface LoginFormProps {
  /**
   * Active fiscal years from public.fiscal_years, fetched by the
   * server component that renders this form — this component has no
   * Supabase access of its own (spec §8: never hardcoded).
   */
  fiscalYears: SelectOption[];
  /** Pre-selected when exactly one fiscal year is active (spec §3). */
  defaultFiscalYear?: string;
}

const initialState: LoginState = { error: null };

/**
 * PHASE 3A: wired to the real `loginAction` Server Action via
 * useActionState — Supabase Auth does the actual password check
 * server-side; this component only owns pending/error UI state.
 * Still composed entirely from components/ui (Input/Select/Button),
 * per the standing design-system rule.
 */
export function LoginForm({ fiscalYears, defaultFiscalYear }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState
  );
  const noFiscalYears = fiscalYears.length === 0;

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      {state.error && (
        <p
          role="alert"
          className="rounded-[var(--radius-control)] bg-red-bg px-3 py-2 text-xs font-medium text-red"
        >
          {state.error}
        </p>
      )}

      <Input
        label="Username"
        name="username"
        autoComplete="username"
        required
        disabled={pending}
      />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        disabled={pending}
      />
      <Select
        label="Tahun Anggaran"
        name="fiscal_year"
        placeholder={noFiscalYears ? undefined : "Pilih tahun anggaran"}
        options={fiscalYears}
        defaultValue={defaultFiscalYear}
        required
        disabled={pending || noFiscalYears}
        error={
          noFiscalYears ? "Tidak ada tahun anggaran aktif saat ini." : undefined
        }
      />

      <Button
        type="submit"
        loading={pending}
        disabled={noFiscalYears}
        className="mt-2"
      >
        Masuk
      </Button>
    </form>
  );
}
