import type { VocabWord } from '../types'

/*
 * Definition presentation.
 *
 * The bulk word bank comes from CC-CEDICT, which lists every attested sense
 * separated by semicolons. That's right for a dictionary and wrong for a
 * flashcard: 會 arrives as "can; to have the skill; to know how to; to be likely
 * to; to be sure to; to meet; to get to", which tells a learner almost nothing
 * because it tells them everything.
 *
 * Nothing here edits the source data — the full definition stays available for
 * the dictionary's detail view. These helpers only decide what to *show* where
 * space is tight.
 */

/** Senses beyond this are dropped from the short form. Two reads as a definition; four reads as a list. */
const DEFAULT_MAX_SENSES = 2

/**
 * Grammatical commentary rather than a translation. CC-CEDICT uses these for
 * particles and bound forms; they're useful in a dictionary entry and useless as
 * the headline gloss on a card, so they sort to the back.
 */
const COMMENTARY = /^(used |used\b|indicating|indicates|particle|classifier|abbr\.|abbreviation|variant of|old variant|see |also written|surname\b|erhua variant)/i

/** Splits on semicolons, tidying the stray spacing CC-CEDICT leaves behind. */
export function senses(definition: string): string[] {
  return definition
    .split(';')
    .map((s) => s.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
}

/**
 * The short gloss: the most concrete senses, at most `maxSenses` of them.
 *
 * Concrete senses come first — a learner meeting 呢 is better served by a plain
 * translation than by a sentence about discourse linkage — but commentary is
 * kept as a fallback so a word whose every sense is grammatical still shows
 * something rather than an empty string.
 */
export function conciseDefinition(definition: string, maxSenses = DEFAULT_MAX_SENSES): string {
  const all = senses(definition)
  if (all.length === 0) return definition.trim()

  const concrete = all.filter((s) => !COMMENTARY.test(s))
  const ordered = concrete.length > 0 ? concrete : all

  // A single long gloss is a sentence, not a list — truncating it mid-clause
  // reads worse than letting it through whole.
  return ordered.slice(0, maxSenses).join('; ')
}

/** Convenience wrapper for the common case of glossing a word. */
export function shortGloss(word: VocabWord, maxSenses = DEFAULT_MAX_SENSES): string {
  return conciseDefinition(word.definition, maxSenses)
}

/**
 * Whether a word is a good candidate for the New Words drill.
 *
 * The imported bank is a full dictionary, so it carries plenty of entries that
 * are real Chinese but poor first vocabulary: transliterated foreign names
 * (羅傑 "Roger"), surnames, abbreviations, bound forms, and entries whose only
 * gloss is a note about grammar. A learner meeting those in a "new words" queue
 * learns a curiosity instead of a word they'll use.
 */
export function isTeachableWord(word: VocabWord): boolean {
  const all = senses(word.definition)
  if (all.length === 0) return false

  // Every sense is commentary — nothing here to translate.
  if (all.every((s) => COMMENTARY.test(s))) return false

  const first = all[0]

  // Transliterated names: a lone capitalised token with nothing after it —
  // "Jack", "John", "Roger". Capitalisation alone is too blunt a test, since it
  // also catches words worth learning ("Good night!", "United States"), so the
  // rule is deliberately narrow: one word, no spaces, no punctuation. A later
  // lower-case sense means the word has an ordinary meaning too, so it stays.
  const looksLikeName = /^[A-Z][a-z]+$/.test(first) && !/^(I|A)$/.test(first)
  if (looksLikeName && !all.slice(1).some((s) => /^[a-z]/.test(s))) return false

  // Cross-references and abbreviations point at another entry rather than
  // carrying a meaning of their own.
  if (/^(abbr\.|variant of|old variant|see |also written)/i.test(first)) return false
  if (/\bsurname\b/i.test(first)) return false

  return true
}
