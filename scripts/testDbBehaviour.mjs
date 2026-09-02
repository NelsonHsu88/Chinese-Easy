#!/usr/bin/env node
/*
 * Proves the schema behaves the way the sync layer assumes it does.
 *
 * `testRls.mjs` answers "can one learner reach another's rows". This answers a
 * different question: **does real Postgres do what the mocked client in
 * `src/lib/__tests__/sync-push.test.ts` pretends it does?** Those tests assert
 * that `pushOutbox` calls `upsert` with certain options; nothing in them proves
 * that Postgres, given those options, produces one row rather than two, or
 * keeps a replayed review event unchanged, or rejects a bad state.
 *
 * Every contract checked here is one `src/lib/sync/push.ts` actually depends on:
 *
 *   srs_cards      upsert onConflict 'user_id,word_id'          -> update in place
 *   review_events  upsert onConflict 'id', ignoreDuplicates     -> replay is a no-op
 *   custom_words   `example` is jsonb                           -> object round-trips
 *   *              `updated_at` maintained by trigger           -> server time, not the device's
 *   srs_cards      state CHECK                                  -> a bad state is refused
 *
 * Same setup and same credentials as `testRls.mjs`, and deliberately the same
 * privilege: an ordinary signed-in account, never a service_role key.
 *
 *   node scripts/testDbBehaviour.mjs
 */

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

