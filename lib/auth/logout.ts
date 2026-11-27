"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { clearSelectedFiscalYear } from "@/lib/auth/fiscal-year";

/**
 * Reusable logout: real supabase.auth.signOut() (invalidates the
 * session server-side, clears the SSR cookies) — never just a
 * frontend state reset. Any page/role can call this the same way via
 * <LogoutButton /> (components/auth/LogoutButton.tsx).
 */
export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  await clearSelectedFiscalYear();
  redirect("/");
}
