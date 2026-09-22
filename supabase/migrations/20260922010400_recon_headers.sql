-- ============================================================
-- 0005: recon_headers
-- ============================================================
-- One row = one OPD + one fiscal year + one reporting month.
-- OPD-owned fields and Admin-owned fields live in separate child
-- tables (recon_opd_values / recon_admin_values) so RLS can grant
-- OPD accounts SELECT/INSERT/UPDATE on their own values while
-- keeping recon_admin_values (LRA Sistem, Keterangan B1-C2) fully
-- inaccessible to them (spec §15/§18).

create table public.recon_headers (
  id                          uuid primary key default gen_random_uuid(),
  opd_id                      uuid not null references public.opd_master(id),
  fiscal_year                 integer not null references public.fiscal_years(year),
  reporting_month             integer not null check (reporting_month between 1 and 12),

  status_opd                  text not null default 'DRAFT'
                                 check (status_opd in ('DRAFT', 'SUBMITTED')),
  status_admin                text not null default 'PENDING'
                                 check (status_admin in ('PENDING', 'VERIFIED')),

  no_surat                    text,
  tanggal_rekon                date,
  hari_rekon                  text,
  bulan_label                 text,

  petugas_rekon_id             uuid,
  petugas_rekon_nama_snapshot  text,

  created_by                  uuid references auth.users(id),
  updated_by                  uuid references auth.users(id),

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  submitted_at                timestamptz,
  verified_at                 timestamptz,

  constraint recon_headers_unique_period unique (opd_id, fiscal_year, reporting_month)
);

comment on table public.recon_headers is
  'One reconciliation period per OPD/year/month. Owns workflow status (DRAFT/SUBMITTED, PENDING/VERIFIED) and BAR metadata; actual figures live in recon_opd_values and recon_admin_values.';
comment on column public.recon_headers.petugas_rekon_nama_snapshot is
  'Snapshotted officer name at BAR-generation time (spec §29): must not change retroactively if petugas master data changes later.';

create trigger set_updated_at
  before update on public.recon_headers
  for each row execute function public.set_updated_at();
