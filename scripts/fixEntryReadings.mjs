import fs from 'node:fs'
import path from 'node:path'
import { CEDICT_LINE, chooseRow, cleanGloss, loadCommonReadings, readingKey, toPinyin } from './lib/cedict.mjs'

/**
 * Re-picks the CC-CEDICT reading of tier-1 single characters in place.
 *
 * `buildWordBank.mjs` used to keep the first CC-CEDICT row for each form, and
 * for about two hundred common characters that row is a rare reading: 看 kān
 * "to look after", 跑 páo "to paw", 打 dá "dozen", 追 duī "to sculpt". Cards then
 * showed that meaning beside sentences using the everyday one. The builder now
 * chooses with `chooseRow` (lib/cedict.mjs); this applies the same choice to the
 * committed bank without a full rebuild, which would reshuffle ranks and need
 * the Tatoeba corpus.
 *
 * Only `pinyin` and `definition` change; ids, ranks and levels stay. An entry
 * whose chosen row has a different traditional form is left alone.
 *
 * Needs `.wordbank-data/cedict` (see buildWordBank.mjs). Idempotent.
 * Follow with `npx tsx scripts/repairExampleSenses.mjs`.
 *
 * Usage: node scripts/fixEntryReadings.mjs [--dry]
 */

const ROOT = process.cwd()
const DATA_DIR = process.env.WORDBANK_DATA ?? path.join(ROOT, '.wordbank-data')
const WORDS = path.join(ROOT, 'src/data/importedWords.json')
const DRY = process.argv.includes('--dry')

const words = JSON.parse(fs.readFileSync(WORDS, 'utf8'))
const common = loadCommonReadings(path.join(ROOT, 'src/data/characterPinyin.json'))

const rowsBySimp = new Map()
for (const line of fs.readFileSync(path.join(DATA_DIR, 'cedict'), 'utf8').split('\n')) {
  if (!line || line[0] === '#') continue
  const m = line.trim().match(CEDICT_LINE)
  if (!m) continue
  const [, trad, simp, pinyin, defs] = m
  if (!rowsBySimp.has(simp)) rowsBySimp.set(simp, [])
  rowsBySimp.get(simp).push({ trad, pinyin, defs })
}

let changed = 0
for (const word of words) {
  if ([...word.simplified].length !== 1) continue
  const rows = (rowsBySimp.get(word.simplified) ?? []).filter((row) => row.trad === word.traditional)
  if (rows.length < 2) continue
  const row = chooseRow(word.simplified, rows, common.get(word.simplified))
  // Both checks: a syllable with no vowel (m2) loses its tone mark in `toPinyin`.
  if (readingKey(row.pinyin) === readingKey(word.pinyin) || toPinyin(row.pinyin) === word.pinyin) continue
  const definition = cleanGloss(row.defs)
  if (!definition) continue
  console.log(`${word.traditional}  ${word.pinyin} "${word.definition}"  →  ${toPinyin(row.pinyin)} "${definition}"`)
  word.pinyin = toPinyin(row.pinyin)
  word.definition = definition
  changed++
}

console.log(`\n${changed} entries re-read`)
if (DRY) console.log('--dry: nothing written')
else if (changed > 0) fs.writeFileSync(WORDS, JSON.stringify(words, null, 0))
