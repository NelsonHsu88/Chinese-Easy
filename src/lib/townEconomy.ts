import type { Grade } from '../types'
import { getLevelFromXp, getXpIntoCurrentLevel, getXpRequiredForNextLevel } from './progression/levels'

/** XP awarded for grading a review card — proportional to how well the word is known. */
export function xpForGrade(grade: Grade): number {
  if (grade === 'again') return 0
  if (grade === 'hard') return 5
  return 10 // good | easy
}

export const XP_PER_LESSON = 15

/**
 * Whether a My Town building's XP threshold has been reached. XP is never
 * spent (see `lib/progression/levels.ts`), so this is a milestone, not a price.
 */
export function canAfford(xp: number, cost: number): boolean {
  return xp >= cost
}

/**
 * The "Level" bar on the Lessons path and My Town. It used to run its own flat
 * 200-XP-per-level curve; it now reads the profile's, so the app has one level
 * and not two that disagree.
 */
export function levelForXp(xp: number): { level: number; xpIntoLevel: number; xpForLevel: number; levelPct: number } {
  const level = getLevelFromXp(xp)
  const xpIntoLevel = getXpIntoCurrentLevel(xp)
  const xpForLevel = getXpRequiredForNextLevel(xp)
  return { level, xpIntoLevel, xpForLevel, levelPct: Math.round((xpIntoLevel / xpForLevel) * 100) }
}
