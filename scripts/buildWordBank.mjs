/**
 * Regenerates the app's two word tiers from CC-CEDICT.
 *
 *   src/data/importedWords.json  tier 1 — the *learning* bank. Frequency-ranked,
 *                                so every entry has a meaningful hskLevel, a
 *                                category and (where the corpus has one) an
 *                                example sentence. This is what the dictionary
 *                                browses, what the SRS draws from, and what
 *                                buildHanziData.mjs bundles stroke data for.
 *
 *   src/data/lookupWords.json    tier 2 — the *reference* tail. Everything else
 *                                CC-CEDICT knows: ~80k forms with no frequency
 *                                data, which is to say chemical names, place
 *                                names, institutions and four-character idioms
 *                                alongside genuinely useful rarer vocabulary.
 *                                Findable by search, and nothing else.
 *
 * The split exists because "every word" and "every word worth teaching" are very
 * different sets, and merging them costs more than it sounds like. Tier 2 entries
 * have no frequency rank, so the search ladder's `hskLevel` tiebreak — which is
 * what puts 蛋糕 above 糒 for "cake" — has nothing to rank them by; folded into
 * one bank they degrade results for the 26k words a learner actually wants. Kept
 * apart, tier 2 is consulted only to top up a thin result set, so a rare word is
 * always findable and can never outrank a common one. It also keeps tier 2 out
 * of the stroke-data bundle: see the size note in buildHanziData.mjs.
 *
 * Sources — downloaded by hand into DATA_DIR (default `.wordbank-data/`, which
 * is gitignored; override with WORDBANK_DATA). Outputs are committed, so a fresh
 * clone never needs these:
 *
 *   cedict    CC-CEDICT (CC-BY-SA 4.0) — traditional/simplified/pinyin/glosses
 *             https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz
 *             (gunzip it to `cedict`, no extension)
 *   freq.txt  hermitdave FrequencyWords (MIT), zh_cn 50k — frequency ranking
 *             https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/zh_cn/zh_cn_50k.txt
 *   cmn.txt   OPTIONAL. Tatoeba via ManyThings (CC-BY 2.0 FR) — EN↔ZH sentence
 *             pairs. https://www.manythings.org/anki/cmn-eng.zip
 *
 * **Tier 1 is capped by the frequency list, not by CC-CEDICT.** Only ~26k of the
 * 50k frequency entries exist in CC-CEDICT as pure-Han words with a usable gloss,
 * so WORD_COUNT above ~26000 has no effect — the loop simply runs out. Everything
 * past that point is what tier 2 is for.
 *
 * ── Example sentences ────────────────────────────────────────────────────────
 * Only ever taken from the Tatoeba corpus. A word with no attested sentence gets
 * no `example` field rather than an invented one: a wrong tone or unnatural
 * phrasing in a learning app teaches incorrect Chinese. Coverage falls off with
 * vocabulary size (~98% at 1k words, ~31% at 20k), which is expected and is a
 * supported state everywhere in the app.
 *
 * If `cmn.txt` is absent the script **carries the existing sentences forward**
 * from the committed importedWords.json, matched by word form rather than by
 * rank so a shifted ranking can't scramble them. That is the better default, not
 * merely a fallback: those attachments have already been through
 * repairExampleSenses.mjs, and re-deriving them from the corpus would throw that
 * corrective pass away and require re-running it.
 *
 * ⚠ **Always run `node scripts/repairExampleSenses.mjs` after this script** —
 * after *any* run of it, not only one that rebuilt from the corpus.
 *
 * Two separate reasons, and the second is easy to miss:
 *
 * 1. With `cmn.txt` present, `findSentence` below matches on **characters only**,
 *    which attaches a wrong sense roughly one time in five: 說 in the sense "to
 *    persuade" (shuì) comes back illustrated by 別說謊, where 說 is shuō inside
 *    the word 別說.
 * 2. The repair pass segments each sentence *against the bank*, so its verdicts
 *    depend on the bank's composition — not just on the sentences. Growing tier 1
 *    from 20,000 to 25,180 words changed 110 attachments on carried-forward
 *    sentences that had already been repaired once, because a word that used to
 *    survive segmentation now gets absorbed into a longer word the bank has
 *    since learned. Those attachments genuinely stopped illustrating their word.
 *
 * It is self-contained (committed JSON only) and idempotent against a fixed bank,
 * so running it twice is free.
 *
 * Usage:  node scripts/buildWordBank.mjs [wordCount]
 *         node scripts/repairExampleSenses.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const DATA_DIR = process.env.WORDBANK_DATA ?? path.join(ROOT, '.wordbank-data')
const OUT = path.join(ROOT, 'src/data/importedWords.json')
const OUT_LOOKUP = path.join(ROOT, 'src/data/lookupWords.json')
const OUT_CONVERSION = path.join(ROOT, 'src/data/scriptConversion.json')
const WORD_COUNT = Number(process.argv[2] ?? 26000)

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

const CORPUS = path.join(DATA_DIR, 'cmn.txt')
const HAS_CORPUS = fs.existsSync(CORPUS)

/**
 * The previous build's attachments, keyed by word form.
 *
 * Keyed by form and not by rank on purpose: CC-CEDICT is a living file, so a
 * rebuild against a newer copy shifts which entries survive `cleanGloss` and
 * therefore shifts every rank below the first change. Carrying `example` across
 * by position would hand 貓's sentence to 狗. Ids are content-derived
 * (`cc-${simp}`), so the form is the stable key.
 */
