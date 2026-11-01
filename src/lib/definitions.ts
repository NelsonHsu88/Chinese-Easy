import COMMON_ENGLISH from '../data/commonEnglish.json'
import type { VocabWord } from '../types'
import { senseKeys, shows, translationStems } from './senseEvidence'

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
 * A note saying a sense is outside everyday standard Mandarin. Such a sense
 * stays listed but shouldn't be the one a card leads with.
 */
const RESTRICTED_USE = /\((?:[^)]*\b)?(slang|archaic|literary|old use|dialect|Cantonese|derogatory|euphemism|vulgar|in former times|historical)\b[^)]*\)/i

/**
 * A note about grammar rather than meaning: "(pronoun) this", "(third-person
 * singular) he", "to be (followed by substantives only)". The word page lists
 * them; a card leaves them off, and search ignores them.
 */
const GRAMMAR_NOTE =
  /^\((?:pronoun|specifier|adjective|adverb|noun|verb|conjunction|preposition|prefix|suffix|noun suffix|verb suffix|third-person singular|directional complement|transitive|intransitive|transitive or intransitive|[^)]*particle|negative prefix[^)]*|(?:followed by|before|after|between|joining|used)\b[^)]*)\)$/i

/**
 * A sense without any notes, for tests on how it starts: "(Taiwan) meter" and
 * "(of an insect) to drink" begin with their gloss.
 */
function withoutNotes(sense: string): string {
  return sense.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s{2,}/g, ' ').trim()
}

/** A sense without its grammar notes. */
export function withoutGrammarNotes(sense: string): string {
  return sense
    .replace(/\s*\([^)]*\)\s*/g, (note) => (GRAMMAR_NOTE.test(note.trim()) ? ' ' : note))
    .replace(/\s{2,}/g, ' ')
    .trim()
}

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
  // A note qualifies the sense rather than lengthening it: "to drink (alcohol)"
  // is a two-word gloss. A note that limits where it's used costs instead.
  const plain = plainEnglish(sense.replace(/\([^)]*\)/g, ' '))
  const words = plain.split(/\s+/).filter(Boolean)

  let score = position * 3
  if (COMMENTARY.test(sense)) score += 100
  if (RESTRICTED_USE.test(sense)) score += 12
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

/** Every sense with its position and score, best first. */
function rankedSenses(definition: string) {
  return senses(definition)
    .map((sense, position) => ({ sense, position, score: senseScore(sense, position) }))
    .sort((a, b) => a.score - b.score || a.position - b.position)
}

/*
 * Which sense the word's own example sentence uses, as a position in
 * `rankedSenses` — or 0 when the example shows the best sense anyway, shows no
 * sense, or there is no example.
 *
 * A card shows one sense beside one sentence, so the two have to agree. 看
 * ranks "to look after" first, but its sentence is 看着我, "Watch me"; 月 ranks
 * "moon" first beside "It took months". When the translation plainly shows a
 * different listed sense and not the best one, that sense is the gloss — the
 * card then reads "to watch" over "Watch me". Commentary senses never win.
 */
const exampleSenseCache = new WeakMap<VocabWord, number>()
function exampleSenseIndex(word: VocabWord, ranked: ReturnType<typeof rankedSenses>): number {
  const cached = exampleSenseCache.get(word)
  if (cached !== undefined) return cached
  let index = 0
  const translation = word.example?.translation
  if (translation && ranked.length > 1) {
    const stems = translationStems(translation)
    const fits = (entry: (typeof ranked)[number]) => shows(senseKeys(plainEnglish(entry.sense)), stems)
    if (!fits(ranked[0])) {
      const found = ranked.findIndex((entry) => !COMMENTARY.test(entry.sense) && fits(entry))
      if (found > 0) index = found
    }
  }
  exampleSenseCache.set(word, index)
  return index
}

/**
 * The gloss for a word: the clearest sense, or the sense its example sentence
 * uses when that sentence plainly shows a different one (see
 * `exampleSenseIndex`). `maxSenses` above one falls back to `conciseDefinition`.
 */
export function shortGloss(word: VocabWord, maxSenses = DEFAULT_MAX_SENSES): string {
  if (maxSenses !== 1) return conciseDefinition(word.definition, maxSenses)
  const ranked = rankedSenses(word.definition)
  if (ranked.length === 0) return plainEnglish(word.definition)
  // Meaning notes stay ("to drink (alcohol)"); grammar notes are for the word page.
  const sense = ranked[exampleSenseIndex(word, ranked)].sense
  return plainEnglish(withoutGrammarNotes(sense) || sense)
}

/**
 * Every sense, plain-English and best-first — what the detail card lists.
 *
 * Same ranking as `shortGloss`, with the same sense leading, so the headline
 * gloss is always the first row rather than appearing twice down the list.
 */
