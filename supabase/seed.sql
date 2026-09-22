-- ============================================================
-- supabase/seed.sql — NON-PRODUCTION placeholder data
-- ============================================================
-- REPLACE WITH OFFICIAL DATA before going live (spec §18/§43).
-- This file intentionally seeds only 2 placeholder OPDs and 1
-- fiscal year so `npm run dev` has something to point at locally —
-- it is NOT the real 36-OPD list and must never be treated as such.
--
-- Real 36 OPD names/codes, real petugas/pejabat names, and real user
-- accounts are entered later through Data Master (Phase 4) or a
-- corrected seed file supplied by BPKAD — never invented by an LLM
-- or a developer guessing.

insert into public.fiscal_years (year, active, open_for_entry)
values (extract(year from now())::int, true, true)
on conflict (year) do nothing;

-- REPLACE WITH OFFICIAL DATA: these are placeholders only.
insert into public.opd_master (kode_opd, nama_opd, urutan) values
  ('OPD_001', 'CONTOH OPD 1 (REPLACE WITH OFFICIAL DATA)', 1),
  ('OPD_002', 'CONTOH OPD 2 (REPLACE WITH OFFICIAL DATA)', 2)
on conflict (nama_opd) do nothing;

-- No profiles / auth.users are seeded here on purpose: creating a
-- login account means creating a Supabase Auth user first (Phase 3),
-- then a matching profiles row — never a profiles row in isolation.
