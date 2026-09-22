-- ============================================================
-- 0010: audit_logs
-- ============================================================
create table public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references auth.users(id),
  action       text not null,
  entity       text not null,
  entity_id    uuid,
  before_data  jsonb,
  after_data   jsonb,
  metadata     jsonb,
  created_at   timestamptz not null default now()
);

comment on table public.audit_logs is
  'Append-only audit trail: login/logout, create/update/submit/verify, reset password, master changes, document uploads (spec §32). Written by server-side code only — see RLS migration for the insert-only policy.';