const previousExamples = new Map()
if (fs.existsSync(OUT)) {
  for (const word of JSON.parse(fs.readFileSync(OUT, 'utf8'))) {
    if (word.example) previousExamples.set(word.simplified, word.example)
  }
}

let pairs = []
let sentenceIdx = new Map()

if (HAS_CORPUS) {
  pairs = fs
    .readFileSync(CORPUS, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      const [en, zh] = l.split('\t')
      return { en: (en ?? '').trim(), zh: (zh ?? '').trim() }
    })
    .filter((p) => p.zh && p.en)

  // Shortest first, so the index below naturally yields the simplest usable example.
  const order = pairs.map((_, i) => i).sort((a, b) => pairs[a].zh.length - pairs[b].zh.length)

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

/**
 * The example for one word: re-derived from the corpus when it is available,
 * otherwise carried over from the last build. Never invented.
 */
function exampleFor(simp) {
  if (!HAS_CORPUS) return previousExamples.get(simp) ?? null
  const s = findSentence(simp)
  if (!s) return null
  return {
    simplified: toSimplified(s.zh),
    traditional: toTraditional(s.zh),
    // Tatoeba ships no romanisation, and deriving it per-character would guess
    // wrong on polyphones — left blank rather than invented. The UI hides it.
    pinyin: '',
    translation: s.en,
  }
}

// ------------------------------------------------------------- tier 1: bank

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

  const example = exampleFor(simp)
  if (example) {
    withSentence++
    word.example = example
  }
  out.push(word)
}

fs.writeFileSync(OUT, JSON.stringify(out, null, 0))

// ------------------------------------------------------- tier 2: lookup tail

/*
 * Packed as ONE string rather than an array of records.
 *
 * Metro inlines every JSON import into the bundle and parses it at startup, so
 * the shape here is a startup-cost decision, not a formatting one: 80k
 * four-field records cost ~320k string allocations before the first frame,
 * where a single string costs one. The table is split into records lazily by
 * src/data/lookupWords.ts, on the first search that actually reaches tier 2 —
 * which for most sessions is never.
 *
 * `|` is safe as a field separator because cleanGloss already drops any gloss
 * containing one (it is how CC-CEDICT writes its trad|simp pairs, which have no
 * business in a learner-facing definition), and neither a Han form nor toned
 * pinyin can contain it. The simplified field is left empty where it matches the
 * traditional one, which is a little over half of them.
 */
