import type { SrsCard } from '../types'

/** How well a word is known, as shown in My Words. */
export type Proficiency = 'new' | 'learning' | 'proficient'

/** Reviews a card has to get *right* before it counts as proficient. */
export const PROFICIENT_REPS = 4

/** Recent mistakes that knock a proficient card back down to still-learning. */
export const DEMOTE_LAPSES = 2

/**
 * Places a card in one of the three My Words tiers.
 *
 * A word is **new** until it has been reviewed at all. From there, getting it
 * right often enough promotes it to **proficient**, and getting it wrong
 * repeatedly drops it back to **still learning** — `recentLapses` is what makes
 * demotion possible, since the all-time `lapses` count only ever grows.
 *
 * Note that an "Again" grade bumps `reps` and `lapses` together, so the
 * difference between them is the number of reviews actually answered correctly.
 */
export function proficiencyFor(card: SrsCard): Proficiency {
  if (card.reps === 0) return 'new'
  const successful = card.reps - card.lapses
  if (successful >= PROFICIENT_REPS && (card.recentLapses ?? 0) < DEMOTE_LAPSES) return 'proficient'
  return 'learning'
}

/** Counts of each tier across a deck, for the My Words summary strip. */
export function proficiencyTotals(cards: SrsCard[]): Record<Proficiency, number> {
  const totals: Record<Proficiency, number> = { new: 0, learning: 0, proficient: 0 }
  for (const card of cards) totals[proficiencyFor(card)] += 1
  return totals
}

/**
 * How far a card is through the climb to proficient, 0-1. Shown as a bar in the
 * word detail sheet so "do more reviews" is a visible target rather than a rule
 * the learner has to take on trust.
 */
export function proficiencyProgress(card: SrsCard): number {
  const successful = Math.max(0, card.reps - card.lapses)
  return Math.min(1, successful / PROFICIENT_REPS)
}
