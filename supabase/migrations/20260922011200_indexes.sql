-- ============================================================
-- 0013: Indexes (spec §13 / §38)
-- ============================================================
-- Note: UNIQUE constraints already created indexes for
-- profiles.username, opd_master.nama_opd, and the composite
-- (opd_id, fiscal_year, reporting_month) on recon_headers — those
-- are not repeated here. What follows covers lookups the unique
-- indexes don't already serve (e.g. filtering by fiscal_year alone).

create index idx_profiles_opd_id on public.profiles (opd_id);

create index idx_recon_headers_opd_id on public.recon_headers (opd_id);
create index idx_recon_headers_fiscal_year on public.recon_headers (fiscal_year);
create index idx_recon_headers_reporting_month on public.recon_headers (reporting_month);

create index idx_attachments_recon_id on public.attachments (recon_id);

create index idx_audit_logs_actor_id on public.audit_logs (actor_id);
create index idx_audit_logs_entity_id on public.audit_logs (entity_id);

create index idx_subunit_mapping_parent_opd_id on public.subunit_mapping (parent_opd_id);
