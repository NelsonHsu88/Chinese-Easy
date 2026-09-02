-- Chinese Easy — account-owned learning progress
--
-- Nine tables, no blobs. A single JSON document per user would be simpler to
-- write and wrong for this app: the deck grows without bound, is touched a few
-- hundred times per session, and must merge across devices card by card. A blob
-- forces the whole deck through every write and makes per-card conflict
-- resolution impossible.
--
-- Two rules run through the whole schema:
--
--   1. No dictionary content is duplicated per user. `word_id` points at the
--      app's own bundled identity (`cc-學習`, `lk-…`, `custom-…`), so a
--      3,000-card learner costs ~300 KB rather than a copy of the word bank.
--      `custom_words` is the sole exception, and correctly so — the learner
--      authored it.
--
--   2. Every row carries `user_id` referencing `auth.users` with
--      `on delete cascade`. That is what makes account deletion a single
--      statement, and what gives Row Level Security (0002) a column to key on.
--
-- Nothing in the app reads or writes these tables yet. This migration is the
-- schema half of Stage 3; wiring is a later stage.

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

-- Rarely written. Separated from `user_state` below by write frequency: this
-- changes when someone edits their name, that changes every session.
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Gameplay counters
-- ---------------------------------------------------------------------------

-- One row per learner, written often.
--
-- `xp` and `streak` are stored, but they are *not* the authority once two
-- devices exist: both are derived from `review_events` + `completions` at merge
-- time, because a counter cannot be reconciled (two devices each earning 40 XP
-- can only merge to 40 or 80, and both are wrong). These columns are a cache of
-- that derivation so the app has something to show immediately.
create table if not exists public.user_state (
  user_id               uuid primary key references auth.users(id) on delete cascade,
  xp                    integer not null default 0,
  streak                integer not null default 0,
  last_active_date      date,
  onboarding_complete   boolean not null default false,
  placement_hsk         smallint,
  placement_completed_at timestamptz,
  updated_at            timestamptz not null default now()
);

