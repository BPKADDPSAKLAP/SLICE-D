-- ============================================================
-- 0001: Extensions & shared helpers
-- ============================================================
-- pgcrypto gives us gen_random_uuid() for uuid primary keys.
create extension if not exists pgcrypto;

-- Shared trigger function: every table with an `updated_at` column
-- uses this instead of each table reinventing the same trigger body.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Generic BEFORE UPDATE trigger: stamps updated_at = now(). Attached to every table below that has an updated_at column.';
