/*
 * Regenerates src/data/characterRadicals.json — the character → Kangxi radical
 * index behind the dictionary's Radical section.
 *
 * Why this exists: the curated RADICALS list in src/data/radicals.ts is a
 * teaching set (99 radicals, each with an authored explanation and a handful of
 * examples). Reversing it answered "what is this character's radical?" for only
 * ~360 of the 3,843 characters in the word bank — 9% — so nine dictionary
 * entries in ten showed no radical at all. This index answers for all of them.
 *
 * Source: the Unicode Unihan database's kRSUnicode field, which gives every CJK
 * ideograph its Kangxi radical number and residual stroke count. Download and
 * unzip it by hand before running (it is ~8 MB and not a dependency):
 *
 *   https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip
 *
 * Then point the script at the folder holding Unihan_IRGSources.txt:
 *
 *   UNIHAN_DATA=/path/to/unihan node scripts/buildRadicalIndex.mjs
 *
 * Output shape is radical number → the characters filed under it, concatenated:
 *
 *   { "9": "他你們…", "30": "…" }
 *
 * One string per radical rather than an entry per character, because the file is
 * inlined into the JS bundle and 3,843 JSON keys is a lot of parse for a lookup
 * table. Characters within a group are ordered by how many words in the bank
 * contain them, so the "other characters with this radical" strip on the detail
 * screen leads with ones a learner has actually met.
 */
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR =
  process.env.UNIHAN_DATA ??
  join(ROOT, '.wordbank-data', 'unihan')
const OUT = join(ROOT, 'src', 'data', 'characterRadicals.json')

const HANZI = /[㐀-䶿一-鿿]/

/** char → Kangxi radical number, read off kRSUnicode ("85.4" → radical 85). */
function readUnihan() {
  const file = join(DATA_DIR, 'Unihan_IRGSources.txt')
  if (!existsSync(file)) {
    console.error(`Unihan_IRGSources.txt not found in ${DATA_DIR}`)
    console.error('Download https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip, unzip it,')
    console.error('and set UNIHAN_DATA to the folder containing it.')
    process.exit(1)
  }

  const radicals = new Map()
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue
    const [codePoint, field, value] = line.split('\t')
    if (field !== 'kRSUnicode') continue
    // "85.4" or "85'.4" (the apostrophe marks a simplified radical form) — the
    // first value is the normative one when a character lists several.
    const match = value.split(' ')[0].match(/^(\d+)'?\.-?\d+$/)
    if (!match) continue
    radicals.set(String.fromCodePoint(parseInt(codePoint.slice(2), 16)), Number(match[1]))
  }
  return radicals
}

/**
 * Every character worth indexing, each with a weight: how many words in the bank
 * contain it. The weight is only used for ordering within a radical group.
 */
function collectCharacters() {
  const weight = new Map()

  for (const char of Object.keys(JSON.parse(readFileSync(join(ROOT, 'src/assets/hanziData.json'), 'utf8')))) {
    if (HANZI.test(char)) weight.set(char, 0)
  }

  const imported = JSON.parse(readFileSync(join(ROOT, 'src/data/importedWords.json'), 'utf8'))
  const words = Array.isArray(imported) ? imported : (imported.words ?? Object.values(imported)[0])
  for (const word of words) {
    // Counted once per word, not once per occurrence — 個個 shouldn't outrank a
    // character that appears in twice as many distinct words. Both scripts are
    // counted, and separately: 學 and 学 are different index entries, and a
    // simplified learner's "other characters with this radical" strip should
    // lead with the forms they actually read.
    for (const char of new Set(`${word.traditional ?? ''}${word.simplified ?? ''}`)) {
      if (weight.has(char)) weight.set(char, weight.get(char) + 1)
    }
  }

  // The curated radicals name characters (variants, examples) that the bank
  // doesn't always carry, and the detail screen can be opened on any of them.
  for (const char of readFileSync(join(ROOT, 'src/data/radicals.ts'), 'utf8')) {
    if (HANZI.test(char) && !weight.has(char)) weight.set(char, 0)
  }

  return weight
}

/** Radical numbers declared in the reference table, so the index can't outrun it. */
function knownRadicalNumbers() {
  const source = readFileSync(join(ROOT, 'src/data/kangxiRadicals.ts'), 'utf8')
  return new Set([...source.matchAll(/number: (\d+),/g)].map((m) => Number(m[1])))
}

function build() {
  const unihan = readUnihan()
  const weight = collectCharacters()
  const known = knownRadicalNumbers()

  const groups = new Map()
  const missing = []

  for (const char of weight.keys()) {
    const number = unihan.get(char)
    if (number === undefined || !known.has(number)) {
      missing.push(char)
      continue
    }
    if (!groups.has(number)) groups.set(number, [])
    groups.get(number).push(char)
  }

  const out = {}
  for (const number of [...groups.keys()].sort((a, b) => a - b)) {
    out[number] = groups
      .get(number)
      .sort((a, b) => weight.get(b) - weight.get(a) || a.localeCompare(b))
      .join('')
  }

  writeFileSync(OUT, JSON.stringify(out))

  const indexed = Object.values(out).reduce((n, s) => n + [...s].length, 0)
  const kb = (statSync(OUT).size / 1024).toFixed(0)
  console.log(`characters indexed : ${indexed}`)
  console.log(`radicals used      : ${Object.keys(out).length} of ${known.size}`)
  console.log(`no radical found   : ${missing.length}`)
  if (missing.length > 0) console.log(`  ${missing.join(' ')}`)
  console.log(`written            : ${OUT} (${kb} KB)`)
}

build()
