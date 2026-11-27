import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico, images
     *
     * Login/logout run as Server Actions on "/" (not a separate
     * /api/auth route), so they're intentionally NOT excluded here —
     * updateSession() runs on them too, which is harmless (it only
     * refreshes the session and redirects for /admin|/opd paths).
     */
    "/((?!_next/static|_next/image|favicon.ico|images/).*)",
  ],
};
