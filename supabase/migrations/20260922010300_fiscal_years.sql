-- ============================================================
-- 0004: fiscal_years
-- ============================================================
create table public.fiscal_years (
  year           integer primary key check (year between 2000 and 2100),
  active         boolean not null default true,
  open_for_entry boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.fiscal_years is
  'Budget years available at login. open_for_entry gates whether OPD can still submit/edit reconciliation for that year.';

create trigger set_updated_at
  before update on public.fiscal_years
  for each row execute function public.set_updated_at();
