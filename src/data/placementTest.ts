import { wordById } from './hskFrequency'
import type { VocabWord } from '../types'

/*
 * The placement test's word pool.
 *
 * **Drawn fresh each time the test runs, not a fixed list.** It used to be
 * eighteen hard-coded ids, which meant every learner sat the identical test in
 * the identical order — memorable after one attempt, and shareable. Sampling
 * from a larger pool per level keeps the *shape* of the test fixed (three words
 * at each HSK level, easiest first) while making the particular words vary.
 *
 * Every candidate is from the hand-curated half of the word bank rather than the
 * bulk CC-CEDICT import: these are the entries with verified glosses and
 * verified example sentences, which is what a test needs. The bulk bank's
 * near-synonyms and grammar notes would make questions ambiguous through no
 * fault of the learner.
 */

/** Candidate ids per HSK level, index 0 = HSK 1. */
const POOL_IDS: string[][] = [
  ['hsk1-01', 'hsk1-02', 'hsk1-03', 'hsk1-04', 'hsk1-05', 'hsk1-06', 'hsk1-07', 'hsk1-08', 'hsk1-09', 'hsk1-10'],
  ['hsk2-01', 'hsk2-02', 'hsk2-03', 'hsk2-04', 'hsk2-05', 'hsk2-06', 'hsk2-07', 'hsk2-08'],
  ['hsk3-01', 'hsk3-02', 'hsk3-03', 'hsk3-04', 'hsk3-05', 'hsk3-06', 'hsk3-07', 'hsk3-08'],
  ['hsk4-01', 'hsk4-02', 'hsk4-03', 'hsk4-04', 'hsk4-05', 'hsk4-06', 'hsk4-07', 'hsk4-08'],
  ['hsk5-01', 'hsk5-02', 'hsk5-03', 'hsk5-04', 'hsk5-05', 'hsk5-06', 'hsk5-07', 'hsk5-08'],
  ['hsk6-01', 'hsk6-02', 'hsk6-03', 'hsk6-04', 'hsk6-05', 'hsk6-06', 'hsk6-07', 'hsk6-08'],
]

/** How many words the test asks about at each level. */
export const ITEMS_PER_LEVEL = 3

const pool: VocabWord[][] = POOL_IDS.map((ids) =>
  ids.map((id) => {
    const word = wordById(id)
    if (!word) throw new Error(`Missing placement word ${id} in hskFrequency`)
    return word
  }),
)

/**
 * A seeded shuffle, so one seed reproduces one test exactly.
 *
 * The seed is held for the life of the attempt by the screen, which is what
 * lets a learner step back to question three and find the same question — and
 * what lets the estimate be computed against the same items the questions were
 * built from.
 */
function shuffled<T>(items: T[], seed: number): T[] {
  let h = Math.imul(seed ^ 0x9e3779b9, 2654435761) >>> 0
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0
    const j = h % (i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Eighteen words for one attempt: `ITEMS_PER_LEVEL` from each HSK level,
 * easiest level first.
 *
 * Level order is preserved on purpose. The estimate in `computeEstimatedHsk`
 * reads the run of levels the learner got right, and shuffling difficulty
 * across the whole test would also make it feel arbitrary — a test that opens
 * on an HSK 6 word tells a beginner they are out of their depth before they
 * have answered anything.
 */
export function samplePlacementItems(seed: number): VocabWord[] {
  return pool.flatMap((levelWords, level) =>
    shuffled(levelWords, seed + level * 7919).slice(0, ITEMS_PER_LEVEL),
  )
}

/**
 * The curated words this attempt is *not* asking about — the wrong answers.
 *
 * **Distractors must never be a word the test also asks about.** Drawing them
 * from the tested items, as this used to, hands the learner a free elimination:
 * once 朋友 has been the answer to its own question, seeing it offered under a
 * later word means it cannot be that answer either. With eighteen questions of
 * four options each, that leaks steadily through the test and inflates the
 * estimate for anyone paying attention.
 *
 * Sampling three words per level out of eight to ten leaves five to seven spare
 * at every level — enough to fill three slots a question from words that carry
 * no signal at all, and still hand-curated rather than pulled from the bulk
 * bank's near-synonyms.
 */
export function placementDistractorPool(items: VocabWord[]): VocabWord[] {
  const asked = new Set(items.map((word) => word.id))
  return pool.flat().filter((word) => !asked.has(word.id))
}

/** A fresh seed for one attempt. */
export function newPlacementSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff)
}
