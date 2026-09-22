-- ============================================================
-- 0006: recon_opd_values
-- ============================================================
-- Data OPD milik OPD (spec §6). 1:1 with recon_headers.

create table public.recon_opd_values (
  recon_id               uuid primary key references public.recon_headers(id) on delete cascade,

  lra_manual              numeric(18, 2) not null default 0,
  spj_fungsional          numeric(18, 2) not null default 0,
  saldo_spj_fungsional    numeric(18, 2) not null default 0,
  rekening_koran          numeric(18, 2) not null default 0,

  updated_by             uuid references auth.users(id),
  updated_at             timestamptz not null default now(),
  submitted_at            timestamptz
);

comment on table public.recon_opd_values is
  'Figures entered by the OPD itself. Never touched by Admin. RLS: an OPD account may only read/write the row whose recon_headers.opd_id matches its own.';

create trigger set_updated_at
  before update on public.recon_opd_values
  for each row execute function public.set_updated_at();