const tier1Forms = new Set(out.map((w) => w.simplified))
const records = []
let identicalForms = 0

for (const [simp, entry] of cedict) {
  if (tier1Forms.has(simp)) continue
  if (VULGAR.test(entry.defs)) continue
  if (!/^[㐀-鿿]+$/.test(simp)) continue
  const definition = cleanGloss(entry.defs)
  if (!definition) continue

  const same = entry.trad === simp
  if (same) identicalForms++
  records.push([entry.trad, same ? '' : simp, toPinyin(entry.pinyin), definition].join('|'))
}

// Sorted by form so the packed string diffs legibly between rebuilds; the order
// carries no ranking meaning, because tier 2 has no ranking to carry.
records.sort()
fs.writeFileSync(OUT_LOOKUP, JSON.stringify({ packed: records.join('\n') }))

// ------------------------------------------------- traditional → simplified

/*
 * The per-character conversion table, for displaying traditional-authored text
 * (the reading library) to a learner who reads simplified.
 *
 * This is the *fallback* half of that conversion, not the whole of it. The story
 * reader segments prose against the word bank first and takes each matched
 * word's own `simplified` field, which is CC-CEDICT's phrase-level answer —
 * that covers 92% of the Han characters in the library and is what gets the
 * context-dependent cases right. Only what segmentation could not match as a
 * word reaches this table: 117 character occurrences across all 103 story pages
 * at the time of writing.
 *
 * **Only the trad → simp direction is emitted, because only that direction is
 * safe per-character.** The ambiguity in Chinese script conversion is
 * overwhelmingly the other way: 干 stands for 乾, 幹 and 干, and picking between
 * them needs the surrounding word. Going trad → simp each traditional character
 * has essentially one simplified form, which is why this file can be a character
 * map at all, and why there is deliberately no simp → trad counterpart here.
 *
 * Emitted as two index-aligned strings rather than an object with 2,000-odd keys
 * — the same shape as characterPinyin.json, and for the same reason: it is
 * inlined into the bundle and parsed at startup either way.
 */
/*
 * Built by aligning each word's two forms character by character and taking the
 * commonest mapping — NOT by reading CC-CEDICT's single-character rows.
 *
 * The rows look like the obvious source and are quietly wrong for the handful of
 * traditional characters that genuinely have two simplified forms. 乾 is the
 * clearest: it is 干 in 乾淨 "clean" and stays 乾 in the hexagram sense, and
 * CC-CEDICT carries a row for each. Taking the first row encountered gave 乾淨 →
 * 乾净, a word that exists in neither script.
 *
 * Aligning whole words instead counts how the character is actually used, so the
 * common reading wins on weight of evidence. Alignment is only meaningful
 * because the two forms always have the same length, which the check below
 * enforces. Single-character rows still fill in any character that never appears
 * inside a bank word.
 */
const alignedCounts = new Map()
function countAlignment(trad, simp) {
  const t = [...trad]
  const s = [...simp]
  if (t.length !== s.length) return
  for (let i = 0; i < t.length; i++) {
    if (!alignedCounts.has(t[i])) alignedCounts.set(t[i], new Map())
    const forChar = alignedCounts.get(t[i])
    forChar.set(s[i], (forChar.get(s[i]) ?? 0) + 1)
  }
}
for (const w of out) countAlignment(w.traditional, w.simplified)
for (const record of records) {
  const [trad, simp] = record.split('|')
  countAlignment(trad, simp || trad)
}

const conversion = new Map()
for (const [trad, candidates] of alignedCounts) {
  let best = trad
  let bestCount = -1
  for (const [simp, count] of candidates) {
    if (count > bestCount) {
      best = simp
      bestCount = count
    }
  }
  conversion.set(trad, best)
}
// Characters with no word-level evidence at all fall back to the single-char rows.
let fromRows = 0
for (const [trad, simp] of tradToSimpChar) {
  if (conversion.has(trad)) continue
  conversion.set(trad, simp)
  if (trad !== simp) fromRows++
}

