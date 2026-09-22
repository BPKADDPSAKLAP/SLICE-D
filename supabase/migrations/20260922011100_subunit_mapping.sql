-- ============================================================
-- 0012: subunit_mapping
-- ============================================================
-- Moves the Puskesmas -> Dinas Kesehatan / Bagian -> Sekretariat
-- Daerah / Kelurahan -> Kecamatan style consolidation out of
-- frontend code and into data (spec §22), so it can be corrected by
-- Admin without a redeploy.

create table public.subunit_mapping (
  id               uuid primary key default gen_random_uuid(),
  source_name      text not null,
  normalized_name  text not null,
  parent_opd_id    uuid references public.opd_master(id),
  aktif            boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint subunit_mapping_source_name_unique unique (source_name)
);

comment on table public.subunit_mapping is
  'Sub-unit name -> parent OPD consolidation table used by Cek Selisih matching (spec §21/§22). Edited via Data Master, never hardcoded in a component.';

create trigger set_updated_at
  before update on public.subunit_mapping
  for each row execute function public.set_updated_at();
