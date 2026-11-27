-- ============================================================
-- 0016: cek_selisih_runs  (Phase 3C.4A — persistence foundation)
-- ============================================================
-- Metadata + version history for Admin "Cek Selisih" runs.
-- Stores ONLY: period, version, status, Google Drive file IDs,
-- summary totals/counts, uploader, timestamp. Never per-account
-- detail rows, never Excel binaries — the full result lives in a
-- result JSON on Google Drive (referenced by result_file_id).
-- Independent of public.attachments (BAR PDFs per recon_headers):
-- different parent, different lifecycle, intentionally not reused.
--
-- Admin-only. Drive integration, Excel processing and UI are NOT
-- part of this migration.

create table public.cek_selisih_runs (
  id                    uuid primary key default gen_random_uuid(),
  fiscal_year           integer not null references public.fiscal_years(year),
  reporting_month       integer not null check (reporting_month between 1 and 12),
  version               integer not null check (version >= 1),
  status                text    not null check (status in ('ACTIVE', 'SUPERSEDED')),

  -- Google Drive file IDs — nullable: filled in by later phases.
  lra_manual_file_id    text,
  lra_program_file_id   text,
  result_file_id        text,

  -- Summary only. numeric(18,2), same as existing financial columns.
  total_sp2d            numeric(18, 2) not null default 0,
  total_lra_program     numeric(18, 2) not null default 0,
  total_selisih         numeric(18, 2) not null default 0,
  jumlah_rekening       integer not null default 0 check (jumlah_rekening >= 0),
  jumlah_sesuai         integer not null default 0 check (jumlah_sesuai >= 0),
  jumlah_selisih        integer not null default 0 check (jumlah_selisih >= 0),
  -- number of SP2D transactions behind total_sp2d (shown in the prototype's summary card)
  jumlah_transaksi      integer not null default 0 check (jumlah_transaksi >= 0),

  catatan               text,
  uploaded_by           uuid not null references auth.users(id),
  created_at            timestamptz not null default now(),

  -- Many versions per period are expected, but a version number is
  -- unique within its period. (NOT unique on fiscal_year+month alone.)
  constraint cek_selisih_runs_unique_version
    unique (fiscal_year, reporting_month, version),

  constraint cek_selisih_runs_counts_consistent
    check (jumlah_sesuai + jumlah_selisih <= jumlah_rekening)
);

comment on table public.cek_selisih_runs is
  'Version history of Admin Cek Selisih runs per fiscal_year + reporting_month. Metadata/summary only; Excel inputs and the result JSON live on Google Drive (file ID columns). At most one ACTIVE row per period; older versions are kept as SUPERSEDED, never deleted.';
comment on column public.cek_selisih_runs.status is
  'ACTIVE (the current version for the period, max one) or SUPERSEDED. A newly created run is staged as SUPERSEDED and becomes ACTIVE only through activate_cek_selisih_run().';

-- At most ONE active version per period (the DB-level guarantee).
create unique index cek_selisih_runs_one_active_per_period
  on public.cek_selisih_runs (fiscal_year, reporting_month)
  where status = 'ACTIVE';

-- ------------------------------------------------------------
-- Identity columns are immutable after insert. Status, file IDs,
-- summary and catatan remain updatable.
-- ------------------------------------------------------------
create or replace function public.protect_cek_selisih_run_identity()
returns trigger
language plpgsql
as $$
begin
  if new.id is distinct from old.id
     or new.fiscal_year is distinct from old.fiscal_year
     or new.reporting_month is distinct from old.reporting_month
     or new.version is distinct from old.version
     or new.uploaded_by is distinct from old.uploaded_by
     or new.created_at is distinct from old.created_at
  then
    raise exception 'Identitas run Cek Selisih (periode, versi, pengunggah) tidak dapat diubah';
  end if;
  return new;
end;
$$;

create trigger protect_cek_selisih_run_identity
  before update on public.cek_selisih_runs
  for each row execute function public.protect_cek_selisih_run_identity();

-- ------------------------------------------------------------
-- RLS — ADMIN ONLY (anon: none, opd: none). No DELETE policy and no
-- DELETE grant: version history is never removed.
-- ------------------------------------------------------------
alter table public.cek_selisih_runs enable row level security;

revoke all on public.cek_selisih_runs from anon, authenticated;
grant select, insert, update on public.cek_selisih_runs to authenticated;

create policy cek_selisih_runs_select_admin
  on public.cek_selisih_runs for select
  to authenticated
  using (public.is_admin());

create policy cek_selisih_runs_insert_admin
  on public.cek_selisih_runs for insert
  to authenticated
  with check (public.is_admin() and uploaded_by = auth.uid());

create policy cek_selisih_runs_update_admin
  on public.cek_selisih_runs for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- Atomic version management.
-- Both functions are SECURITY INVOKER (default): they run as the
-- caller, so the RLS policies above still apply. They additionally
-- check is_admin() up front for a clear error. A transaction-scoped
-- advisory lock on (fiscal_year, reporting_month) serialises
-- concurrent calls for the same period.
-- ------------------------------------------------------------

-- Creates the next version for a period, STAGED as SUPERSEDED (it
-- does not touch the current ACTIVE run). Version number is computed
-- under the lock, so concurrent creates cannot collide. Returns id.
create or replace function public.create_cek_selisih_run(
  p_fiscal_year         integer,
  p_reporting_month     integer,
  p_lra_manual_file_id  text    default null,
  p_lra_program_file_id text    default null,
  p_result_file_id      text    default null,
  p_total_sp2d          numeric default 0,
  p_total_lra_program   numeric default 0,
  p_total_selisih       numeric default 0,
  p_jumlah_rekening     integer default 0,
  p_jumlah_sesuai       integer default 0,
  p_jumlah_selisih      integer default 0,
  p_catatan             text    default null,
  p_jumlah_transaksi    integer default 0
)
returns uuid
language plpgsql
as $$
declare
  v_next_version integer;
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Hanya Admin yang dapat membuat run Cek Selisih';
  end if;

  perform pg_advisory_xact_lock(p_fiscal_year, p_reporting_month);

  select coalesce(max(version), 0) + 1
    into v_next_version
    from public.cek_selisih_runs
   where fiscal_year = p_fiscal_year
     and reporting_month = p_reporting_month;

  insert into public.cek_selisih_runs (
    fiscal_year, reporting_month, version, status,
    lra_manual_file_id, lra_program_file_id, result_file_id,
    total_sp2d, total_lra_program, total_selisih,
    jumlah_rekening, jumlah_sesuai, jumlah_selisih, jumlah_transaksi,
    catatan, uploaded_by
  ) values (
    p_fiscal_year, p_reporting_month, v_next_version, 'SUPERSEDED',
    p_lra_manual_file_id, p_lra_program_file_id, p_result_file_id,
    p_total_sp2d, p_total_lra_program, p_total_selisih,
    p_jumlah_rekening, p_jumlah_sesuai, p_jumlah_selisih, p_jumlah_transaksi,
    p_catatan, auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Makes the given run the ACTIVE one for its period and supersedes
-- the previous ACTIVE run — in ONE function call (one transaction):
-- either both changes commit or neither does, so the period can
-- never be left with the old run superseded and no new ACTIVE run.
-- Activating an already-ACTIVE run is a no-op. Also used to roll
-- back to an older version.
create or replace function public.activate_cek_selisih_run(p_id uuid)
returns void
language plpgsql
as $$
declare
  v_fiscal_year integer;
  v_reporting_month integer;
begin
  if not public.is_admin() then
    raise exception 'Hanya Admin yang dapat mengaktifkan run Cek Selisih';
  end if;

  select fiscal_year, reporting_month
    into v_fiscal_year, v_reporting_month
    from public.cek_selisih_runs
   where id = p_id;

  if not found then
    raise exception 'Run Cek Selisih tidak ditemukan';
  end if;

  perform pg_advisory_xact_lock(v_fiscal_year, v_reporting_month);

  update public.cek_selisih_runs
     set status = 'SUPERSEDED'
   where fiscal_year = v_fiscal_year
     and reporting_month = v_reporting_month
     and status = 'ACTIVE'
     and id <> p_id;

  update public.cek_selisih_runs
     set status = 'ACTIVE'
   where id = p_id;
end;
$$;

-- Not callable by anon (Supabase grants EXECUTE to PUBLIC/anon by default).
revoke all on function public.create_cek_selisih_run(
  integer, integer, text, text, text, numeric, numeric, numeric, integer, integer, integer, text, integer
) from public, anon;
revoke all on function public.activate_cek_selisih_run(uuid) from public, anon;

grant execute on function public.create_cek_selisih_run(
  integer, integer, text, text, text, numeric, numeric, numeric, integer, integer, integer, text, integer
) to authenticated;
grant execute on function public.activate_cek_selisih_run(uuid) to authenticated;
