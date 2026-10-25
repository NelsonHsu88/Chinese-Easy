/*
 * Puts back common words an old version of buildWordBank.mjs left out of tier 1,
 * without rebuilding — so every existing entry, its HSK level and the learner's
 * deck stay exactly as they are.
 *
 *   npx tsx scripts/addMissingWords.ts --dry   # list what would be added
 *   npx tsx scripts/addMissingWords.ts         # write src/data/importedWords.json
 *
 * 船 ("ship") was one: searching "ship" could never find the word for ship.
 * This replays the builder's own selection over the frequency list (same
 * CC-CEDICT row choice, gloss cleaning and filters), and inserts each selected
 * form tier 1 lacks at its frequency position, with the level that rank earns.
 *
 * No example sentence is invented: the corpus (cmn.txt) isn't kept locally, so
 * these words carry none, and New Words (which requires one) skips them until a
 * full rebuild gives them one. Search, word pages and My Words need none.
 *
 * Reads the gitignored `.wordbank-data/` like the other bank scripts. Re-run the
 * stroke/radical/character-pinyin builders afterwards if any new character
 * lacks data (the script reports it).
 */
import fs from 'node:fs'
import path from 'node:path'
import { CEDICT_LINE, chooseRow, cleanGloss, loadCommonReadings, toPinyin } from './lib/cedict.mjs'
import { hskFrequency } from '../src/data/hskFrequency'
import type { VocabWord } from '../src/types'

const ROOT = path.resolve(__dirname, '..')
const DATA_DIR = process.env.WORDBANK_DATA ?? path.join(ROOT, '.wordbank-data')
const OUT = path.join(ROOT, 'src/data/importedWords.json')
const DRY = process.argv.includes('--dry')

// Kept identical to buildWordBank.mjs.
const VULGAR = /\b(taboo|vulgar|obscene|offensive|slang for penis|derogatory)\b/i
const CATEGORY_RULES: [string, RegExp][] = [
  ['food', /\b(food|eat|drink|rice|noodle|meat|fruit|vegetable|tea|wine|cook|restaurant|meal|hungry|taste|sweet|soup)\b/i],
  ['travel', /\b(travel|road|car|train|plane|fly|airport|ticket|hotel|map|street|city|country|abroad|walk|drive|bus|station)\b/i],
  ['people', /\b(person|people|friend|family|mother|father|child|son|daughter|love|marry|he|she|teacher|student|name|baby|brother|sister)\b/i],
  ['work', /\b(work|job|office|company|money|business|buy|sell|price|market|manage|boss|salary|meeting|study|school|learn)\b/i],
  ['science', /\b(science|scientific|chemistry|physics|biology|computer|electric|machine|technology|research|experiment|data|energy|medicine)\b/i],
]
const categoryFor = (gloss: string) => CATEGORY_RULES.find(([, re]) => re.test(gloss.split(';')[0]))?.[0] ?? 'daily'
const levelForRank = (rank: number) => (rank < 750 ? 1 : rank < 1600 ? 2 : rank < 3000 ? 3 : rank < 6000 ? 4 : rank < 11000 ? 5 : 6)

const commonReadings = loadCommonReadings(path.join(ROOT, 'src/data/characterPinyin.json'))
const rowsBySimp = new Map<string, { trad: string; pinyin: string; defs: string }[]>()
for (const line of fs.readFileSync(path.join(DATA_DIR, 'cedict'), 'utf8').split('\n')) {
  if (!line || line[0] === '#') continue
  const m = line.trim().match(CEDICT_LINE)
  if (!m) continue
  const [, trad, simp, pinyin, defs] = m
  if (!rowsBySimp.has(simp)) rowsBySimp.set(simp, [])
  rowsBySimp.get(simp)!.push({ trad, pinyin, defs })
}

const bank: VocabWord[] = JSON.parse(fs.readFileSync(OUT, 'utf8'))
const present = new Set(hskFrequency.flatMap((w) => [w.simplified, w.traditional]))
const freq = fs
  .readFileSync(path.join(DATA_DIR, 'freq.txt'), 'utf8')
  .split(/\r?\n/)
  .map((l) => l.split(' ')[0])
  .filter(Boolean)

/* Replay the builder's loop: `rank` is the place each form takes in tier 1. */
const additions: { word: VocabWord; after: string | null }[] = []
const seen = new Set<string>()
let rank = 0
let lastPresent: string | null = null
for (const simp of freq) {
  if (rank >= bank.length) break
  if (seen.has(simp)) continue
  const rows = rowsBySimp.get(simp)
  if (!rows) continue
  const row = chooseRow(simp, rows, commonReadings.get(simp))
  if (VULGAR.test(row.defs)) continue
  const definition = cleanGloss(row.defs)
  if (!definition) continue
  if (!/^[㐀-鿿]+$/.test(simp)) continue
  seen.add(simp)

  if (present.has(simp) || present.has(row.trad)) {
    lastPresent = simp
  } else {
    additions.push({
      after: lastPresent,
      word: {
        id: `cc-${simp}`,
        simplified: simp,
        traditional: row.trad,
        pinyin: toPinyin(row.pinyin),
        definition,
        hskLevel: levelForRank(rank),
        category: categoryFor(definition),
      } as VocabWord,
    })
  }
  rank++
}

for (const { word } of additions) {
  console.log(`${word.traditional}\t${word.simplified}\tHSK${word.hskLevel}\t${word.pinyin}\t${word.definition.slice(0, 60)}`)
}
console.log(`\n${additions.length} words to add`)

if (!DRY && additions.length) {
  const out = [...bank]
  // Insert after the word that precedes each one in frequency order.
  for (const { word, after } of additions) {
    const at = after === null ? -1 : out.findIndex((w) => w.simplified === after)
    out.splice(at + 1, 0, word)
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 0))
  console.log(`wrote ${OUT}: ${bank.length} → ${out.length}`)
}
