import COMMON_ENGLISH from '../data/commonEnglish.json'
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
 * So the short form shows exactly one sense — and it is *chosen*, not just the
 * first. CC-CEDICT orders senses by primacy, not by usefulness to a beginner, so
 * it happily leads with an archaic reading (嗨 → "oh alas; hey!; hi!") or a
 * clause built round its own shorthand (快點 → "to do sth more quickly; Hurry
 * up!"). `pickSense` scores every sense on plain-English grounds and takes the
 * best, with a deliberate thumb on the scale for the first one.
 *
 * Nothing here edits the source data — the full definition stays available for
 * the dictionary's detail view. These helpers only decide what to *show* where
 * space is tight.
 */

/** One sense. A learner reading a card wants a meaning, not a menu of them. */
const DEFAULT_MAX_SENSES = 1

/**
 * Grammatical commentary rather than a translation. CC-CEDICT uses these for
 * particles and bound forms; they're useful in a dictionary entry and useless as
 * the headline gloss on a card, so they sort to the back.
 */
const COMMENTARY =
  /^(used |used\b|indicating|indicates|classifier|abbr\.|abbreviation|variant of|old variant|see |also written|surname\b|erhua variant|lit\.)|\b(particle|interjection)\b/i

/**
 * CC-CEDICT's shorthand, spelled out.
 *
 * "to do sth more quickly" is dictionary notation leaking onto a flashcard —
 * every one of these has a plain English word behind it, and reading them aloud
 * is how you find out how odd they look.
 */
const SHORTHAND: [RegExp, string][] = [
  // A trailing \b would not match, since a full stop followed by a space is not
  // a word boundary — "sth." and "esp." need the period inside the pattern.
  [/\bsth\b\.?/gi, 'something'],
  [/\bsb\b\.?/gi, 'someone'],
  [/\betc\b\.?/gi, 'and so on'],
  [/\be\.g\.\s*/gi, 'for example '],
  [/\bi\.e\.\s*/gi, 'that is '],
  [/\besp\./gi, 'especially'],
  // "fig." marks the sense that carries the actual meaning of an idiom; the
  // marker is editorial and the sentence reads fine without it. Its "lit."
  // sibling is treated as commentary instead — a literal reading of 拐彎抹角 as
  // "going round the curves and skirting the corners" is not what the word means.
  [/^fig\.\s*/i, ''],
]

/** Splits on semicolons, tidying the stray spacing CC-CEDICT leaves behind. */
export function senses(definition: string): string[] {
  return definition
    .split(';')
    .map((s) => s.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
}

/** A sense with the dictionary notation expanded into words. */
export function plainEnglish(sense: string): string {
  let out = sense
  for (const [pattern, replacement] of SHORTHAND) out = out.replace(pattern, replacement)
  return out.replace(/\s+/g, ' ').trim()
}

/*
 * The few thousand commonest English words, used to tell "notice" from "alas".
 *
 * Built once, lazily — the JSON is a single space-joined string rather than an
 * array so it stays a 29 KB parse rather than four thousand of them.
 */
let commonWords: Set<string> | null = null

/**
 * Whether a word is one a learner is likely to already know.
 *
 * Inflections are stemmed back crudely rather than with a real stemmer: the
 * question is only "is this recognisable English", and "noticing" not matching
 * "notice" would make half the verb glosses look esoteric.
 */
function isPlainWord(raw: string): boolean {
  commonWords ??= new Set(COMMON_ENGLISH.words.split(' '))
  const word = raw.toLowerCase().replace(/[^a-z-]/g, '')
  if (!word) return true
  if (commonWords.has(word)) return true
  for (const stem of [
    word.replace(/(ies)$/, 'y'),
    word.replace(/(es|s)$/, ''),
    word.replace(/(ed|ing)$/, ''),
    word.replace(/(ed|ing)$/, 'e'),
    word.replace(/(ly)$/, ''),
  ]) {
    if (stem !== word && commonWords.has(stem)) return true
  }
  return false
}

/**
 * How poorly a sense would serve as *the* gloss — lower is better.
 *
 * The weights encode an order of preference: never lead with grammatical
 * commentary; prefer words a learner already knows; prefer short over long; and
 * all else being equal, trust CC-CEDICT's own ordering. The position penalty is
 * what keeps this conservative — a later sense has to be genuinely plainer or
 * shorter to overtake the first, so this reorders the odd entry rather than
 * second-guessing the source across the board.
 */
function senseScore(sense: string, position: number): number {
  const plain = plainEnglish(sense)
  const words = plain.split(/\s+/).filter(Boolean)

  let score = position * 3
  if (COMMENTARY.test(sense)) score += 100
  for (const raw of words) {
    const token = raw.replace(/[^A-Za-z-]/g, '')
    if (!token) continue
    // An all-caps abbreviation is short but not plainer, and shortness is
    // rewarded below — without this, 結核病 glossed as "TB" rather than
    // "tuberculosis". Checked before the proper-noun exemption, which it fits.
    if (/^[A-Z]{2,}$/.test(token)) {
      if (!isPlainWord(token)) score += 6
      continue
    }
    // Proper nouns are exempt. A rare name is not an esoteric way of saying
    // something plainer, so penalising it just swaps one name for another —
    // 傑米 came out as "Jim" because "Jamie" isn't in the frequency list.
    if (/^[A-Z]/.test(token)) continue
    if (!isPlainWord(token)) score += 6
  }
  // Three words is a gloss ("to look after"); eight is an explanation.
  if (words.length > 3) score += (words.length - 3) * 2
  return score
}

/**
 * The short gloss: the single clearest sense, or `maxSenses` of them joined.
 *
 * Commentary is scored down rather than filtered out, so a word whose every
 * sense is grammatical still shows something instead of an empty string.
 */
export function conciseDefinition(definition: string, maxSenses = DEFAULT_MAX_SENSES): string {
  const all = senses(definition)
  if (all.length === 0) return plainEnglish(definition)

  const ranked = all
    .map((sense, position) => ({ sense, position, score: senseScore(sense, position) }))
    .sort((a, b) => a.score - b.score || a.position - b.position)

  return ranked
    .slice(0, maxSenses)
    // Back into CC-CEDICT's order, so a two-sense gloss doesn't read backwards.
    .sort((a, b) => a.position - b.position)
    .map((entry) => plainEnglish(entry.sense))
    .join('; ')
}

/** Convenience wrapper for the common case of glossing a word. */
export function shortGloss(word: VocabWord, maxSenses = DEFAULT_MAX_SENSES): string {
  return conciseDefinition(word.definition, maxSenses)
}

/**
 * Every sense, plain-English and best-first — what the detail card lists.
 *
 * Same ranking as `shortGloss`, so the headline gloss is always the first row
 * rather than appearing twice in a different position down the list.
 */
export function allSenses(word: VocabWord): string[] {
  const all = senses(word.definition)
  return all
    .map((sense, position) => ({ sense, score: senseScore(sense, position), position }))
    .sort((a, b) => a.score - b.score || a.position - b.position)
    .map((entry) => plainEnglish(entry.sense))
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

/*
 * Function words — the glue of the language rather than vocabulary you go and
 * learn. 的, 很, 但是 and friends are essential to *read*, but meeting them as
 * flashcards teaches nothing a learner can use, because their meaning is
 * positional rather than referential.
 *
 * Deliberately narrow: pronouns, demonstratives and everyday verbs all stay,
 * because those genuinely are words worth learning. A word only counts as
 * function-only if *every* one of its senses reads that way.
 */
const FUNCTION_WORD_SENSE = [
  /^(of|~'s)$/i,
  /^(no|not|not so|un-)$/i,
  /^(a|an|the|one) (bit|little|whole)\b/i,
  /^(a bit|a little|a few|some|slightly)\b/i,
  /^(very|quite|rather|already|still|just|also|too|again|always|often|sometimes|never|surely|certainly|definitely|probably|perhaps|maybe|merely|only)$/i,
  /^(and|but|or|if|then|because|so that|although|however|in that case)$/i,
  /^(more|less|most|least)$/i,
  /^(first|second|third|once|twice)$/i,
  /^(one|two|three) (kind|type) of$/i,
]

/*
 * Structural and sentence-final particles, listed outright.
 *
 * Normally a gloss-based rule is preferable to a hand-written list, but these
 * particles have no standalone meaning to gloss, so CC-CEDICT's entries for them
 * are unreliable or plainly misleading — 嗎 comes through as "what?" and 吧 as
 * "bar; to puff; bang". No pattern over that text can classify them correctly.
 *
 * It's a small closed class in Chinese, so naming its members is both accurate
 * and stable. They're essential to read and impossible to learn as flashcards.
 */
const PARTICLES = new Set([
  '的', '了', '著', '过', '過', '嗎', '吗', '吧', '呢', '啊', '呀', '嘛', '哦', '喔', '唄', '呗',
  '之', '乎', '者', '矣', '焉', '哉', '麼', '么', '得', '地',
])

export function isFunctionWord(word: VocabWord): boolean {
  if (PARTICLES.has(word.traditional) || PARTICLES.has(word.simplified)) return true
  return senses(word.definition).every((s) => FUNCTION_WORD_SENSE.some((re) => re.test(s)))
}

/**
 * Adverbs, demonstratives and pronouns: real words worth knowing, but not the
 * concrete nouns and adjectives a queue should lead with. Demoted rather than
 * removed, so they still turn up once the picturable words are exhausted.
 */
const GRAMMAR_ADJACENT = new Set([
  '就', '都', '也', '還', '还', '很', '太', '再', '才', '又', '更', '最', '沒', '没', '別', '别',
  '這', '这', '那', '哪', '每', '些', '多少', '怎麼', '怎么', '為什麼', '为什么',
])

/**
 * How readily a word can be pictured and used, lowest first. This only decides
 * what a learner *meets soonest* — nothing is discarded on this basis, so a
 * queue that runs long still reaches everything.
 *
 * Concrete things and descriptions lead, then verbs, then words that are mostly
 * grammar wearing a content-word gloss.
 */
export function contentRank(word: VocabWord): number {
  const all = senses(word.definition)
  const first = all[0] ?? ''

  if (isFunctionWord(word)) return 3
  if (GRAMMAR_ADJACENT.has(word.traditional) || GRAMMAR_ADJACENT.has(word.simplified)) return 2
  // Directional complements gloss as verbs but behave as grammar: 下去, 出來.
  if (/^to (go|come) (up|down|out|in|over|back|on|along)\b/i.test(first)) return 3

  /*
   * Judged on the *first* sense, which CC-CEDICT lists as the primary meaning.
   * Requiring every sense to look grammatical was too weak a test: 一下 glosses
   * as "a bit; a little; all at once; suddenly", and the two adverbs at the end
   * were enough to let it rank as a concrete word and lead the whole queue.
   */
  if (
    /^(a bit|a little|a few|some|slightly|the least bit|all at once|one kind|one type)\b/i.test(first) ||
    /^(surely|certainly|definitely|straight|continuously|always|immediately|suddenly|together|altogether|approximately|probably|already|still|merely|only|very|quite)\b/i.test(first)
  ) {
    return 2
  }

  if (/^to /i.test(first)) return 1
  return 0
}