const convFrom = []
const convTo = []
for (const [trad, simp] of conversion) {
  // Identical pairs are the majority and carry no information.
  if (trad === simp) continue
  convFrom.push(trad)
  convTo.push(simp)
}
fs.writeFileSync(OUT_CONVERSION, JSON.stringify({ traditional: convFrom.join(''), simplified: convTo.join('') }))

/* Characters where the two sources disagree — the 乾 case. Reported rather than
   silenced, because a growing list would mean the alignment heuristic is being
   asked to arbitrate more than it should. */
const disagreements = []
for (const [trad, simp] of conversion) {
  const fromRow = tradToSimpChar.get(trad)
  if (fromRow !== undefined && fromRow !== simp) disagreements.push(`${trad}→${simp} (single-char row said ${fromRow})`)
}

/*
 * A word's two forms must have the same character count.
 *
 * Everything downstream of the reader's segmentation leans on this: the
 * narration cursor maps a character offset reported by the speech engine onto
 * the canonical page text, `segmentSpans` measures those offsets from canonical
 * segment lengths, and `paginateStory` cuts pages by canonical character count.
 * Converting a segment's *display* form is only safe while it occupies the same
 * number of characters — otherwise the green line drifts out of step with the
 * words underneath it, one character per conversion, and nothing else complains.
 *
 * It holds for every entry in both tiers today. Checked rather than assumed,
 * because a future CC-CEDICT revision breaking it would surface as a subtly
 * mistimed highlight rather than as an error.
 */
const lengthMismatches = []
for (const w of out) {
  if ([...w.traditional].length !== [...w.simplified].length) lengthMismatches.push(`${w.traditional}/${w.simplified}`)
}
for (const record of records) {
  const [trad, simp] = record.split('|')
  if (simp && [...trad].length !== [...simp].length) lengthMismatches.push(`${trad}/${simp}`)
}
if (lengthMismatches.length > 0) {
  console.error(`\n${lengthMismatches.length} entries whose traditional and simplified forms differ in length:`)
  console.error(`  ${lengthMismatches.slice(0, 20).join(' ')}`)
  console.error('The story reader converts a segment in place and assumes equal length. Fix before shipping.')
  process.exit(1)
}

// ---------------------------------------------------------------- report

const mb = (file) => `${(fs.statSync(file).size / 1048576).toFixed(2)} MB`

console.log('tier 1 (learning bank)')
console.log(`  words:         ${out.length}${out.length < WORD_COUNT ? '   <- frequency list exhausted' : ''}`)
console.log(`  with sentence: ${withSentence} (${((100 * withSentence) / out.length).toFixed(1)}%)`)
console.log(`  sentences:     ${HAS_CORPUS ? 'rebuilt from cmn.txt' : 'carried forward from the previous build'}`)
console.log('  NEXT:          node scripts/repairExampleSenses.mjs  (required either way — see header)')
console.log(`  output:        ${OUT}  ${mb(OUT)}`)
console.log('tier 2 (lookup tail)')
console.log(`  entries:       ${records.length}`)
console.log(`  trad === simp: ${identicalForms} (${((100 * identicalForms) / records.length).toFixed(1)}%)`)
console.log(`  output:        ${OUT_LOOKUP}  ${mb(OUT_LOOKUP)}`)
console.log('traditional -> simplified (per-character fallback)')
console.log(`  pairs:         ${convFrom.length}  (${fromRows} from single-char rows, rest from aligned words)`)
console.log(`  disagreements: ${disagreements.length}${disagreements.length ? `  ${disagreements.slice(0, 12).join('  ')}` : ''}`)
console.log(`  length check:  every entry's two forms are the same length`)
console.log(`  output:        ${OUT_CONVERSION}  ${mb(OUT_CONVERSION)}`)
