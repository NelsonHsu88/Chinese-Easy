import test from 'node:test'
import assert from 'node:assert/strict'
import { createMemoryStore } from '../keyValueStore'
import {
  ACCOUNT_KEYS,
  ACCOUNT_MACHINERY_KEYS,
  DEVICE_KEYS,
  accountKeys,
  classifyKey,
  legacyKey,
  reviewArchiveChunkKey,
  scopedKey,
  type StorageKey,
  type StorageScope,
} from '../storageKeys'
import {
  adoptGuestProgressExplicitly,
  dismissGuestRecovery,
  findRecoverableGuestProgress,
  hasAccountData,
  maybeAdoptGuestProgress,
  migrateLegacyKeys,
} from '../storageMigration'
import {
  ADOPTION_INTENT_TTL_MS,
  installationId,
  recordGuestAdoptionIntent,
  resolveScope,
} from '../storageScope'

/*
 * Account isolation and migration.
 *
 * These cover the two ways this subsystem can hurt somebody: showing one
 * learner another learner's work, and losing a deck during migration. Both are
 * invisible in ordinary use until the day they are not, so neither is left to
 * inspection.
 *
 * Everything runs against an in-memory `KeyValueStore`, so there is no
 * AsyncStorage and no native module involved.
 */

const USER_A = '11111111-1111-4111-8111-111111111111'
const USER_B = '22222222-2222-4222-8222-222222222222'

const scopeA: StorageScope = { kind: 'user', userId: USER_A }
const scopeB: StorageScope = { kind: 'user', userId: USER_B }

/** A recognisable slice of learning progress. */
function progress(tag: string): Record<StorageKey, string> {
  return {
    deck: JSON.stringify([{ wordId: `${tag}-word`, due: '2026-01-01T00:00:00.000Z', reps: 7 }]),
    xp: JSON.stringify(tag === 'A' ? 4200 : 15),
    streak: JSON.stringify({ streak: tag === 'A' ? 30 : 1, lastActiveDate: '2026-08-18' }),
    settings: JSON.stringify({ username: tag }),
    reviewLog: JSON.stringify([{ wordId: `${tag}-word`, grade: 'good' }]),
    /* The ledger for the sealed review archive. The chunk it counts is seeded
       separately by `seedScope`, because the chunk keys are not `StorageKey`s —
       which is the whole reason `copyArchiveChunks` has to exist. */
    reviewArchive: JSON.stringify({
      v: 1,
      sealed: 1000,
      chunks: 1,
      xp: tag === 'A' ? 9000 : 30,
      grades: { again: 100, hard: 100, good: 400, easy: 400 },
    }),
    customWords: JSON.stringify([]),
    dailyProgress: JSON.stringify([]),
    onboarding: JSON.stringify({ complete: true }),
    storyProgress: JSON.stringify({ [`${tag}-story`]: 3 }),
    completedLessonIds: JSON.stringify([`${tag}-lesson`]),
    claimedChallengeIds: JSON.stringify([]),
    unlockedBuildingIds: JSON.stringify([]),
    newWordHistory: JSON.stringify([]),
    newlyAddedWordIds: JSON.stringify([]),
    subscription: JSON.stringify({ plan: 'yearly', source: 'store' }),
    quarantinedCards: JSON.stringify([]),
  } as Record<StorageKey, string>
}

async function seedScope(
  store: ReturnType<typeof createMemoryStore>,
  scope: StorageScope,
  tag: string,
) {
  const values = progress(tag)
  for (const key of Object.keys(values) as StorageKey[]) {
    await store.set(scopedKey(scope, key), values[key])
  }
  /* The one sealed archive chunk the `reviewArchive` ledger above claims. It is
     seeded by hand because chunk keys are generated rather than declared, so
     `accountKeys()` cannot reach them and neither can the loop above. */
  await store.set(
    reviewArchiveChunkKey(scope, 0),
    JSON.stringify([{ wordId: `${tag}-archived`, grade: 'good' }]),
  )
}

