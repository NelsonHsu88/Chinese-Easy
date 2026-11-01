import fs from 'node:fs'
import path from 'node:path'
import { CEDICT_LINE, cleanGloss, loadCommonReadings, readingKey, toPinyin } from './lib/cedict.mjs'

/**
 * Points simplified entries at the traditional form they actually stand for.
 *
 * An older builder kept, for these simplified forms, the rare CC-CEDICT row
 * whose traditional form is the same character — 几 jī "small table" instead of
 * 幾 jǐ "how many", 叶 xié instead of 葉 yè "leaf", 价 jiè instead of 價 jià
 * "price". `fixEntryReadings.mjs` leaves an entry alone when the right row has a
 * different traditional form, so these survived it. Ids and ranks stay; the
 * traditional form, reading and definition change, and the example's
 * traditional text follows.
 *
 * Forms where both rows are everyday words (斗 dǒu/鬥, 划 huá/劃, 咽 yān/嚥,
 * 祢 nǐ) are deliberately not listed.
 *
 * Needs `.wordbank-data/cedict`. Idempotent.
 * Follow with `npx tsx scripts/repairExampleSenses.mjs`.
 */

const FORMS = {
  听: '聽', 离: '離', 圣: '聖', 台: '臺', 杠: '槓', 腊: '臘',
  几: '幾', 叶: '葉', 价: '價', 腌: '醃', 岭: '嶺', 眯: '瞇', 于: '於',
}

const ROOT = process.cwd()
const WORDS = path.join(ROOT, 'src/data/importedWords.json')
const DATA_DIR = process.env.WORDBANK_DATA ?? path.join(ROOT, '.wordbank-data')
const words = JSON.parse(fs.readFileSync(WORDS, 'utf8'))

const common = loadCommonReadings(path.join(ROOT, 'src/data/characterPinyin.json'))
// Several rows can share a form (幾 jī "almost", 幾 jǐ "how many"): the one on
// the character's common reading wins, else the first.
const rows = new Map()
for (const line of fs.readFileSync(path.join(DATA_DIR, 'cedict'), 'utf8').split('\n')) {
  const m = line.trim().match(CEDICT_LINE)
  if (!m) continue
  const [, trad, simp, pinyin, defs] = m
  const key = `${simp} ${trad}`
  if (!/^[a-z]/.test(pinyin)) continue
  const onCommon = readingKey(pinyin) === readingKey(common.get(simp) ?? '')
  if (!rows.has(key) || (onCommon && !rows.get(key).onCommon)) rows.set(key, { pinyin, defs, onCommon })
}

let changed = 0
for (const word of words) {
  const trad = FORMS[word.simplified]
  if (!trad || word.id !== `cc-${word.simplified}`) continue
  const row = rows.get(`${word.simplified} ${trad}`)
  if (!row) continue
  const was = `${word.traditional} ${word.pinyin} "${word.definition}"`
  const old = word.traditional
  word.traditional = trad
  word.pinyin = toPinyin(row.pinyin)
  word.definition = cleanGloss(row.defs)
  if (word.example && old !== trad) word.example.traditional = word.example.traditional.split(old).join(trad)
  if (was !== `${word.traditional} ${word.pinyin} "${word.definition}"`) {
    changed++
    console.log(`${was}  →  ${word.traditional} ${word.pinyin} "${word.definition}"`)
  }
}
console.log(`\n${changed} entries changed`)
fs.writeFileSync(WORDS, JSON.stringify(words, null, 0))
