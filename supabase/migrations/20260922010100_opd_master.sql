-- ============================================================
-- 0002: opd_master
-- ============================================================
-- Master list of the 36 OPD (Organisasi Perangkat Daerah). Rows are
-- seeded via supabase/seed.sql with a NON-PRODUCTION placeholder
-- (see spec §43) — the real 36 names/codes must be entered through
-- Data Master (Phase 4) or a corrected seed, never invented here.

create table public.opd_master (
  id         uuid primary key default gen_random_uuid(),
  kode_opd   text,
  nama_opd   text not null unique,
  aktif      boolean not null default true,
  urutan     integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.opd_master is
  'Master list of Denpasar city OPDs (36 in production). Seeded with placeholder rows only — see supabase/seed.sql.';

create trigger set_updated_at
  before update on public.opd_master
  for each row execute function public.set_updated_at();
