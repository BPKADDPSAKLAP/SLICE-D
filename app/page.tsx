import Image from "next/image";
import { LoginForm } from "@/components/forms/login-form";

/**
 * Landing page = login page (spec §5).
 *
 * PHASE 1 SCOPE: visual shell only. The <LoginForm /> below renders the
 * three required fields (username, password, tahun anggaran) but does
 * not yet call Supabase Auth — that wiring, the synthetic-email
 * lookup, and the role-based redirect (/admin/dashboard vs
 * /opd/dashboard) are built in PHASE 3 (Authentication), once
 * PHASE 2 (Supabase database: profiles, fiscal_years) exists.
 */
export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-navy px-4">
      {/* subtle vignette, echoes the legacy login screen without the
          heavy texture/animation so it stays fast and accessible */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(107,140,184,0.35), transparent 60%)",
        }}
      />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-8 rounded-xl bg-white px-8 py-10 shadow-2xl">
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

        <LoginForm />

        <p className="text-center text-[11px] leading-relaxed text-muted">
          Badan Pengelolaan Keuangan dan Aset Daerah
          <br />
          Kota Denpasar
        </p>
      </div>
    </main>
  );
}
