/**
 * Regenerates src/data/importedWords.json — the bulk word bank behind the
 * dictionary, Review deck and word lookup.
 *
 * Sources (all downloaded by hand into DATA_DIR before running; see README notes
 * at the bottom of this file):
 *   cedict    CC-CEDICT (CC-BY-SA 4.0)  — traditional/simplified/pinyin/glosses
 *   freq.txt  hermitdave FrequencyWords (MIT), zh_cn 50k — frequency ranking
 *   cmn.txt   Tatoeba via ManyThings (CC-BY 2.0 FR) — real EN↔ZH sentence pairs
 *
 * Example sentences are ONLY ever taken from the Tatoeba corpus. Words with no
 * attested sentence get no `example` field rather than an invented one — a wrong
 * tone or unnatural phrasing in a learning app teaches incorrect Chinese. Sentence
 * coverage therefore falls off with vocabulary size (~98% at 1k words, ~41% at
 * 20k); run with a smaller WORD_COUNT if you want higher coverage.
 *
 * Usage:  node scripts/buildWordBank.mjs [wordCount]
 */
import fs from 'node:fs'
import path from 'node:path'

const DATA_DIR =
  process.env.WORDBANK_DATA ??
  'C:/Users/Nelson/AppData/Local/Temp/claude/C--Users-Nelson-Desktop-chinese-easy/3f994d62-c5d4-4342-8d68-5bb11bd37e2a/scratchpad/data'
const OUT = path.join(process.cwd(), 'src/data/importedWords.json')
const WORD_COUNT = Number(process.argv[2] ?? 20000)

/** Longest sentence (in characters) we'll attach — short ones are better examples. */
const MAX_SENTENCE_LEN = 28

// ---------------------------------------------------------------- pinyin

const VOWELS = {
  a: 'āáǎàa',
  e: 'ēéěèe',
  i: 'īíǐìi',
  o: 'ōóǒòo',
  u: 'ūúǔùu',
  'ü': 'ǖǘǚǜü',
}

/** "xue2" -> "xué". Tone goes on a/o/e, else on the last vowel of the syllable. */
function toneMark(syllable) {
  const m = syllable.match(/^([a-zA-ZüÜ:]+)([1-5])$/)
  if (!m) return syllable.replace(/5$/, '')
  let [, body, tone] = m
  body = body.replace(/u:/g, 'ü').replace(/v/g, 'ü')
  const t = Number(tone)
  if (t === 5) return body.toLowerCase()

  const lower = body.toLowerCase()
  let target = -1
  for (const v of ['a', 'o', 'e']) {
    const i = lower.indexOf(v)
    if (i !== -1) { target = i; break }
  }
  if (target === -1) {
    for (let i = lower.length - 1; i >= 0; i--) {
      if ('iuü'.includes(lower[i])) { target = i; break }
    }
  }
  if (target === -1) return lower
  const ch = lower[target]
  return lower.slice(0, target) + VOWELS[ch][t - 1] + lower.slice(target + 1)
}

const toPinyin = (raw) => raw.trim().split(/\s+/).map(toneMark).join(' ')

// ---------------------------------------------------------------- cedict

const CEDICT_LINE = /^(\S+) (\S+) \[([^\]]*)\] \/(.*)\/$/

/** CEDICT glosses carry a lot of apparatus a learner doesn't want to read. */
function cleanGloss(defs) {
  const parts = defs
    .split('/')
    .map((d) => d.trim())
    .filter(Boolean)
    // Drop cross-reference and metadata glosses that read as noise to a learner.
    .filter((d) => !/^(CL:|Taiwan pr\.|see |variant of|old variant|abbr\. for|also pr\.)/i.test(d))
    .map((d) =>
      d
        // Inline pinyin keys and 傳統|简体 pairs, e.g. 皮革的[pi2 ge2 de5]
        .replace(/\[[^\]]*\]/g, '')
        .replace(/[㐀-鿿]+\|[㐀-鿿]+/g, '')
        // Long parenthetical grammar notes
        .replace(/\([^)]*\)/g, '')
        .replace(/["“”]/g, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/\s*[;,]\s*$/, '')
        .trim(),
    )
    // Stripping the apparatus above can leave dangling fragments ("... or  )"),
    // so drop anything with orphaned punctuation or leftover CJK.
    .filter((d) => d && d.length <= 60 && !/[()\[\]|]/.test(d) && !/[㐀-鿿]/.test(d))
    .filter((d) => /[a-z]/i.test(d))
  const gloss = parts.slice(0, 3).join('; ')
  return gloss.length > 90 ? gloss.slice(0, 90).replace(/[;,]\s*\S*$/, '') : gloss
}

/** Words CEDICT flags as coarse — out of place in a beginner learning app. */
const VULGAR = /\b(taboo|vulgar|obscene|offensive|slang for penis|derogatory)\b/i

const cedict = new Map()
const simpToTradChar = new Map()
const tradToSimpChar = new Map()
for (const line of fs.readFileSync(path.join(DATA_DIR, 'cedict'), 'utf8').split('\n')) {
  if (!line || line[0] === '#') continue
  const m = line.trim().match(CEDICT_LINE)
  if (!m) continue
  const [, trad, simp, pinyin, defs] = m
  // CEDICT lists several readings per form and proper nouns often come first —
  // taking entry[0] blindly made 水 "surname Shui" instead of "water". Proper
  // nouns are marked by a capitalised pinyin syllable, so prefer common readings.
  const isProper = /^[A-Z]/.test(pinyin) || /^surname\b/i.test(defs)
  const prev = cedict.get(simp)
  if (!prev || (prev.isProper && !isProper)) cedict.set(simp, { trad, pinyin, defs, isProper })
  // Single-char rows double as a script-conversion table. Tatoeba's Mandarin
  // corpus is a mix of simplified and traditional, so sentences get normalised
  // in both directions rather than assumed to be simplified.
  if (simp.length === 1 && trad.length === 1) {
    if (!simpToTradChar.has(simp)) simpToTradChar.set(simp, trad)
    if (!tradToSimpChar.has(trad)) tradToSimpChar.set(trad, simp)
  }
}

