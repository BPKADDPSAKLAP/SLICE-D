-- ============================================================
-- RLS test suite (spec §39 testing checklist)
-- ============================================================
-- NOT applied to production. Run locally/CI against a Postgres
-- instance that has the migrations applied plus a stub `auth` schema
-- (see project README "Menjalankan test RLS secara lokal") and the
-- fixtures below (fixed UUIDs on purpose, so this file is
-- self-contained and needs no psql variables — psql does not
-- substitute :variables inside dollar-quoted DO $$ ... $$ bodies).
--
-- Each DO block RAISEs an exception on failure, so a clean run
-- ending in "ALL RLS TESTS PASSED" with only NOTICE: PASS lines is a
-- pass; any ERROR means a real RLS gap.

-- Fixtures
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'admin@internal.test'),
  ('00000000-0000-0000-0000-000000000002', 'opda@internal.test'),
  ('00000000-0000-0000-0000-000000000003', 'opdb@internal.test');

insert into public.opd_master (id, kode_opd, nama_opd, urutan) values
  ('10000000-0000-0000-0000-000000000001', 'OPD_001', 'Dinas A (TEST)', 1),
  ('10000000-0000-0000-0000-000000000002', 'OPD_002', 'Dinas B (TEST)', 2);

insert into public.fiscal_years (year, active, open_for_entry) values (2026, true, true);

insert into public.profiles (id, username, role, opd_id) values
  ('00000000-0000-0000-0000-000000000001', 'admin1', 'admin', null),
  ('00000000-0000-0000-0000-000000000002', 'opda_user', 'opd', '10000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000003', 'opdb_user', 'opd', '10000000-0000-0000-0000-000000000002');

-- ---------- 1. OPD A can create its own January 2026 header + values ----------
set role authenticated;
select set_config('app.current_user_id', '00000000-0000-0000-0000-000000000002', false);

insert into public.recon_headers (opd_id, fiscal_year, reporting_month)
values ('10000000-0000-0000-0000-000000000001', 2026, 1);

insert into public.recon_opd_values (recon_id, lra_manual, spj_fungsional, saldo_spj_fungsional, rekening_koran)
select id, 1000000, 1000000, 50000, 50000
from public.recon_headers
where opd_id = '10000000-0000-0000-0000-000000000001' and reporting_month = 1;

do $$
begin
  if (select count(*) from public.recon_headers) <> 1 then
    raise exception 'FAIL: OPD A should see exactly its own 1 header';
  end if;
  raise notice 'PASS: OPD A sees exactly its own header';
end $$;

-- ---------- 2. OPD A cannot create a header for OPD B ----------
do $$
begin
  begin
    insert into public.recon_headers (opd_id, fiscal_year, reporting_month)
    values ('10000000-0000-0000-0000-000000000002', 2026, 1);
    raise exception 'FAIL: OPD A was able to insert a recon_header for OPD B';
  exception
    when others then
      if sqlerrm like 'FAIL:%' then raise; end if;
      raise notice 'PASS: OPD A blocked from inserting for OPD B (%)', sqlerrm;
  end;
end $$;

-- ---------- 3. OPD A cannot read or write recon_admin_values at all ----------
do $$
declare
  cnt int;
begin
  select count(*) into cnt from public.recon_admin_values;
  if cnt <> 0 then
    raise exception 'FAIL: OPD A could see % row(s) in recon_admin_values', cnt;
  end if;
  raise notice 'PASS: OPD A sees 0 rows in recon_admin_values';
end $$;

do $$
begin
  begin
    insert into public.recon_admin_values (recon_id, lra_sistem)
    select id, 1 from public.recon_headers where opd_id = '10000000-0000-0000-0000-000000000001' and reporting_month = 1;
    raise exception 'FAIL: OPD A was able to insert into recon_admin_values';
  exception
    when others then
      if sqlerrm like 'FAIL:%' then raise; end if;
      raise notice 'PASS: OPD A blocked from inserting into recon_admin_values (%)', sqlerrm;
  end;
end $$;

-- ---------- 4. OPD A cannot change role/opd_id/aktif on its own profile ----------
do $$
begin
  begin
    update public.profiles set role = 'admin'
    where id = '00000000-0000-0000-0000-000000000002';
    raise exception 'FAIL: OPD A was able to self-promote to admin';
  exception
    when others then
      if sqlerrm like 'FAIL:%' then raise; end if;
      raise notice 'PASS: OPD A blocked from changing own role (%)', sqlerrm;
  end;
end $$;

