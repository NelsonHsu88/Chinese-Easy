#!/usr/bin/env node
/*
 * Proves Row Level Security actually isolates two accounts.
 *
 * This is the test the architecture report said must pass before anything is
 * wired, and it is deliberately an *integration* test against a real Supabase
 * project: RLS is enforced by Postgres, so a mock proves nothing about it.
 *
 * ── It does not need a service_role key ─────────────────────────────────────
 * Creating users with an admin key would be convenient and would mean putting a
 * secret that can bypass RLS into a script that lives in the repo. Instead it
 * signs in as two ordinary accounts you create once by hand, which is both
 * safer and a more honest test — it exercises exactly the privileges a real
 * learner's app has.
 *
 * Setup, once:
 *   1. Apply supabase/migrations/0001_schema.sql and 0002_rls.sql
 *   2. Create two confirmed users in Authentication -> Users
 *   3. Put their credentials in .env (see supabase/README.md)
 *
 * Then:  node scripts/testRls.mjs
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
const B_EMAIL = process.env.TEST_USER_B_EMAIL
const B_PASS = process.env.TEST_USER_B_PASSWORD

for (const [name, value] of Object.entries({
  EXPO_PUBLIC_SUPABASE_URL: URL_,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: ANON,
  TEST_USER_A_EMAIL: A_EMAIL,
  TEST_USER_A_PASSWORD: A_PASS,
  TEST_USER_B_EMAIL: B_EMAIL,
  TEST_USER_B_PASSWORD: B_PASS,
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

const TEST_WORD = 'rls-test-word'

async function main() {
  console.log('RLS isolation\n')
  const a = await signIn(A_EMAIL, A_PASS)
  const b = await signIn(B_EMAIL, B_PASS)

  if (a.userId === b.userId) {
    console.error('TEST_USER_A and TEST_USER_B are the same account.')
    process.exit(2)
  }

  /* A writes a card of their own. */
  const seeded = await a.client.from('srs_cards').upsert({
    user_id: a.userId,
    word_id: TEST_WORD,
    due: new Date().toISOString(),
    stability: 3.5,
    difficulty: 5.1,
    state: 'review',
    reps: 4,
    lapses: 1,
  })
  check('A can write a card of their own', seeded.error === null, seeded.error?.message)

  /* ---- B must not be able to touch it in any way ---- */

  const read = await b.client.from('srs_cards').select('*').eq('user_id', a.userId)
  check('B cannot read A', (read.data ?? []).length === 0, `${(read.data ?? []).length} rows visible`)

  const update = await b.client
    .from('srs_cards')
    .update({ stability: 999 })
    .eq('user_id', a.userId)
    .select()
  check('B cannot update A', (update.data ?? []).length === 0)

  const del = await b.client
    .from('srs_cards')
    .delete()
    .eq('user_id', a.userId)
    .select()
  check('B cannot delete A', (del.data ?? []).length === 0)

  const forge = await b.client.from('srs_cards').insert({
    user_id: a.userId, // pretending to be A
    word_id: 'forged',
    due: new Date().toISOString(),
    stability: 1,
    difficulty: 1,
    state: 'new',
  })
  check('B cannot insert rows as A', forge.error !== null, forge.error ? '' : 'insert was allowed')

  /* A's card must be exactly as A left it. */
  const after = await a.client
    .from('srs_cards')
    .select('stability')
    .eq('user_id', a.userId)
    .eq('word_id', TEST_WORD)
    .single()
  check('A card survived untouched', after.data?.stability === 3.5, `stability=${after.data?.stability}`)

  /* ---- a signed-out client must see nothing ---- */
  const anon = createClient(URL_, ANON, { auth: { persistSession: false } })
  for (const table of [
    'profiles',
    'user_state',
    'user_preferences',
    'srs_cards',
    'review_events',
    'custom_words',
    'story_progress',
    'daily_activity',
    'completions',
  ]) {
    const res = await anon.from(table).select('*').limit(1)
    check(`anon reads nothing from ${table}`, res.error !== null || (res.data ?? []).length === 0)
  }

  /* Clean up after ourselves. */
  await a.client.from('srs_cards').delete().eq('user_id', a.userId).eq('word_id', TEST_WORD)

  console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) FAILED.`}`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((error) => {
  console.error(error)
  process.exit(2)
})
