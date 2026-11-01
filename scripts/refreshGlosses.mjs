import fs from 'node:fs'
import path from 'node:path'
import { CEDICT_LINE, cleanGloss, isProperRow, readingKey, toPinyin } from './lib/cedict.mjs'

/**
 * Re-applies `cleanGloss` to the committed banks, both tiers, in place.
 *
 * For when `cleanGloss` changes (it now keeps meaning-narrowing notes like
 * "(alcohol)" and lists up to six senses) without a full rebuild, which would
 * reshuffle ranks and need the Tatoeba corpus. Only `definition` changes: ids,
 * readings, ranks, levels and categories stay. Each entry is matched to the
 * CC-CEDICT row with its own traditional form and reading.
 *
 * Needs `.wordbank-data/cedict`. Idempotent.
 * Follow with `npx tsx scripts/repairExampleSenses.mjs`.
 *
 * Usage: node scripts/refreshGlosses.mjs [--dry]
 */

const ROOT = process.cwd()
const DATA_DIR = process.env.WORDBANK_DATA ?? path.join(ROOT, '.wordbank-data')
const WORDS = path.join(ROOT, 'src/data/importedWords.json')
const LOOKUP = path.join(ROOT, 'src/data/lookupWords.json')
const DRY = process.argv.includes('--dry')

/**
 * CC-CEDICT rows keyed by traditional form + reading. `toPinyin` lowercases, so
 * 也's surname row "Ye3" shares a key with "ye3" — an ordinary row always wins.
 */
const rows = new Map()
const proper = new Set()
const put = (key, defs, isProper) => {
  if (rows.has(key) && !(proper.has(key) && !isProper)) return
  rows.set(key, defs)
  if (isProper) proper.add(key)
  else proper.delete(key)
}
for (const line of fs.readFileSync(path.join(DATA_DIR, 'cedict'), 'utf8').split('\n')) {
  if (!line || line[0] === '#') continue
  const m = line.trim().match(CEDICT_LINE)
  if (!m) continue
  const [, trad, , pinyin, defs] = m
  const isProper = isProperRow(pinyin, defs)
  put(`${trad} ${toPinyin(pinyin)}`, defs, isProper)
  put(`${trad} ~${readingKey(pinyin)}`, defs, isProper)
}
const defsFor = (trad, pinyin) => rows.get(`${trad} ${pinyin}`) ?? rows.get(`${trad} ~${readingKey(pinyin)}`)

const samples = []
function refreshed(trad, pinyin, old) {
  const defs = defsFor(trad, pinyin)
  if (!defs) return old
  const definition = cleanGloss(defs)
  if (!definition || definition === old) return old
  if (samples.length < 40) samples.push(`${trad}  "${old}"  →  "${definition}"`)
  return definition
}

// Tier 1.
const words = JSON.parse(fs.readFileSync(WORDS, 'utf8'))
let tier1 = 0
for (const word of words) {
  const next = refreshed(word.traditional, word.pinyin, word.definition)
  if (next !== word.definition) {
    word.definition = next
    tier1++
  }
}

// Tier 2: one packed string, `trad|simp|pinyin|definition` per line.
const lookup = JSON.parse(fs.readFileSync(LOOKUP, 'utf8'))
let tier2 = 0
const packed = lookup.packed
  .split('\n')
  .map((record) => {
    const [trad, simp, pinyin, definition] = record.split('|')
    const next = refreshed(trad, pinyin, definition)
    if (next === definition) return record
    tier2++
    return [trad, simp, pinyin, next].join('|')
  })
  .join('\n')

for (const line of samples) console.log(line)
console.log(`\ntier 1: ${tier1} of ${words.length} definitions changed`)
console.log(`tier 2: ${tier2} definitions changed`)
if (DRY) console.log('--dry: nothing written')
else {
  fs.writeFileSync(WORDS, JSON.stringify(words, null, 0))
  fs.writeFileSync(LOOKUP, JSON.stringify({ packed }))
}
