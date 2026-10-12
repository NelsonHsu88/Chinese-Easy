-- Chinese Easy — per-account row limits
--
-- RLS (0002) stops one learner reaching another's rows, and 0003 caps how big
-- each row can be. Neither caps how *many* rows one account may hold, so a
-- script signed in as an ordinary account could insert millions of rows into
-- its own deck and exhaust the project's storage quota — an outage for every
-- learner, paid for by nobody but the developer.
--
-- Each limit below sits well above anything a real learner can reach:
--
--   srs_cards        50,000   the whole learning bank is 25,180 words
--   review_events   500,000   ~5 years at 270 reviews a day, every day
--   custom_words      2,000   custom words can no longer be added in the UI
--   story_progress      500   the library holds 46 stories
--   daily_activity   20,000   one row per day: 54 years
--   completions      10,000   lessons + challenge claims + buildings
--
-- profiles, user_state and user_preferences need nothing: their primary key is
-- the user id, so each account already has at most one row.
--
-- ── How it is checked ──────────────────────────────────────────────────────
-- One AFTER INSERT trigger *per statement*, reading the statement's inserted
-- rows through a transition table. A per-row trigger would count the account's
-- rows once for every row in a sync batch — 500 counts of up to 500,000 rows for
-- one upsert. Per statement it is one count per account in the batch (in
-- practice one), on the primary-key / sync index that already leads with
-- user_id.
--
-- Rows an upsert resolves as an UPDATE, or that `ignoreDuplicates` skips, are
-- not in the transition table, so a re-sync of existing rows never trips a
-- limit. Raising an exception from an AFTER trigger rolls back the whole
-- statement; the client sees an error, `push.ts` leaves that table queued, and
-- the learner's data stays safe on the device.
--
-- SECURITY INVOKER (the default) on purpose: under RLS the count can only see
-- the caller's own rows, which are the only rows the insert policies let them
-- write anyway. No privilege is borrowed.

create or replace function public.enforce_row_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  max_rows integer := TG_ARGV[0]::integer;
  over     record;
begin
  execute format(
    'select n.user_id, count(*) as total
       from (select distinct user_id from new_rows) n
       join public.%I t on t.user_id = n.user_id
      group by n.user_id
     having count(*) > $1
      limit 1',
    TG_TABLE_NAME)
  into over
  using max_rows;

  if over.user_id is not null then
    raise exception 'row limit reached on %: an account may hold at most % rows', TG_TABLE_NAME, max_rows
      using errcode = 'P0001', hint = 'row_limit';
  end if;

  return null;
end;
$$;

do $mig$
declare
  spec record;
begin
  for spec in
    select * from (values
      ('srs_cards',       50000),
      ('review_events',  500000),
      ('custom_words',     2000),
      ('story_progress',    500),
      ('daily_activity',  20000),
      ('completions',     10000)
    ) as t(tbl, max_rows)
  loop
    execute format('drop trigger if exists enforce_row_limit on public.%I', spec.tbl);
    execute format(
      'create trigger enforce_row_limit
         after insert on public.%I
         referencing new table as new_rows
         for each statement
         execute function public.enforce_row_limit(%s)',
      spec.tbl, spec.max_rows);
  end loop;
end;
$mig$;
