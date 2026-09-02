-- Chinese Easy — Row Level Security
--
-- The database enforces ownership. A `user_id` sent from JavaScript is never
-- trusted on its own: `auth.uid()` comes from the verified JWT, and every
-- policy below compares against it.
--
-- ── The clause that is easy to omit ────────────────────────────────────────
-- `with check` on UPDATE. With `using` alone, a learner may target their own
-- row and rewrite `user_id` to somebody else's — handing their row to another
-- account, or planting a card in it. `using` decides which rows may be touched;
-- `with check` decides what they are allowed to become. Both, on every update
-- policy, on every table.
--
-- `profiles` keys on `id` rather than `user_id`; everything else keys on
-- `user_id`. That is the only variation.

-- ---------------------------------------------------------------------------
-- profiles — keyed on id
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

drop policy if exists "profiles read own"   on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
drop policy if exists "profiles delete own" on public.profiles;

create policy "profiles read own"   on public.profiles for select
  using (auth.uid() = id);
create policy "profiles insert own" on public.profiles for insert
  with check (auth.uid() = id);
create policy "profiles update own" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles delete own" on public.profiles for delete
  using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Everything else — keyed on user_id, identical four policies each
-- ---------------------------------------------------------------------------

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
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "%s read own"   on public.%I', t, t);
    execute format('drop policy if exists "%s insert own" on public.%I', t, t);
    execute format('drop policy if exists "%s update own" on public.%I', t, t);
    execute format('drop policy if exists "%s delete own" on public.%I', t, t);

    execute format(
      'create policy "%s read own" on public.%I for select
         using (auth.uid() = user_id)', t, t);

    execute format(
      'create policy "%s insert own" on public.%I for insert
         with check (auth.uid() = user_id)', t, t);

    -- Both clauses. See the note at the top of this file.
    execute format(
      'create policy "%s update own" on public.%I for update
         using (auth.uid() = user_id)
         with check (auth.uid() = user_id)', t, t);

    execute format(
      'create policy "%s delete own" on public.%I for delete
         using (auth.uid() = user_id)', t, t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Role grants
-- ---------------------------------------------------------------------------

-- RLS filters rows; grants decide who may attempt a statement at all. Signed-in
-- learners get the four verbs (constrained by the policies above); `anon` gets
-- nothing, so a signed-out client cannot read a single row even by accident.
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'user_state', 'user_preferences', 'srs_cards',
    'review_events', 'custom_words', 'story_progress', 'daily_activity',
    'completions'
  ]
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end;
$$;
