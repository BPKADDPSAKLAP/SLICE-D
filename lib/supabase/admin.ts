import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service-role Supabase client. BYPASSES RLS.
 *
 * server-only import guard ensures a bundling mistake that pulls this
 * into a Client Component fails the build instead of leaking the
 * secret key to the browser.
 *
 * Use ONLY for operations that legitimately require bypassing RLS
 * (e.g. Admin resetting another user's password via Supabase Auth
 * Admin API). Every call site MUST first verify the caller is an
 * authenticated admin (see lib/permissions) before using this client.
 * Never call this from a Client Component or expose it via an API
 * route without an explicit admin check.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