async function readScope(
  store: ReturnType<typeof createMemoryStore>,
  scope: StorageScope,
  key: StorageKey,
) {
  return store.get(scopedKey(scope, key))
}

test('key classification', async (t) => {
  await t.test('every key has exactly one owner', () => {
    for (const key of ACCOUNT_KEYS) assert.equal(classifyKey(key), 'account')
    for (const key of DEVICE_KEYS) assert.equal(classifyKey(key), 'device')
    for (const key of ACCOUNT_KEYS) assert.equal(DEVICE_KEYS.has(key), false)
  })

  await t.test('the test fixture covers every progress key', () => {
    /* Guards against a new account key being added without the migration and
       isolation tests ever exercising it. */
    const seeded = new Set(Object.keys(progress('A')))
    for (const key of accountKeys()) {
      assert.ok(seeded.has(key), `progress() fixture is missing "${key}"`)
    }
  })

  await t.test('machinery keys are scoped but never treated as progress', () => {
    for (const key of ACCOUNT_MACHINERY_KEYS) {
      assert.equal(classifyKey(key), 'account')
      assert.equal(accountKeys().includes(key), false, `${key} would be copied on adoption`)
    }
  })

  await t.test('an unclassified key throws rather than defaulting', () => {
    assert.throws(() => classifyKey('somethingNew' as StorageKey), /not classified/)
  })

  await t.test('device keys are not scoped, and are identical across accounts', () => {
    for (const key of DEVICE_KEYS) {
      assert.equal(scopedKey(scopeA, key), legacyKey(key))
      assert.equal(scopedKey(scopeA, key), scopedKey(scopeB, key))
    }
  })

  await t.test('account keys differ per account, and per guest installation', () => {
    assert.notEqual(scopedKey(scopeA, 'deck'), scopedKey(scopeB, 'deck'))
    assert.equal(scopedKey(scopeA, 'deck'), `chinese-easy:${USER_A}:deck`)
    assert.equal(
      scopedKey({ kind: 'guest', installationId: 'inst-1' }, 'deck'),
      'chinese-easy:guest:inst-1:deck',
    )
    assert.notEqual(
      scopedKey({ kind: 'guest', installationId: 'inst-1' }, 'deck'),
      scopedKey({ kind: 'guest', installationId: 'inst-2' }, 'deck'),
    )
  })
})

test('installation id', async (t) => {
  await t.test('is minted once and then stable', async () => {
    const store = createMemoryStore()
    const first = await installationId(store)
    const second = await installationId(store)
    assert.equal(first, second)
    assert.ok(first.length > 8)
  })

  await t.test('a signed-out learner resolves to a guest scope', async () => {
    const store = createMemoryStore()
    const scope = await resolveScope(store, null)
    assert.equal(scope.kind, 'guest')
  })

  await t.test('a signed-in learner resolves to their own user scope', async () => {
    const store = createMemoryStore()
    const scope = await resolveScope(store, USER_A)
    assert.deepEqual(scope, { kind: 'user', userId: USER_A })
  })
})

test('account isolation', async (t) => {
  await t.test('B sees none of A on the same device', async () => {
    const store = createMemoryStore()
    await seedScope(store, scopeA, 'A')

    /* B has never used this handset. */
    assert.equal(await hasAccountData(store, scopeB), false)
    for (const key of ACCOUNT_KEYS) {
      assert.equal(await readScope(store, scopeB, key), null, `${key} leaked to B`)
    }
  })

  await t.test("A's progress survives B signing in and studying", async () => {
    const store = createMemoryStore()
    await seedScope(store, scopeA, 'A')
    await seedScope(store, scopeB, 'B')

    /* Each account still reads its own values, unchanged. */
    assert.equal(await readScope(store, scopeA, 'xp'), JSON.stringify(4200))
    assert.equal(await readScope(store, scopeB, 'xp'), JSON.stringify(15))
    assert.deepEqual(
      JSON.parse((await readScope(store, scopeA, 'streak')) as string),
      { streak: 30, lastActiveDate: '2026-08-18' },
    )
  })

  await t.test('the entitlement cache is per account', async () => {
    const store = createMemoryStore()
    await seedScope(store, scopeA, 'A')
    assert.equal(await readScope(store, scopeB, 'subscription'), null)
  })
})

