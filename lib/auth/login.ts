"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { usernameToInternalEmail } from "@/lib/auth/internal-email";
import { setSelectedFiscalYear } from "@/lib/auth/fiscal-year";

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
  fiscal_year: z.coerce.number().int(),
});

export type LoginState = { error: string | null };

/**
 * Login flow (spec §4):
 *  1-2. validate input (zod)
 *  3.   build the synthetic internal email for this username
 *  4.   supabase.auth.signInWithPassword — Supabase Auth is the only
 *       place a password is ever checked
 *  5-6. load public.profiles for the authenticated user, require it
 *       to exist and be active
 *  7.   role decides the redirect target
 *  8.   fiscal year saved to a server-side cookie (see
 *       lib/auth/fiscal-year.ts) — never localStorage
 *
 * Every failure path returns a single human-readable message and
 * never leaks which part failed (matches spec §9 — "username atau
 * password" stays generic so this endpoint can't be used to enumerate
 * valid usernames).
 */
export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    fiscal_year: formData.get("fiscal_year"),
  });

  if (!parsed.success) {
    return { error: "Username, password, dan tahun anggaran wajib diisi." };
  }

  const { username, password, fiscal_year } = parsed.data;
  const supabase = await createClient();

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email: usernameToInternalEmail(username),
      password,
    });

  if (authError || !authData.user) {
    return { error: "Username atau password tidak benar." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, aktif")
    .eq("id", authData.user.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return { error: "Profil pengguna belum tersedia. Hubungi administrator." };
  }

  if (!profile.aktif) {
    await supabase.auth.signOut();
    return {
      error: "Akun Anda tidak aktif. Silakan hubungi administrator.",
    };
  }

  // The <select> value is client input — never trusted as-is. The
  // frontend already filters to active=true (app/page.tsx), but that
  // is a UX convenience, not a guarantee: the option list could be
  // stale (year deactivated between page load and submit) or the
  // request could be forged entirely. Re-check against the database,
  // through the same RLS-governed client, before persisting anything.
  const { data: fiscalYear, error: fiscalYearError } = await supabase
    .from("fiscal_years")
    .select("year")
    .eq("year", fiscal_year)
    .eq("active", true)
    .maybeSingle();

  if (fiscalYearError) {
    return { error: "Terjadi kesalahan saat memvalidasi tahun anggaran." };
  }
  if (!fiscalYear) {
    return { error: "Tahun anggaran yang dipilih tidak tersedia." };
  }

  await setSelectedFiscalYear(fiscalYear.year);

  redirect(profile.role === "admin" ? "/admin/dashboard" : "/opd/dashboard");
}
