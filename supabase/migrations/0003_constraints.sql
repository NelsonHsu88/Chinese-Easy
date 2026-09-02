-- Chinese Easy — bounds on learner-supplied values
--
-- Row Level Security (0002) decides *whose* rows a client may write. It says
-- nothing about what may be in them, and until this migration there was nothing
-- else that did: `custom_words.definition` was unbounded `text`, `example` was
-- unbounded `jsonb`, and the app is a public client holding a publishable key.
-- So an authenticated learner could write a few hundred megabytes into their own
-- rows. RLS keeps that confined to them, which is why this is a bill-and-
-- availability problem rather than a disclosure one — but `pull.ts` does
-- `select('*')` with no limit, so the account that did it would then pull the
-- whole payload into memory on every device it ever signed into.
--
-- The bounds live here rather than in the client because the client is not in
-- the request path. `maxLength` on a TextInput is a courtesy to the person
-- typing; anyone can POST to PostgREST directly with the same anon key the app
-- ships. The database is the only layer an attacker cannot skip, so it is the
-- only layer where a limit is a control.
--
-- ── Sizes ────────────────────────────────────────────────────────────────────
-- Chosen against what the app can actually produce, with room to spare. The
-- longest word in the bundled bank is 8 characters (`AddCustomWordModal` caps
-- its input there); 32 leaves room for a learner's own compound. Definitions
-- are one line on a flashcard — 512 is already far past readable. `word_id` is
-- an app-generated identity (`cc-學習`, `lk-…`, `custom-…`), so 64 is generous.
--
-- Re-runnable, like 0001 and 0002: every constraint is added only if absent.
-- Postgres has no `add constraint if not exists`, hence the loops.

-- ---------------------------------------------------------------------------
-- Length and size bounds
-- ---------------------------------------------------------------------------

do $mig$
declare
  spec record;
begin
  for spec in
    select * from (values
      -- Learner-authored content: the one place user text is stored, not referenced.
      ('custom_words',   'custom_words_word_id_len',     'char_length(word_id) <= 64'),
      ('custom_words',   'custom_words_simplified_len',  'char_length(simplified) <= 32'),
      ('custom_words',   'custom_words_traditional_len', 'char_length(traditional) <= 32'),
      ('custom_words',   'custom_words_pinyin_len',      'char_length(pinyin) <= 128'),
      ('custom_words',   'custom_words_definition_len',  'char_length(definition) <= 512'),
      ('custom_words',   'custom_words_category_len',    'category is null or char_length(category) <= 32'),
      -- jsonb is measured in bytes, not characters: an example is a sentence
      -- pair plus a translation, so 2 KB is several times what one needs.
      ('custom_words',   'custom_words_example_size',    'example is null or pg_column_size(example) <= 2048'),

      -- Identity and display.
      ('profiles',         'profiles_display_name_len',     'display_name is null or char_length(display_name) <= 64'),
      ('user_preferences', 'user_preferences_username_len', 'username is null or char_length(username) <= 64'),
      ('user_preferences', 'user_preferences_reminder_len',  'char_length(reminder_time) <= 5'),

      -- Identifiers the client supplies. A primary key is still free storage
      -- if nothing bounds it.
      ('srs_cards',      'srs_cards_word_id_len',        'char_length(word_id) <= 64'),
      ('review_events',  'review_events_word_id_len',    'char_length(word_id) <= 64'),
      ('story_progress', 'story_progress_story_id_len',  'char_length(story_id) <= 64'),
      ('completions',    'completions_item_id_len',      'char_length(item_id) <= 64')
    ) as t(tbl, name, expr)
  loop
    if not exists (
      select 1 from pg_constraint
      where conname = spec.name
        and conrelid = format('public.%I', spec.tbl)::regclass
    ) then
      execute format('alter table public.%I add constraint %I check (%s)',
                     spec.tbl, spec.name, spec.expr);
    end if;
  end loop;
end;
$mig$;

-- ---------------------------------------------------------------------------
-- Value domains
-- ---------------------------------------------------------------------------

