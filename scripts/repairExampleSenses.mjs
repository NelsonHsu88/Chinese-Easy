import fs from 'node:fs'
import path from 'node:path'
import { conciseDefinition, plainEnglish, senses } from '../src/lib/definitions.ts'
import { senseKeys, shows, translationStems } from '../src/lib/senseEvidence.ts'

/**
 * Repairs example sentences so each one shows its word, in the sense the card
 * shows, in characters that are right in both scripts.
 *
 * `buildWordBank.mjs` attaches a Tatoeba sentence to a word by **character
 * match** — the shortest sentence containing the string. Chinese does not
 * cooperate with that: 說 in the sense "to persuade" (shuì) got 別說謊 ("don't
 * lie"), 大 got 大家好 ("Hi, everybody"), where the word is not there at all.
 * This pass fixes, in order:
 *
 * 0. **Script conversion.** The traditional text was converted from simplified
 *    with a table that often chose archaic variants — 喜懽 for 喜歡, 咊 for 和,
 *    㕥 for 以, 傢 for 家 — and the simplified text has 幺 for 么. Besides
 *    showing learners odd characters, these stop the segmenter from finding the
 *    word (大傢 is not 大家). Simplified characters were also left behind in the
 *    traditional text (几個月, 然后). Each such character is rebuilt from the
 *    simplified sentence, phrase-level through the bank's own entries.
 *
 * 1. **The word has to survive segmentation, in both scripts.** Each sentence is
 *    segmented the way the app segments it (greedy longest match over one index
 *    keyed on both scripts, traditional first — exactly `lib/textSegmentation.ts`)
 *    and the word must come out as one of the tokens, matched by entry id, in
 *    the traditional *and* the simplified sentence. 行 in a sentence about 銀行
 *    does not; neither does 大 in simplified 大家好.
 *
 * 2. **A one-character entry on a rare reading gets nothing.** If the entry's
 *    pinyin is not that character's common reading (Unihan `kMandarin`, via
 *    `characterPinyin.json`), no sentence found by character match can be
 *    trusted to be this sense — 說 shuì, 上 shǎng, 個 gě.
 *
 * 3. **The sentence should show the meaning.** Of the sentences that pass, the
 *    one whose English translation shows the word's best sense (the gloss
 *    `conciseDefinition` picks) is preferred, then one showing any listed sense
 *    (the card then glosses with that sense — see `shortGloss`), then the rest.
 *    The current sentence is kept unless a candidate is strictly better.
 *
 * Replacements come from every sentence already in the bank, so each is a real
 * corpus sentence with its own translation — the whole `example` moves across.
 * Where nothing passes the `example` is dropped: a word with no sentence is a
 * supported state, and a wrong sentence teaches wrong Chinese.
 *
 * **Self-contained**: reads and rewrites `src/data/importedWords.json` and needs
 * none of the hand-downloaded corpora `buildWordBank.mjs` depends on. Idempotent.
 * Re-run it after any rebuild of the word bank. Only the bulk bank is touched;
 * the curated entries in `hskFrequency.ts` carry hand-written examples.
 *
 * Usage: npx tsx scripts/repairExampleSenses.mjs [--dry]
 * (tsx, because the gloss logic is the app's own TypeScript.)
 */

const WORDS = path.join(process.cwd(), 'src/data/importedWords.json')
const CHAR_PINYIN = path.join(process.cwd(), 'src/data/characterPinyin.json')
const CONVERSION = path.join(process.cwd(), 'src/data/scriptConversion.json')
const DRY = process.argv.includes('--dry')

/** Mirrors `MAX_WORD_LEN` in `lib/textSegmentation.ts`. */
const MAX_WORD_LEN = 4

const words = JSON.parse(fs.readFileSync(WORDS, 'utf8'))
const charPinyin = JSON.parse(fs.readFileSync(CHAR_PINYIN, 'utf8'))
const conversion = JSON.parse(fs.readFileSync(CONVERSION, 'utf8'))

/** Character → its commonest reading, the same index `characterReading.ts` uses. */
const commonReading = new Map()
{
  const chars = [...charPinyin.chars]
  const readings = charPinyin.pinyin.split(' ')
  for (let i = 0; i < chars.length; i++) commonReading.set(chars[i], readings[i])
}

/** Tone marks and spacing off, so "shuì" and "shuī" compare as the same syllable. */
const bareSyllable = (reading) =>
  (reading || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '')

// --- 0. Script conversion ----------------------------------------------------

/** Characters in ordinary use: those spelling the commonest entries, either script. */
const COMMON_ENTRIES = 15000
const common = new Set()
for (const word of words.slice(0, COMMON_ENTRIES)) {
  for (const ch of word.traditional) common.add(ch)
  for (const ch of word.simplified) common.add(ch)
}

