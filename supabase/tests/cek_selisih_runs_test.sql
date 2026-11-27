-- ============================================================
-- cek_selisih_runs test suite (Phase 3C.4A)
-- ============================================================
-- NOT applied to production. Run against a Postgres that has ALL
-- migrations applied plus a stub `auth` schema (same setup as
-- rls_test_suite.sql). Uses fixed UUID literals on purpose: psql
-- does not substitute :variables inside DO $$ ... $$ bodies.
-- A clean run ends with "ALL CEK SELISIH RUN TESTS PASSED"; any
-- ERROR (or a FAIL: exception) is a real gap.
--
-- Fixtures: admin A, opd user, fiscal years 2026 + 2027.

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@internal.test'),
  ('00000000-0000-0000-0000-0000000000a2', 'admin2@internal.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'opd@internal.test');

insert into public.opd_master (id, kode_opd, nama_opd) values
  ('10000000-0000-0000-0000-0000000000c1', 'OPD_T1', 'Dinas Test (TEST)');

insert into public.fiscal_years (year, active, open_for_entry) values (2026, true, true), (2027, true, true);

insert into public.profiles (id, username, role, opd_id) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin_t1', 'admin', null),
  ('00000000-0000-0000-0000-0000000000a2', 'admin_t2', 'admin', null),
  ('00000000-0000-0000-0000-0000000000b1', 'opd_t1', 'opd', '10000000-0000-0000-0000-0000000000c1');

-- ---------- 1. ANON: no access at all ----------
set role anon;
select set_config('app.current_user_id', '', false);

do $$
begin
  begin
    perform count(*) from public.cek_selisih_runs;
    raise exception 'FAIL: anon could SELECT cek_selisih_runs';
  exception when insufficient_privilege then
    raise notice 'PASS: anon has no table access';
  end;
  begin
    perform public.create_cek_selisih_run(2026, 1);
    raise exception 'FAIL: anon could EXECUTE create_cek_selisih_run';
  exception when insufficient_privilege then
    raise notice 'PASS: anon cannot execute create_cek_selisih_run';
  end;
  begin
    perform public.activate_cek_selisih_run('00000000-0000-0000-0000-000000000000');
    raise exception 'FAIL: anon could EXECUTE activate_cek_selisih_run';
  exception when insufficient_privilege then
    raise notice 'PASS: anon cannot execute activate_cek_selisih_run';
  end;
end $$;
reset role;

-- ---------- 2. ADMIN creates + activates; seed some history ----------
set role authenticated;
select set_config('app.current_user_id', '00000000-0000-0000-0000-0000000000a1', false);

do $$
declare
  v1 uuid; v2 uuid; v3 uuid;
  s text; ver int; active_count int;
begin
  -- create v1: staged, NOT active, does not disturb anything
  v1 := public.create_cek_selisih_run(2026, 9, 'lm1', 'lp1', 'res1', 1000, 900, -100, 10, 6, 4, 'v1');
  select status, version into s, ver from public.cek_selisih_runs where id = v1;
  if s <> 'SUPERSEDED' or ver <> 1 then
    raise exception 'FAIL: new run should be staged as SUPERSEDED v1, got % v%', s, ver;
  end if;
  raise notice 'PASS: createRun stages v1 as SUPERSEDED';

  perform public.activate_cek_selisih_run(v1);
  select status into s from public.cek_selisih_runs where id = v1;
  if s <> 'ACTIVE' then raise exception 'FAIL: v1 should be ACTIVE after activate, got %', s; end if;
  raise notice 'PASS: activate makes v1 ACTIVE';

  -- create v2: v1 must stay ACTIVE until v2 is explicitly activated
  v2 := public.create_cek_selisih_run(2026, 9);
  select version into ver from public.cek_selisih_runs where id = v2;
  select status into s from public.cek_selisih_runs where id = v1;
  if ver <> 2 or s <> 'ACTIVE' then
    raise exception 'FAIL: creating v2 must give version 2 and leave v1 ACTIVE (v%, v1=%)', ver, s;
  end if;
  raise notice 'PASS: createRun v2 leaves v1 ACTIVE';

  -- activate v2: v1 -> SUPERSEDED, v2 -> ACTIVE, exactly one ACTIVE
  perform public.activate_cek_selisih_run(v2);
  select count(*) into active_count from public.cek_selisih_runs
   where fiscal_year = 2026 and reporting_month = 9 and status = 'ACTIVE';
  select status into s from public.cek_selisih_runs where id = v1;
  if active_count <> 1 or s <> 'SUPERSEDED' then
    raise exception 'FAIL: after activating v2 expected 1 ACTIVE and v1 SUPERSEDED (active=%, v1=%)', active_count, s;
  end if;
  raise notice 'PASS: activate v2 supersedes v1, exactly one ACTIVE';

  -- history kept: v1 + v2 both still present
  if (select count(*) from public.cek_selisih_runs where fiscal_year = 2026 and reporting_month = 9) <> 2 then
    raise exception 'FAIL: history rows were lost';
  end if;

  -- rollback to older version is supported
  perform public.activate_cek_selisih_run(v1);
  select status into s from public.cek_selisih_runs where id = v2;
  if s <> 'SUPERSEDED' then raise exception 'FAIL: rollback to v1 should supersede v2'; end if;
  raise notice 'PASS: re-activating an older version works (rollback)';

  -- activating an already ACTIVE run is a no-op
  perform public.activate_cek_selisih_run(v1);
  select count(*) into active_count from public.cek_selisih_runs
   where fiscal_year = 2026 and reporting_month = 9 and status = 'ACTIVE';
  if active_count <> 1 then raise exception 'FAIL: idempotent activate broke the single-ACTIVE rule'; end if;
  raise notice 'PASS: activate on ACTIVE run is idempotent';

  -- independent period is unaffected
  v3 := public.create_cek_selisih_run(2026, 10);
  perform public.activate_cek_selisih_run(v3);
  select count(*) into active_count from public.cek_selisih_runs where status = 'ACTIVE';
  if active_count <> 2 then raise exception 'FAIL: periods must be independent (active=%)', active_count; end if;
  raise notice 'PASS: ACTIVE is per period (2026/9 and 2026/10 each have one)';

  -- summary persisted as numeric(18,2) exactly
  if (select total_selisih from public.cek_selisih_runs where id = v1) <> -100 then
    raise exception 'FAIL: numeric summary not stored exactly';
  end if;
end $$;

-- ---------- 3. Partial unique index: two ACTIVE rows impossible ----------
do $$
declare v_id uuid;
begin
  v_id := public.create_cek_selisih_run(2026, 9);          -- v3, staged
  begin
    update public.cek_selisih_runs set status = 'ACTIVE' where id = v_id;   -- bypass the function
    raise exception 'FAIL: two ACTIVE rows for the same period were allowed';
  exception when unique_violation then
    raise notice 'PASS: partial unique index blocks a second ACTIVE row';
  end;
end $$;

-- ---------- 4. Constraints ----------
do $$
begin
  begin
    insert into public.cek_selisih_runs (fiscal_year, reporting_month, version, status, uploaded_by)
    values (2026, 13, 1, 'SUPERSEDED', '00000000-0000-0000-0000-0000000000a1');
    raise exception 'FAIL: month 13 accepted';
  exception when check_violation then raise notice 'PASS: reporting_month 13 rejected'; end;

  begin
    insert into public.cek_selisih_runs (fiscal_year, reporting_month, version, status, uploaded_by)
    values (2026, 0, 1, 'SUPERSEDED', '00000000-0000-0000-0000-0000000000a1');
    raise exception 'FAIL: month 0 accepted';
  exception when check_violation then raise notice 'PASS: reporting_month 0 rejected'; end;

  begin
    insert into public.cek_selisih_runs (fiscal_year, reporting_month, version, status, uploaded_by)
    values (2026, 5, 0, 'SUPERSEDED', '00000000-0000-0000-0000-0000000000a1');
    raise exception 'FAIL: version 0 accepted';
  exception when check_violation then raise notice 'PASS: version 0 rejected'; end;

  begin
    insert into public.cek_selisih_runs (fiscal_year, reporting_month, version, status, uploaded_by)
    values (2026, 5, 1, 'PENDING', '00000000-0000-0000-0000-0000000000a1');
    raise exception 'FAIL: status PENDING accepted';
  exception when check_violation then raise notice 'PASS: status other than ACTIVE/SUPERSEDED rejected'; end;

  begin
    insert into public.cek_selisih_runs (fiscal_year, reporting_month, version, status, uploaded_by, jumlah_rekening, jumlah_sesuai, jumlah_selisih)
    values (2026, 5, 1, 'SUPERSEDED', '00000000-0000-0000-0000-0000000000a1', 3, 2, 2);
    raise exception 'FAIL: sesuai+selisih > rekening accepted';
  exception when check_violation then raise notice 'PASS: inconsistent counts rejected'; end;

  begin
    insert into public.cek_selisih_runs (fiscal_year, reporting_month, version, status, uploaded_by, jumlah_rekening)
    values (2026, 5, 1, 'SUPERSEDED', '00000000-0000-0000-0000-0000000000a1', -1);
    raise exception 'FAIL: negative count accepted';
  exception when check_violation then raise notice 'PASS: negative count rejected'; end;

  begin
    insert into public.cek_selisih_runs (fiscal_year, reporting_month, version, status, uploaded_by)
    values (1999, 5, 1, 'SUPERSEDED', '00000000-0000-0000-0000-0000000000a1');
    raise exception 'FAIL: unknown fiscal_year accepted';
  exception when foreign_key_violation then raise notice 'PASS: fiscal_year must exist in fiscal_years'; end;

  begin
    insert into public.cek_selisih_runs (fiscal_year, reporting_month, version, status, uploaded_by)
    values (2026, 9, 1, 'SUPERSEDED', '00000000-0000-0000-0000-0000000000a1');
    raise exception 'FAIL: duplicate (year, month, version) accepted';
  exception when unique_violation then raise notice 'PASS: duplicate version for a period rejected'; end;

  -- uploaded_by cannot be spoofed to another user on a direct insert
  begin
    insert into public.cek_selisih_runs (fiscal_year, reporting_month, version, status, uploaded_by)
    values (2026, 5, 1, 'SUPERSEDED', '00000000-0000-0000-0000-0000000000a2');
    raise exception 'FAIL: admin inserted a row attributed to someone else';
  exception when insufficient_privilege then raise notice 'PASS: uploaded_by must equal the caller'; end;

  -- identity columns immutable
  begin
    update public.cek_selisih_runs set version = 99 where fiscal_year = 2026 and reporting_month = 10;
    raise exception 'FAIL: version was changed';
  exception when raise_exception then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'PASS: identity columns are immutable (%)', sqlerrm;
  end;

  -- history is never deleted (no DELETE grant)
  begin
    delete from public.cek_selisih_runs;
    raise exception 'FAIL: admin could DELETE run history';
  exception when insufficient_privilege then raise notice 'PASS: DELETE not permitted'; end;

  -- activating a missing run fails cleanly
  begin
    perform public.activate_cek_selisih_run('00000000-0000-0000-0000-00000000dead');
    raise exception 'FAIL: activating a missing id succeeded';
  exception when raise_exception then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'PASS: activating a missing run raises (%)', sqlerrm;
  end;
end $$;

-- summary / file-id update path (what updateRunSummary does) works for admin
update public.cek_selisih_runs
   set result_file_id = 'drive-result-1', total_sp2d = 5000.5, jumlah_rekening = 4, jumlah_sesuai = 3, jumlah_selisih = 1
 where fiscal_year = 2026 and reporting_month = 10;

-- ---------- 4b. jumlah_transaksi (Revision 1) ----------
-- Period 2026/11 is used so nothing above is disturbed.
do $$
declare
  v1 uuid; v2 uuid; v3 uuid; n int; s text;
begin
  -- default is 0 when the caller does not supply it (existing callers unaffected)
  v1 := public.create_cek_selisih_run(2026, 11);
  select jumlah_transaksi into n from public.cek_selisih_runs where id = v1;
  if n <> 0 then raise exception 'FAIL: default jumlah_transaksi should be 0, got %', n; end if;
  raise notice 'PASS: jumlah_transaksi defaults to 0';

  -- the column default also applies to a plain direct insert
  insert into public.cek_selisih_runs (fiscal_year, reporting_month, version, status, uploaded_by)
  values (2026, 12, 1, 'SUPERSEDED', '00000000-0000-0000-0000-0000000000a1');
  select jumlah_transaksi into n from public.cek_selisih_runs where fiscal_year = 2026 and reporting_month = 12;
  if n <> 0 then raise exception 'FAIL: column default jumlah_transaksi should be 0, got %', n; end if;
  raise notice 'PASS: column default is 0 on direct insert';

  -- zero is valid; positive values can be stored via the function (named arg) ...
  v2 := public.create_cek_selisih_run(2026, 11, p_jumlah_transaksi => 1234);
  select jumlah_transaksi into n from public.cek_selisih_runs where id = v2;
  if n <> 1234 then raise exception 'FAIL: positive jumlah_transaksi via function not stored, got %', n; end if;
  raise notice 'PASS: positive jumlah_transaksi stored via create_cek_selisih_run';

  -- ... via the existing 12-argument positional call (pre-revision callers) it still works ...
  v3 := public.create_cek_selisih_run(2026, 11, null, null, null, 10, 9, -1, 2, 1, 1, 'old-style call');
  select jumlah_transaksi into n from public.cek_selisih_runs where id = v3;
  if n <> 0 then raise exception 'FAIL: old-style positional call changed behaviour (got %)', n; end if;
  raise notice 'PASS: pre-revision positional calls still work (jumlah_transaksi = 0)';

  -- ... and via UPDATE (what updateRunSummary does)
  update public.cek_selisih_runs set jumlah_transaksi = 987654 where id = v1;
  select jumlah_transaksi into n from public.cek_selisih_runs where id = v1;
  if n <> 987654 then raise exception 'FAIL: positive jumlah_transaksi via update not stored'; end if;
  raise notice 'PASS: positive jumlah_transaksi stored via UPDATE';

  -- negatives rejected on every path
  begin
    update public.cek_selisih_runs set jumlah_transaksi = -1 where id = v1;
    raise exception 'FAIL: negative jumlah_transaksi accepted via UPDATE';
  exception when check_violation then raise notice 'PASS: negative jumlah_transaksi rejected (UPDATE)'; end;

  begin
    insert into public.cek_selisih_runs (fiscal_year, reporting_month, version, status, uploaded_by, jumlah_transaksi)
    values (2026, 12, 2, 'SUPERSEDED', '00000000-0000-0000-0000-0000000000a1', -5);
    raise exception 'FAIL: negative jumlah_transaksi accepted via INSERT';
  exception when check_violation then raise notice 'PASS: negative jumlah_transaksi rejected (INSERT)'; end;

  begin
    perform public.create_cek_selisih_run(2026, 11, p_jumlah_transaksi => -1);
    raise exception 'FAIL: negative jumlah_transaksi accepted via create_cek_selisih_run';
  exception when check_violation then raise notice 'PASS: negative jumlah_transaksi rejected (function)'; end;

  -- the failed create above must not have consumed or skipped a version number
  if (select max(version) from public.cek_selisih_runs where fiscal_year = 2026 and reporting_month = 11) <> 3 then
    raise exception 'FAIL: a rejected create left a gap/extra version';
  end if;

  -- version history + single ACTIVE still hold with the new column in play
  perform public.activate_cek_selisih_run(v2);
  perform public.activate_cek_selisih_run(v1);
  select count(*) into n from public.cek_selisih_runs
   where fiscal_year = 2026 and reporting_month = 11 and status = 'ACTIVE';
  select status into s from public.cek_selisih_runs where id = v2;
  if n <> 1 or s <> 'SUPERSEDED' then
    raise exception 'FAIL: expected exactly one ACTIVE (v1) and v2 SUPERSEDED, got active=% v2=%', n, s;
  end if;
  if (select count(*) from public.cek_selisih_runs where fiscal_year = 2026 and reporting_month = 11) <> 3 then
    raise exception 'FAIL: version history lost rows';
  end if;
  -- superseded version keeps its own transaction count
  select jumlah_transaksi into n from public.cek_selisih_runs where id = v2;
  if n <> 1234 then raise exception 'FAIL: superseded version lost its jumlah_transaksi'; end if;
  raise notice 'PASS: history kept, exactly one ACTIVE, per-version jumlah_transaksi preserved';

  begin
    update public.cek_selisih_runs set status = 'ACTIVE' where id = v2;
    raise exception 'FAIL: second ACTIVE row allowed';
  exception when unique_violation then raise notice 'PASS: partial unique index still blocks a second ACTIVE'; end;
end $$;
reset role;

-- ---------- 5. OPD: no access, cannot write, cannot call functions ----------
set role authenticated;
select set_config('app.current_user_id', '00000000-0000-0000-0000-0000000000b1', false);

do $$
declare n int;
begin
  select count(*) into n from public.cek_selisih_runs;
  if n <> 0 then raise exception 'FAIL: OPD could see % run row(s)', n; end if;
  raise notice 'PASS: OPD sees 0 rows';

  begin
    insert into public.cek_selisih_runs (fiscal_year, reporting_month, version, status, uploaded_by)
    values (2026, 3, 1, 'SUPERSEDED', '00000000-0000-0000-0000-0000000000b1');
    raise exception 'FAIL: OPD inserted a run';
  exception when insufficient_privilege then raise notice 'PASS: OPD insert blocked by RLS'; end;

  begin
    perform public.create_cek_selisih_run(2026, 3);
    raise exception 'FAIL: OPD created a run through the function';
  exception when raise_exception then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'PASS: OPD blocked from create_cek_selisih_run (%)', sqlerrm;
  end;

  begin
    perform public.activate_cek_selisih_run((select id from public.cek_selisih_runs limit 1));
    raise exception 'FAIL: OPD activated a run';
  exception when raise_exception then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'PASS: OPD blocked from activate_cek_selisih_run (%)', sqlerrm;
  end;

  -- UPDATE is silently 0 rows under RLS (rows invisible), check ROW_COUNT
  update public.cek_selisih_runs set catatan = 'hack';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: OPD updated % row(s)', n; end if;
  raise notice 'PASS: OPD update affects 0 rows';
end $$;
reset role;

-- Nothing the OPD did leaked into the data
do $$
begin
  if exists (select 1 from public.cek_selisih_runs where catatan = 'hack') then
    raise exception 'FAIL: OPD write persisted';
  end if;
end $$;

select 'ALL CEK SELISIH RUN TESTS PASSED' as result;
