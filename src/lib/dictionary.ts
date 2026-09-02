import strokeCounts from '../data/strokeCounts.json'
import RADICAL_MEMBERS from '../data/characterRadicals.json'
import { lookupCandidates } from '../data/lookupWords'
import { KANGXI_RADICALS } from '../data/kangxiRadicals'
import { RADICALS } from '../data/radicals'
import { displayExample, displayWord, foldPinyin } from './hanzi'
import { contentRank, isTeachableWord, senses } from './definitions'
import { proficiencyFor } from './proficiency'
import type { KangxiRadical, Radical, ScriptMode, SrsCard, VocabWord } from '../types'

/*
 * Queries behind the Dictionary screens.
 *
 * Pure logic — no platform APIs, no React. The screens decide how to show a
 * result; everything about *finding* one lives here so the landing page, the
 * search results and both detail screens agree on what an answer is.
 */

// --- Search -------------------------------------------------------------------

/** Which part of an entry a query is matched against. Mirrors the filter chips. */
export type SearchField = 'all' | 'hanzi' | 'pinyin' | 'english'

export const SEARCH_FIELDS: { value: SearchField; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'hanzi', label: 'Hanzi' },
  { value: 'pinyin', label: 'Pinyin' },
  { value: 'english', label: 'English' },
]

function matchesHanzi(word: VocabWord, raw: string): boolean {
  return word.simplified.includes(raw) || word.traditional.includes(raw)
}

function matchesPinyin(keys: FixedKeys, folded: string, tight: string): boolean {
  // Stored pinyin is syllable-spaced ("xué xí") but people type it run together
  // ("xuexi"), so the despaced form has to match too.
  return keys.pinyin.includes(folded) || keys.tight.includes(tight)
}

/**
 * Whether the query is a whole number of syllables from the start of the
 * reading — "shui" of "shuǐ guǒ", or "nihao" of "nǐ hǎo".
 *
 * This is what separates a learner typing a reading from a coincidence of
 * spelling. "red" is a prefix of 熱帶's "redai", but it cuts the second
 * syllable in half; nobody typing it meant that word, and they very likely
 * meant the colour. A prefix that lands on a syllable boundary is a reading; a
 * prefix that lands inside one is an accident, and is ranked as such.
 */
function isSyllablePrefix(keys: FixedKeys, tight: string): boolean {
  let run = ''
  for (const syllable of keys.syllables) {
    run += syllable
    if (run === tight) return true
    if (run.length >= tight.length) return false
  }
  return false
}

/**
 * A prepared query. Built once per search rather than per candidate: folding
 * pinyin is a Unicode normalise plus a regex, and doing it inside a 20,000-entry
 * filter is most of the cost of a search.
 */
interface Query {
  /** As typed, for matching Chinese characters. */
  raw: string
  /** Lowercased and stripped of tone marks. */
  folded: string
  /** …and of spaces, for run-together pinyin ("xuexi"). */
  tight: string
  /**
   * Singularised, so a learner who types the plural still finds the entry.
   *
   * CC-CEDICT glosses in the singular — 餃子 is "dumpling", not "dumplings" —
   * so searching "dumplings" used to return nothing at all while "dumpling"
   * returned the word. Folding the query rather than the definition keeps this
   * to one operation per search instead of one per entry.
   */
  singular: string
}

/**
 * Trailing plural, removed only where what's left is still a word worth
 * matching.
 *
 * Crude on purpose, and safe because of where it is used: the query is tested
 * in *both* forms, so a wrong guess ("does" → "doe") can only add candidates,
 * never take one away. The `ss/us/is` guard is what keeps "glass", "bus" and
 * "this" from being filed down to nonsense, and the length floors keep "yes"
 * and "gas" intact.
 */
function singularise(text: string): string {
  if (/(?:ss|us|is)$/.test(text)) return text
  if (/[a-z]{3,}ies$/.test(text)) return `${text.slice(0, -3)}y`
  if (/[a-z]{3,}(?:ch|sh|x|z|s)es$/.test(text)) return text.slice(0, -2)
  if (/[a-z]{3,}s$/.test(text)) return text.slice(0, -1)
  return text
}

