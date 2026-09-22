import "server-only";

/**
 * Supabase Auth is email/password-native, but SLICE-D's business
 * identity is `username` (profiles.username, unique). Rather than
 * storing a separate username->email lookup table (more state to
 * keep in sync, more surface for bugs), the mapping is a pure,
 * deterministic function: an Auth account for "admin1" must always
 * have been created with email "admin1@<AUTH_INTERNAL_EMAIL_DOMAIN>".
 *
 * This is documented in README "Membuat user pertama" — Admin
 * accounts (Phase 3A: created manually via Supabase Dashboard; a
 * proper Admin UI for this comes in a later phase) must follow this
 * convention exactly, using the lowercase username.
 */
export function usernameToInternalEmail(username: string): string {
  const domain = process.env.AUTH_INTERNAL_EMAIL_DOMAIN;
  if (!domain) {
    throw new Error(
      "AUTH_INTERNAL_EMAIL_DOMAIN is not configured (see .env.example)"
    );
  }
  const normalized = username.trim().toLowerCase();
  return `${normalized}@${domain}`;
}
