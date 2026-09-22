-- ============================================================
-- 0008: recon_summary view
-- ============================================================
-- Single place where selisih B1/B2/C1/C2 are computed (spec §8/§17)
-- so this logic is never duplicated in the frontend or in multiple
-- queries. Selisih is NEVER stored as a manual input column.
--
-- security_invoker = true (Postgres 15+) is essential: without it, a
-- view runs with the OWNER's privileges and would silently bypass
-- every RLS policy on the underlying tables. With it, the view
-- re-checks RLS as the querying user — so an OPD account querying
-- this view still cannot see recon_admin_values (and therefore sees
-- NULL selisih/status for its own rows, since Admin hasn't finished
-- yet, or admin_* columns are simply absent from what they're
-- allowed to join).

create view public.recon_summary
  with (security_invoker = true)
as
select
  h.id                              as recon_id,
  h.opd_id,
  o.nama_opd,
  o.kode_opd,
  h.fiscal_year,
  h.reporting_month,
  h.bulan_label,
  h.status_opd,
  h.status_admin,
  h.no_surat,
  h.tanggal_rekon,
  h.petugas_rekon_nama_snapshot,
  h.submitted_at,
  h.verified_at,

  -- OPD-owned figures
  v.lra_manual,
  v.spj_fungsional,
  v.saldo_spj_fungsional,
  v.rekening_koran,

  -- Admin-owned figures (NULL for a caller with no RLS access to
  -- recon_admin_values, i.e. any 'opd' role account)
  a.lra_sistem,
  a.saldo_spj_fungsional_sistem,
  a.saldo_laporan_penutupan_kas,
  a.keterangan_b1,
  a.keterangan_b2,
  a.keterangan_c1,
  a.keterangan_c2,

  -- Selisih B1: LRA Sistem - SPJ Fungsional
  (a.lra_sistem - v.spj_fungsional)                          as selisih_b1,
  case
    when a.recon_id is null then null
    when abs(a.lra_sistem - v.spj_fungsional) <= 0.01 then 'SESUAI'
    else 'SELISIH'
  end                                                          as status_b1,

  -- Selisih B2: LRA Sistem - LRA Manual
  (a.lra_sistem - v.lra_manual)                              as selisih_b2,
  case
    when a.recon_id is null then null
    when abs(a.lra_sistem - v.lra_manual) <= 0.01 then 'SESUAI'
    else 'SELISIH'
  end                                                          as status_b2,

  -- Selisih C1: Sisa Saldo SPJ Fungsional - Sisa Saldo Laporan Penutupan Kas
  (v.saldo_spj_fungsional - a.saldo_laporan_penutupan_kas)   as selisih_c1,
  case
    when a.recon_id is null then null
    when abs(v.saldo_spj_fungsional - a.saldo_laporan_penutupan_kas) <= 0.01 then 'SESUAI'
    else 'SELISIH'
  end                                                          as status_c1,

  -- Selisih C2: Sisa Saldo SPJ Fungsional Sistem - Rekening Koran
  (a.saldo_spj_fungsional_sistem - v.rekening_koran)         as selisih_c2,
  case
    when a.recon_id is null then null
    when abs(a.saldo_spj_fungsional_sistem - v.rekening_koran) <= 0.01 then 'SESUAI'
    else 'SELISIH'
  end                                                          as status_c2

from public.recon_headers h
join public.opd_master o        on o.id = h.opd_id
left join public.recon_opd_values v   on v.recon_id = h.id
left join public.recon_admin_values a on a.recon_id = h.id;

comment on view public.recon_summary is
  'Single computed source for selisih B1/B2/C1/C2 and their SESUAI/SELISIH status (tolerance 0.01). security_invoker=true so RLS on the underlying tables still applies per caller — do not recreate this calculation elsewhere.';

-- Views need their own explicit GRANT even with security_invoker —
-- the underlying tables' grants don't extend to the view
-- automatically. Only `authenticated`: this view surfaces
-- reconciliation figures, unlike the public fiscal_years list.
grant select on public.recon_summary to authenticated;
