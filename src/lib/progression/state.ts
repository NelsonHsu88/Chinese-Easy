/*
 * The learner's progression state, and every transition on it.
 *
 * One persisted object (`progression` in AppContext, account-scoped like the
 * rest of the learner's work) holding what XP alone cannot say: which level-up
 * has been celebrated, which cosmetics are unlocked and worn, which
 * achievements are earned and displayed, what is in the garden, and the three
 * lifetime counters the app did not record before.
 *
 * Every function here is pure — state in, state out — so the rules (three
 * pins at most, one decoration per slot, unlocks are permanent) are enforced in
 * one place and tested in `__tests__/progression.test.ts`, not re-implemented
 * by whichever screen happens to be changing them.
 */

import { ACHIEVEMENTS, MAX_PINNED, newlyEarnedAchievements, type AchievementStats } from './achievements'
import { GARDEN_ITEMS, GARDEN_SLOTS, type GardenItemId, type GardenSlotId } from './gardenItems'
import { PROFILE_REWARDS, type ProfileRewardId } from './profileRewards'

export interface ProgressionState {
  /**
   * The highest level whose level-up has been handled — unlocks granted and,
   * past the first, celebrated. `null` until the first evaluation, which then
   * seeds everything the learner has already earned *silently*: an existing
   * learner opening this version at level 9 should find their rewards waiting,
   * not sit through nine modals.
   */
  levelReached: number | null
  profileRewards: { unlocked: ProfileRewardId[]; equipped: ProfileRewardId[] }
  achievements: {
    /** Achievement id → ISO time it was earned. Never removed. */
    unlocked: Record<string, string>
    /** Displayed on the profile, in order. At most `MAX_PINNED`. */
    pinned: string[]
  }
  garden: {
    unlockedItemIds: GardenItemId[]
    slots: Partial<Record<GardenSlotId, GardenItemId>>
  }
  /** Lifetime counters for the things the app did not already keep a history of. */
  lifetime: { reviewSessions: number; listeningCorrect: number; storiesFinished: number }
}

export const DEFAULT_PROGRESSION: ProgressionState = {
  levelReached: null,
  profileRewards: { unlocked: [], equipped: [] },
  achievements: { unlocked: {}, pinned: [] },
  garden: { unlockedItemIds: [], slots: {} },
  lifetime: { reviewSessions: 0, listeningCorrect: 0, storiesFinished: 0 },
}

/**
 * A stored value, made safe to use. Fills anything missing from an older or
 * partial blob, and drops ids this build no longer defines, so a renamed
 * reward can never leave a learner holding something the app cannot draw.
 */
export function normaliseProgression(raw: unknown): ProgressionState {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<ProgressionState>
  const rewardIds = new Set<string>(PROFILE_REWARDS.map((x) => x.id))
  const itemIds = new Set<string>(GARDEN_ITEMS.map((x) => x.id))
  const achievementIds = new Set(ACHIEVEMENTS.map((a) => a.id))

  const unlockedRewards = (r.profileRewards?.unlocked ?? []).filter((id) => rewardIds.has(id))
  const unlockedItems = (r.garden?.unlockedItemIds ?? []).filter((id) => itemIds.has(id))
  const unlockedAchievements = Object.fromEntries(
    Object.entries(r.achievements?.unlocked ?? {}).filter(([id]) => achievementIds.has(id)),
  )
  const slots: ProgressionState['garden']['slots'] = {}
  for (const slot of GARDEN_SLOTS) {
    const item = r.garden?.slots?.[slot]
    if (item && unlockedItems.includes(item)) slots[slot] = item
  }

  return {
    levelReached: typeof r.levelReached === 'number' ? r.levelReached : null,
    profileRewards: {
      unlocked: unlockedRewards,
      equipped: (r.profileRewards?.equipped ?? []).filter((id) => unlockedRewards.includes(id)),
    },
    achievements: {
      unlocked: unlockedAchievements,
      pinned: (r.achievements?.pinned ?? []).filter((id) => id in unlockedAchievements).slice(0, MAX_PINNED),
    },
    garden: { unlockedItemIds: unlockedItems, slots },
    lifetime: { ...DEFAULT_PROGRESSION.lifetime, ...(r.lifetime ?? {}) },
  }
}

// --- Levels -------------------------------------------------------------------

export interface LevelUnlocks {
  rewards: ProfileRewardId[]
  gardenItems: GardenItemId[]
}

/** Everything that unlocks above `fromLevel` up to and including `toLevel`. */
export function unlocksBetween(fromLevel: number, toLevel: number): LevelUnlocks {
  const inRange = (level: number) => level > fromLevel && level <= toLevel
  return {
    rewards: PROFILE_REWARDS.filter((r) => inRange(r.unlockLevel)).map((r) => r.id),
    gardenItems: GARDEN_ITEMS.filter((i) => inRange(i.unlockLevel)).map((i) => i.id),
  }
}

