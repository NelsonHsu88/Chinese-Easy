# Supabase — schema and security

Version-controlled migrations for account-owned learning progress.

**Applied to the live project (`qaotewdbkwyrphfytomw`) on 2026-08-18.** Both
migrations are recorded in the remote migration history; all nine tables and
twelve indexes were verified present afterwards, and a signed-out client is
refused on every table with `42501 insufficient_privilege`.

**Nothing in the app reads or writes these tables yet.** `FEATURES.cloudSync`
is false, and the app still stores everything locally, namespaced per account
(`src/lib/storageKeys.ts`). Applying these migrations changed nothing about how
Chinese Easy behaves today.

| File | What it does |
|---|---|
| `migrations/0001_schema.sql` | Nine tables, keys, indexes, `updated_at` triggers |
| `migrations/0002_rls.sql` | Row Level Security + 36 policies + role grants |
| `migrations/0003_constraints.sql` | Length/size bounds, value domains, `search_path` pin |

`0003` is the answer to a question `0002` does not address. RLS decides *whose*
rows a client may write; nothing decided what could be in them. `custom_words`
had unbounded `text` columns and an unbounded `jsonb`, so an authenticated
learner could write a few hundred megabytes into their own rows — confined to
them by RLS, and therefore a storage-bill and availability problem rather than a
disclosure one, but `pull.ts` does `select('*')` with no limit, so that account
would then pull the lot into memory on every device it signed into.

It also fixes a latent bug: `0001` shipped `review_direction default 'zh-en'`,
which is not a member of `ReviewDirection` in `src/types.ts`
(`'recognition' | 'production' | 'mixed'`) — a leftover from an earlier design
that nothing caught because nothing writes this table yet. The default is
corrected to `'production'` before the matching check constraint is added.

**Bounds belong here, not in the client.** `maxLength` on a `TextInput` is a
courtesy to the person typing; anyone can POST to PostgREST with the same
publishable key the app ships. `AddCustomWordModal` mirrors these numbers so a
learner meets a field that stops rather than a write that is rejected — but this
file is the source of truth, and changing one means changing both.

## Applying them

Either paste each file into the Supabase dashboard's **SQL Editor** and run it,
in numeric order, or use the CLI:

```
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Both files are re-runnable: every object uses `if not exists`, and every policy
is dropped before being recreated.

## Verifying isolation

RLS is enforced by Postgres, so a mock proves nothing about it. `scripts/testRls.mjs`
is an integration test against your real project.

It deliberately **does not use a `service_role` key** — an admin key can bypass
RLS entirely, so testing with one would prove the opposite of what is wanted,
and it would put a secret in a script that lives in the repo. It signs in as two
ordinary accounts instead, which is exactly the privilege a real learner's app
has.

1. Apply both migrations
2. Create two confirmed users under **Authentication → Users**
3. Add to `.env` (already gitignored):

```
TEST_USER_A_EMAIL=a@example.com
TEST_USER_A_PASSWORD=…
TEST_USER_B_EMAIL=b@example.com
TEST_USER_B_PASSWORD=…
```

4. Run it:

```
node scripts/testRls.mjs
```

It checks that B cannot read, update or delete A's rows; that B cannot insert a
row carrying A's `user_id`; that A's data is untouched afterwards; and that a
signed-out client reads nothing from any of the nine tables.

## Settings that live in the dashboard, not in this repo

These are real controls with no file to review, which is the problem — nobody can
tell from the repository whether they are set. Check them by hand, and treat this
list as the record of what they should be.

| Setting | Where | Why it matters |
|---|---|---|
| **Redirect allowlist** | Authentication → URL Configuration | `AuthContext` derives its callback from the app scheme and relies entirely on this list to stop another app claiming the redirect. Must contain the `chineseeasy://auth/callback` and `exp://` forms, and the web origin. |
| **Auth rate limits** | Authentication → Rate Limits | The only brute-force protection the project has — the app owns no rate limiter, and with no server tier there is nowhere to add one. Defaults are sane; the point is to know they are unchanged. |
| **Leaked password protection** | Authentication → Policies | Free, and the only defence against credential stuffing if email/password is ever wired. Currently dormant: no screen calls `signInWithEmail`. |
| **Email confirmation** | Authentication → Providers | `signUpWithEmail` already handles the no-session case (`needsEmailConfirmation`), so leaving this on costs nothing and is what makes that branch correct. |
| **Test users** | Authentication → Users | The two accounts `scripts/testRls.mjs` signs in as. Give them distinct high-entropy passwords, and prefer a separate project so a test credential grants nothing on production. |

## Notes on the design

- **No dictionary content is duplicated per user.** `word_id` references the
  app's own bundled identity, so a 3,000-card learner costs roughly 300 KB.
  `custom_words` is the exception, because the learner authored it.
- **`xp` and `streak` are stored but not authoritative.** Once two devices
  exist, both are derived from `review_events` and `completions` — a counter
  cannot be merged. The columns are a cache of that derivation.
- **`review_events.id` is generated on the device**, which is what makes
  replaying a sync idempotent rather than duplicating reviews.
- **`custom_words.deleted_at` is a tombstone.** A hard delete on one device
  would otherwise be resurrected by another device's stale copy.
- **`profiles` keys on `id`; every other table keys on `user_id`.** That is the
  only variation in the policies.

## Blockers before any of this is wired

1. **Word IDs must become a frozen contract.** They have changed once already
   (positional `imp-1-0001` → content-derived `cc-學習`), and `AppContext` still
   silently drops cards whose `wordId` does not resolve. Today that costs one
   device's deck; after sync the deletion would replicate to every device.
   **Still open.** Not addressed by these migrations.

2. ~~**XP must stop being a bare counter.**~~ **Addressed.** `xp` is still a
   stored counter, but it is no longer the only answer: `review_events` is now
   a complete history rather than a truncated one, so XP can be *derived* from
   it exactly. `lib/reviewHistory.ts` keeps every graded review — a bounded
   in-memory window over an append-only archive, with a ledger carrying what
   the sealed part adds up to — and `restoreFromCloud` passes that derivation
   to `mergeXp` as `derivedXp`. Before, the log was capped at 5,000 entries and
   the derivation silently undercounted, which made it a third opinion rather
   than an authority.

3. **The push half is not wired.** `lib/sync/push.ts` can drain an outbox and
   `AppContext` fills one, but nothing calls `pushOutbox` — so the queue
   accumulates and is never sent. Restoring works; uploading does not.