function matchesEnglish(keys: FixedKeys, q: Query): boolean {
  return keys.definition.includes(q.folded) || keys.definition.includes(q.singular)
}

/**
 * Leading grammar that a learner does not type.
 *
 * Somebody searching "eat" means 吃, whose gloss is "to eat"; somebody
 * searching "dumpling" should not be beaten to the top by an entry glossed
 * "a dumpling of some kind". Stripped for the *equality* test only — the
 * article still counts as part of the sense everywhere else.
 */
const LEADING_GRAMMAR = /^(?:to |a |an |the )/

function normaliseSense(sense: string): string {
  return singularise(
    sense
      .toLowerCase()
      .replace(LEADING_GRAMMAR, '')
      .replace(/[.,;:!?"']+$/, '')
      .trim(),
  )
}

const LETTER = /[a-z0-9]/

/**
 * How `term` sits inside `text`: 0 a whole word, 1 the start of one, 2 buried
 * inside one, 3 not there at all.
 *
 * All three distinctions earn their keep. Whole word is the real answer ("rice"
 * in "rice bowl"). The *start* of a word is how search-as-you-type works at all
 * — "dumpl" has to find "dumpling" while the learner is still typing — but it
 * is weaker, or "car" is answered by "not to care". Buried is weakest: it is
 * what makes "rice" match 價格 "price", which should be found and should be
 * last.
 */
function placement(text: string, term: string): number {
  let at = text.indexOf(term)
  let best = 3
  while (at !== -1) {
    const startsWord = at === 0 || !LETTER.test(text[at - 1])
    if (startsWord) {
      const after = at + term.length
      if (after >= text.length || !LETTER.test(text[after])) return 0
      best = Math.min(best, 1)
    } else {
      best = Math.min(best, 2)
    }
    at = text.indexOf(term, at + 1)
  }
  return best
}

/**
 * How well an entry's English answers the query, and from how deep in the entry.
 *
 * Four tiers — the sense *is* the query, contains it as a word, contains a word
 * beginning with it, or merely contains the letters — and the distance between
 * the first and the last is the whole point. Searching "cake" used to put 蛋糕
 * — the word for cake — *seventh*, under 塊 ("classifier for pieces of cloth,
 * cake, soap etc"), 糒 ("food for a journey; cakes") and three other rarities,
 * because every English match scored identically and the tie was then broken by
 * *character count*, which is a ranking by obscurity: single rare characters win
 * it every time. Searching "rice" returned 價格 "price" above 米飯, because
 * nothing distinguished a whole word from a fragment inside another one.
 *
 * What is deliberately *not* a tier: whether the sense starts with the query.
 * An earlier draft ranked "rice vessel" above "uncooked rice" on that basis,
 * and there is nothing about the modifier coming first that makes a rarer word
 * the better answer. Within a tier, commonness decides — which is what that
 * distinction was reaching for.
 *
 * `senseIndex` is returned alongside because CC-CEDICT lists the primary
 * meaning first: a word that *means* the query beats one that mentions it in
 * its fifth sense, even at the same tier.
 */
function englishRelevance(all: string[], q: Query): { tier: number; senseIndex: number } {
  let best = { tier: 4, senseIndex: all.length }

  for (let i = 0; i < all.length; i++) {
    const sense = all[i].toLowerCase()
    const normalised = normaliseSense(all[i])
    let tier: number
    if (normalised === q.folded || normalised === q.singular) tier = 0
    else {
      /* Both forms of the query, best placement wins: the singular is a guess
         and must never make an entry rank worse than the letters typed would. */
      tier = 1 + Math.min(placement(sense, q.folded), placement(sense, q.singular))
    }
    if (tier >= 4) continue

    if (tier < best.tier) best = { tier, senseIndex: i }
    if (best.tier === 0) break
  }

  return best
}

/**
 * The ladder every hit is placed on, best first.
 *
 * The one ordering here that is not obvious is where **English exact** sits: it
 * beats a *containment* match in pinyin. Somebody typing "red" is answered by
 * 紅, not by 熱帶 (rè dài) — which matches only because "red" happens to fall
 * inside "redai" when the syllables are run together. A pinyin match that is
 * neither the whole reading nor its start is a coincidence of spelling, and a
 * gloss that is exactly the word typed is not.
 */
const SCORE = {
  scriptExact: 0,
  /** A hanzi prefix, or a pinyin prefix that lands on a syllable boundary. */
  scriptPrefix: 1,
  hanziContains: 2,
  englishExact: 3,
  /** A pinyin prefix that cuts a syllable in half — see `isSyllablePrefix`. */
  pinyinPartial: 4,
  pinyinContains: 5,
  englishWord: 6,
  /** A word *beginning* with the query — how typing finds a word mid-spelling. */
  englishWordPrefix: 7,
  englishSubstring: 8,
} as const

/** English tier (0…3 from `englishRelevance`) → its rung on the ladder. */
const ENGLISH_SCORES = [
  SCORE.englishExact,
  SCORE.englishWord,
  SCORE.englishWordPrefix,
  SCORE.englishSubstring,
] as const

/**
 * A transliterated name is moved one English tier down rather than a fixed
 * number of rungs.
 *
 * So an exact gloss match — "Rice", of 賴斯 — lands level with the ordinary
 * whole-word matches rather than above them, and commonness then decides
 * between them, which is how 米 and 飯 get back in front of Condoleezza Rice.
 * A rung count cannot express that, because the gap between the tiers is not
 * constant: the weaker pinyin signals are interleaved between them.
 */
function demote(tier: number): number {
  return ENGLISH_SCORES[Math.min(tier + 1, ENGLISH_SCORES.length - 1)]
}

/**
 * Ranks a hit so the obvious answer lands first: an exact character or pinyin
 * match, then a prefix, then the English tiers interleaved with the weaker
 * script matches per `SCORE`. `contentRank` breaks ties towards real
 * vocabulary, which keeps grammar notes out of the top few rows.
 */
function relevance(word: VocabWord, q: Query, keys: FixedKeys): { score: number; senseIndex: number } {
  if (word.traditional === q.raw || word.simplified === q.raw || keys.tight === q.tight) {
    return { score: SCORE.scriptExact, senseIndex: 0 }
  }
  if (word.traditional.startsWith(q.raw) || word.simplified.startsWith(q.raw)) {
    return { score: SCORE.scriptPrefix, senseIndex: 0 }
  }
  if (keys.tight.startsWith(q.tight) && isSyllablePrefix(keys, q.tight)) {
    return { score: SCORE.scriptPrefix, senseIndex: 0 }
  }
  if (matchesHanzi(word, q.raw)) return { score: SCORE.hanziContains, senseIndex: 0 }

  const english = englishRelevance(keys.senses, q)
  /*
   * The two weaker pinyin signals, kept apart: a prefix that happens to stop
   * inside a syllable still beats a passing mention in a definition, but it
   * does not beat a gloss that is exactly what was typed.
   */
  const pinyinScore = keys.tight.startsWith(q.tight)
    ? SCORE.pinyinPartial
    : matchesPinyin(keys, q.folded, q.tight)
      ? SCORE.pinyinContains
      : Number.POSITIVE_INFINITY

  if (english.tier < ENGLISH_SCORES.length) {
    /*
     * A transliterated name is pushed down the band rather than out of it. The
     * test is the same one the New Words queue uses, and it also catches place
     * names — which are perfectly good answers when somebody searches for one,
     * and are still first there because nothing better competes.
     */
    const score = isTeachableWord(word) ? ENGLISH_SCORES[english.tier] : demote(english.tier)
    /* A word that answers in both languages is ranked by whichever answered better. */
    return { score: Math.min(score, pinyinScore), senseIndex: english.senseIndex }
  }

  return { score: pinyinScore, senseIndex: 0 }
}

/** The per-entry work that does not depend on the query. See `fixedKeys`. */
interface FixedKeys {
  /** Folded reading, syllable-spaced: "hai shui". */
  pinyin: string
  /** …and run together, the way people type it: "haishui". */
  tight: string
  syllables: string[]
  /** Lowercased definition, for the filter — the sense split is for scoring. */
  definition: string
  senses: string[]
  content: number
}

/**
 * The scoring work that depends only on the entry, kept between searches.
 *
 * Folding a reading, splitting a definition into senses and ranking its content
 * are all pure functions of the word — and a learner typing "dumpling" runs
 * eight searches over the same 20,000-entry bank, one per keystroke, each of
 * which was folding and splitting every entry again from scratch. Folding alone
 * is a Unicode normalise plus a regex per word, and it was the single largest
 * cost in a search. Caching turns every keystroke after the first into
 * comparisons.
 *
 * A `WeakMap` keyed by the entry itself, so nothing has to be invalidated: a
 * rebuilt bank is a new set of objects and therefore a new set of keys, and the
 * old ones are collected with it.
 */
const FIXED_KEYS = new WeakMap<VocabWord, FixedKeys>()

function fixedKeys(word: VocabWord): FixedKeys {
  const cached = FIXED_KEYS.get(word)
  if (cached) return cached
  const pinyin = foldPinyin(word.pinyin)
  const computed: FixedKeys = {
    pinyin,
    tight: pinyin.replace(/\s+/g, ''),
    syllables: pinyin.split(/\s+/).filter(Boolean),
    definition: word.definition.toLowerCase(),
    senses: senses(word.definition),
    content: contentRank(word),
  }
  FIXED_KEYS.set(word, computed)
  return computed
}

function matchesQuery(word: VocabWord, q: Query, field: SearchField): boolean {
  /* Hanzi is tested against the entry's own fields; the other two want the
     cached, folded forms, so anything but a pure hanzi search warms the
     cache here and the scoring pass below then costs nothing. */
  if (field === 'hanzi') return matchesHanzi(word, q.raw)
  const keys = fixedKeys(word)
  switch (field) {
    case 'pinyin':
      return matchesPinyin(keys, q.folded, q.tight)
    case 'english':
      return matchesEnglish(keys, q)
    default:
      return matchesHanzi(word, q.raw) || matchesEnglish(keys, q) || matchesPinyin(keys, q.folded, q.tight)
  }
}

/**
 * Filters a set of candidates to those the query matches, best answer first.
 *
 * Sort keys are computed once per candidate rather than inside the comparator.
 * `relevance` folds pinyin and splits senses, and a comparator runs O(n log n)
 * times, so scoring in place did that work dozens of times per word on a broad
 * query. Same ordering, a fraction of the cost.
 */
function rank(candidates: VocabWord[], q: Query, field: SearchField, limit: number): VocabWord[] {
  return candidates
    .filter((word) => matchesQuery(word, q, field))
    .map((word) => {
      const fixed = fixedKeys(word)
      const { score, senseIndex } = relevance(word, q, fixed)
      return {
        word,
        score,
        senseIndex,
        content: fixed.content,
        /*
         * Commonness, as the last real tiebreak. `hskLevel` is derived from a
         * frequency rank when the bank is built, so this genuinely means "the
         * word a learner is more likely to have meant" — and it is what
         * replaced ordering by character count, which quietly ranked by
         * obscurity: 糕 is one character to 蛋糕's two, and nobody searching
         * "cake" wants the bound morpheme first.
         */
        level: word.hskLevel,
        length: word.traditional.length,
      }
    })
    .sort(
      (a, b) =>
        a.score - b.score ||
        a.senseIndex - b.senseIndex ||
        a.content - b.content ||
        a.level - b.level ||
        a.length - b.length,
    )
    .slice(0, limit)
    .map((entry) => entry.word)
}

/**
 * How many tier-2 rows are worth materialising to fill the remaining slots.
 *
 * Generous, because the pre-filter is a plain substring test and the ladder
 * still has to sort what comes back — asking for exactly the shortfall would
 * fill the tail with whichever rare words happen to sort first alphabetically.
 */
const LOOKUP_OVERSCAN = 12

/**
 * The dictionary's search, across both tiers.
 *
 * **The two tiers are ranked in separate passes, and that is the point.** Tier 2
 * has no frequency data, so `hskLevel` — the tiebreak that puts 蛋糕 above 糒
 * for "cake" — cannot order it against tier 1; scored into one list, 81,000
 * unranked rarities would interleave with the vocabulary a learner actually
 * wants. Ranking them separately and appending makes "tier 2 never outranks
 * tier 1" a property of the control flow rather than a hope about the weights.
 *
 * Tier 2 is only consulted when tier 1 has not filled the page, so the common
 * case costs exactly what it did before this existed: a learner searching "cake"
 * never touches it, and a learner searching "fovea" gets an answer.
 */
export function searchWords(bank: VocabWord[], query: string, field: SearchField = 'all', limit = 40): VocabWord[] {
  const raw = query.trim()
  if (!raw) return []
  const folded = foldPinyin(raw)
  const q: Query = {
    raw,
    folded,
    tight: folded.replace(/\s+/g, ''),
    singular: singularise(folded),
  }

  const primary = rank(bank, q, field, limit)
  if (primary.length >= limit) return primary

  const shortfall = limit - primary.length
  const seen = new Set(primary.map((word) => word.traditional))
  const tail = rank(
    lookupCandidates(q.raw, q.folded, (shortfall + LOOKUP_OVERSCAN) * 4),
    q,
    field,
    shortfall + LOOKUP_OVERSCAN,
  )

  /* Deduplicated on the form rather than the id: the same word can legitimately
     sit in both tiers as `cc-學習` and `lk-學習` — tier 1 carries the curated
     overlap of hskFrequency, which the build only dedupes against the imported
     half — and showing a learner the same entry twice is worse than showing it
     once from the tier that knows its level. */
  for (const word of tail) {
    if (primary.length >= limit) break
    if (seen.has(word.traditional)) continue
    seen.add(word.traditional)
    primary.push(word)
  }

  return primary
}

/**
 * Splits a sentence around every occurrence of `term`, so the caller can tint
 * the searched word inside its own example. Alternating segments: the even ones
 * are plain, the odd ones are hits.
 */
export function highlightParts(sentence: string, term: string): { text: string; hit: boolean }[] {
  if (!term || !sentence.includes(term)) return [{ text: sentence, hit: false }]
  const parts: { text: string; hit: boolean }[] = []
  let rest = sentence
  while (rest.length > 0) {
    const at = rest.indexOf(term)
    if (at === -1) {
      parts.push({ text: rest, hit: false })
      break
    }
    if (at > 0) parts.push({ text: rest.slice(0, at), hit: false })
    parts.push({ text: term, hit: true })
    rest = rest.slice(at + term.length)
  }
  return parts
}

// --- Deck state ---------------------------------------------------------------

/** How a word currently stands with the learner, as shown on a result row's trailing control. */
export type EntryState =
  /** Not in the deck. */
  | 'add'
  /** In the deck and being drilled. */
  | 'learning'
  /** In the deck and past the learning stage. */
  | 'in-deck'
  /** Added from the story reader and not yet reviewed. */
  | 'new-from-story'

/**
 * Deck membership, indexed for lookup.
 *
 * The screens ask "is this word in the deck?" once per visible row, and the
 * arrays behind that answer are the whole deck and the whole newly-added list —
 * so the naive `deck.find(...)` per row is a full scan per row. Building this
 * once per render turns the list into a couple of hash lookups.
 */
export interface DeckIndex {
  cards: Map<string, SrsCard>
  newlyAdded: Set<string>
}

export function buildDeckIndex(deck: SrsCard[], newlyAddedWordIds: string[]): DeckIndex {
  return {
    cards: new Map(deck.map((c) => [c.wordId, c])),
    newlyAdded: new Set(newlyAddedWordIds),
  }
}

export function isInDeck(wordId: string, index: DeckIndex): boolean {
  return index.cards.has(wordId)
}

export function entryStateFor(wordId: string, index: DeckIndex): EntryState {
  const card = index.cards.get(wordId)
  if (!card) return 'add'
  if (index.newlyAdded.has(wordId)) return 'new-from-story'
  return proficiencyFor(card) === 'learning' ? 'learning' : 'in-deck'
}

// --- Character facts ----------------------------------------------------------

const STROKE_COUNTS = strokeCounts as Record<string, number>

/**
 * Stroke count, or null for a character the stroke data doesn't cover. Null is a
 * real answer here — `hanziData.json` covers 5,378 characters (every character
 * in tier 1 of the word bank, in both scripts) and the detail screen hides the
 * field rather than guessing for anything outside that.
 *
 * Reads `strokeCounts.json`, a 45KB character → integer map, rather than the
 * stroke dataset itself. This function wants one number per character; getting
 * it from `strokes.length` meant importing 15.8MB of paths and medians, which
 * compiles to 25.8MB of Hermes bytecode — 59% of the JS bundle, to print "8
 * strokes". The map is generated from that same dataset by
 * scripts/buildStrokeCounts.mjs and verified to give an identical answer for
 * every one of the 5,378 characters, so re-run it after buildHanziData.mjs.
 */
export function strokeCountFor(character: string): number | null {
  return STROKE_COUNTS[character] ?? null
}

/*
 * Character → radical.
 *
 * `characterRadicals.json` files every character in the word bank under its
 * Kangxi radical number (see scripts/buildRadicalIndex.mjs, which derives it from
 * the Unicode Unihan database). `KANGXI_RADICALS` names all 214 of those
 * radicals, and `RADICALS` teaches 99 of them properly — so a lookup always has
 * a name to print, and often has an explanation to go with it.
 *
 * This replaced an index reversed out of `RADICALS` alone, which knew the
 * radical for 362 of the bank's 3,843 characters. The other nine in ten showed
 * no radical section at all.
 */
interface RadicalIndex {
  byNumber: Map<number, KangxiRadical>
  /** Radical number → the characters filed under it, most widely used first. */
  members: Map<number, string>
  /** Every character the index can answer for, including the radical glyphs themselves. */
  ofCharacter: Map<string, number>
  /** The in-depth teaching entry, for the radicals that have one. */
  curated: Map<number, Radical>
}

let index: RadicalIndex | null = null

function buildIndex(): RadicalIndex {
  const byNumber = new Map<number, KangxiRadical>()
  const ofCharacter = new Map<string, number>()

  for (const radical of KANGXI_RADICALS) {
    byNumber.set(radical.number, radical)
    // A radical glyph is itself a character someone can open, and it is filed
    // under itself — worth seeding, because the bundled index only covers the
    // word bank and several radical forms (亠, 冫, 廴) are never words.
    ofCharacter.set(radical.character, radical.number)
    for (const variant of radical.variants ?? []) ofCharacter.set(variant, radical.number)
  }

  const members = new Map<number, string>()
  for (const [key, chars] of Object.entries(RADICAL_MEMBERS as Record<string, string>)) {
    const number = Number(key)
    members.set(number, chars)
    for (const char of chars) ofCharacter.set(char, number)
  }

  const curated = new Map<number, Radical>()
  for (const radical of RADICALS) {
    const number = ofCharacter.get(radical.character)
    if (number !== undefined) curated.set(number, radical)
  }

  return { byNumber, members, ofCharacter, curated }
}

/** A character's radical, with whatever depth the app has on it. */
export interface RadicalInfo {
  radical: KangxiRadical
  /** The Radicals-screen entry — explanation, origin, worked examples — or null. */
  curated: Radical | null
  /** True when the character being looked up *is* the radical, or one of its combining forms. */
  isSelf: boolean
}

/**
 * The radical a character is filed under.
 *
 * Null only for characters outside the bundled index — a custom word using a
 * glyph the word bank has never seen. The detail screens say so rather than
 * guessing.
 */
export function radicalFor(character: string): RadicalInfo | null {
  index ??= buildIndex()
  const number = index.ofCharacter.get(character)
  if (number === undefined) return null
  const radical = index.byNumber.get(number)
  if (!radical) return null
  return {
    radical,
    curated: index.curated.get(number) ?? null,
    isSelf: radical.character === character || (radical.variants?.includes(character) ?? false),
  }
}

/**
 * Other characters filed under the same radical, minus the one being viewed.
 *
 * Ordered by the index, which the build script sorts by how many words in the
 * bank contain each character — so the strip leads with characters a learner
 * has a chance of recognising rather than whatever sorts first by code point.
 */
export function relatedCharacters(info: RadicalInfo, exclude: string, limit = 6): string[] {
  index ??= buildIndex()
  const members = index.members.get(info.radical.number)
  if (!members) return []
  // The radical's own glyph is already the large one in the card; repeating it in
  // the strip below reads as a duplicate rather than a neighbour.
  const skip = new Set([exclude, info.radical.character, ...(info.radical.variants ?? [])])
  const out: string[] = []
  for (const char of members) {
    if (skip.has(char)) continue
    out.push(char)
    if (out.length === limit) break
  }
  return out
}

// --- Word relationships -------------------------------------------------------

/*
 * Everything below takes the learner's `script` and matches the term against
 * that same form.
 *
 * The term these are called with is whatever the detail screen is showing, which
 * follows the script preference — so a simplified learner looking at 学习 asks
 * for the words containing 学. Matched against `traditional` (as this all used to
 * be, when traditional was the only script the app rendered) that finds nothing
 * at all, and every relationship card on the screen goes silently empty. Using
 * `displayWord` for both sides keeps term and haystack in one script, which also
 * keeps the counts honest: `appearsIn` promises exactly the rows its modal lists.
 */

/** Whether an entry is one of the "words containing" a term. The single definition of that. */
function containsTerm(word: VocabWord, term: string, script: ScriptMode): boolean {
  const form = displayWord(word, script)
  return form.includes(term) && form !== term && isTeachableWord(word)
}

/** Multi-character words that contain `character`, best vocabulary first. */
export function wordsContaining(bank: VocabWord[], character: string, script: ScriptMode, limit = 3): VocabWord[] {
  return bank
    .filter((w) => containsTerm(w, character, script))
    .sort((a, b) => {
      const byLevel = a.hskLevel - b.hskLevel
      if (byLevel !== 0) return byLevel
      return contentRank(a) - contentRank(b)
    })
    .slice(0, limit)
}

/** An example sentence, with the entry it was filed under. */
export interface SentenceHit {
  word: VocabWord
  example: NonNullable<VocabWord['example']>
}

/**
 * Every sentence in the bank that uses a term, easiest first.
 *
 * Capped, because the count behind it is not always small — 我 turns up in 2,259
 * of the 8,023 sentences the bank carries, and nothing good comes of building
 * two thousand rows into a modal. The caller shows the true total alongside.
 */
export function sentencesWith(bank: VocabWord[], term: string, script: ScriptMode, limit = 60): SentenceHit[] {
  const hits: SentenceHit[] = []
  for (const word of bank) {
    if (displayExample(word, script).includes(term) && word.example) hits.push({ word, example: word.example })
  }
  return hits
    .sort(
      (a, b) =>
        a.word.hskLevel - b.word.hskLevel ||
        displayExample(a.word, script).length - displayExample(b.word, script).length,
    )
    .slice(0, limit)
}

/** Words containing a term, in the same order as `wordsContaining` but many more of them. */
export function wordsWith(bank: VocabWord[], term: string, script: ScriptMode, limit = 60): VocabWord[] {
  return wordsContaining(bank, term, script, limit)
}

/**
 * How much of the corpus a term turns up in — the "Appears in" counts.
 *
 * Both numbers are counted from the bundled bank, never estimated, and both
 * count exactly what the matching modal goes on to list. That equality is the
 * point: a button reading "12" that opens a list of nine is worse than no
 * button, so `words` applies the same `containsTerm` test `wordsWith` does
 * rather than a looser substring count of its own.
 */
export function appearsIn(bank: VocabWord[], term: string, script: ScriptMode): { words: number; sentences: number } {
  let words = 0
  let sentences = 0
  for (const w of bank) {
    if (containsTerm(w, term, script)) words++
    if (displayExample(w, script).includes(term)) sentences++
  }
  return { words, sentences }
}

/**
 * A fixed-size starter set for an HSK level — the words the level's card offers
 * to add in bulk.
 *
 * Capped rather than "every word at this level": HSK 1 alone runs to hundreds of
 * entries in this bank, and a bulk-add button that quietly drops 400 cards into
 * someone's deck is a trap. Twenty is a session's worth.
 */
export function starterList(bank: VocabWord[], hskLevel: number, size = 20): VocabWord[] {
  return bank
    .filter((w) => w.hskLevel === hskLevel && isTeachableWord(w))
    .sort((a, b) => contentRank(a) - contentRank(b) || a.traditional.length - b.traditional.length)
    .slice(0, size)
}
