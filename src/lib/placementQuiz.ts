import { shortGloss } from './definitions'
import { displayExample, displayWord } from './hanzi'
import type { ScriptMode, VocabWord } from '../types'

/*
 * Turning the placement word list into questions.
 *
 * The placement test used to ask the learner to rate themselves ("I know this"
 * / "I recognize it" / "I don't know this"), which is quick but measures
 * confidence rather than knowledge — and confidence is exactly the thing a
 * beginner has least calibration for. Asking a question measures the answer.
 *
 * There are three kinds, because reading a character, recognising it spoken and
 * using it in a sentence are different skills and a learner can easily have one
 * without the others:
 *
 *  - **meaning** — the word is shown, the learner picks its English gloss.
 *  - **listening** — the word is *spoken*, the learner picks the characters.
 *    No pinyin is shown anywhere on these, since a romanisation of the word is
 *    a transcript of the very thing being tested.
 *  - **cloze** — one of the word bank's own example sentences with the word cut
 *    out, and the learner picks what fills the gap. This is the only kind that
 *    tests a word *in use* rather than in isolation, which is why it is worth
 *    having: a learner can know that 因為 means "because" and still not know
 *    where it goes.
 *
 * **Cloze questions use the sentences already in the bank and never invent
 * one.** A word with no example simply cannot be a cloze question, and the
 * builder falls back to asking its meaning — the same rule the rest of the app
 * follows, and for the same reason: a made-up sentence with a wrong tone or
 * unnatural phrasing teaches incorrect Chinese.
 *
 * Pure logic, no React and no speech API: the screen renders what this returns
 * and owns the audio.
 */

export type PlacementKind = 'meaning' | 'listening' | 'cloze'

export interface PlacementQuestion {
  kind: PlacementKind
  word: VocabWord
  /** English glosses for `meaning`, hanzi for `listening` and `cloze`. */
  options: string[]
  /** Index into `options` of the correct one. */
  answerIndex: number
  /**
   * The example sentence with the word replaced by a blank — `cloze` only.
   * Already in the learner's script.
   */
  sentence?: string
  /** The sentence's English translation, shown under it as a hint. */
  translation?: string
}

/** What a blank looks like in a cloze sentence. */
export const CLOZE_BLANK = '____'

/** How many wrong answers sit alongside the right one. */
const DISTRACTORS = 3

/**
 * One question in every `LISTENING_EVERY` is a listening question.
 *
 * Spread rather than grouped: a block of six audio questions in a row turns
 * into an endurance test of one skill, and a learner who has the app muted
 * would meet a wall instead of an occasional question they can skip with
 * "I don't know".
 */
const LISTENING_EVERY = 3

/**
 * One question in every `CLOZE_EVERY` is a fill-in-the-blank, offset from the
 * listening ones so the two kinds interleave rather than collide.
 */
const CLOZE_EVERY = 3

/**
 * A deterministic shuffle.
 *
 * Seeded off the item's own id rather than `Math.random`, so a learner who
 * steps back to a previous question finds the options where they left them.
 * Re-rendering with a fresh random order every keystroke makes the test feel
 * like it is cheating.
 */
