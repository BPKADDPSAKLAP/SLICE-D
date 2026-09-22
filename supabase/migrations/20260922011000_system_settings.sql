-- ============================================================
-- 0011: system_settings
-- ============================================================
create table public.system_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id)
);

comment on table public.system_settings is
  'Key/value app configuration: signatory data (kasubid, jabatan, NIP), other admin-editable settings (spec §11/§24). Values are jsonb so shape can evolve without new migrations.';

create trigger set_updated_at
  before update on public.system_settings
  for each row execute function public.set_updated_at();
