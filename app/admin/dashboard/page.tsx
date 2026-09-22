import { requireAdmin } from "@/lib/permissions";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Card, CardHeader, CardBody } from "@/components/ui";
import { PageHeader } from "@/components/layout";

/**
 * PHASE 3A PLACEHOLDER ONLY. `requireAdmin()` (existing
 * lib/permissions, not duplicated) is the actual authorization check
 * here — everything below it is just enough UI to verify login,
 * route protection, and logout end-to-end (AUTH-01, 06, 07, 12, 13).
 * The real Admin Dashboard (OPD stats, reconciliation status grid,
 * spec §19) is built in a later phase.
 */
export default async function AdminDashboardPage() {
  const profile = await requireAdmin();

  return (
    <main className="min-h-screen bg-background p-6">
      <PageHeader
        eyebrow="Admin"
        title={`Selamat datang, ${profile.username}`}
        subtitle="Autentikasi berhasil. Dashboard Admin sesungguhnya dibangun pada phase berikutnya."
        actions={<LogoutButton />}
      />
      <Card>
        <CardHeader className="text-sm font-bold text-navy">
          Status Autentikasi (Phase 3A)
        </CardHeader>
        <CardBody className="space-y-1 text-sm text-muted">
          <p>
            Role: <span className="font-semibold text-navy">{profile.role}</span>
          </p>
          <p>
            Username:{" "}
            <span className="font-semibold text-navy">{profile.username}</span>
          </p>
          <p>
            Status akun:{" "}
            <span className="font-semibold text-green">
              {profile.aktif ? "Aktif" : "Nonaktif"}
            </span>
          </p>
        </CardBody>
      </Card>
    </main>
  );
}