const tradToSimp = new Map()
{
  const t = [...conversion.traditional]
  const s = [...conversion.simplified]
  for (let i = 0; i < t.length; i++) tradToSimp.set(t[i], s[i])
}

/*
 * Simplified → traditional for one character, only where the conversion table
 * has exactly one ordinary traditional form for it (从 ← 從; not 发 ← 發/髮).
 */
const simpToTradChar = new Map()
{
  const candidates = new Map()
  for (const [trad, simp] of tradToSimp) {
    // Archaic forms (旹 → 时) don't count against an ordinary one (時 → 时).
    if (trad === simp || !common.has(trad)) continue
    if (!candidates.has(simp)) candidates.set(simp, [])
    candidates.get(simp).push(trad)
  }
  for (const [simp, trads] of candidates) if (trads.length === 1) simpToTradChar.set(simp, trads[0])
}

/*
 * Simplified → traditional, phrase-level. The bank is in frequency order, so the
 * first entry with a given simplified form is its commonest reading — 头发 is
 * 頭髮, 后 alone is 後. Only used to replace characters that are already wrong.
 */
const simpToEntry = new Map()
for (const word of words) {
  if (word.simplified.length !== word.traditional.length) continue
  if (!simpToEntry.has(word.simplified)) simpToEntry.set(word.simplified, word)
}

/**
 * Characters the common entries spell their traditional form with. Common only:
 * rare entries list archaic forms like 从 and 时 as traditional too.
 */
const traditionalChars = new Set()
for (const word of words.slice(0, COMMON_ENTRIES)) for (const ch of word.traditional) traditionalChars.add(ch)

/** Per character: its traditional form, and whether a whole word (not one character) decided it. */
function traditionalFrom(simplified) {
  const out = []
  let i = 0
  while (i < simplified.length) {
    let len = Math.min(MAX_WORD_LEN, simplified.length - i)
    for (; len >= 1; len--) {
      const entry = simpToEntry.get(simplified.slice(i, i + len))
      if (entry) {
        for (const ch of entry.traditional) out.push({ ch, phrase: len > 1 })
        break
      }
    }
    if (len === 0) {
      // No entry: the character itself if it is ordinary traditional too (和),
      // else the table's single traditional form if that is ordinary (从 → 從).
      const ch = simplified[i]
      const viaTable = simpToTradChar.get(ch)
      out.push({ ch: traditionalChars.has(ch) || !common.has(viaTable) ? ch : viaTable, phrase: false })
      len = 1
    }
    i += len
  }
  return out
}

let conversionFixes = 0
function fixScripts(example) {
  const trad = [...example.traditional]
  const simp = [...example.simplified]
  if (trad.length !== simp.length) return
  let changed = false
  for (let i = 0; i < simp.length; i++) {
    // 麼 is 么 in simplified; 幺 ("youngest") is a different word.
    let fixed = simp[i]
    if (simp[i] === '幺' && trad[i] === '麼') fixed = '么'
    else if (!common.has(simp[i]) && common.has(tradToSimp.get(trad[i]))) fixed = tradToSimp.get(trad[i])
    if (fixed !== simp[i]) {
      simp[i] = fixed
      changed = true
    }
  }
  const rebuilt = traditionalFrom(simp.join(''))
  for (let i = 0; i < trad.length; i++) {
    if (!rebuilt[i]) continue
    const { ch: better, phrase } = rebuilt[i]
    if (better === trad[i]) continue
    const wrong =
      // A whole dictionary word says otherwise: 几個月 is 幾個月, 然后 is 然後.
      phrase ||
      // An archaic variant (咊, 㕥, 懽).
      !common.has(trad[i]) ||
      // A simplified-only character left in the traditional text (纸).
      !traditionalChars.has(trad[i]) ||
      // 傢 standing in for 家 (傢 is right only in 傢具/傢伙).
      (trad[i] === '傢' && better === '家')
    if (wrong && common.has(better)) {
      trad[i] = better
      changed = true
    }
  }
  if (changed) {
    example.traditional = trad.join('')
    example.simplified = simp.join('')
    conversionFixes++
  }
}

for (const word of words) if (word.example?.traditional) fixScripts(word.example)

// --- 1. Segmentation, mirroring the app --------------------------------------

/*
 * The bank's own lookup table — first entry wins, keyed on both scripts with
 * traditional inserted first, exactly as `lib/textSegmentation.ts` builds it. A
 * simplified form is a match even inside traditional text, which is why this
 * has to mirror the app rather than approximate it.
 */
const byText = new Map()
for (const word of words) if (!byText.has(word.traditional)) byText.set(word.traditional, word)
for (const word of words) if (!byText.has(word.simplified)) byText.set(word.simplified, word)

