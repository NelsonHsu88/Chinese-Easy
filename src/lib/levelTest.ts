import type { ScriptMode, VocabWord } from '../types'
import { isTeachableWord } from './definitions'
import { buildMixedSteps, shuffle, type DrillStep } from './mixedDrills'
import { HSK_MAX_LEVEL } from './selectors'

/*
 * The level-up test (SS1025 "Progress placement test"): twenty questions on
 * words from the next HSK level, in Mixed Drills' kinds — listening and fill
 * the gap — and at most two mistakes to pass. Pure: the screen is
 * `screens/LevelTest.tsx`.
 *
 * Nothing here touches the SRS deck. These are words the learner may never have
 * met, and the test is a measurement, not a review.
 */

export const LEVEL_TEST_QUESTIONS = 20
/** Mistakes allowed; one more fails the test. */
export const LEVEL_TEST_MAX_MISTAKES = 2

type Random = () => number

/** The level the test would move the learner to, or null at the top. */
export function nextTestLevel(level: number): number | null {
  return level < HSK_MAX_LEVEL ? level + 1 : null
}

/** Words the test may ask about: the level's teachable words (no names or abbreviations). */
export function levelTestPool(wordBank: VocabWord[], level: number): VocabWord[] {
  return wordBank.filter((w) => w.hskLevel === level && isTeachableWord(w))
}

/**
 * A fresh test: a random sample of the level, so no two attempts ask the same
 * set. Questions come from `buildMixedSteps` (alternating listening and gaps,
 * distractors from the same level, which is what makes them fair), minus its
 * Match boards, which are practice and can't be marked.
 */
export function buildLevelTest({
  wordBank,
  level,
  script,
  listening,
  random = Math.random,
}: {
  wordBank: VocabWord[]
  level: number
  script: ScriptMode
  /** False while "Can't listen now" is on: gaps only. */
  listening: boolean
  random?: Random
}): DrillStep[] {
  const pool = shuffle(levelTestPool(wordBank, level), random)
  /* Spare candidates. Without listening every question is a gap, so only words
     with a sentence are drawn (HSK 6 has few), and some still sit out. */
  const usable = listening ? pool : pool.filter((w) => w.example?.traditional && w.example.translation)
  const candidates = usable.slice(0, LEVEL_TEST_QUESTIONS * 4)
  const steps = buildMixedSteps({
    dueWords: candidates,
    deckWords: candidates,
    wordBank,
    script,
    matchedAt: {},
    listening,
    random,
  })
  return steps.filter((s) => s.kind !== 'match').slice(0, LEVEL_TEST_QUESTIONS)
}

/** Where a test stands after `mistakes` wrong answers out of `answered` of `total`. */
export function levelTestOutcome(mistakes: number, answered: number, total: number): 'pass' | 'fail' | 'running' {
  if (mistakes > LEVEL_TEST_MAX_MISTAKES) return 'fail'
  if (answered >= total) return 'pass'
  return 'running'
}
