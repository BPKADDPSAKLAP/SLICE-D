import Image from "next/image";
import { LoginForm } from "@/components/auth/LoginForm";
import { Card, type SelectOption } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing page = login page (spec §5).
 *
 * PHASE 3A: fiscal years now come from `public.fiscal_years` (RLS
 * grants anon SELECT on active=true rows specifically so this
 * unauthenticated page can populate the dropdown — see Phase 2
 * migration 0015). `error` query param is set by proxy.ts when a
 * still-logged-in session is force-signed-out (profile missing or
 * deactivated after login) — never a raw database error.
 */
const ERROR_MESSAGES: Record<string, string> = {
  inactive: "Akun Anda tidak aktif. Silakan hubungi administrator.",
  no_profile: "Profil pengguna belum tersedia. Hubungi administrator.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const bannerMessage = error ? ERROR_MESSAGES[error] : undefined;

  const supabase = await createClient();
  const { data: fiscalYearRows, error: fyError } = await supabase
    .from("fiscal_years")
    .select("year")
    .eq("active", true)
    .order("year", { ascending: false });

  const fiscalYears: SelectOption[] = (fiscalYearRows ?? []).map((fy) => ({
    value: String(fy.year),
    label: String(fy.year),
  }));
  const defaultFiscalYear =
    fiscalYears.length === 1 ? fiscalYears[0].value : undefined;
  const loadError = fyError
    ? "Terjadi kesalahan saat memuat tahun anggaran."
    : undefined;

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-navy px-4">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(107,140,184,0.35), transparent 60%)",
        }}
      />

      <Card className="relative z-10 flex w-full max-w-sm flex-col items-center gap-8 border-none px-8 py-10 shadow-2xl">
        <div className="flex flex-col items-center gap-3 text-center">
          <Image
            src="/images/logo-denpasar.png"
            alt="Logo Kota Denpasar"
            width={56}
            height={56}
            priority
          />
          <div>
            <h1 className="text-lg font-bold tracking-wide text-navy">
              SLICE-D
            </h1>
            <p className="text-xs text-muted">
              Sistem Layanan Informasi Cerdas Denpasar
            </p>
          </div>
        </div>

        {(bannerMessage || loadError) && (
          <p
            role="alert"
            className="-mt-4 w-full rounded-[var(--radius-control)] bg-red-bg px-3 py-2 text-center text-xs font-medium text-red"
          >
            {bannerMessage ?? loadError}
          </p>
        )}

        <LoginForm
          fiscalYears={fiscalYears}
          defaultFiscalYear={defaultFiscalYear}
        />

        <p className="text-center text-[11px] leading-relaxed text-muted">
          Badan Pengelolaan Keuangan dan Aset Daerah
          <br />
          Kota Denpasar
        </p>
      </Card>
    </main>
  );
}
