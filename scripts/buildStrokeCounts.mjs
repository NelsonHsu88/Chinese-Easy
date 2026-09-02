/*
 * Generates src/data/strokeCounts.json — character → number of strokes.
 *
 * Why this exists at all: `strokeCountFor` in lib/dictionary.ts wants one
 * integer per character, and used to get it by reading `strokes.length` off the
 * full stroke dataset. That meant importing hanziData.json — 15.8MB of source
 * that compiles to 25.8MB of Hermes bytecode, 59% of the whole JS bundle — so
 * that the word detail screen could print "8 strokes". This file is the same
 * answer at ~30KB, and it is what lets the stroke data itself leave the bundle.
 *
 * Reads only committed files, so unlike most of the art scripts it always runs
 * on a fresh clone. Idempotent. Re-run it after buildHanziData.mjs, which is the
 * only thing that changes its input.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const SOURCE = resolve(here, '../src/assets/hanziData.json')
const OUT = resolve(here, '../src/data/strokeCounts.json')

const data = JSON.parse(readFileSync(SOURCE, 'utf8'))

/** @type {Record<string, number>} */
const counts = {}
let skipped = 0

for (const [character, record] of Object.entries(data)) {
  const strokes = record?.strokes
  if (!Array.isArray(strokes) || strokes.length === 0) {
    // A character with no usable stroke list has no honest count to give. The
    // consumer's contract is `number | null`, and an absent key reads as null —
    // which is the same answer it gave before, so nothing downstream changes.
    skipped += 1
    continue
  }
  counts[character] = strokes.length
}

// Sorted by codepoint so the file is stable across runs and diffs usefully.
const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b, 'en')))

writeFileSync(OUT, JSON.stringify(sorted), 'utf8')

const bytes = readFileSync(OUT).length
console.log(`strokeCounts.json: ${Object.keys(sorted).length} characters, ${(bytes / 1024).toFixed(1)} KB`)
if (skipped) console.log(`  skipped ${skipped} character(s) with no stroke list`)
