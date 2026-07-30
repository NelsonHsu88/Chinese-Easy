import type { Grade } from '../types'

/** XP awarded for grading a review card — proportional to how well the word is known. */
export function xpForGrade(grade: Grade): number {
  if (grade === 'again') return 0
  if (grade === 'hard') return 5
  return 10 // good | easy
}

export const XP_PER_LESSON = 15

export function canAfford(xp: number, cost: number): boolean {
  return xp >= cost
}

/** Shared "Level" progress display used on both the Lessons path and My Town screens. */
export const XP_PER_LEVEL = 200

export function levelForXp(xp: number): { level: number; xpIntoLevel: number; levelPct: number } {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1
  const xpIntoLevel = xp % XP_PER_LEVEL
  const levelPct = Math.round((xpIntoLevel / XP_PER_LEVEL) * 100)
  return { level, xpIntoLevel, levelPct }
}