export function allSenses(word: VocabWord): string[] {
  const ranked = rankedSenses(word.definition)
  const lead = ranked.length > 0 ? exampleSenseIndex(word, ranked) : 0
  if (lead > 0) ranked.unshift(...ranked.splice(lead, 1))
  return ranked.map((entry) => plainEnglish(entry.sense))
}

/**
 * A label that puts a sense outside everyday Mandarin: a specialist field or a
 * register a learner wouldn't reach for. 能 "(physics) energy" is real, but it
 * isn't why a learner should know 能 means more than "can".
 */
const SPECIALIST_LABEL =
  /^\((?:[^)]*\b)?(slang|literary|archaic|old use|dialect|Cantonese|derogatory|vulgar|euphemism|euph\.|jocular|in former times|historical|mathematics|computing|computer|chemistry|medicine|physics|Buddhism|Taoism|sports|botany|geology|anatomy|military|music|law|finance|linguistics|zoology|biology|astronomy|electronics|economics|geometry|statistics|biochemistry|agriculture|photography|mining|psychology|meteorology|grammar|gaming|Internet)\b[^)]*\)/i

/** "haven't" → "have not", so it shares a word with "to not have". */
function expandContractions(sense: string): string {
  return sense
    .replace(/\bcan't\b/gi, 'can not')
    .replace(/\bwon't\b/gi, 'will not')
    .replace(/n't\b/gi, ' not')
}

/*
 * Whether a word has more than one distinct meaning: 說 "to speak … theory",
 * 被 "quilt … (passive)", 等 "to wait … rank". The flag on a card says the
 * gloss shown isn't the whole story.
 *
 * CC-CEDICT lists synonyms as separate senses (我 "I; me; my", 知道 "to know;
 * to become aware of"), so counting senses would flag nearly every word.
 * Instead, senses are merged into meanings:
 *
 * - senses that share a content word are one meaning ("to thank; thanks");
 * - neighbouring senses of the same kind, both verbs ("to …") or both not, are
 *   one meaning — CC-CEDICT lists a meaning's synonyms together and starts a
 *   new run when the meaning changes;
 * - commentary, cross-references, surnames, suffixes and specialist or
 *   off-everyday senses don't count at all.
 *
 * It errs towards leaving the flag off: 月 "moon; month" (two nouns) goes
 * unflagged. A flag on a synonym list would teach the learner to ignore it.
 */
/*
 * Words whose meanings differ but which the rules below can't see: two nouns
 * side by side read like CC-CEDICT synonyms ("big; large"), and 米 "uncooked
 * rice; meter" or 月 "moon; month" are exactly that shape. No offline signal
 * tells them apart (a thesaurus built from the bank's own co-listings flagged
 * 人 "person; people" and 媽媽 "mama; mother"), so these are listed by hand,
 * chosen from the common words where the rules split nothing.
 *
 * Keyed by traditional form, each with the sense that makes it a second
 * meaning. The flag only applies while the entry still lists that sense, so a
 * bank rebuild can't leave it on a different reading.
 */
const LISTED_MULTIPLE_MEANINGS: Record<string, string> = {
  米: 'meter', 月: 'month', 天: 'sky', 飯: 'fan', 先生: 'husband', 馬上: 'on horseback',
  才: 'just now', 剛: 'just', 所: 'place', 派: 'faction', 門: 'family', 盾: 'currency',
  貓: 'modem', 種: 'species', 子: 'seed', 塔: 'tart', 聲: 'reputation', 元: 'first',
  菜: 'weak', 空: 'sky', 票: 'banknote', 洞: 'zero', 紅: 'popular', 麥: 'mic', 煙: 'smoke',
  酷: 'cool', 額: 'specified number', 牌: 'brand', 情: 'situation', 皮: 'naughty',
  利: 'profit', 腔: 'accent', 戲: 'trick', 熟: 'familiar', 機: 'opportunity', 蠻: 'quite',
  案: 'table', 單: 'single', 數: 'several', 秀: 'show', 草: 'draft', 師: 'army division',
  碼: 'yard', 座: 'constellation', 東: 'host', 沙: 'hoarse', 方: 'direction', 堡: 'burger',
  胸: 'mind', 極: 'pole', 風: 'news',
  // Reviewed 2026-10-27 against the 2,500 commonest teachable words.
  好: 'easy to', 要: 'important', 想: 'to miss', 就: 'merely', 快: 'almost', 找: 'to return',
  點: 'to order', 看: 'to visit', 過: 'to celebrate', 坐: 'to take', 穿: 'to wear', 回: 'to reply',
  老: 'always', 拉: 'to play', 拍: 'to take', 賣: 'to betray', 算: 'to regard as', 謝: 'to wither',
  棒: 'smart', 活: 'work', 間: 'room', 吹: 'to boast', 自: 'from', 輸: 'to transport',
  邊: 'simultaneously', 推: 'to refuse', 背: 'to learn by heart', 修: 'to repair',
  交: 'to make friends', 牛: 'awesome', 還是: 'or', 等等: 'wait a minute', 明白: 'to understand',
  所有: 'to possess', 對不起: 'to let down', 加油: 'to make an extra effort', 開心: 'to make fun of',
  寶貝: 'darling', 厲害: 'amazing', 案子: 'case', 將軍: 'to check', 老大: 'boss', 酒店: 'hotel',
  太陽: 'temple', 好看: 'in an embarrassing situation', 垃圾: 'of poor quality', 一塊: 'one yuan',
  便宜: 'a petty advantage', 帽子: 'label', 出口: 'to export', 陽光: 'upbeat', 對象: 'boyfriend',
  學會: 'institute', 千萬: 'one must', 左右: 'approximately', 回頭: 'later', 制服: 'uniform',
}

/*
 * The other direction: common words the rules split but whose senses are one
 * idea seen from different sides — 歌 "song; to sing", 偷 "to steal; thief",
 * 能 "can; ability". Keyed by traditional form; these never carry the tag.
 */
const LISTED_SINGLE_MEANING = new Set([
  '能', '忙', '完', '病', '吻', '歌', '尿', '餓', '累', '犯', '偷', '姓', '綁', '臭', '傳說',
  '感受', '恐怕', '加上', '少', '錯', '變', '短', '噓', '哼', '課', '辦', '組', '賈', '無', '祝', '替',
])

function listedAsMultiple(word: VocabWord): boolean {
  const sense = LISTED_MULTIPLE_MEANINGS[word.traditional]
  if (!sense) return false
  const escaped = sense.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|;)\\s*(\\([^)]*\\)\\s*)*${escaped}\\b`, 'i').test(word.definition)
}

const multipleMeaningsCache = new WeakMap<VocabWord, boolean>()
export function hasMultipleMeanings(word: VocabWord): boolean {
  const cached = multipleMeaningsCache.get(word)
  if (cached !== undefined) return cached
  if (listedAsMultiple(word)) {
    multipleMeaningsCache.set(word, true)
    return true
  }
  if (LISTED_SINGLE_MEANING.has(word.traditional)) {
    multipleMeaningsCache.set(word, false)
    return false
  }

  const kept = senses(word.definition)
    .filter((sense) => {
      const main = withoutNotes(sense)
      if (!/[a-z]/i.test(main) || /^[-~.]/.test(main)) return false
      return !COMMENTARY.test(main) && !RESTRICTED_USE.test(sense) && !SPECIALIST_LABEL.test(sense.trim())
    })
    .map((sense) => expandContractions(plainEnglish(withoutGrammarNotes(sense) || sense)))

  const parent = kept.map((_, i) => i)
  const root = (i: number): number => (parent[i] === i ? i : (parent[i] = root(parent[i])))
  const join = (a: number, b: number) => {
    parent[root(b)] = root(a)
  }

  /* Keys plus a five-letter root of each longer word, so a verb meets its own
     noun or adjective: "to despair; desperate", "to stipulate; stipulations". */
  const keys = kept.map((sense) => {
    const set = senseKeys(sense)
    for (const key of [...set]) if (key.length >= 6) set.add(`${key.slice(0, 5)}…`)
    return set
  })
  for (let i = 0; i < kept.length; i++) {
    for (let j = i + 1; j < kept.length; j++) {
      for (const key of keys[i]) {
        if (keys[j].has(key)) {
          join(i, j)
          break
        }
      }
    }
  }
  // "to this day", "to one's surprise" and "to a certain extent" aren't verbs.
  const isVerb = (sense: string) =>
    /^to (?!(this|that|these|those|one's|a|an|the|some|what|which|my|his|her|its|our|their|your|date|me|him|them|us|and|or)\b)/i.test(
      withoutNotes(sense),
    )
  for (let i = 1; i < kept.length; i++) if (isVerb(kept[i]) === isVerb(kept[i - 1])) join(i - 1, i)

  /* A longer word asks for three. Its senses mostly alternate a verb with the
     same idea as a noun (旅行 "to travel; journey", 記憶 "to remember;
     memory"), which the runs above can't tell from a new meaning. */
  const needed = [...word.simplified].length > 1 ? 3 : 2
  const result = new Set(kept.map((_, i) => root(i))).size >= needed
  multipleMeaningsCache.set(word, result)
  return result
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
  // Judged on the gloss, not its notes: 喲 "Oh! (interjection …)" is a word.
  if (all.every((s) => COMMENTARY.test(withoutNotes(s)))) return false

  const first = withoutNotes(all[0])

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
  return senses(word.definition).every((s) => FUNCTION_WORD_SENSE.some((re) => re.test(withoutNotes(s))))
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
  const first = withoutNotes(all[0] ?? '')

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