function withUnlocks(state: ProgressionState, unlocks: LevelUnlocks): ProgressionState {
  const union = <T,>(a: T[], b: T[]) => [...a, ...b.filter((x) => !a.includes(x))]
  return {
    ...state,
    profileRewards: { ...state.profileRewards, unlocked: union(state.profileRewards.unlocked, unlocks.rewards) },
    garden: { ...state.garden, unlockedItemIds: union(state.garden.unlockedItemIds, unlocks.gardenItems) },
  }
}

export interface LevelChange {
  state: ProgressionState
  /** Set only when a level-up should be celebrated — never on the silent first seed. */
  celebrate: { from: number; to: number; unlocks: LevelUnlocks } | null
}

/**
 * Bring the state up to `level`. Unlocks are granted for every level crossed,
 * so one large award that jumps two levels still grants both levels' rewards.
 * A level lower than the one already reached changes nothing: XP is never
 * spent, and an unlock is never taken back.
 */
export function reachLevel(state: ProgressionState, level: number): LevelChange {
  if (state.levelReached === null) {
    return { state: { ...withUnlocks(state, unlocksBetween(0, level)), levelReached: level }, celebrate: null }
  }
  if (level <= state.levelReached) return { state, celebrate: null }
  const unlocks = unlocksBetween(state.levelReached, level)
  return {
    state: { ...withUnlocks(state, unlocks), levelReached: level },
    celebrate: { from: state.levelReached, to: level, unlocks },
  }
}

// --- Achievements -------------------------------------------------------------

export interface AchievementChange {
  state: ProgressionState
  /** Newly earned ids to celebrate — empty on the silent first seed. */
  earned: string[]
}

export function evaluateAchievements(
  state: ProgressionState,
  stats: AchievementStats,
  now: string,
  { silent = false }: { silent?: boolean } = {},
): AchievementChange {
  const ids = newlyEarnedAchievements(stats, state.achievements.unlocked)
  if (ids.length === 0) return { state, earned: [] }
  const unlocked = { ...state.achievements.unlocked }
  for (const id of ids) unlocked[id] = now
  return {
    state: { ...state, achievements: { ...state.achievements, unlocked } },
    earned: silent ? [] : ids,
  }
}

export type PinResult = 'pinned' | 'already' | 'full' | 'locked'

/** Display an achievement on the profile. Refuses rather than evicting when all slots are full. */
export function pinAchievement(state: ProgressionState, id: string): { state: ProgressionState; result: PinResult } {
  const { unlocked, pinned } = state.achievements
  if (!unlocked[id]) return { state, result: 'locked' }
  if (pinned.includes(id)) return { state, result: 'already' }
  if (pinned.length >= MAX_PINNED) return { state, result: 'full' }
  return { state: { ...state, achievements: { ...state.achievements, pinned: [...pinned, id] } }, result: 'pinned' }
}

export function unpinAchievement(state: ProgressionState, id: string): ProgressionState {
  return { ...state, achievements: { ...state.achievements, pinned: state.achievements.pinned.filter((p) => p !== id) } }
}

/** Swap `outgoing` for `incoming` in place, so the replacement keeps its slot. */
export function replacePinnedAchievement(state: ProgressionState, outgoing: string, incoming: string): ProgressionState {
  const { unlocked, pinned } = state.achievements
  if (!unlocked[incoming] || !pinned.includes(outgoing) || pinned.includes(incoming)) return state
  return {
    ...state,
    achievements: { ...state.achievements, pinned: pinned.map((p) => (p === outgoing ? incoming : p)) },
  }
}

// --- Profile rewards ----------------------------------------------------------

export function setRewardEquipped(state: ProgressionState, id: ProfileRewardId, equipped: boolean): ProgressionState {
  if (!state.profileRewards.unlocked.includes(id)) return state
  const rest = state.profileRewards.equipped.filter((e) => e !== id)
  return { ...state, profileRewards: { ...state.profileRewards, equipped: equipped ? [...rest, id] : rest } }
}

// --- Garden -------------------------------------------------------------------

export function slotOf(state: ProgressionState, item: GardenItemId): GardenSlotId | undefined {
  return GARDEN_SLOTS.find((slot) => state.garden.slots[slot] === item)
}

/**
 * Put a decoration in the garden. Without a `slot`, it takes the first empty
 * one — and returns `null` when there is none, so the screen can ask which to
 * replace. With a `slot`, it goes there, leaving any slot it was in before,
 * and whatever was in that slot goes back to the collection.
 */
export function placeGardenItem(
  state: ProgressionState,
  item: GardenItemId,
  slot?: GardenSlotId,
): ProgressionState | null {
  if (!state.garden.unlockedItemIds.includes(item)) return state
  const target = slot ?? (slotOf(state, item) || GARDEN_SLOTS.find((s) => !state.garden.slots[s]))
  if (!target) return null
  const slots = { ...state.garden.slots }
  const previous = slotOf(state, item)
  if (previous) delete slots[previous]
  slots[target] = item
  return { ...state, garden: { ...state.garden, slots } }
}

export function removeGardenItem(state: ProgressionState, item: GardenItemId): ProgressionState {
  const previous = slotOf(state, item)
  if (!previous) return state
  const slots = { ...state.garden.slots }
  delete slots[previous]
  return { ...state, garden: { ...state.garden, slots } }
}
