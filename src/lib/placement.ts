import type { PlacementAnswer, VocabWord } from '../types'

/*
 * The adaptive placement test: which word to ask next, and what level the
 * answers add up to. Pure, so the screen can replay a saved attempt exactly.
 *
 * It runs as a staircase. The first `PLACEMENT_WARMUP` questions are easy
 * (HSK 1) so nobody opens on a word they can't read. After that, a right answer
 * moves the next question up one level and a miss moves it down one, so the
 * test spends its questions around the learner's real level instead of walking
 * every level in turn.
 */

/** The most questions one attempt asks. */
export const PLACEMENT_QUESTIONS = 15
/** Easy HSK 1 questions at the start, before the test starts moving. */
export const PLACEMENT_WARMUP = 3
/** A level counts as known with at least this many right answers at it… */
export const PLACEMENT_MIN_CORRECT = 2
/** …and at least this share of its answers right. */
export const PLACEMENT_MIN_ACCURACY = 0.6

const MIN_LEVEL = 1
const MAX_LEVEL = 6

const clamp = (level: number) => Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, level))

export interface PlacementPlan {
  /** The words already answered, in order — one per answer that still fits this attempt. */
  asked: VocabWord[]
  /** The word to ask now, or null when the test is over. */
  next: VocabWord | null
}

/**
 * Replays an attempt: walks the answers given so far and works out the next
 * word. `questionWords` holds the words this attempt may ask, per level
 * (index 0 = HSK 1).
 *
 * The test ends after `PLACEMENT_QUESTIONS`, or straight after the warm-up when
 * none of it was right (a true beginner doesn't need eleven more questions to
 * prove it). When a level has run out of words, the nearest level that still
 * has one is used, the easier side first.
 *
 * Answers that don't match the word the replay expects (a stale save) are
 * dropped from that point on, and the plan carries on from there.
 */
export function planPlacement(questionWords: VocabWord[][], answers: PlacementAnswer[]): PlacementPlan {
  const used = new Set<string>()
  const asked: VocabWord[] = []
  let level = MIN_LEVEL
  let warmupRight = 0

  const wordNear = (target: number): VocabWord | null => {
    for (let distance = 0; distance < MAX_LEVEL; distance++) {
      const levels = distance === 0 ? [target] : [target - distance, target + distance]
      for (const l of levels) {
        if (l < MIN_LEVEL || l > MAX_LEVEL) continue
        const word = questionWords[l - 1]?.find((w) => !used.has(w.id))
        if (word) return word
      }
    }
    return null
  }

  for (let i = 0; ; i++) {
    if (asked.length >= PLACEMENT_QUESTIONS) return { asked, next: null }
    const word = wordNear(level)
    if (!word) return { asked, next: null }
    const answer = answers[i]
    if (!answer || answer.wordId !== word.id) return { asked, next: word }

    used.add(word.id)
    asked.push(word)
    const right = answer.rating === 'know'

    if (i < PLACEMENT_WARMUP) {
      if (right) warmupRight++
      if (i === PLACEMENT_WARMUP - 1) {
        if (warmupRight === 0) return { asked, next: null }
        level = warmupRight >= 2 ? MIN_LEVEL + 1 : MIN_LEVEL
      }
      continue
    }
    // From the level actually asked, which can differ from the target when a level ran out.
    level = clamp(word.hskLevel + (right ? 1 : -1))
  }
}

/**
 * The level the answers support: the highest HSK level with at least
 * `PLACEMENT_MIN_CORRECT` right answers and `PLACEMENT_MIN_ACCURACY` of its
 * answers right. One lucky guess at a hard level is never enough on its own.
 * HSK 1 when no level qualifies.
 */
export function estimatePlacement(asked: VocabWord[], answers: PlacementAnswer[]): number {
  const byLevel = new Map<number, { right: number; total: number }>()
  asked.forEach((word, i) => {
    const bucket = byLevel.get(word.hskLevel) ?? { right: 0, total: 0 }
    bucket.total += 1
    if (answers[i]?.rating === 'know') bucket.right += 1
    byLevel.set(word.hskLevel, bucket)
  })

  let estimated = MIN_LEVEL
  for (let level = MIN_LEVEL; level <= MAX_LEVEL; level++) {
    const b = byLevel.get(level)
    if (b && b.right >= PLACEMENT_MIN_CORRECT && b.right / b.total >= PLACEMENT_MIN_ACCURACY) estimated = level
  }
  return estimated
}
