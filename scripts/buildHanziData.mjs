/*
 * Regenerates src/assets/hanziData.json — the bundled character → stroke/median
 * dataset that HanziStage draws from.
 *
 * Replaces the old mergeHanziData.mjs, which read from a since-deleted
 * public/hanzi-data/ directory and so couldn't be re-run. This one sources from
 * the `hanzi-writer-data` package (a devDependency), so it is repeatable: run it
 * again whenever the word bank grows.
 *
 *   node scripts/buildHanziData.mjs
 *
 * Why bundle rather than fetch: HanziStage falls back to the hanzi-writer CDN
 * for anything not bundled, which means stroke order silently fails with no
 * network. Every character a learner can reach from the dictionary should be
 * available offline, so the set below is "every character in the word bank",
 * not a hand-picked subset.
 */
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = join(ROOT, 'node_modules', 'hanzi-writer-data')
const OUT = join(ROOT, 'src', 'assets', 'hanziData.json')

const HANZI = /[㐀-䶿一-鿿]/

/** Every character the app can put in front of a learner as a glyph to write. */
function collectCharacters() {
  const chars = new Set()

  /*
   * Tier 1 only, and word forms only.
   *
   * Example sentences are never drawn stroke by stroke, so their characters
   * would be dead weight — and tier 2 (src/data/lookupWords.json, ~81k rare
   * forms) is deliberately excluded for the same reason at a much larger scale.
   * Bundling stroke data for every character CC-CEDICT knows would want ~11,700
   * glyphs against tier 1's ~3,900, taking this file from ~15 MB to ~29 MB — and
   * 4,500 of those characters have no data in hanzi-writer-data at all. Tier 2
   * is a reference tail you look words up in, not vocabulary you practise
   * writing; if a learner wants to write one, they can add it to My Words, and
   * HanziStage's CDN fallback covers it.
   *
   * BOTH scripts, unlike earlier versions of this script: `settings.script` is
   * a real preference again, so a simplified learner must be able to practise
   * 学 and not be shown 學. That is ~1,200 extra characters and ~3 MB.
   */
  const imported = JSON.parse(readFileSync(join(ROOT, 'src/data/importedWords.json'), 'utf8'))
  const words = Array.isArray(imported) ? imported : (imported.words ?? Object.values(imported)[0])
  for (const word of words) {
    for (const ch of word.traditional ?? '') if (HANZI.test(ch)) chars.add(ch)
    for (const ch of word.simplified ?? '') if (HANZI.test(ch)) chars.add(ch)
  }

  /*
   * The curated word list and the radicals are TypeScript sources, so rather
   * than parse them, every Han character in the file is taken. That
   * over-collects slightly (it picks up example sentences too) but the cost is a
   * handful of extra entries, and the alternative is a brittle regex over
   * object literals that breaks the first time the shape changes.
   */
  for (const file of ['src/data/hskFrequency.ts', 'src/data/radicals.ts']) {
    for (const ch of readFileSync(join(ROOT, file), 'utf8')) if (HANZI.test(ch)) chars.add(ch)
  }

  return [...chars].sort()
}

function build() {
  if (!existsSync(DATA_DIR)) {
    console.error('hanzi-writer-data is not installed. Run: npm install --save-dev hanzi-writer-data')
    process.exit(1)
  }

  const characters = collectCharacters()
  const out = {}
  const missing = []

  for (const ch of characters) {
    const file = join(DATA_DIR, `${ch}.json`)
    if (!existsSync(file)) {
      missing.push(ch)
      continue
    }
    const { strokes, medians } = JSON.parse(readFileSync(file, 'utf8'))
    // Only the two fields hanzi-writer actually needs. The upstream files carry
    // no more than this today, but pinning the shape keeps an upstream addition
    // from quietly inflating the bundle.
    out[ch] = { strokes, medians }
  }

  writeFileSync(OUT, JSON.stringify(out))

  const mb = (statSync(OUT).size / 1048576).toFixed(1)
  console.log(`characters wanted : ${characters.length}`)
  console.log(`characters written: ${Object.keys(out).length}`)
  console.log(`no data available : ${missing.length}`)
  if (missing.length > 0) console.log(`  ${missing.join(' ')}`)
  console.log(`written           : ${OUT} (${mb} MB)`)
}

build()