-- The account half of AppSettings, as real columns so one changed field is one
-- merge rather than a whole-blob overwrite that reverts unrelated settings.
-- The device half (sound, haptics, notification permission) is deliberately
-- absent — see lib/storageKeys.ts.
create table if not exists public.user_preferences (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  script               text    not null default 'traditional',
  phonetic_script      text    not null default 'pinyin',
  review_direction     text    not null default 'zh-en',
  review_order         text    not null default 'due',
  daily_review_limit   integer not null default 30,
  daily_new_word_limit integer not null default 5,
  wrong_answer_reps    integer not null default 3,
  hsk_level            smallint not null default 1,
  learning_goal        text    not null default 'daily-life',
  reminder_time        text    not null default '19:00',
  username             text,
  updated_at           timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- The deck
-- ---------------------------------------------------------------------------

-- Column names match `SrsCard` in src/types.ts exactly, and deliberately.
-- Renaming a field here would mean a translation layer between the scheduler
-- and the database, which is precisely where a due date gets quietly lost.
--
-- `schema_version` is `SrsCard.v`: 1 = SM-2, 2 = FSRS. It travels with the row
-- so a v1 card is still recognisable as v1 after a round trip and the existing
-- `migrateDeck` keeps working untouched.
create table if not exists public.srs_cards (
  user_id        uuid not null references auth.users(id) on delete cascade,
  word_id        text not null,
  schema_version smallint not null default 2,

  due            timestamptz not null,
  stability      double precision not null,
  difficulty     double precision not null,
  elapsed_days   double precision not null default 0,
  scheduled_days double precision not null default 0,
  learning_steps integer not null default 0,
  -- Text, not an enum ordinal. `SrsState` in src/types.ts is a string union
  -- ('new' | 'learning' | 'review' | 'relearning'); storing a number here would
  -- mean a lookup table on both sides of the wire and a silent corruption the
  -- day the order changed.
  state          text not null check (state in ('new', 'learning', 'review', 'relearning')),
  last_review    timestamptz,
  reps           integer not null default 0,
  lapses         integer not null default 0,

  -- Chinese Easy's own fields
  recent_lapses  integer not null default 0,
  practice_queue integer not null default 0,
  practice_total integer not null default 0,

  updated_at     timestamptz not null default now(),
  primary key (user_id, word_id)
);

-- Incremental pull: "everything of mine that changed since I last synced".
create index if not exists srs_cards_sync_idx on public.srs_cards (user_id, updated_at);

-- Append-only. `id` is generated on the device, which is what makes replaying a
-- sync idempotent: the same event inserted twice collides on the primary key
-- and is discarded, rather than becoming two reviews that never happened.
--
-- "I don't know" is deliberately absent, matching the app: it submits no
-- rating and changes no schedule, so recording it would put a review in the
-- history that did not occur.
create table if not exists public.review_events (
  id             uuid primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  word_id        text not null,
  grade          text not null check (grade in ('again', 'hard', 'good', 'easy')),
  reviewed_at    timestamptz not null,
  state_before   text not null check (state_before in ('new', 'learning', 'review', 'relearning')),
  scheduled_days double precision not null default 0,
  duration_ms    integer not null default 0
);

create index if not exists review_events_sync_idx
  on public.review_events (user_id, reviewed_at desc);

-- ---------------------------------------------------------------------------
-- Learner-authored content
-- ---------------------------------------------------------------------------

-- The one place user content is stored rather than referenced.
-- `deleted_at` is a tombstone: a hard delete on one device would otherwise be
-- resurrected by another device's stale copy on the next sync.
create table if not exists public.custom_words (
  user_id     uuid not null references auth.users(id) on delete cascade,
  word_id     text not null,
  simplified  text not null,
  traditional text not null,
  pinyin      text not null,
  definition  text not null,
  hsk_level   smallint not null default 0,
  category    text,
  example     jsonb,
  deleted_at  timestamptz,
  updated_at  timestamptz not null default now(),
  primary key (user_id, word_id)
);

create index if not exists custom_words_sync_idx on public.custom_words (user_id, updated_at);

-- ---------------------------------------------------------------------------
-- Progress
-- ---------------------------------------------------------------------------

-- Per-story rows rather than one JSON map, so the merge rule (greater page
-- index wins) applies per story instead of per whole object.
create table if not exists public.story_progress (
  user_id    uuid not null references auth.users(id) on delete cascade,
  story_id   text not null,
  page_index integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, story_id)
);

-- Backs the heatmap, the This Week strip and the streak. Per-date rows merge
-- cleanly; these counters are also re-derivable from `review_events`.
create table if not exists public.daily_activity (
  user_id           uuid not null references auth.users(id) on delete cascade,
  activity_date     date not null,
  words_learned     integer not null default 0,
  reviews_completed integer not null default 0,
  updated_at        timestamptz not null default now(),
  primary key (user_id, activity_date)
);

-- Lessons, challenge claims and building unlocks are all "this id is done,
-- once" — monotonic, union-merged, never un-done. One table with a `kind`
-- discriminator beats three near-identical ones, and adding a fourth kind
-- later is a value rather than a migration.
create table if not exists public.completions (
  user_id      uuid not null references auth.users(id) on delete cascade,
  kind         text not null check (kind in ('lesson', 'challenge', 'building')),
  item_id      text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, kind, item_id)
);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

-- Sync pulls "changed since", so `updated_at` has to be true even when a client
-- forgets to send it. Set in the database rather than trusted from the device,
-- whose clock may be wrong or deliberately altered.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'user_state', 'user_preferences', 'srs_cards',
    'custom_words', 'story_progress', 'daily_activity'
  ]
  loop
    execute format('drop trigger if exists touch_updated_at on public.%I', t);
    execute format(
      'create trigger touch_updated_at before update on public.%I
         for each row execute function public.touch_updated_at()', t);
  end loop;
end;
$$;
