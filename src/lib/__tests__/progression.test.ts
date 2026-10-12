import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  getLevelFromXp,
  getLevelProgress,
  getXpIntoCurrentLevel,
  getXpRequiredForNextLevel,
  levelTitle,
  xpAtLevelStart,
  xpRequiredForLevel,
} from '../progression/levels'
import { ACHIEVEMENTS, MAX_PINNED, countDailyChallengeClaims, type AchievementStats } from '../progression/achievements'
import {
  DEFAULT_PROGRESSION,
  evaluateAchievements,
  normaliseProgression,
  pinAchievement,
  placeGardenItem,
  reachLevel,
  removeGardenItem,
  replacePinnedAchievement,
  setRewardEquipped,
} from '../progression/state'

/*
 * The progression rules. These are the parts of the profile where a quiet
 * mistake costs the learner something they earned — a level that doesn't
 * arrive, a reward that vanishes, a fourth trophy silently evicting a third.
 */

const NOW = '2026-09-29T12:00:00.000Z'

const ZERO: AchievementStats = {
  wordsSaved: 0,
  reviews: 0,
  reviewSessions: 0,
  charactersWritten: 0,
  listeningAnswered: 0,
  listeningCorrect: 0,
  storiesFinished: 0,
  streak: 0,
  dailyChallengesCompleted: 0,
}

describe('levels', () => {
  test('the curve is 100, 150, 200, … XP per level', () => {
    assert.equal(xpRequiredForLevel(1), 100)
    assert.equal(xpRequiredForLevel(2), 150)
    assert.equal(xpRequiredForLevel(12), 650)
  })

  test('level boundaries land exactly where the curve says', () => {
    assert.equal(getLevelFromXp(0), 1)
    assert.equal(getLevelFromXp(99), 1)
    assert.equal(getLevelFromXp(100), 2)
    assert.equal(getLevelFromXp(249), 2)
    assert.equal(getLevelFromXp(250), 3)
    for (let level = 1; level < 60; level++) {
      assert.equal(getLevelFromXp(xpAtLevelStart(level)), level)
      assert.equal(getLevelFromXp(xpAtLevelStart(level + 1) - 1), level)
    }
  })

  test('progress within a level adds up', () => {
    const xp = 340 // level 3 starts at 250
    assert.equal(getXpIntoCurrentLevel(xp), 90)
    assert.equal(getXpRequiredForNextLevel(xp), 200)
    assert.equal(getLevelProgress(xp), 90 / 200)
  })

  test('titles follow the level bands', () => {
    assert.equal(levelTitle(1), 'Learner')
    assert.equal(levelTitle(9), 'Explorer')
    assert.equal(levelTitle(12), 'Scholar')
    assert.equal(levelTitle(34), 'Linguist')
    assert.equal(levelTitle(50), 'Master Scholar')
  })
})

describe('level unlocks', () => {
  test('the first evaluation seeds silently', () => {
    const { state, celebrate } = reachLevel(DEFAULT_PROGRESSION, 11)
    assert.equal(celebrate, null)
    assert.deepEqual(state.profileRewards.unlocked, ['misty_mountain_background', 'sakura_frame'])
    assert.deepEqual(state.garden.unlockedItemIds, ['bamboo', 'stone_lantern', 'hanging_lantern'])
    assert.deepEqual(state.profileRewards.equipped, [], 'seeding unlocks but never equips')
  })

  test('a jump across several levels grants every level crossed', () => {
    const seeded = reachLevel(DEFAULT_PROGRESSION, 4).state
    const { state, celebrate } = reachLevel(seeded, 10)
    assert.ok(celebrate)
    assert.deepEqual(celebrate.unlocks.rewards, ['misty_mountain_background', 'sakura_frame'])
    assert.deepEqual(celebrate.unlocks.gardenItems, ['stone_lantern', 'hanging_lantern'])
    assert.equal(state.levelReached, 10)
  })

  test('nothing is taken back, and an old level is never re-celebrated', () => {
    const seeded = reachLevel(DEFAULT_PROGRESSION, 12).state
    const { state, celebrate } = reachLevel(seeded, 3)
    assert.equal(celebrate, null)
    assert.equal(state, seeded)
  })
})

describe('achievements', () => {
  test('there are exactly thirty, with unique ids', () => {
    assert.equal(ACHIEVEMENTS.length, 30)
    assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, 30)
  })

  test('earned once, never earned again', () => {
    const first = evaluateAchievements(DEFAULT_PROGRESSION, { ...ZERO, wordsSaved: 30 }, NOW)
    assert.deepEqual(first.earned, ['first_word', 'word_collector'])
    const again = evaluateAchievements(first.state, { ...ZERO, wordsSaved: 30 }, NOW)
    assert.deepEqual(again.earned, [])
    // Falling below the goal later (a word removed) does not revoke it.
    const after = evaluateAchievements(first.state, { ...ZERO, wordsSaved: 3 }, NOW)
    assert.ok(after.state.achievements.unlocked.word_collector)
  })

  test('daily challenge claims are counted, the whole-set bonus is not', () => {
    const ids = [
      'daily-review-2026-09-28',
      'daily-writing-2026-09-29',
      'daily-review-5-2026-08-01', // an id from the previous challenge set
      'daily-all-2026-09-29',
      'weekly-writing-w2026-09-28',
      'milestone-streak-7',
    ]
    assert.equal(countDailyChallengeClaims(ids), 3)
  })
})

