/*
 * XP and levels — the one place level arithmetic lives.
 *
 * XP is permanent and cumulative: it is earned (reviews, lessons, claimed
 * challenges — all through `awardXp` in AppContext) and never spent. The level
 * is a pure function of it, so nothing about a level is stored except which
 * level-up the learner has already been shown (`ProgressionState.levelReached`).
 *
 * The curve is deliberately simple and easy to rebalance: each level costs 50
 * XP more than the one before it, starting at 100. Change
 * `xpRequiredForLevel` and everything else follows.
 */

/** XP needed to go from `level` to `level + 1`. */
export function xpRequiredForLevel(level: number): number {
  return 100 + (Math.max(1, level) - 1) * 50
}

/** Total XP at which `level` begins. Level 1 begins at 0. */
export function xpAtLevelStart(level: number): number {
  // Sum of an arithmetic series: (level - 1) steps of 100, 150, 200, …
  const steps = Math.max(0, level - 1)
  return steps * 100 + (50 * steps * (steps - 1)) / 2
}

export function getLevelFromXp(xp: number): number {
  let level = 1
  // The curve grows quadratically, so this loop is a few dozen steps at most.
  while (xpAtLevelStart(level + 1) <= Math.max(0, xp)) level++
  return level
}

export function getXpIntoCurrentLevel(xp: number): number {
  return Math.max(0, xp) - xpAtLevelStart(getLevelFromXp(xp))
}

export function getXpRequiredForNextLevel(xp: number): number {
  return xpRequiredForLevel(getLevelFromXp(xp))
}

/** 0–1 through the current level. */
export function getLevelProgress(xp: number): number {
  return getXpIntoCurrentLevel(xp) / getXpRequiredForNextLevel(xp)
}

/**
 * The title beside a level. Cosmetic only: nothing in the app reads it to
 * decide what a learner may study.
 */
const LEVEL_TITLES: { from: number; title: string }[] = [
  { from: 50, title: 'Master Scholar' },
  { from: 35, title: 'Sage' },
  { from: 25, title: 'Linguist' },
  { from: 20, title: 'Scribe' },
  { from: 15, title: 'Reader' },
  { from: 10, title: 'Scholar' },
  { from: 5, title: 'Explorer' },
  { from: 1, title: 'Learner' },
]

export function levelTitle(level: number): string {
  return LEVEL_TITLES.find((t) => level >= t.from)?.title ?? 'Learner'
}