test('legacy migration', async (t) => {
  /** A pre-scoping install: flat keys, no namespace. */
  async function legacyInstall() {
    const store = createMemoryStore()
    const values = progress('A')
    for (const key of Object.keys(values) as StorageKey[]) {
      await store.set(legacyKey(key), values[key])
    }
    return store
  }

  await t.test('adopts flat keys into the active scope', async () => {
    const store = await legacyInstall()
    const result = await migrateLegacyKeys(store, scopeA)
    assert.equal(result.status, 'migrated')
    assert.equal(await readScope(store, scopeA, 'xp'), JSON.stringify(4200))
    assert.equal(await readScope(store, scopeA, 'deck'), progress('A').deck)
  })

  await t.test('never deletes the legacy copy', async () => {
    const store = await legacyInstall()
    await migrateLegacyKeys(store, scopeA)
    for (const key of Object.keys(progress('A')) as StorageKey[]) {
      assert.notEqual(await store.get(legacyKey(key)), null, `${key} legacy copy destroyed`)
    }
  })

  await t.test('is idempotent — no duplicated XP, no reset deck', async () => {
    const store = await legacyInstall()
    await migrateLegacyKeys(store, scopeA)
    const afterFirst = store.snapshot()

    const second = await migrateLegacyKeys(store, scopeA)
    assert.equal(second.status, 'already-done')
    assert.deepEqual(store.snapshot(), afterFirst, 'a second run changed stored state')

    const third = await migrateLegacyKeys(store, scopeA)
    assert.equal(third.status, 'already-done')
    assert.equal(await readScope(store, scopeA, 'xp'), JSON.stringify(4200))
  })

  await t.test('SRS data crosses the migration byte-identical', async () => {
    const store = await legacyInstall()
    const before = await store.get(legacyKey('deck'))
    await migrateLegacyKeys(store, scopeA)
    assert.equal(await readScope(store, scopeA, 'deck'), before)
  })

  await t.test('refuses to overwrite a scope that already holds data', async () => {
    const store = await legacyInstall()
    await seedScope(store, scopeA, 'B') // scope already occupied, different values
    const occupied = await readScope(store, scopeA, 'xp')

    const result = await migrateLegacyKeys(store, scopeA)
    assert.equal(result.status, 'target-not-empty')
    assert.equal(await readScope(store, scopeA, 'xp'), occupied, 'existing data overwritten')
  })

  await t.test('a fresh install migrates nothing and says so', async () => {
    const store = createMemoryStore()
    const result = await migrateLegacyKeys(store, scopeA)
    assert.equal(result.status, 'nothing-to-migrate')
  })

  await t.test('device keys are left exactly where they were', async () => {
    const store = await legacyInstall()
    await store.set(legacyKey('tourStep'), '3')
    await store.set(legacyKey('adFrequency'), '{"shown":2}')
    await migrateLegacyKeys(store, scopeA)
    assert.equal(await store.get(legacyKey('tourStep')), '3')
    assert.equal(await store.get(legacyKey('adFrequency')), '{"shown":2}')
    assert.equal(await store.get(`chinese-easy:${USER_A}:tourStep`), null)
  })
})

