/*
 * Regenerates src/data/characterPinyin.json — a reading for every character the
 * word bank uses, in both scripts.
 *
 * Why: the pronunciation check scores what the recogniser *heard* against how
 * the target word sounds, and the recogniser hands back Han characters, not
 * pinyin. Turning those characters into syllables needs a reading for any
 * character that might come back — and only 2,359 of the bank's 5,065 distinct
 * characters have a single-character entry of their own to read it off.
 *
 * Simplified forms are included deliberately: a zh-CN recogniser writes back
 * simplified even when the learner said the identical syllables.
 *
 * Source: the Unicode Unihan database's kMandarin field. Download and unzip it
 * by hand before running (~8 MB, not a dependency):
 *
 *   https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip
 *   UNIHAN_DATA=/path/to/unihan node scripts/buildCharacterPinyin.mjs
 *
 * kMandarin gives one reading per character — the commonest. Characters with
 * several (了 le/liǎo, 行 xíng/háng) therefore score against their usual one.
 * That only ever affects the *heard* side: the target word's own `pinyin` field
 * is authoritative and is what it's compared against.
 *
 * Output is two index-aligned strings rather than an object with 5,000 keys,
 * which is inlined into the JS bundle and parsed at startup either way.
 */
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR =
  process.env.UNIHAN_DATA ??
  join(ROOT, '.wordbank-data', 'unihan')
const OUT = join(ROOT, 'src', 'data', 'characterPinyin.json')

const HANZI = /[㐀-䶿一-鿿]/

function readMandarin() {
  const file = join(DATA_DIR, 'Unihan_Readings.txt')
  if (!existsSync(file)) {
    console.error(`Unihan_Readings.txt not found in ${DATA_DIR}`)
    console.error('Download https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip, unzip it,')
    console.error('and set UNIHAN_DATA to the folder containing it.')
    process.exit(1)
  }

  const readings = new Map()
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue
    const [codePoint, field, value] = line.split('\t')
    if (field !== 'kMandarin') continue
    readings.set(String.fromCodePoint(parseInt(codePoint.slice(2), 16)), value.split(' ')[0])
  }
  return readings
}

function collectCharacters() {
  const chars = new Set()

  const imported = JSON.parse(readFileSync(join(ROOT, 'src/data/importedWords.json'), 'utf8'))
  const words = Array.isArray(imported) ? imported : (imported.words ?? Object.values(imported)[0])
  for (const word of words) {
    for (const char of `${word.traditional ?? ''}${word.simplified ?? ''}`) {
      if (HANZI.test(char)) chars.add(char)
    }
    // Example sentences too: the reader and the dictionary both put them in
    // front of a learner, and a sentence is a plausible thing to read aloud.
    for (const char of word.example?.traditional ?? '') if (HANZI.test(char)) chars.add(char)
  }

  /*
   * The TypeScript data files, taken character by character rather than parsed.
   *
   * `stories.ts` is in here for a reason worth keeping: the reader shows a
   * reading under every word of a story, and story prose runs well outside the
   * word bank's vocabulary — folk tales and classical myths carry characters no
   * HSK list contains. Leaving it out left one story segment in sixty with a
   * blank line under it.
   */
  for (const file of ['src/data/hskFrequency.ts', 'src/data/radicals.ts', 'src/data/stories.ts']) {
    for (const char of readFileSync(join(ROOT, file), 'utf8')) if (HANZI.test(char)) chars.add(char)
  }

  return [...chars].sort()
}

function build() {
  const readings = readMandarin()
  const characters = collectCharacters()

  const chars = []
  const pinyin = []
  const missing = []

  for (const char of characters) {
    const reading = readings.get(char)
    if (!reading) {
      missing.push(char)
      continue
    }
    chars.push(char)
    pinyin.push(reading)
  }

  writeFileSync(OUT, JSON.stringify({ chars: chars.join(''), pinyin: pinyin.join(' ') }))

  const kb = (statSync(OUT).size / 1024).toFixed(0)
  console.log(`characters wanted : ${characters.length}`)
  console.log(`readings written  : ${chars.length}`)
  console.log(`no reading        : ${missing.length}`)
  if (missing.length > 0) console.log(`  ${missing.join(' ')}`)
  console.log(`written           : ${OUT} (${kb} KB)`)
}

build()
