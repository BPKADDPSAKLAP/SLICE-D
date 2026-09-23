import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

/**
 * Refreshes the Supabase auth session on every request and enforces
 * coarse route protection (unauthenticated -> /, wrong role -> own
 * dashboard). Fine-grained data access is still enforced by RLS in
 * Postgres — this is a UX guard, not the security boundary.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  /**
   * A plain `NextResponse.redirect(url)` is a brand-new response
   * object — it does NOT inherit whatever cookies `setAll` above
   * already wrote onto `supabaseResponse` (a rotated session token
   * from `getUser()`, or the cleared session cookies from
   * `signOut()`). Every redirect in this function MUST go through
   * this helper, or a refreshed/cleared session silently doesn't
   * reach the browser — the very next request would read a stale or
   * already-invalidated cookie.
   */
  function redirectTo(pathname: string, params?: Record<string, string>) {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAdminRoute = path.startsWith("/admin");
  const isOpdRoute = path.startsWith("/opd");

  if (!user && (isAdminRoute || isOpdRoute)) {
    return redirectTo("/");
  }

  if (user && (isAdminRoute || isOpdRoute)) {
    // Role check happens against `profiles`, which is protected by RLS
    // (a user can only ever read their own profile row).
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, aktif")
      .eq("id", user.id)
      .single();

    // Defense in depth: the profile can be deleted or deactivated
    // *after* the session cookie was issued (e.g. Admin deactivates
    // the account mid-session). Previously this fell through to the
    // role checks below, which — with profile null/undefined — sent
    // an /admin/* request to /opd/dashboard and an /opd/* request to
    // /admin/dashboard; since neither redirect target's own role
    // check would pass either, the two routes bounced the request
    // back and forth forever. Handle it explicitly instead: sign the
    // session out and send the user to login with a clear reason
    // (spec §4: "jika profile tidak ditemukan: logout"; §9 error copy).
    if (!profile) {
      await supabase.auth.signOut();
      return redirectTo("/", { error: "no_profile" });
    }
    if (!profile.aktif) {
      await supabase.auth.signOut();
      return redirectTo("/", { error: "inactive" });
    }

    if (isAdminRoute && profile.role !== "admin") {
      return redirectTo("/opd/dashboard");
    }
    if (isOpdRoute && profile.role !== "opd") {
      return redirectTo("/admin/dashboard");
    }
  }

  return supabaseResponse;
}