test('guest adoption', async (t) => {
  const guestScope: StorageScope = { kind: 'guest', installationId: 'inst-1' }

  async function guestWithProgress() {
    const store = createMemoryStore()
    await store.set('chinese-easy:installationId', 'inst-1')
    await seedScope(store, guestScope, 'A')
    return store
  }

  await t.test('a brand-new account adopts the guest progress', async () => {
    const store = await guestWithProgress()
    await recordGuestAdoptionIntent(store, 'learner@example.com')

    const result = await maybeAdoptGuestProgress(store, USER_A, 'learner@example.com')
    assert.equal(result.status, 'adopted')
    assert.equal(await readScope(store, scopeA, 'xp'), JSON.stringify(4200))
  })

  await t.test('adoption leaves the guest namespace intact', async () => {
    const store = await guestWithProgress()
    await recordGuestAdoptionIntent(store, 'learner@example.com')
    await maybeAdoptGuestProgress(store, USER_A, 'learner@example.com')
    assert.equal(await readScope(store, guestScope, 'xp'), JSON.stringify(4200))
  })

  await t.test('adoption is consumed once, so a later account gets nothing', async () => {
    const store = await guestWithProgress()
    await recordGuestAdoptionIntent(store, 'learner@example.com')
    await maybeAdoptGuestProgress(store, USER_A, 'learner@example.com')

    const again = await maybeAdoptGuestProgress(store, USER_B, 'learner@example.com')
    assert.equal(again.status, 'no-intent')
    assert.equal(await readScope(store, scopeB, 'xp'), null)
  })

  await t.test('signing into an existing account adopts nothing — no intent exists', async () => {
    const store = await guestWithProgress()
    /* No sign-up happened on this device, so no intent was ever written. */
    const result = await maybeAdoptGuestProgress(store, USER_B, 'friend@example.com')
    assert.equal(result.status, 'no-intent')
    for (const key of ACCOUNT_KEYS) {
      assert.equal(await readScope(store, scopeB, key), null, `${key} leaked into the friend's account`)
    }
    assert.equal(await readScope(store, guestScope, 'xp'), JSON.stringify(4200))
  })

  await t.test("a friend cannot consume somebody else's intent", async () => {
    const store = await guestWithProgress()
    await recordGuestAdoptionIntent(store, 'owner@example.com')

    const result = await maybeAdoptGuestProgress(store, USER_B, 'friend@example.com')
    assert.equal(result.status, 'not-this-account')
    assert.equal(await readScope(store, scopeB, 'deck'), null)
  })

  await t.test('an account that already has progress is never merged into', async () => {
    const store = await guestWithProgress()
    await recordGuestAdoptionIntent(store, 'learner@example.com')
    await seedScope(store, scopeA, 'B') // the account is established
    const established = await readScope(store, scopeA, 'xp')

    const result = await maybeAdoptGuestProgress(store, USER_A, 'learner@example.com')
    assert.equal(result.status, 'target-not-empty')
    assert.equal(await readScope(store, scopeA, 'xp'), established, 'established account overwritten')
    assert.equal(await readScope(store, guestScope, 'xp'), JSON.stringify(4200), 'guest data destroyed')
  })

  await t.test('a stale intent expires rather than staying armed', async () => {
    const store = await guestWithProgress()
    await recordGuestAdoptionIntent(store, 'learner@example.com')

    const later = Date.now() + ADOPTION_INTENT_TTL_MS + 1000
    const result = await maybeAdoptGuestProgress(store, USER_A, 'learner@example.com', later)
    assert.equal(result.status, 'no-intent')
    assert.equal(await readScope(store, scopeA, 'deck'), null)
  })

  await t.test('email matching ignores case and surrounding space', async () => {
    const store = await guestWithProgress()
    await recordGuestAdoptionIntent(store, '  Learner@Example.com ')
    const result = await maybeAdoptGuestProgress(store, USER_A, 'learner@example.com')
    assert.equal(result.status, 'adopted')
  })
})

