import { wordById } from './hskFrequency'
import type { VocabWord } from '../types'

/*
 * The placement test's word pool.
 *
 * **Drawn fresh each time the test runs, not a fixed list.** It used to be
 * eighteen hard-coded ids, which meant every learner sat the identical test in
 * the identical order — memorable after one attempt, and shareable. Each
 * attempt now shuffles every level's words by its seed, and the adaptive test
 * picks which of them to ask.
 *
 * Candidates are picked by hand (see `POOL_IDS`), so no near-synonym or bare
 * grammar note can make a question ambiguous through no fault of the learner.
 */

/**
 * Candidate ids per HSK level, index 0 = HSK 1 — each word's official HSK 3.0
 * level (the test checks it), not its id's "hskN", which predates the syllabus.
 *
 * Hand-curated words where the syllabus puts one at the level; the rest are
 * common syllabus words with a short, unambiguous gloss and an example sentence
 * long enough to cut a gap from. Two words with near-identical meanings (抱歉
 * and 道歉) never share a level, since either could be the other's wrong answer.
 */
const POOL_IDS: string[][] = [
  ['hsk1-02', 'hsk1-03', 'hsk1-04', 'hsk1-05', 'hsk1-06', 'hsk1-07', 'hsk1-08', 'hsk1-09', 'hsk1-10', 'hsk2-03'],
  ['hsk2-06', 'hsk3-04', 'hsk3-05', 'hsk3-06', 'cc-问题', 'cc-已经', 'cc-一定', 'cc-一直'],
  ['hsk3-01', 'hsk3-02', 'hsk3-03', 'hsk3-07', 'hsk3-08', 'hsk4-02', 'hsk4-07', 'hsk4-08'],
  ['hsk4-03', 'hsk4-04', 'cc-担心', 'cc-了解', 'cc-选择', 'cc-或许', 'cc-妻子', 'cc-丈夫'],
  ['hsk4-05', 'hsk5-04', 'cc-讨厌', 'cc-控制', 'cc-放弃', 'cc-即使', 'cc-聪明', 'cc-打扰'],
  ['hsk5-05', 'hsk5-06', 'cc-国王', 'cc-攻击', 'cc-军队', 'cc-英雄', 'cc-威胁', 'cc-允许'],
]

/** Words per level held back as wrong answers, never asked. */
export const DISTRACTORS_PER_LEVEL = 3

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
 * One attempt's words, split per level into the words it may ask and the words
 * it uses only as wrong answers.
 *
 * **A wrong answer is never a word the test could also ask about.** Otherwise
 * a learner could rule an option out because it was the answer to an earlier
 * question. The adaptive test (`planPlacement`) decides which question words
 * are actually asked; whatever it picks, the wrong answers stay separate.
 *
 * Shuffled per seed, so one seed reproduces one attempt exactly (what lets a
 * saved attempt resume) and a retake gets different words.
 */
export function placementSplit(seed: number): { questionWords: VocabWord[][]; distractors: VocabWord[] } {
  const questionWords: VocabWord[][] = []
  const distractors: VocabWord[] = []
  pool.forEach((levelWords, level) => {
    const order = shuffled(levelWords, seed + level * 7919)
    distractors.push(...order.slice(0, DISTRACTORS_PER_LEVEL))
    questionWords.push(order.slice(DISTRACTORS_PER_LEVEL))
  })
  return { questionWords, distractors }
}

/** A fresh seed for one attempt. */
export function newPlacementSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff)
}
