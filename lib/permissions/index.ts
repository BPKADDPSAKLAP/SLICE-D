import "server-only";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type AppRole = "admin" | "opd";

export type CurrentProfile = {
  id: string;
  username: string;
  role: AppRole;
  opd_id: string | null;
  aktif: boolean;
  must_change_password: boolean;
};

/**
 * Loads the current authenticated user's profile. This is a
 * convenience/UX helper for server code — it is NOT the security
 * boundary. RLS policies (see supabase/migrations) are what actually
 * stop a user from reading/writing another OPD's data, even if this
 * helper is bypassed or misused.
 */
export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, role, opd_id, aktif, must_change_password")
    .eq("id", user.id)
    .single();

  return profile as CurrentProfile | null;
}

/** Server Action / Route Handler guard: throws the user back to login. */
export async function requireProfile(): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.aktif) redirect("/");
  return profile;
}

export async function requireAdmin(): Promise<CurrentProfile> {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/opd/dashboard");
  return profile;
}

export async function requireOpd(): Promise<CurrentProfile> {
  const profile = await requireProfile();
  if (profile.role !== "opd") redirect("/admin/dashboard");
  return profile;
}
