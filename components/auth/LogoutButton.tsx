import { Button } from "@/components/ui";
import { logoutAction } from "@/lib/auth/logout";

/**
 * Drop this into any Topbar/PageHeader `actions` slot regardless of
 * role — it always calls the same real logoutAction (spec §11).
 */
export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="ghost" size="sm">
        Keluar
      </Button>
    </form>
  );
}
