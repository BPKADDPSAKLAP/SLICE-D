-- ============================================================
-- 0015: Row Level Security
-- ============================================================
-- THIS is the real security boundary (spec §15/§30/§31). Frontend
-- role checks (lib/permissions) are UX only — every table below
-- must reject an illegal query even if the frontend is bypassed
-- entirely (curl, another client, a bug).
--
-- Baseline table privileges: Supabase does not auto-grant table
-- access to anon/authenticated when tables are created via SQL
-- migration (only the Studio table editor does that) — so each
-- section below GRANTs the minimum SQL-level privilege needed, and
-- RLS policies then narrow it further per row/column.

-- ---------- opd_master ----------
alter table public.opd_master enable row level security;

grant select on public.opd_master to authenticated;
grant insert, update, delete on public.opd_master to authenticated; -- narrowed by policy below

create policy opd_master_select_authenticated
  on public.opd_master for select
  to authenticated
  using (true);

create policy opd_master_admin_write
  on public.opd_master for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- profiles ----------
alter table public.profiles enable row level security;

grant select, insert, update on public.profiles to authenticated;

create policy profiles_select_own_or_admin
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_insert_admin_only
  on public.profiles for insert
  to authenticated
  with check (public.is_admin());

create policy profiles_update_own_or_admin
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Column-level protection (spec §16): even though the UPDATE policy
-- above lets a user touch their own row, this trigger blocks any
-- non-admin, non-service-role caller from changing role/opd_id/aktif/
-- must_change_password. auth.uid() is NULL for the service-role
-- connection (no user JWT), so trusted server-side flows (Phase 3
-- admin actions using lib/supabase/admin.ts) are never blocked here.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role
       or new.opd_id is distinct from old.opd_id
       or new.aktif is distinct from old.aktif
       or new.must_change_password is distinct from old.must_change_password
    then
      raise exception 'Tidak diizinkan mengubah role, opd_id, aktif, atau must_change_password';
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_profile_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ---------- fiscal_years ----------
alter table public.fiscal_years enable row level security;

-- Publicly readable (active years only) so the login screen's "Tahun
-- Anggaran" select can be populated before the user is authenticated.
grant select on public.fiscal_years to anon, authenticated;
grant insert, update, delete on public.fiscal_years to authenticated; -- narrowed by policy below

create policy fiscal_years_select_active_public
  on public.fiscal_years for select
  to anon, authenticated
  using (active = true or public.is_admin());

create policy fiscal_years_admin_write
  on public.fiscal_years for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- recon_headers ----------
alter table public.recon_headers enable row level security;

grant select, insert, update on public.recon_headers to authenticated;

create policy recon_headers_select_own_or_admin
  on public.recon_headers for select
  to authenticated
  using (opd_id = public.get_my_opd_id() or public.is_admin());

create policy recon_headers_insert_own_or_admin
  on public.recon_headers for insert
  to authenticated
  with check (
    public.is_admin()
    or (
      opd_id = public.get_my_opd_id()
      and status_admin = 'PENDING'
      and verified_at is null
      and no_surat is null
      and tanggal_rekon is null
      and petugas_rekon_id is null
      and petugas_rekon_nama_snapshot is null
    )
  );

create policy recon_headers_update_own_or_admin
  on public.recon_headers for update
  to authenticated
  using (opd_id = public.get_my_opd_id() or public.is_admin())
  with check (opd_id = public.get_my_opd_id() or public.is_admin());

-- Edit-lock (spec §13 workflow, §16): once an OPD has submitted, only
-- Admin may touch the row further, and even before submit an OPD may
-- only move status_opd DRAFT->SUBMITTED plus set submitted_at — never
-- the Admin-owned columns.
create or replace function public.enforce_recon_header_edit_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if old.status_opd = 'SUBMITTED' then
      raise exception 'Rekonsiliasi sudah disubmit, tidak dapat diubah oleh OPD';
    end if;
    if new.opd_id <> old.opd_id
       or new.fiscal_year <> old.fiscal_year
       or new.reporting_month <> old.reporting_month
    then
      raise exception 'OPD tidak dapat mengubah identitas periode rekonsiliasi';
    end if;
    if new.status_admin is distinct from old.status_admin
       or new.verified_at is distinct from old.verified_at
       or new.no_surat is distinct from old.no_surat
       or new.tanggal_rekon is distinct from old.tanggal_rekon
       or new.hari_rekon is distinct from old.hari_rekon
       or new.petugas_rekon_id is distinct from old.petugas_rekon_id
       or new.petugas_rekon_nama_snapshot is distinct from old.petugas_rekon_nama_snapshot
    then
      raise exception 'OPD tidak dapat mengubah kolom milik Admin pada recon_headers';
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_recon_header_edit_rules
  before update on public.recon_headers
  for each row execute function public.enforce_recon_header_edit_rules();

