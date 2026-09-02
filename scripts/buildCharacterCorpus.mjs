/*
 * Collects every character the app can put in front of a learner, into
 * src/data/characters-traditional.txt and src/data/characters-simplified.txt.
 *
 * This is the input to font subsetting, and the rule it exists to enforce is
 * blunt: **a character that exists anywhere in reachable content must not
 * disappear.** So the collection is deliberately greedy and errs towards
 * over-inclusion — a character wrongly included costs a few bytes, a character
 * wrongly excluded is tofu on somebody's screen.
 *
 * Nothing here is a hand-picked "common characters" list. Every character comes
 * from content in the repository:
 *
 *  - both dictionary tiers (tier 2 is 81k entries and *is* displayed, so it
 *    counts, even though it is search-only and carries no stroke data)
 *  - the stroke dataset's own key set
 *  - every story, in the canonical traditional and in the simplified the reader
 *    converts it to
 *  - the per-character pinyin and radical indexes
 *  - the script-conversion table, both sides
 *  - and a raw scan of every .ts/.tsx source file, which is what catches Chinese
 *    written directly into the UI (the 學 / 学 on the onboarding script page,
 *    the writing guide's examples, challenge and lesson copy) without anyone
 *    having to remember to list it
 *
 * The source scan reads whole files rather than parsing string literals, so
 * Chinese inside comments is swept up too. That is intentional: it is a
 * superset, and the cost of a wrong inclusion is a few bytes.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(here, '../src')
const OUT_TRAD = resolve(here, '../src/data/characters-traditional.txt')
const OUT_SIMP = resolve(here, '../src/data/characters-simplified.txt')

/** Anything that needs a CJK glyph. Han, plus the scripts and marks that sit with it. */
const CJK = /[⺀-⻿　-〿㄀-ㄯㆠ-ㆿ㐀-䶿一-鿿豈-﫿︰-﹏＀-￯]|[\uD840-\uD87F][\uDC00-\uDFFF]/gu

const traditional = new Set()
const simplified = new Set()

/** Add every CJK-ish character in `text` to the given sets. */
function harvest(text, ...sets) {
  if (!text) return
  const found = String(text).match(CJK)
  if (!found) return
  for (const ch of found) for (const s of sets) s.add(ch)
}

// ── Always included, in both ────────────────────────────────────────────────
// The CJK faces are asked to render more than Han: pinyin with tone marks sits
// beside hanzi in the same Text runs, zhuyin is a real display option, and the
// fullwidth punctuation in story prose comes from the CJK block above. ASCII is
// in here because a CJK font is the resolved family for mixed runs and a missing
// digit or full stop is as visible as a missing character.
const ALWAYS = [
  // ASCII printable
  ...Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)),
  // Latin-1 letters + the pinyin tone-marked vowels, precomposed and combining
  ...'àáâãäāăǎèéêëēĕěìíîïīĭǐòóôõöōŏǒùúûüūŭǔǖǘǚǜńňǹḿ',
  ...'ÀÁÂÃÄĀĂǍÈÉÊËĒĔĚÌÍÎÏĪĬǏÒÓÔÕÖŌŎǑÙÚÛÜŪŬǓǕǗǙǛŃŇǸ',
  '̀', '́', '̄', '̌', '̈',
  // Bopomofo / zhuyin, including the tone marks the app prints with it
  ...Array.from({ length: 0x312f - 0x3105 + 1 }, (_, i) => String.fromCharCode(0x3105 + i)),
  ...'ˉˊˇˋ˙',
  // Punctuation that shows up in prose and glosses
  ...'　、。〈〉《》「」『』【】〔〕・…—–‘’“”·×÷°％±',
]
for (const ch of ALWAYS) {
  traditional.add(ch)
  simplified.add(ch)
}

// ── Tier 1: the learning bank ───────────────────────────────────────────────
const tier1 = JSON.parse(readFileSync(resolve(SRC, 'data/importedWords.json'), 'utf8'))
for (const w of tier1) {
  harvest(w.traditional, traditional)
  harvest(w.simplified, simplified)
  harvest(w.pinyin, traditional, simplified)
  harvest(w.definition, traditional, simplified)
  if (w.example) {
    harvest(w.example.traditional, traditional)
    harvest(w.example.simplified, simplified)
    harvest(w.example.pinyin, traditional, simplified)
    harvest(w.example.translation, traditional, simplified)
  }
}
console.log(`tier 1: ${tier1.length} words`)