describe('pinned achievements', () => {
  const earned = evaluateAchievements(
    DEFAULT_PROGRESSION,
    { ...ZERO, wordsSaved: 60, reviews: 60, charactersWritten: 30 },
    NOW,
  ).state

  test(`at most ${MAX_PINNED}, and a fourth is refused rather than evicting one`, () => {
    let state = earned
    for (const id of ['first_word', 'word_collector', 'word_keeper']) {
      const r = pinAchievement(state, id)
      assert.equal(r.result, 'pinned')
      state = r.state
    }
    const fourth = pinAchievement(state, 'getting_it_back')
    assert.equal(fourth.result, 'full')
    assert.deepEqual(fourth.state.achievements.pinned, ['first_word', 'word_collector', 'word_keeper'])

    const replaced = replacePinnedAchievement(state, 'word_collector', 'getting_it_back')
    assert.deepEqual(replaced.achievements.pinned, ['first_word', 'getting_it_back', 'word_keeper'])
  })

  test('a locked achievement cannot be displayed', () => {
    assert.equal(pinAchievement(earned, 'living_dictionary').result, 'locked')
  })
})

describe('profile rewards', () => {
  test('only an unlocked reward can be equipped', () => {
    const seeded = reachLevel(DEFAULT_PROGRESSION, 6).state
    assert.deepEqual(setRewardEquipped(seeded, 'jade_ink', true).profileRewards.equipped, [])
    const on = setRewardEquipped(seeded, 'misty_mountain_background', true)
    assert.deepEqual(on.profileRewards.equipped, ['misty_mountain_background'])
    assert.deepEqual(setRewardEquipped(on, 'misty_mountain_background', false).profileRewards.equipped, [])
  })
})

describe('garden', () => {
  const all = reachLevel(DEFAULT_PROGRESSION, 30).state

  test('fills the first empty slot, and reports a full garden instead of overwriting', () => {
    let state = all
    for (const item of ['bamboo', 'stone_lantern', 'hanging_lantern', 'sakura_tree'] as const) {
      const next = placeGardenItem(state, item)
      assert.ok(next)
      state = next
    }
    assert.deepEqual(state.garden.slots, {
      left: 'bamboo',
      centerLeft: 'stone_lantern',
      centerRight: 'hanging_lantern',
      right: 'sakura_tree',
    })
    assert.equal(placeGardenItem(state, 'bonsai'), null)

    const swapped = placeGardenItem(state, 'bonsai', 'centerLeft')
    assert.ok(swapped)
    assert.equal(swapped.garden.slots.centerLeft, 'bonsai')
    assert.ok(!Object.values(swapped.garden.slots).includes('stone_lantern'), 'the displaced item returns to the tray')
  })

  test('an item occupies one slot at most', () => {
    const a = placeGardenItem(all, 'bamboo', 'left')!
    const b = placeGardenItem(a, 'bamboo', 'right')!
    assert.deepEqual(b.garden.slots, { right: 'bamboo' })
    assert.deepEqual(removeGardenItem(b, 'bamboo').garden.slots, {})
  })

  test('a locked item cannot be placed', () => {
    const early = reachLevel(DEFAULT_PROGRESSION, 3).state
    assert.deepEqual(placeGardenItem(early, 'small_pagoda')?.garden.slots, {})
  })
})

describe('stored state is normalised', () => {
  test('missing fields fill in, unknown and inconsistent ids are dropped', () => {
    const state = normaliseProgression({
      levelReached: 7,
      profileRewards: { unlocked: ['sakura_frame', 'golden_robe'], equipped: ['sakura_frame', 'jade_ink'] },
      achievements: { unlocked: { first_word: NOW, retired_one: NOW }, pinned: ['first_word', 'bookworm'] },
      garden: { unlockedItemIds: ['bamboo'], slots: { left: 'bamboo', right: 'small_pagoda' } },
    })
    assert.deepEqual(state.profileRewards, { unlocked: ['sakura_frame'], equipped: ['sakura_frame'] })
    assert.deepEqual(state.achievements, { unlocked: { first_word: NOW }, pinned: ['first_word'] })
    assert.deepEqual(state.garden.slots, { left: 'bamboo' })
    assert.deepEqual(state.lifetime, DEFAULT_PROGRESSION.lifetime)
    assert.deepEqual(normaliseProgression(undefined), DEFAULT_PROGRESSION)
  })
})
