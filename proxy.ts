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
     * - the API auth routes themselves (they set/read cookies directly)
     */
    "/((?!_next/static|_next/image|favicon.ico|images/).*)",
  ],
};
