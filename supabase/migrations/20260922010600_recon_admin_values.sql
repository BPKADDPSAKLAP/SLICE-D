-- ============================================================
-- 0007: recon_admin_values
-- ============================================================
-- Data internal Admin (spec §7/§18). 1:1 with recon_headers.
-- RLS on this table grants ZERO access to role='opd' — not even
-- SELECT of their own recon's admin row. Enforced in the RLS
-- migration (0015), not by hiding fields in the UI.

create table public.recon_admin_values (
  recon_id                        uuid primary key references public.recon_headers(id) on delete cascade,

  lra_sistem                      numeric(18, 2) not null default 0,
  saldo_spj_fungsional_sistem     numeric(18, 2) not null default 0,
  saldo_laporan_penutupan_kas     numeric(18, 2) not null default 0,

  keterangan_b1                   text,
  keterangan_b2                   text,
  keterangan_c1                   text,
  keterangan_c2                   text,

  updated_by                      uuid references auth.users(id),
  updated_at                      timestamptz not null default now()
);

comment on table public.recon_admin_values is
  'Figures and remarks entered by Admin only. OPD accounts have NO RLS grant on this table at all (spec §18/§31) — this is the enforced boundary, not the frontend.';

create trigger set_updated_at
  before update on public.recon_admin_values
  for each row execute function public.set_updated_at();