// ── Tier 2: the reference tail. Search-only, but it is displayed. ───────────
const tier2 = JSON.parse(readFileSync(resolve(SRC, 'data/lookupWords.json'), 'utf8'))
let tier2Rows = 0
for (const row of String(tier2.packed).split('\n')) {
  if (!row) continue
  tier2Rows += 1
  const [trad, simp, pinyin, definition] = row.split('|')
  harvest(trad, traditional)
  harvest(simp, simplified)
  harvest(pinyin, traditional, simplified)
  harvest(definition, traditional, simplified)
}
console.log(`tier 2: ${tier2Rows} entries`)

// ── The stroke dataset's key set (both scripts by construction) ─────────────
const hanzi = JSON.parse(readFileSync(resolve(SRC, 'assets/hanziData.json'), 'utf8'))
for (const ch of Object.keys(hanzi)) harvest(ch, traditional, simplified)
console.log(`stroke data: ${Object.keys(hanzi).length} characters`)

// ── Per-character indexes ──────────────────────────────────────────────────
for (const file of ['data/characterPinyin.json', 'data/characterRadicals.json']) {
  const json = JSON.parse(readFileSync(resolve(SRC, file), 'utf8'))
  for (const [k, v] of Object.entries(json)) {
    harvest(k, traditional, simplified)
    harvest(typeof v === 'string' ? v : '', traditional, simplified)
  }
}

// ── Script conversion, both sides ───────────────────────────────────────────
const conversion = JSON.parse(readFileSync(resolve(SRC, 'data/scriptConversion.json'), 'utf8'))
for (const [from, to] of Object.entries(conversion)) {
  harvest(from, traditional)
  harvest(to, simplified)
  // Also both-ways, because a conversion pair can appear either side of a diff
  harvest(from, simplified)
  harvest(to, traditional)
}

// ── Every source file, raw ─────────────────────────────────────────────────
// Catches Chinese written straight into components and data modules — stories,
// radicals, lessons, challenges, placement test, UI strings — with no list to
// maintain. Both sets, because a source file does not say which script it is.
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      walk(full)
    } else if (/\.(ts|tsx)$/.test(entry)) {
      harvest(readFileSync(full, 'utf8'), traditional, simplified)
    }
  }
}
walk(SRC)

// ── Emit ───────────────────────────────────────────────────────────────────
const sortByCodepoint = (a, b) => (a.codePointAt(0) ?? 0) - (b.codePointAt(0) ?? 0)
const tradList = [...traditional].sort(sortByCodepoint)
const simpList = [...simplified].sort(sortByCodepoint)

writeFileSync(OUT_TRAD, tradList.join(''), 'utf8')
writeFileSync(OUT_SIMP, simpList.join(''), 'utf8')

/*
 * The union is what the fonts are actually subset against, and the two
 * script-specific files above are reference rather than build inputs.
 *
 * Two reasons, and the first is the one that matters. `font-hanzi` is declared
 * as the chain ['NotoSerifSC', 'NotoSerifTC', 'serif'] — but React Native only
 * honours the first family on native, so NotoSerifSC is what actually draws
 * traditional text on a phone, and a simplified-only SC subset would be tofu
 * there. Second, it costs almost nothing: only 6 characters are simplified-only,
 * so the union is the traditional set plus a handful.
 */
const union = new Set([...traditional, ...simplified])
writeFileSync(resolve(here, '../src/data/characters-union.txt'), [...union].sort(sortByCodepoint).join(''), 'utf8')

console.log('')
console.log(`traditional : ${tradList.length} characters`)
console.log(`simplified  : ${simpList.length} characters`)
console.log(`union       : ${union.size} characters  <- fonts are subset to this`)
console.log(`only in trad: ${[...traditional].filter((c) => !simplified.has(c)).length}`)
console.log(`only in simp: ${[...simplified].filter((c) => !traditional.has(c)).length}`)