-- 0001 constrained `srs_cards.state`, `review_events.grade` and
-- `completions.kind` and then stopped, leaving every `user_preferences` column
-- as free text with a default. These mirror the string unions in src/types.ts,
-- so a value the app cannot represent cannot be stored either — the same
-- argument 0001 makes for `state` ("a silent corruption the day the order
-- changed"), applied to the rest of the table.
--
-- **`review_direction`'s default was wrong.** 0001 shipped `default 'zh-en'`,
-- which is not a member of `ReviewDirection` ('recognition' | 'production' |
-- 'mixed') — a leftover from an earlier design. Nothing caught it because
-- nothing writes this table yet (`FEATURES.cloudSync` is false). Left alone, the
-- check below would reject every insert that omitted the column. Corrected to
-- 'production', which is what `DEFAULT_SETTINGS` in AppContext.tsx uses.
alter table public.user_preferences alter column review_direction set default 'production';

do $mig$
declare
  spec record;
begin
  for spec in
    select * from (values
      ('user_preferences_script_domain',    'script in (''simplified'', ''traditional'')'),
      ('user_preferences_phonetic_domain',  'phonetic_script in (''pinyin'', ''zhuyin'')'),
      ('user_preferences_direction_domain', 'review_direction in (''recognition'', ''production'', ''mixed'')'),
      ('user_preferences_order_domain',     'review_order in (''due'', ''shuffled'', ''hardest-first'')'),
      ('user_preferences_goal_domain',      'learning_goal in (''daily-life'', ''travel'', ''exam'', ''culture'')'),
      -- Ranges rather than exact sets: these are numbers a learner nudges, and
      -- the bound is here to stop an absurd one, not to police the UI's steps.
      ('user_preferences_review_limit_range',      'daily_review_limit between 1 and 500'),
      ('user_preferences_new_word_limit_range',    'daily_new_word_limit between 1 and 100'),
      ('user_preferences_wrong_answer_reps_range', 'wrong_answer_reps between 0 and 20'),
      ('user_preferences_hsk_level_range',         'hsk_level between 1 and 7')
    ) as t(name, expr)
  loop
    if not exists (
      select 1 from pg_constraint
      where conname = spec.name
        and conrelid = 'public.user_preferences'::regclass
    ) then
      execute format('alter table public.user_preferences add constraint %I check (%s)',
                     spec.name, spec.expr);
    end if;
  end loop;
end;
$mig$;

-- Counters cannot be negative. `xp` and `streak` are re-derived from
-- `review_events` at merge time (see 0001), but the cached column is written by
-- the client, and a negative XP balance would buy every building in My Town.
do $mig$
declare
  spec record;
begin
  for spec in
    select * from (values
      ('user_state',     'user_state_xp_nonneg',           'xp >= 0'),
      ('user_state',     'user_state_streak_nonneg',       'streak >= 0'),
      ('user_state',     'user_state_placement_hsk_range', 'placement_hsk is null or placement_hsk between 1 and 7'),
      ('daily_activity', 'daily_activity_words_nonneg',    'words_learned >= 0'),
      ('daily_activity', 'daily_activity_reviews_nonneg',  'reviews_completed >= 0'),
      ('story_progress', 'story_progress_page_nonneg',     'page_index >= 0'),
      ('srs_cards',      'srs_cards_reps_nonneg',          'reps >= 0 and lapses >= 0'),
      ('srs_cards',      'srs_cards_practice_nonneg',      'practice_queue >= 0 and practice_total >= 0'),
      ('srs_cards',      'srs_cards_recent_lapses_nonneg', 'recent_lapses >= 0'),
      ('review_events',  'review_events_duration_nonneg',  'duration_ms >= 0')
    ) as t(tbl, name, expr)
  loop
    if not exists (
      select 1 from pg_constraint
      where conname = spec.name
        and conrelid = format('public.%I', spec.tbl)::regclass
    ) then
      execute format('alter table public.%I add constraint %I check (%s)',
                     spec.tbl, spec.name, spec.expr);
    end if;
  end loop;
end;
$mig$;

-- ---------------------------------------------------------------------------
-- Function hardening
-- ---------------------------------------------------------------------------

-- `touch_updated_at` unchanged from 0001 but for `set search_path = ''`, which
-- Supabase's own linter flags as `function_search_path_mutable`. The risk is
-- small today — the function is SECURITY INVOKER, so it runs with the caller's
-- privileges and resolves nothing unqualified — but pinning it costs one line
-- and removes the class outright, including the day somebody extends this
-- function or marks it SECURITY DEFINER without thinking about the path.
--
-- An empty search_path is safe here: `now()` lives in pg_catalog, which is
-- always implicitly on the path and cannot be shadowed.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;