/* Minimal .env reader — this runs outside Expo, which would otherwise do it. */
function loadEnv() {
  try {
    for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
      if (!match) continue
      const value = match[2].replace(/^["']|["']$/g, '')
      if (!process.env[match[1]]) process.env[match[1]] = value
    }
  } catch {
    /* no .env — rely on the real environment */
  }
}
loadEnv()

const URL_ = process.env.EXPO_PUBLIC_SUPABASE_URL
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
const A_EMAIL = process.env.TEST_USER_A_EMAIL
const A_PASS = process.env.TEST_USER_A_PASSWORD

for (const [name, value] of Object.entries({
  EXPO_PUBLIC_SUPABASE_URL: URL_,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: ANON,
  TEST_USER_A_EMAIL: A_EMAIL,
  TEST_USER_A_PASSWORD: A_PASS,
})) {
  if (!value) {
    console.error(`Missing ${name}. See supabase/README.md.`)
    process.exit(2)
  }
}

let failures = 0
function check(name, passed, detail = '') {
  console.log(`${passed ? '  PASS' : '  FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
  if (!passed) failures += 1
}

function note(text) {
  console.log(`  NOTE  ${text}`)
}

async function signIn(email, password) {
  const client = createClient(URL_, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) {
    console.error(`Could not sign in as ${email}: ${error.message}`)
    process.exit(2)
  }
  return { client, userId: data.user.id }
}

const WORD = 'behaviour-test-word'
const STORY = 'behaviour-test-story'
/* A fixed uuid, so a replay collides on the primary key exactly as a real
   re-sent event would. */
const EVENT_ID = '3f7c1b20-0000-4000-8000-00000000abcd'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function main() {
  console.log('Schema behaviour against real Postgres\n')
  const a = await signIn(A_EMAIL, A_PASS)
  const uid = a.userId
  const db = a.client

  // ── onConflict: an upsert updates in place rather than duplicating ──────────

  const card = (stability) => ({
    user_id: uid,
    word_id: WORD,
    due: '2026-09-01T10:00:00.000Z',
    stability,
    difficulty: 5.1,
    state: 'review',
    reps: 4,
    lapses: 1,
  })

  await db.from('srs_cards').upsert(card(3.5), { onConflict: 'user_id,word_id' })
  const second = await db
    .from('srs_cards')
    .upsert(card(7.25), { onConflict: 'user_id,word_id' })
  check('srs_cards upsert on the composite key does not error', second.error === null, second.error?.message)

  const cards = await db.from('srs_cards').select('*').eq('user_id', uid).eq('word_id', WORD)
  check('upserting twice leaves exactly one row', (cards.data ?? []).length === 1, `${(cards.data ?? []).length} rows`)
  check('the second upsert won', cards.data?.[0]?.stability === 7.25, `stability=${cards.data?.[0]?.stability}`)

  // ── timestamptz and double precision survive the round trip ────────────────

  check(
    'due round-trips as the same instant',
    new Date(cards.data?.[0]?.due).toISOString() === '2026-09-01T10:00:00.000Z',
    String(cards.data?.[0]?.due),
  )
  /* FSRS stability is a float and the scheduler is sensitive to it — an integer
     column here would silently round every interval. */
  await db.from('srs_cards').upsert(card(12.3456789), { onConflict: 'user_id,word_id' })
  const precise = await db.from('srs_cards').select('stability').eq('user_id', uid).eq('word_id', WORD)
  check('stability keeps full float precision', precise.data?.[0]?.stability === 12.3456789, `${precise.data?.[0]?.stability}`)

  // ── updated_at is the server's, not the device's ───────────────────────────

  const before = await db.from('srs_cards').select('updated_at').eq('user_id', uid).eq('word_id', WORD)
  const beforeAt = before.data?.[0]?.updated_at
  await sleep(1100)
  /* A device claiming an absurd modification time must not be believed — sync
     pulls "changed since", so a client-controlled updated_at is a way to make
     your row invisible to your other phone, or permanently newest. */
  await db
    .from('srs_cards')
    .update({ stability: 9.5, updated_at: '2001-01-01T00:00:00.000Z' })
    .eq('user_id', uid)
    .eq('word_id', WORD)
  const after = await db.from('srs_cards').select('updated_at').eq('user_id', uid).eq('word_id', WORD)
  const afterAt = after.data?.[0]?.updated_at

  check('updated_at moves forward on update', Date.parse(afterAt) > Date.parse(beforeAt), `${beforeAt} -> ${afterAt}`)
  check(
    'a device-supplied updated_at is overwritten by the trigger',
    Date.parse(afterAt) > Date.parse('2001-01-01T00:00:00.000Z'),
    String(afterAt),
  )

  // ── CHECK constraints reject values the app's unions cannot produce ────────

  const badState = await db.from('srs_cards').upsert({ ...card(1), word_id: `${WORD}-bad`, state: 'asleep' })
  check('srs_cards rejects an unknown state', badState.error !== null, badState.error?.code ?? 'no error!')

  const badGrade = await db.from('review_events').insert({
    id: '3f7c1b20-0000-4000-8000-00000000bad0',
    user_id: uid,
    word_id: WORD,
    grade: 'terrible',
    reviewed_at: new Date().toISOString(),
    state_before: 'review',
  })
  check('review_events rejects an unknown grade', badGrade.error !== null, badGrade.error?.code ?? 'no error!')

  const badKind = await db.from('completions').insert({ user_id: uid, kind: 'sticker', item_id: 'x' })
  check('completions rejects an unknown kind', badKind.error !== null, badKind.error?.code ?? 'no error!')

  // ── review_events: a replayed event must be a silent no-op ─────────────────

  const event = (durationMs) => ({
    id: EVENT_ID,
    user_id: uid,
    word_id: WORD,
    grade: 'good',
    reviewed_at: '2026-09-01T10:00:00.000Z',
    state_before: 'review',
    scheduled_days: 4,
    duration_ms: durationMs,
  })

  await db.from('review_events').upsert(event(3000), { onConflict: 'id', ignoreDuplicates: true })
  const replay = await db
    .from('review_events')
    .upsert(event(999999), { onConflict: 'id', ignoreDuplicates: true })
  check('replaying a review event does not error', replay.error === null, replay.error?.message)

  const events = await db.from('review_events').select('*').eq('id', EVENT_ID)
  check('a replayed event stays one row', (events.data ?? []).length === 1, `${(events.data ?? []).length} rows`)
  check(
    'ignoreDuplicates leaves the original untouched',
    events.data?.[0]?.duration_ms === 3000,
    `duration_ms=${events.data?.[0]?.duration_ms}`,
  )

  // ── jsonb round-trips as an object, not a string ───────────────────────────

  const example = {
    simplified: '我喜欢学习',
    traditional: '我喜歡學習',
    pinyin: 'wǒ xǐhuān xuéxí',
    translation: 'I like studying',
  }
  const custom = await db.from('custom_words').upsert(
    {
      user_id: uid,
      word_id: 'behaviour-custom',
      simplified: '学习',
      traditional: '學習',
      pinyin: 'xuéxí',
      definition: 'to study',
      example,
    },
    { onConflict: 'user_id,word_id' },
  )
  check('custom_words accepts a jsonb example', custom.error === null, custom.error?.message)

  const readBack = await db
    .from('custom_words')
    .select('example, deleted_at')
    .eq('user_id', uid)
    .eq('word_id', 'behaviour-custom')
  const got = readBack.data?.[0]?.example
  check('jsonb comes back as an object, not a string', got !== null && typeof got === 'object')
  check('jsonb survives non-ASCII intact', got?.traditional === '我喜歡學習', String(got?.traditional))
  check('the deleted_at tombstone defaults to null', readBack.data?.[0]?.deleted_at === null)

  // ── composite primary keys really are unique ───────────────────────────────

  await db.from('story_progress').upsert({ user_id: uid, story_id: STORY, page_index: 2 }, { onConflict: 'user_id,story_id' })
  await db.from('story_progress').upsert({ user_id: uid, story_id: STORY, page_index: 5 }, { onConflict: 'user_id,story_id' })
  const stories = await db.from('story_progress').select('*').eq('user_id', uid).eq('story_id', STORY)
  check('story_progress is unique per (user, story)', (stories.data ?? []).length === 1, `${(stories.data ?? []).length} rows`)
  check('the later page index won', stories.data?.[0]?.page_index === 5)

  const dupEvent = await db.from('review_events').insert(event(1))
  check(
    'a plain insert of a duplicate id is refused (23505)',
    dupEvent.error !== null && dupEvent.error.code === '23505',
    dupEvent.error?.code ?? 'no error!',
  )

  // ── what an ordinary session structurally cannot test ──────────────────────

  const foreign = await db.from('srs_cards').insert({
    ...card(1),
    word_id: `${WORD}-foreign`,
    user_id: '00000000-0000-4000-8000-000000000000',
  })
  check('a row claiming a non-existent user is refused', foreign.error !== null, foreign.error?.code ?? 'no error!')
  note(
    'That refusal is RLS (42501), not the foreign key — the insert policy checks ' +
      'auth.uid() = user_id and never gets far enough to consult auth.users. The FK ' +
      'is therefore unreachable from an ordinary session, which is correct: it exists ' +
      'to make ON DELETE CASCADE work, not to be a client-facing constraint.',
  )
  note(
    'ON DELETE CASCADE is NOT verified here. Proving it means deleting an auth.users ' +
      'row, which needs admin privilege this script deliberately does not hold. It is ' +
      'exercised by the Stage 9 Delete Account flow, and must be tested there.',
  )

  /* Clean up after ourselves. Order does not matter — these are all A's own rows. */
  await db.from('srs_cards').delete().eq('user_id', uid).like('word_id', `${WORD}%`)
  await db.from('review_events').delete().eq('id', EVENT_ID)
  await db.from('custom_words').delete().eq('user_id', uid).eq('word_id', 'behaviour-custom')
  await db.from('story_progress').delete().eq('user_id', uid).eq('story_id', STORY)

  console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) FAILED.`}`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((error) => {
  console.error(error)
  process.exit(2)
})