/** Entry ids of the tokens a text segments into. Identity, not strings, is the test. */
function tokenIds(text) {
  const ids = new Set()
  let i = 0
  while (i < text.length) {
    let len = Math.min(MAX_WORD_LEN, text.length - i)
    for (; len >= 1; len--) {
      const found = byText.get(text.slice(i, i + len))
      if (found) {
        ids.add(found.id)
        break
      }
    }
    i += Math.max(len, 1)
  }
  return ids
}

/** Ids a sentence contains as a token in both of its scripts. */
function containedIds(example) {
  const simp = tokenIds(example.simplified)
  return new Set([...tokenIds(example.traditional)].filter((id) => simp.has(id)))
}

/** Rule 2 — a multi-character word is not at meaningful risk of being a homograph. */
function readingIsTrustworthy(word) {
  if ([...word.traditional].length !== 1) return true
  const reading = commonReading.get(word.traditional)
  if (!reading) return true
  return bareSyllable(reading) === bareSyllable(word.pinyin)
}

// --- 3. Sense fit ------------------------------------------------------------

const COMMENTARY = /^(CL:|used |indicating|indicates|classifier|abbr\.|abbreviation|variant of|old variant|see |also written|surname\b|erhua variant|lit\.)/i

function senseKeysFor(word) {
  const gloss = senseKeys(conciseDefinition(word.definition))
  const any = senses(word.definition)
    .filter((s) => !COMMENTARY.test(s))
    .map((s) => senseKeys(plainEnglish(s)))
  return { gloss, any }
}

/** 0: shows the best sense; 1: shows another listed sense; 2: shows none. */
function fitRank(keys, example) {
  const t = translationStems(example.translation)
  if (shows(keys.gloss, t)) return 0
  if (keys.any.some((k) => shows(k, t))) return 1
  return 2
}

// --- The pass ------------------------------------------------------------------

/* Every distinct sentence in the bank, indexed by the entries it truly contains. */
const sentencesFor = new Map()
{
  const seen = new Set()
  for (const word of words) {
    const example = word.example
    if (!example?.traditional || seen.has(example.traditional)) continue
    seen.add(example.traditional)
    for (const id of containedIds(example)) {
      if (!sentencesFor.has(id)) sentencesFor.set(id, [])
      sentencesFor.get(id).push(example)
    }
  }
}

let had = 0
let kept = 0
let swappedWrong = 0
let swappedBetterSense = 0
let droppedRareReading = 0
let droppedNoReplacement = 0
const fits = [0, 0, 0]

for (const word of words) {
  if (!word.example?.traditional) continue
  had++

  if (!readingIsTrustworthy(word)) {
    delete word.example
    droppedRareReading++
    continue
  }

  const keys = senseKeysFor(word)
  const currentValid = containedIds(word.example).has(word.id)
  const currentRank = currentValid ? fitRank(keys, word.example) : Infinity

  let best = null
  let bestRank = Infinity
  for (const candidate of sentencesFor.get(word.id) ?? []) {
    const rank = fitRank(keys, candidate)
    if (rank < bestRank || (rank === bestRank && candidate.traditional.length < best.traditional.length)) {
      best = candidate
      bestRank = rank
    }
  }

  if (best && bestRank < currentRank) {
    if (currentValid) swappedBetterSense++
    else swappedWrong++
    word.example = { ...best }
    fits[bestRank]++
  } else if (currentValid) {
    kept++
    fits[currentRank]++
  } else {
    delete word.example
    droppedNoReplacement++
  }
}

const total = kept + swappedWrong + swappedBetterSense
console.log(`entries:                         ${words.length}`)
console.log(`sentences with fixed characters: ${conversionFixes}`)
console.log(`had an example:                  ${had}`)
console.log(`  kept:                          ${kept}`)
console.log(`  replaced, word not in it:      ${swappedWrong}`)
console.log(`  replaced, better sense fit:    ${swappedBetterSense}`)
console.log(`  dropped, rare reading:         ${droppedRareReading}`)
console.log(`  dropped, no replacement:       ${droppedNoReplacement}`)
console.log(`now showing an example:          ${total}  (${((100 * total) / had).toFixed(1)}% of before)`)
console.log(`  translation shows best sense:  ${fits[0]}`)
console.log(`  shows another listed sense:    ${fits[1]}`)
console.log(`  shows no listed sense:         ${fits[2]}`)

if (DRY) {
  console.log('\n--dry: nothing written')
} else {
  fs.writeFileSync(WORDS, JSON.stringify(words, null, 0))
  console.log(`\nwrote ${WORDS}  ${(fs.statSync(WORDS).size / 1024 / 1024).toFixed(2)} MB`)
}