-- ---------- recon_opd_values ----------
alter table public.recon_opd_values enable row level security;

grant select on public.recon_opd_values to authenticated;
grant insert, update on public.recon_opd_values to authenticated; -- narrowed by policy below

create policy recon_opd_values_select_own_or_admin
  on public.recon_opd_values for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.recon_headers h
      where h.id = recon_id and h.opd_id = public.get_my_opd_id()
    )
  );

-- Admin is intentionally SELECT-only here (spec §12/§16: these
-- fields are auto-filled from OPD data and READ ONLY for Admin) —
-- no admin branch in the insert/update policies below.
create policy recon_opd_values_insert_own
  on public.recon_opd_values for insert
  to authenticated
  with check (
    exists (
      select 1 from public.recon_headers h
      where h.id = recon_id and h.opd_id = public.get_my_opd_id()
    )
  );

create policy recon_opd_values_update_own
  on public.recon_opd_values for update
  to authenticated
  using (
    exists (
      select 1 from public.recon_headers h
      where h.id = recon_id and h.opd_id = public.get_my_opd_id()
    )
  )
  with check (
    exists (
      select 1 from public.recon_headers h
      where h.id = recon_id and h.opd_id = public.get_my_opd_id()
    )
  );

-- Same submit-lock idea as recon_headers: once the parent header is
-- SUBMITTED, the OPD can no longer edit its own figures.
create or replace function public.enforce_recon_opd_values_edit_lock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  header_status text;
begin
  if auth.uid() is not null and not public.is_admin() then
    select status_opd into header_status
    from public.recon_headers
    where id = new.recon_id;

    if header_status = 'SUBMITTED' then
      raise exception 'Rekonsiliasi sudah disubmit, nilai OPD tidak dapat diubah lagi';
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_recon_opd_values_edit_lock
  before insert or update on public.recon_opd_values
  for each row execute function public.enforce_recon_opd_values_edit_lock();

-- ---------- recon_admin_values ----------
alter table public.recon_admin_values enable row level security;

-- No grants at all for anon (default). Only `authenticated` gets a
-- table-level grant, and the policy below still requires is_admin() —
-- an authenticated OPD user has the SQL privilege but RLS denies
-- every row, which is the same as no access (spec §18/§31: OPD must
-- not be able to SELECT this table at all, including its own recon).
grant select, insert, update on public.recon_admin_values to authenticated;

create policy recon_admin_values_admin_only
  on public.recon_admin_values for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- attachments ----------
alter table public.attachments enable row level security;

grant select on public.attachments to authenticated;
grant insert, update, delete on public.attachments to authenticated; -- narrowed by policy below

create policy attachments_select_own_or_admin
  on public.attachments for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.recon_headers h
      where h.id = recon_id and h.opd_id = public.get_my_opd_id()
    )
  );

-- Uploading BAR documents is an Admin-only workflow (spec §27,
-- route /admin/unggah-rekon) — OPD gets read-only access above.
create policy attachments_admin_write
  on public.attachments for insert
  to authenticated
  with check (public.is_admin());

create policy attachments_admin_update
  on public.attachments for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy attachments_admin_delete
  on public.attachments for delete
  to authenticated
  using (public.is_admin());

-- ---------- audit_logs ----------
alter table public.audit_logs enable row level security;

-- Append-only: grant SELECT + INSERT only, never UPDATE/DELETE, at
-- the SQL level. No policy = no access, so there is intentionally no
-- select policy for role='opd' (spec §19: "OPD TIDAK BOLEH ... audit
-- logs internal").
grant select, insert on public.audit_logs to authenticated;

create policy audit_logs_select_admin_only
  on public.audit_logs for select
  to authenticated
  using (public.is_admin());

create policy audit_logs_insert_self_or_admin
  on public.audit_logs for insert
  to authenticated
  with check (actor_id = auth.uid() or public.is_admin());

-- ---------- system_settings ----------
alter table public.system_settings enable row level security;

grant select, insert, update, delete on public.system_settings to authenticated;

create policy system_settings_admin_only
  on public.system_settings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- subunit_mapping ----------
alter table public.subunit_mapping enable row level security;

grant select, insert, update, delete on public.subunit_mapping to authenticated;

create policy subunit_mapping_admin_only
  on public.subunit_mapping for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
