/**
 * PLACEHOLDER. Replace by running, after the Phase 2 migrations are
 * applied to your Supabase project:
 *
 *   npx supabase gen types typescript --project-id <project-ref> > types/database.ts
 *
 * Keeping a hand-written minimal shape here for Phase 1 so the app
 * compiles before the real schema exists.
 */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          role: "admin" | "opd";
          opd_id: string | null;
          aktif: boolean;
          must_change_password: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
    };
  };
};
