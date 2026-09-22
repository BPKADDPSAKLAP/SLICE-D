import "server-only";
import { cookies } from "next/headers";

const COOKIE_NAME = "slice_d_fiscal_year";

/**
 * The fiscal year picked at login is application state (which year's
 * data the UI defaults to showing), never an authorization boundary
 * — every query still goes through RLS scoped by the authenticated
 * user's profile, regardless of what this cookie says. Stored
 * server-side via an httpOnly cookie (not localStorage) so it can't
 * be read or tampered with from client JS, and so Server Components
 * can read it directly with `cookies()`.
 */
export async function setSelectedFiscalYear(year: number): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, String(year), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function getSelectedFiscalYear(): Promise<number | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const year = Number(raw);
  return Number.isFinite(year) ? year : null;
}

export async function clearSelectedFiscalYear(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