const toTraditional = (s) => [...s].map((c) => simpToTradChar.get(c) ?? c).join('')
const toSimplified = (s) => [...s].map((c) => tradToSimpChar.get(c) ?? c).join('')

// ---------------------------------------------------------------- category

const CATEGORY_RULES = [
  ['food', /\b(food|eat|drink|rice|noodle|meat|fruit|vegetable|tea|wine|cook|restaurant|meal|hungry|taste|sweet|soup)\b/i],
  ['travel', /\b(travel|road|car|train|plane|fly|airport|ticket|hotel|map|street|city|country|abroad|walk|drive|bus|station)\b/i],
  ['people', /\b(person|people|friend|family|mother|father|child|son|daughter|love|marry|he|she|teacher|student|name|baby|brother|sister)\b/i],
  ['work', /\b(work|job|office|company|money|business|buy|sell|price|market|manage|boss|salary|meeting|study|school|learn)\b/i],
  ['science', /\b(science|scientific|chemistry|physics|biology|computer|electric|machine|technology|research|experiment|data|energy|medicine)\b/i],
]

/**
 * Matched against the first gloss only. Run over the whole definition it misfires
 * badly — 的's grammar note mentions "restaurant", which filed it under food.
 */
const categoryFor = (gloss) => {
  const first = gloss.split(';')[0]
  return CATEGORY_RULES.find(([, re]) => re.test(first))?.[0] ?? 'daily'
}

/**
 * Frequency band mapped onto the HSK 1-6 scale. This is NOT the official HSK
 * syllabus — it's a difficulty proxy so the level filters stay meaningful.
 */
function levelForRank(rank) {
  if (rank < 750) return 1
  if (rank < 1600) return 2
  if (rank < 3000) return 3
  if (rank < 6000) return 4
  if (rank < 11000) return 5
  return 6
}

// ---------------------------------------------------------------- sentences

const pairs = fs
  .readFileSync(path.join(DATA_DIR, 'cmn.txt'), 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((l) => {
    const [en, zh] = l.split('\t')
    return { en: (en ?? '').trim(), zh: (zh ?? '').trim() }
  })
  .filter((p) => p.zh && p.en)

// Shortest first, so the index below naturally yields the simplest usable example.
const order = pairs.map((_, i) => i).sort((a, b) => pairs[a].zh.length - pairs[b].zh.length)

const sentenceIdx = new Map()
for (const i of order) {
  const zh = pairs[i].zh
  if (zh.length > MAX_SENTENCE_LEN) continue
  for (let L = 1; L <= 4; L++) {
    for (let s = 0; s + L <= zh.length; s++) {
      const k = zh.substr(s, L)
      if (!sentenceIdx.has(k)) sentenceIdx.set(k, i)
    }
  }
}

function findSentence(word) {
  if (word.length <= 4) {
    const i = sentenceIdx.get(word)
    return i === undefined ? null : pairs[i]
  }
  let best = null
  for (const p of pairs) {
    if (p.zh.length <= MAX_SENTENCE_LEN && p.zh.includes(word)) {
      if (!best || p.zh.length < best.zh.length) best = p
    }
  }
  return best
}

// ---------------------------------------------------------------- build

const freq = fs
  .readFileSync(path.join(DATA_DIR, 'freq.txt'), 'utf8')
  .split('\n')
  .map((l) => l.split(' ')[0])
  .filter(Boolean)

const out = []
const seen = new Set()
let withSentence = 0

for (const simp of freq) {
  if (out.length >= WORD_COUNT) break
  if (seen.has(simp)) continue
  const entry = cedict.get(simp)
  if (!entry) continue
  if (VULGAR.test(entry.defs)) continue
  const definition = cleanGloss(entry.defs)
  if (!definition) continue
  // Latin/# noise occasionally rides along in the frequency list.
  if (!/^[\u3400-\u9fff]+$/.test(simp)) continue

  seen.add(simp)
  const rank = out.length
  const word = {
    id: `cc-${simp}`,
    simplified: simp,
    traditional: entry.trad,
    pinyin: toPinyin(entry.pinyin),
    definition,
    hskLevel: levelForRank(rank),
    category: categoryFor(definition),
  }

  const s = findSentence(simp)
  if (s) {
    withSentence++
    word.example = {
      simplified: toSimplified(s.zh),
      traditional: toTraditional(s.zh),
      // Tatoeba ships no romanisation, and deriving it per-character would guess
      // wrong on polyphones — left blank rather than invented. The UI hides it.
      pinyin: '',
      translation: s.en,
    }
  }
  out.push(word)
}

fs.writeFileSync(OUT, JSON.stringify(out, null, 0))

const bytes = fs.statSync(OUT).size
console.log(`words:           ${out.length}`)
console.log(`with sentence:   ${withSentence} (${((100 * withSentence) / out.length).toFixed(1)}%)`)
console.log(`without:         ${out.length - withSentence}`)
console.log(`output:          ${OUT}  ${(bytes / 1024 / 1024).toFixed(2)} MB`)
