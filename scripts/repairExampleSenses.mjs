import fs from 'node:fs'
import path from 'node:path'

/**
 * Repairs example sentences that show a word in the wrong sense.
 *
 * `buildWordBank.mjs` attaches a Tatoeba sentence to a word by **character
 * match** — the shortest sentence containing the string. Chinese does not
 * cooperate with that. Search 說 in the sense CC-CEDICT files as `shuì`, "to
 * persuade", and the bank hands back 別說謊 ("don't lie"), where 說 is `shuō`
 * inside the word 別說. The characters are right and the word is not there at
 * all. Roughly one attached sentence in five had this fault.
 *
 * Two rules, and both are about the same thing — is the entry's *word* actually
 * in the sentence, or only its letters?
 *
 * 1. **The word has to survive segmentation.** The sentence is segmented the way
 *    the app segments it (greedy longest match against the bank, exactly
 *    `lib/textSegmentation.ts`), and the word must come out as one of the
 *    tokens. 行 in a sentence about 銀行 does not.
 * 2. **A one-character entry on a rare reading gets nothing.** If the entry's
 *    pinyin is not that character's common reading (Unihan `kMandarin`, via
 *    `characterPinyin.json`), then no sentence found by character match can be
 *    trusted to be this sense — 說 shuì, 上 shǎng, 個 gě. There is no signal in
 *    the corpus that would tell them apart, so the honest output is no example.
 *
 * A rejected sentence is replaced where possible: every sentence in the bank is
 * indexed by the tokens it segments into, and the shortest one that genuinely
 * contains the word wins. That is how 好 stops being illustrated by 你好 and
 * starts being illustrated by 做得好. Where no replacement exists the `example`
 * is dropped — a word with no sentence is already a supported state everywhere
 * in the app, and a wrong sentence teaches wrong Chinese.
 *
 * **Self-contained**: reads and rewrites `src/data/importedWords.json` and needs
 * none of the hand-downloaded corpora `buildWordBank.mjs` depends on. Idempotent
 * — a second run finds every remaining example already passing and changes
 * nothing. Re-run it after any rebuild of the word bank, because that script
 * attaches sentences the old way. Only the bulk bank is touched; the curated
 * entries in `hskFrequency.ts` carry hand-written examples and are correct by
 * construction.
 *
 * Usage: node scripts/repairExampleSenses.mjs [--dry]
 */

const WORDS = path.join(process.cwd(), 'src/data/importedWords.json')
const CHAR_PINYIN = path.join(process.cwd(), 'src/data/characterPinyin.json')
const DRY = process.argv.includes('--dry')

/** Mirrors `MAX_WORD_LEN` in `lib/textSegmentation.ts`. */
const MAX_WORD_LEN = 4

const words = JSON.parse(fs.readFileSync(WORDS, 'utf8'))
const charPinyin = JSON.parse(fs.readFileSync(CHAR_PINYIN, 'utf8'))

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

/** The bank's own lookup table — first entry wins, as in `textSegmentation.ts`. */
const byText = new Map()
for (const word of words) if (!byText.has(word.traditional)) byText.set(word.traditional, word)

/** Greedy longest-match segmentation. Deliberately identical to the app's. */
function segment(text) {
  const out = []
  let i = 0
  while (i < text.length) {
    let hit = null
    for (let len = Math.min(MAX_WORD_LEN, text.length - i); len >= 1; len--) {
      const candidate = text.slice(i, i + len)
      if (byText.has(candidate)) {
        hit = candidate
        break
      }
    }
    if (hit) {
      out.push(hit)
      i += hit.length
    } else {
      out.push(text[i])
      i += 1
    }
  }
  return out
}

/** Rule 2 — a multi-character word is not at meaningful risk of being a homograph. */
function readingIsTrustworthy(word) {
  if ([...word.traditional].length !== 1) return true
  const common = commonReading.get(word.traditional)
  if (!common) return true
  return bareSyllable(common) === bareSyllable(word.pinyin)
}

/*
 * token → the shortest example in the bank that genuinely contains it.
 *
 * Built from every sentence already attached anywhere, so a replacement is a
 * real corpus sentence with its own verified translation — the whole `example`
 * object moves across, never just the Chinese.
 */
const bestFor = new Map()
for (const word of words) {
  const example = word.example
  if (!example?.traditional) continue
  for (const token of new Set(segment(example.traditional))) {
    const held = bestFor.get(token)
    if (!held || example.traditional.length < held.traditional.length) bestFor.set(token, example)
  }
}

let had = 0
let kept = 0
let swapped = 0
let droppedRareReading = 0
let droppedNoReplacement = 0

for (const word of words) {
  if (!word.example?.traditional) continue
  had++

  if (!readingIsTrustworthy(word)) {
    delete word.example
    droppedRareReading++
    continue
  }

  if (segment(word.example.traditional).includes(word.traditional)) {
    kept++
    continue
  }

  const replacement = bestFor.get(word.traditional)
  if (replacement && replacement.traditional !== word.example.traditional) {
    word.example = { ...replacement }
    swapped++
  } else {
    delete word.example
    droppedNoReplacement++
  }
}

const total = kept + swapped
console.log(`entries:                    ${words.length}`)
console.log(`had an example:             ${had}`)
console.log(`  kept (word really there): ${kept}`)
console.log(`  replaced with a better:   ${swapped}`)
console.log(`  dropped, rare reading:    ${droppedRareReading}`)
console.log(`  dropped, no replacement:  ${droppedNoReplacement}`)
console.log(`now showing an example:     ${total}  (${((100 * total) / had).toFixed(1)}% of before)`)

if (DRY) {
  console.log('\n--dry: nothing written')
} else {
  fs.writeFileSync(WORDS, JSON.stringify(words, null, 0))
  console.log(`\nwrote ${WORDS}  ${(fs.statSync(WORDS).size / 1024 / 1024).toFixed(2)} MB`)
}