test('stranded guest progress', async (t) => {
  const guestScope: StorageScope = { kind: 'guest', installationId: 'inst-1' }

  async function strandedInstall() {
    const store = createMemoryStore()
    await store.set('chinese-easy:installationId', 'inst-1')
    await seedScope(store, guestScope, 'A')
    return store
  }

  await t.test('is offered to a signed-in account with nothing of its own', async () => {
    const store = await strandedInstall()
    const found = await findRecoverableGuestProgress(store, scopeA, 'inst-1')
    assert.ok(found)
    assert.equal(found.deckCount, 1)
    assert.equal(found.xp, 4200)
    assert.equal(found.streak, 30)
  })

  await t.test('is not offered to an account that already has progress', async () => {
    const store = await strandedInstall()
    await seedScope(store, scopeA, 'B')
    assert.equal(await findRecoverableGuestProgress(store, scopeA, 'inst-1'), null)
  })

  await t.test('is not offered when the guest side is empty', async () => {
    const store = createMemoryStore()
    await store.set('chinese-easy:installationId', 'inst-1')
    assert.equal(await findRecoverableGuestProgress(store, scopeA, 'inst-1'), null)
  })

  await t.test('is not offered again once declined', async () => {
    const store = await strandedInstall()
    await dismissGuestRecovery(store, USER_A)
    assert.equal(await findRecoverableGuestProgress(store, scopeA, 'inst-1'), null)
    /* ...but a different account on the same device is still asked. */
    assert.ok(await findRecoverableGuestProgress(store, scopeB, 'inst-1'))
  })

  await t.test('accepting copies the progress and leaves the guest copy', async () => {
    const store = await strandedInstall()
    const result = await adoptGuestProgressExplicitly(store, scopeA, 'inst-1')
    assert.equal(result.status, 'adopted')
    assert.equal(await readScope(store, scopeA, 'deck'), progress('A').deck)
    assert.equal(await readScope(store, guestScope, 'deck'), progress('A').deck)
  })

  await t.test('accepting carries the sealed review archive, not just the ledger', async () => {
    /* The ledger is an ordinary account key and rides along with the rest. The
       chunks it counts are not keys `accountKeys()` knows about, so without
       `copyArchiveChunks` an adopted account would arrive claiming a thousand
       sealed reviews and holding none of them — a history that reads as
       corrupt the first time anything asks to see it. */
    const store = await strandedInstall()
    await adoptGuestProgressExplicitly(store, scopeA, 'inst-1')

    const chunk = await store.get(reviewArchiveChunkKey(scopeA, 0))
    assert.equal(chunk, JSON.stringify([{ wordId: 'A-archived', grade: 'good' }]))
    /* And the guest's copy is still there, like every other adopted value. */
    assert.equal(await store.get(reviewArchiveChunkKey(guestScope, 0)), chunk)
  })

  await t.test('accepting is not offered twice', async () => {
    const store = await strandedInstall()
    await adoptGuestProgressExplicitly(store, scopeA, 'inst-1')
    assert.equal(await findRecoverableGuestProgress(store, scopeA, 'inst-1'), null)
  })

  await t.test('re-checks emptiness at the moment of acceptance, not of the offer', async () => {
    const store = await strandedInstall()
    const offered = await findRecoverableGuestProgress(store, scopeA, 'inst-1')
    assert.ok(offered)
    /* The account fills up between the offer being shown and answered. */
    await seedScope(store, scopeA, 'B')
    const established = await readScope(store, scopeA, 'xp')

    const result = await adoptGuestProgressExplicitly(store, scopeA, 'inst-1')
    assert.equal(result.status, 'target-not-empty')
    assert.equal(await readScope(store, scopeA, 'xp'), established)
  })

  await t.test('declining destroys nothing', async () => {
    const store = await strandedInstall()
    await dismissGuestRecovery(store, USER_A)
    assert.equal(await readScope(store, guestScope, 'xp'), JSON.stringify(4200))
  })
})
