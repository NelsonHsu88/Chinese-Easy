-- Chinese Easy — RLS policies evaluate auth.uid() once per statement
--
-- 0002 wrote every policy as `auth.uid() = user_id`. Postgres treats that as a
-- per-row function call, so a sync pull of 3,000 cards called auth.uid() 3,000
-- times. Wrapped as `(select auth.uid())` it becomes an init-plan: evaluated
-- once and compared as a constant. Same rows allowed, same rows refused —
-- Supabase's advisor flags the unwrapped form as lint 0003 (auth_rls_initplan).
--
-- Re-runnable, like 0002: every policy is dropped before being recreated, and
-- still carries `with check` on UPDATE (see the note at the top of 0002).

drop policy if exists "profiles read own"   on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
drop policy if exists "profiles delete own" on public.profiles;

create policy "profiles read own"   on public.profiles for select
  using ((select auth.uid()) = id);
create policy "profiles insert own" on public.profiles for insert
  with check ((select auth.uid()) = id);
create policy "profiles update own" on public.profiles for update
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "profiles delete own" on public.profiles for delete
  using ((select auth.uid()) = id);

do $$
declare
  t text;
begin
  foreach t in array array[
    'user_state',
    'user_preferences',
    'srs_cards',
    'review_events',
    'custom_words',
    'story_progress',
    'daily_activity',
    'completions'
  ]
  loop
    execute format('drop policy if exists "%s read own"   on public.%I', t, t);
    execute format('drop policy if exists "%s insert own" on public.%I', t, t);
    execute format('drop policy if exists "%s update own" on public.%I', t, t);
    execute format('drop policy if exists "%s delete own" on public.%I', t, t);

    execute format(
      'create policy "%s read own" on public.%I for select
         using ((select auth.uid()) = user_id)', t, t);

    execute format(
      'create policy "%s insert own" on public.%I for insert
         with check ((select auth.uid()) = user_id)', t, t);

    execute format(
      'create policy "%s update own" on public.%I for update
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)', t, t);

    execute format(
      'create policy "%s delete own" on public.%I for delete
         using ((select auth.uid()) = user_id)', t, t);
  end loop;
end;
$$;
