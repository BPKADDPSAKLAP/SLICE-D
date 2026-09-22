-- ============================================================
-- 0003: profiles
-- ============================================================
-- One row per Supabase Auth user, carrying the app-level role and,
-- for OPD accounts, which OPD they belong to. Passwords are never
-- stored here — Supabase Auth (auth.users) owns password/credential
-- management entirely (spec §33/§17).

create table public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  username              text not null unique,
  role                  text not null check (role in ('admin', 'opd')),
  opd_id                uuid references public.opd_master(id),
  aktif                 boolean not null default true,
  must_change_password  boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  -- Admin accounts must NOT be tied to an OPD; OPD accounts MUST be.
  constraint profiles_role_opd_id_check check (
    (role = 'admin' and opd_id is null) or
    (role = 'opd'   and opd_id is not null)
  )
);

comment on table public.profiles is
  'App-level identity for each Supabase Auth user: role (admin/opd) and, for opd accounts, which OPD they represent. No password data here.';

create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
