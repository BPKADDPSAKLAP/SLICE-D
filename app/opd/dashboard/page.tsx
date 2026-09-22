import { requireOpd } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Card, CardHeader, CardBody } from "@/components/ui";
import { PageHeader } from "@/components/layout";

/**
 * PHASE 3A PLACEHOLDER ONLY. `requireOpd()` (existing lib/permissions)
 * is the actual authorization check. The OPD name below is resolved
 * from the authenticated profile's `opd_id` — never from a URL/query
 * parameter (spec §7, AUTH-15) — which is the one thing worth
 * demonstrating here. Real OPD Dashboard content (status per bulan,
 * total LRA Manual, spec §10) is built in a later phase.
 */
export default async function OpdDashboardPage() {
  const profile = await requireOpd();
  const supabase = await createClient();

  const { data: opd } = profile.opd_id
    ? await supabase
        .from("opd_master")
        .select("nama_opd")
        .eq("id", profile.opd_id)
        .single()
    : { data: null };

  return (
    <main className="min-h-screen bg-background p-6">
      <PageHeader
        eyebrow="OPD"
        title={`Selamat datang, ${profile.username}`}
        subtitle="Autentikasi berhasil. Dashboard OPD sesungguhnya dibangun pada phase berikutnya."
        actions={<LogoutButton />}
      />
      <Card>
        <CardHeader className="text-sm font-bold text-navy">
          Status Autentikasi (Phase 3A)
        </CardHeader>
        <CardBody className="space-y-1 text-sm text-muted">
          <p>
            OPD:{" "}
            <span className="font-semibold text-navy">
              {opd?.nama_opd ?? "—"}
            </span>
          </p>
          <p>
            Role: <span className="font-semibold text-navy">{profile.role}</span>
          </p>
          <p className="text-xs">
            Ditentukan dari{" "}
            <code className="rounded bg-soft px-1 py-0.5">
              profile.opd_id
            </code>
            , bukan query parameter.
          </p>
        </CardBody>
      </Card>
    </main>
  );
}