-- OPD A CAN still update an allowed column on its own profile row
-- (sanity check that the trigger isn't over-blocking).
update public.profiles set must_change_password = must_change_password
  where id = '00000000-0000-0000-0000-000000000002';

-- ---------- 5. OPD A submits, then can no longer edit header or values ----------
update public.recon_headers
  set status_opd = 'SUBMITTED', submitted_at = now()
  where opd_id = '10000000-0000-0000-0000-000000000001' and reporting_month = 1;

do $$
begin
  begin
    update public.recon_opd_values set lra_manual = 999
    where recon_id = (
      select id from public.recon_headers
      where opd_id = '10000000-0000-0000-0000-000000000001' and reporting_month = 1
    );
    raise exception 'FAIL: OPD A edited values after SUBMITTED';
  exception
    when others then
      if sqlerrm like 'FAIL:%' then raise; end if;
      raise notice 'PASS: OPD A blocked from editing values after submit (%)', sqlerrm;
  end;
end $$;

do $$
begin
  begin
    update public.recon_headers set no_surat = 'HACK/001'
    where opd_id = '10000000-0000-0000-0000-000000000001' and reporting_month = 1;
    raise exception 'FAIL: OPD A modified an Admin-owned column on recon_headers';
  exception
    when others then
      if sqlerrm like 'FAIL:%' then raise; end if;
      raise notice 'PASS: OPD A blocked from modifying Admin-owned header columns (%)', sqlerrm;
  end;
end $$;

reset role;

-- ---------- 6. OPD B creates its own February header ----------
set role authenticated;
select set_config('app.current_user_id', '00000000-0000-0000-0000-000000000003', false);

insert into public.recon_headers (opd_id, fiscal_year, reporting_month)
values ('10000000-0000-0000-0000-000000000002', 2026, 2);

-- ---------- 7. OPD B cannot see OPD A's header (core isolation test) ----------
do $$
declare
  cnt int;
begin
  select count(*) into cnt from public.recon_headers
  where opd_id = '10000000-0000-0000-0000-000000000001';
  if cnt <> 0 then
    raise exception 'FAIL: OPD B could see % header row(s) belonging to OPD A', cnt;
  end if;
  raise notice 'PASS: OPD B sees 0 rows belonging to OPD A';
end $$;

do $$
declare
  cnt int;
begin
  select count(*) into cnt from public.recon_headers;
  if cnt <> 1 then
    raise exception 'FAIL: OPD B should see exactly its own 1 header, saw %', cnt;
  end if;
  raise notice 'PASS: OPD B sees exactly its own header';
end $$;

reset role;

-- ---------- 8. Admin sees both OPDs, can verify, is read-only on OPD figures ----------
set role authenticated;
select set_config('app.current_user_id', '00000000-0000-0000-0000-000000000001', false);

do $$
declare
  cnt int;
begin
  select count(*) into cnt from public.recon_headers;
  if cnt <> 2 then
    raise exception 'FAIL: Admin should see 2 headers total, saw %', cnt;
  end if;
  raise notice 'PASS: Admin sees all % headers', cnt;
end $$;

insert into public.recon_admin_values (recon_id, lra_sistem, saldo_spj_fungsional_sistem, saldo_laporan_penutupan_kas)
select id, 1000000, 50000, 50000
from public.recon_headers
where opd_id = '10000000-0000-0000-0000-000000000001' and reporting_month = 1;

do $$
declare
  s text;
begin
  select status_b1 into s from public.recon_summary
  where opd_id = '10000000-0000-0000-0000-000000000001' and reporting_month = 1;
  if s <> 'SESUAI' then
    raise exception 'FAIL: expected status_b1 SESUAI, got %', s;
  end if;
  raise notice 'PASS: recon_summary computed status_b1 = %', s;
end $$;

-- NOTE: RLS blocks an UPDATE by making the row invisible, not by
-- raising an error — an update the policy denies just silently
-- affects 0 rows. So the correct check is GET DIAGNOSTICS ROW_COUNT,
-- not a try/catch around the statement.
do $$
declare
  affected int;
begin
  update public.recon_opd_values set lra_manual = 12345
  where recon_id = (
    select id from public.recon_headers
    where opd_id = '10000000-0000-0000-0000-000000000001' and reporting_month = 1
  );
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'FAIL: Admin was able to edit OPD-owned figures directly (% row(s) affected)', affected;
  end if;
  raise notice 'PASS: Admin blocked from editing recon_opd_values (0 rows affected)';
end $$;

reset role;

-- ---------- 9. Unauthenticated (anon) cannot read reconciliation data, but can read active fiscal_years ----------
set role anon;
select set_config('app.current_user_id', '', false);

do $$
declare
  cnt int;
begin
  select count(*) into cnt from public.recon_headers;
  raise exception 'FAIL: anon role should not have table-level SELECT on recon_headers, got % rows', cnt;
exception
  when insufficient_privilege then
    raise notice 'PASS: anon has no table-level access to recon_headers';
  when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'PASS (blocked, different error): anon cannot read recon_headers (%)', sqlerrm;
end $$;

do $$
declare
  cnt int;
begin
  select count(*) into cnt from public.fiscal_years where active = true;
  if cnt < 1 then
    raise exception 'FAIL: anon should still be able to read active fiscal_years for the login screen';
  end if;
  raise notice 'PASS: anon can read % active fiscal_years for the login dropdown', cnt;
end $$;

reset role;

select 'ALL RLS TESTS PASSED' as result;
