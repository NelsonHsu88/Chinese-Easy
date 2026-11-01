/*
 * Sets every word bank entry's `hskLevel` from the official HSK 3.0 syllabus.
 *
 *   node scripts/applyHskLevels.mjs
 *
 * Source: scripts/data/hsk30Levels.json — simplified form → level, 1–6, with 7
 * for the 7–9 band. Extracted from the MIT-licensed complete-hsk-vocabulary
 * dataset (github.com/drkameleon/complete-hsk-vocabulary, wordlists/exclusive/new).
 *
 * - On the syllabus: its official level (7 = HSK 7–9), and `hskOfficial: true`.
 * - Not on it (你好, names, rarer compounds): an estimate, never easier than
 *   either its frequency band or its hardest character. A character's level is
 *   the easiest syllabus word it appears in (示 → 显示, 提示…); one in none
 *   counts as 7. Capped at 7 (shown as "Rare").
 *
 * Rewrites src/data/importedWords.json in place (the bank stays in frequency
 * order, so an entry's index is its frequency rank). Only levels change: the
 * bank's composition doesn't, so repairExampleSenses.mjs needn't re-run.
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..')
const LEVELS = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/hsk30Levels.json'), 'utf8'))
const BANK = path.join(ROOT, 'src/data/importedWords.json')

/** The frequency band the bank used before (see buildWordBank.mjs). */
function levelForRank(rank) {
  if (rank < 750) return 1
  if (rank < 1600) return 2
  if (rank < 3000) return 3
  if (rank < 6000) return 4
  if (rank < 11000) return 5
  return 6
}

const TOP = 7
/** Each character's easiest syllabus word. */
const firstSeen = {}
for (const [form, level] of Object.entries(LEVELS)) {
  for (const ch of form) firstSeen[ch] = Math.min(firstSeen[ch] ?? TOP, level)
}
const charLevel = (ch) => firstSeen[ch] ?? TOP

const bank = JSON.parse(fs.readFileSync(BANK, 'utf8'))
const counts = {}
bank.forEach((word, rank) => {
  const official = LEVELS[word.simplified]
  if (official) {
    word.hskLevel = official
    word.hskOfficial = true
  } else {
    const hardestChar = Math.max(...[...word.simplified].map(charLevel))
    word.hskLevel = Math.min(TOP, Math.max(levelForRank(rank), hardestChar))
    delete word.hskOfficial
  }
  const key = `${word.hskLevel}${official ? '' : '~'}`
  counts[key] = (counts[key] ?? 0) + 1
})
fs.writeFileSync(BANK, JSON.stringify(bank))
console.log('levels (~ = estimated):', counts)
