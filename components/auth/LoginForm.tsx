"use client";

import { useState } from "react";
import { Button, Input, Select, type SelectOption } from "@/components/ui";

export interface LoginFormProps {
  /**
   * Fiscal years to offer in the select. Populated by the server
   * component that renders this form (from the `fiscal_years` table,
   * once Phase 2 exists) — this component has no Supabase access of
   * its own.
   */
  fiscalYears?: SelectOption[];
}

/**
 * PHASE 1: presentational only, composed entirely from components/ui
 * primitives (Input, Select, Button) — no ad-hoc styling here.
 *
 * Auth wiring (Server Action calling supabase.auth.signInWithPassword
 * with the synthetic internal email, then redirect by role) is added
 * in PHASE 3 as a separate `lib/auth/login.ts` action passed in via
 * `action` — this component's job stays limited to layout + state.
 */
export function LoginForm({ fiscalYears = [] }: LoginFormProps) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      className="flex w-full flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitting(true);
        // TODO (Phase 3): call a Server Action from lib/auth here.
        setSubmitting(false);
      }}
    >
      <Input label="Username" name="username" autoComplete="username" required />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <Select
        label="Tahun Anggaran"
        name="fiscal_year"
        placeholder="Pilih tahun anggaran"
        options={fiscalYears}
        required
      />
      <Button type="submit" loading={submitting} className="mt-2">
        Masuk
      </Button>
    </form>
  );
}
