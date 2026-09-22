-- ============================================================
-- 0014: RLS helper functions
-- ============================================================
-- security definer + fixed search_path so these can be safely called
-- from inside RLS policies (which run as the querying user) while
-- still reading public.profiles reliably. STABLE so the planner can
-- cache the result within a single statement.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.aktif = true
  );
$$;

comment on function public.is_admin() is
  'True if the currently authenticated user (auth.uid()) is an active admin. Used by every RLS policy below — never reimplement this check inline in a policy.';

create or replace function public.get_my_opd_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.opd_id
  from public.profiles p
  where p.id = auth.uid()
    and p.role = 'opd'
    and p.aktif = true;
$$;

comment on function public.get_my_opd_id() is
  'Returns the opd_id of the currently authenticated OPD user, or NULL if the caller is not an active opd-role user.';
