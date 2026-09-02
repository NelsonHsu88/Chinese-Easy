import type { StoryPage } from '../types'

/*
 * Cutting an authored story page down to screen-sized ones.
 *
 * The reading library is authored in long pages — a median of 274 Chinese
 * characters, up to 572 — which is several screens of the reader's layout, so
 * every page needed scrolling and the translation at the foot of it was a long
 * way from the text it explained. This re-cuts them into screens of a few whole
 * sentences each, and carries the matching slice of the translation along with
 * each piece.
 *
 * What a "screen" promises is worth stating, because it changed: not that it
 * fits without scrolling — on a phone, once the header and the translation card
 * have taken their share, almost nothing does — but that it is a few whole
 * sentences with their translation beside them, and that a story is a handful
 * of them rather than fifty. See `MIN_SENTENCES`.
 *
 * Pure logic, no React and no layout APIs: the reader measures its own reading
 * area and passes a character budget in.
 */

/**
 * Sentence ends. `」』"'` are included so a closing quote stays attached to the
 * sentence it closes — the library is full of dialogue, and splitting after 。
 * alone would strand a lone 」 at the head of the next screen.
 */
const ZH_SENTENCE = /[^。！？…]*[。！？…]+[」』"']*|[^。！？…]+$/g

/** Secondary breaks, used only when one sentence alone overruns a whole screen. */
const ZH_CLAUSE = /[^，、；：]*[，、；：]+[」』"']*|[^，、；：]+$/g

const EN_SENTENCE = /[^.!?]*[.!?]+["'”’)]*(?:\s+|$)|[^.!?]+$/g

/** Nothing sensible can be laid out below this, whatever the measurement says. */
const MIN_BUDGET = 12

/**
 * Sentences every screen gets, however little room the measurement leaves.
 *
 * The measured budget alone was making books enormous. On a 393pt phone the
 * reading area comes out at about two rows — sixteen characters — once the
 * header, the cover, the translation card and the page nav have taken their
 * share, and sixteen characters is most of one sentence. Stories were arriving
 * cut into fifty-odd screens, a sentence at a time, with the progress bar
 * reading 1% after the first page turn: a page turn every few seconds, which is
 * not reading, and no sense of a story having any shape.
 *
 * So a screen holds at least this many whole sentences and scrolls if it has
 * to. That is the trade being made deliberately — the pagination stops
 * promising that a screen never scrolls, and promises instead that it never
 * splits a sentence and never ends in the middle of a thought. Across the
 * library it takes a story from around fifty screens to three or four.
 *
 * `budget` still has a job: it is a *floor*, not a ceiling. Where the screen is
 * big enough to hold more than these four sentences — a tablet, or a browser
 * window — they go on the same screen rather than being held back.
 */
const MIN_SENTENCES = 4

/**
 * And the ceiling, so "at least four sentences" cannot mean an absurd screen.
 *
 * Four of the longest sentences in the library would run past 500 characters,
 * which is a page and a half of scrolling and defeats the point of cutting the
 * story up at all. This closes the screen at a sentence end instead — the only
 * kind of break this module is ever willing to make above the clause level.
 */
const MAX_SCREEN_CHARS = 300

function matchAll(text: string, re: RegExp): string[] {
  return (text.match(re) ?? []).map((s) => s).filter((s) => s.trim().length > 0)
}

/** Chinese text cut into sentences, punctuation kept with the sentence it ends. */
export function splitChineseSentences(text: string): string[] {
  return matchAll(text, ZH_SENTENCE)
}

/** English text cut into sentences, trailing space trimmed. */
export function splitEnglishSentences(text: string): string[] {
  return matchAll(text, EN_SENTENCE).map((s) => s.trim())
}

/**
 * Breaks a sentence too long for one screen at its commas.
 *
 * A last resort, and it still prefers a real punctuation mark to a blind cut:
 * only if a single comma-free run is itself over budget does it get sliced at
 * the budget, because at that point there is nothing in the text to aim at.
 */
function breakLongSentence(sentence: string, budget: number): string[] {
  if (sentence.length <= budget) return [sentence]

  const out: string[] = []
  let current = ''
  for (const clause of matchAll(sentence, ZH_CLAUSE)) {
    if (current && current.length + clause.length > budget) {
      out.push(current)
      current = ''
    }
    if (clause.length > budget) {
      if (current) {
        out.push(current)
        current = ''
      }
      for (let i = 0; i < clause.length; i += budget) out.push(clause.slice(i, i + budget))
      continue
    }
    current += clause
  }
  if (current) out.push(current)
  return out
}

/**
 * Packs sentences into screens: at least `MIN_SENTENCES` of them, more while
 * they fit inside `budget`, and never more than `MAX_SCREEN_CHARS`.
 *
 * Whole sentences throughout. A screen is only ever closed at a sentence end,
 * so the single exception — `breakLongSentence`, for one sentence that on its
 * own runs past the ceiling — is the only place a screen can begin mid-thought.
 */
export function packSentences(
  sentences: string[],
  budget: number,
  minSentences: number = MIN_SENTENCES,
): string[] {
  const limit = Math.max(MIN_BUDGET, budget)
  const chunks: string[] = []
  let current = ''
  /* Whole sentences in `current` — the pieces of a split sentence count as the
     one sentence they came from, or a monster sentence would satisfy the
     minimum by itself. */
  let held = 0

  const close = () => {
    if (current) chunks.push(current)
    current = ''
    held = 0
  }

  for (const sentence of sentences) {
    for (const piece of breakLongSentence(sentence, MAX_SCREEN_CHARS)) {
      const over = current.length + piece.length
      /* Two ways a screen ends: it has its minimum and the next sentence would
         overrun the measured area, or it would overrun the ceiling whether or
         not it has its minimum. */
      if (current && ((held >= minSentences && over > limit) || over > MAX_SCREEN_CHARS)) close()
      current += piece
    }
    held += 1
  }
  close()
  return chunks
}

/**
 * The English sentences belonging to the slice of a page running from `start`
 * to `end`, both as fractions of the page's Chinese.
 *
 * Alignment is proportional rather than sentence-for-sentence because the two
 * languages don't agree on how many sentences a page has: 58% of the authored
 * pages have different Chinese and English sentence counts, since Chinese ends
 * short clauses with 。 where the English joins them into one sentence. Counting
 * sentences would therefore drift badly on more than half the library.
 *
 * Selecting by *overlap* is what keeps the result honest. Every English
 * sentence occupies a span of the page, every screen occupies a span, and a
 * sentence is shown on each screen its span touches. So no screen is ever left
 * with no translation, no sentence is ever cut in half, and a long English
 * sentence covering two screens of Chinese appears on both — which is the
 * truthful answer, since it really is describing both.
 */
export function translationFor(sentences: string[], start: number, end: number): string {
  if (sentences.length === 0) return ''
  const total = sentences.reduce((sum, s) => sum + s.length, 0)
  if (total === 0) return ''

  const picked: string[] = []
  let at = 0
  for (const sentence of sentences) {
    const from = at / total
    const to = (at + sentence.length) / total
    // Touching counts as overlapping only if the spans genuinely intersect,
    // so a sentence ending exactly on a screen boundary isn't repeated.
    if (from < end && to > start) picked.push(sentence)
    at += sentence.length
  }
  // A screen narrower than a single sentence can fall between two spans; give
  // it the sentence it sits inside rather than nothing.
  if (picked.length === 0) {
    const mid = (start + end) / 2
    let cursor = 0
    for (const sentence of sentences) {
      const to = (cursor + sentence.length) / total
      if (mid <= to) return sentence
      cursor += sentence.length
    }
    return sentences[sentences.length - 1]
  }
  return picked.join(' ')
}

export interface StoryScreen {
  chinese: string
  translation: string
  /** Which authored page this came from, for anything that still thinks in those. */
  sourcePage: number
}

/**
 * Re-cuts a story's authored pages into screens: a few whole sentences each,
 * `budget` being the size the reading area was measured at rather than a cap.
 *
 * `pinyin` is dropped deliberately: the reader renders a per-word reading under
 * each word and no page in the library relies on the page-level romanisation
 * any more, so carrying a slice of it here would mean splitting a string that
 * nothing reads.
 */
export function paginateStory(pages: StoryPage[], budget: number): StoryScreen[] {
  const screens: StoryScreen[] = []

  pages.forEach((page, sourcePage) => {
    const chunks = packSentences(splitChineseSentences(page.chinese), budget)
    if (chunks.length === 0) return

    const english = splitEnglishSentences(page.translation)
    const total = page.chinese.length || 1
    let at = 0

    for (const chunk of chunks) {
      const start = at / total
      const end = (at + chunk.length) / total
      screens.push({
        chinese: chunk,
        translation: translationFor(english, start, end),
        sourcePage,
      })
      at += chunk.length
    }
  })

  return screens
}

/*
 * Turning a measured reading area into a character budget.
 *
 * The reader draws one bordered cell per word with its reading underneath, so
 * these are the rendered size of one such cell. Both are measured from the
 * running app rather than derived from the style rules, because the rules alone
 * miss what the line height and the reading underneath really add up to: a row
 * pitch worked out on paper came to 68 and measures 77, which over ten rows is
 * a whole row of overflow.
 *
 * `CELL_WIDTH` is per *character* and so runs deliberately wide — a
 * two-character word measures 66, not 86 — which errs toward fewer characters
 * per row. That is the safe direction: the page sits inside a ScrollView, so an
 * underfilled screen costs nothing while an overfilled one has to be scrolled.
 *
 * What comes out of here is the point at which a screen stops taking *extra*
 * sentences, not the size of a screen: `packSentences` gives every screen its
 * minimum first. On a phone the two rows this measures are used up by the first
 * sentence and the minimum is what decides the page; on a tablet there is real
 * room and this is what spends it.
 */
const CELL_WIDTH = 43
const CELL_HEIGHT = 77

/** How many characters comfortably fit in a reading area of this size. */
export function budgetForArea(width: number, height: number): number {
  const perRow = Math.max(1, Math.floor(width / CELL_WIDTH))
  const rows = Math.max(1, Math.floor(height / CELL_HEIGHT))
  return Math.max(MIN_BUDGET, perRow * rows)
}
