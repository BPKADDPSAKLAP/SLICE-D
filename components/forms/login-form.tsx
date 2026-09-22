"use client";

import { useState } from "react";

/**
 * PHASE 1: presentational only. onSubmit is a stub — real
 * authentication (Supabase Auth sign-in with the synthetic internal
 * email built from `username`, then redirect by role) is wired in
 * PHASE 3 once `profiles` and `fiscal_years` exist (PHASE 2).
 */
export function LoginForm() {
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      className="flex w-full flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitting(true);
        // TODO (Phase 3): call server action -> supabase.auth.signInWithPassword
        // using the synthetic email for `username`, then redirect based on
        // profiles.role.
        setSubmitting(false);
      }}
    >
      <Field label="Username" name="username" autoComplete="username" />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
      />
      <div className="flex flex-col gap-1">
        <label
          htmlFor="fiscal_year"
          className="text-xs font-semibold uppercase tracking-wide text-muted"
        >
          Tahun Anggaran
        </label>
        <select
          id="fiscal_year"
          name="fiscal_year"
          required
          className="h-10 rounded-md border border-line bg-white px-3 text-sm text-foreground outline-none focus:border-blue-dark focus:ring-2 focus:ring-blue-mid/30"
          defaultValue=""
        >
          <option value="" disabled>
            Pilih tahun anggaran
          </option>
          {/* PHASE 2+: populate from `fiscal_years` table */}
        </select>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 h-10 rounded-md bg-navy text-sm font-semibold text-white transition hover:bg-navy-2 disabled:opacity-60"
      >
        {submitting ? "Memproses…" : "Masuk"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={name}
        className="text-xs font-semibold uppercase tracking-wide text-muted"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        className="h-10 rounded-md border border-line bg-white px-3 text-sm text-foreground outline-none focus:border-blue-dark focus:ring-2 focus:ring-blue-mid/30"
      />
    </div>
  );
}
