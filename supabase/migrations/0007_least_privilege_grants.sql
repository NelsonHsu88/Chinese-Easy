-- Chinese Easy — the API roles get only the privileges the app uses
--
-- Supabase's default grants give `anon` and `authenticated` every table
-- privilege in `public`, RLS then deciding which rows each can touch. Three of
-- those privileges are never used by the app and are not covered by RLS:
--
--   TRUNCATE   empties a whole table and is not subject to row-level security.
--   TRIGGER    lets the role create triggers on the table.
--   REFERENCES lets the role create foreign keys pointing at the table.
--
-- PostgREST cannot issue any of them, so this is defence in depth rather than
-- a fix for a live hole: if a future feature (an RPC, an extension) ever runs
-- SQL as these roles, emptying another learner's rows is still impossible.
--
-- SELECT / INSERT / UPDATE / DELETE stay, and the per-user policies in
-- 0002_rls.sql still decide which rows. `anon` keeps nothing at all: every
-- table is per-user, and a signed-out client has no rows.
--
-- The default privileges line makes the same true of tables created later.

revoke truncate, trigger, references on all tables in schema public from anon, authenticated;
revoke all on all tables in schema public from anon;

alter default privileges in schema public revoke truncate, trigger, references on tables from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon;
