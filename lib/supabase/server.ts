import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Supabase client for use in Server Components, Route Handlers, and
 * Server Actions. Reads/writes the auth session via Next.js cookies.
 * RLS is enforced by Postgres using the caller's JWT — this client
 * NEVER bypasses RLS. For privileged operations (e.g. admin password
 * reset) use lib/supabase/admin.ts explicitly and only from trusted
 * server-side code paths that have already verified the caller is an
 * admin via is_admin().
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component — safe to ignore
            // because middleware refreshes the session on every request.
          }
        },
      },
    }
  );
}