function seededOrder(seed: string, length: number): number[] {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const indices = Array.from({ length }, (_, i) => i)
  for (let i = length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    const j = Math.abs(h) % (i + 1)
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  return indices
}

/**
 * Builds the question list.
 *
 * **Wrong answers come from `distractors` — words the test never asks about.**
 * They used to be drawn from the tested items themselves, which quietly handed
 * the learner an elimination: a word that has already been the answer to its own
 * question cannot be the answer to a later one, so every question answered made
 * the rest a little easier. Over eighteen questions that inflates the estimate
 * for anyone paying attention, and the placement is then wrong in the direction
 * that hurts most — a beginner started too high.
 *
 * Distractors are still hand-curated words rather than anything from the bulk
 * bank, and are preferred from the target's own HSK level outwards: the bank is
 * full of near-synonyms that would make a question unfairly ambiguous, and a
 * wrong answer that is obviously not beginner vocabulary gives the answer away
 * just as surely as a repeat does.
 *
 * Options are de-duplicated. Two words can reduce to the same short gloss, and
 * a question with the right answer listed twice has no right answer.
 */
export function buildPlacementQuestions(
  items: VocabWord[],
  distractors: VocabWord[],
  script: ScriptMode,
): PlacementQuestion[] {
  /*
   * Labels belonging to the words under test, by kind.
   *
   * Excluding the *words* is not quite enough: 高興 and 快樂 both reduce to the
   * gloss "happy", so an untested word can still print the same label as a
   * tested one and put the elimination back. Matching on the rendered label is
   * what actually closes it.
   */
  const askedGlosses = new Set(items.map(shortGloss))
  const askedHanzi = new Set(items.map((word) => displayWord(word, script)))

  return items.map((item, index) => {
    const kind = kindFor(item, index, script)
    /* Cloze answers are hanzi, like listening: the gap in the sentence is a
       word-shaped hole, so filling it with an English gloss would be a
       different question about a different skill. */
    const label = (word: VocabWord) => (kind === 'meaning' ? shortGloss(word) : displayWord(word, script))
    const correct = label(item)

    const asked = kind === 'meaning' ? askedGlosses : askedHanzi

    const pool: string[] = []
    for (const candidate of nearestFirst(distractors, item, kind)) {
      const text = label(candidate)
      if (text === correct || asked.has(text) || pool.includes(text)) continue
      pool.push(text)
      if (pool.length === DISTRACTORS) break
    }

    /* Should never fire: three slots against five-plus spare words at every
       level. Kept so a shrunken pool degrades to a shorter question rather than
       to one with a missing option — and so it degrades to *other tested items*,
       the old behaviour, rather than to nothing. */
    if (pool.length < DISTRACTORS) {
      for (const offset of seededOrder(`${item.id}:${kind}:fallback`, items.length)) {
        if (offset === index) continue
        const text = label(items[offset])
        if (text === correct || pool.includes(text)) continue
        pool.push(text)
        if (pool.length === DISTRACTORS) break
      }
    }

    const choices = [correct, ...pool]
    const order = seededOrder(`${item.id}:${kind}`, choices.length)
    const options = order.map((i) => choices[i])

    const question: PlacementQuestion = { kind, word: item, options, answerIndex: options.indexOf(correct) }
    if (kind === 'cloze') {
      question.sentence = blankOut(displayExample(item, script), displayWord(item, script))
      question.translation = item.example?.translation
    }
    return question
  })
}

/**
 * Which kind of question this item becomes.
 *
 * Cloze is offered first and only where the bank actually has a usable sentence
 * — one that contains the word, so there is something to cut out. Everything
 * that fails that test falls through to the listening/meaning rota, so a word
 * without an example is never a gap the learner cannot fill.
 */
function kindFor(item: VocabWord, index: number, script: ScriptMode): PlacementKind {
  if (index % CLOZE_EVERY === 1 && canCloze(item, script)) return 'cloze'
  return index % LISTENING_EVERY === LISTENING_EVERY - 1 ? 'listening' : 'meaning'
}

/**
 * Candidate distractors, closest HSK level first, shuffled within each level.
 *
 * The shuffle happens before the sort, and the sort is stable, so words at the
 * same distance from the target's level come back in a seeded-random order
 * while the level ordering itself is fixed. That gives variety between attempts
 * without ever offering an HSK 6 word beside an HSK 1 answer, which would be as
 * good as underlining the right one.
 */
function nearestFirst(distractors: VocabWord[], item: VocabWord, kind: PlacementKind): VocabWord[] {
  const order = seededOrder(`${item.id}:${kind}:distractors`, distractors.length)
  return order
    .map((i) => distractors[i])
    .sort((a, b) => Math.abs(a.hskLevel - item.hskLevel) - Math.abs(b.hskLevel - item.hskLevel))
}

function canCloze(item: VocabWord, script: ScriptMode): boolean {
  const sentence = displayExample(item, script)
  const form = displayWord(item, script)
  if (!sentence || !form) return false
  /* The word has to appear exactly once. Twice and blanking both leaves a
     sentence with two holes and one answer; the learner would be right to call
     that unfair. */
  return sentence.split(form).length === 2
}

/** Replaces the word with a blank, leaving the rest of the sentence intact. */
function blankOut(sentence: string, form: string): string {
  return sentence.replace(form, CLOZE_BLANK)
}
