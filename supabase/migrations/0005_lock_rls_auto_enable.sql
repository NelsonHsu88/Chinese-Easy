-- Chinese Easy — close the API door on `rls_auto_enable()`
--
-- Supabase creates this SECURITY DEFINER function (and the `ensure_rls` event
-- trigger that calls it) when "auto-enable RLS" is switched on for a project.
-- It is created with EXECUTE granted to PUBLIC, `anon` and `authenticated`, so
-- the advisor flags it as callable through `/rest/v1/rpc/rls_auto_enable`
-- (lints 0028 / 0029).
--
-- Nothing in the app calls it, and the event trigger does not need the grant:
-- Postgres does not check EXECUTE when an event trigger fires its function. So
-- the grants go, and the trigger keeps enabling RLS on new tables as before.
--
-- Guarded, because a project without auto-enable RLS has no such function.

do $mig$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$mig$;
