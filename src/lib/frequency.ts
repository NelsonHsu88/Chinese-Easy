import importedWordsJson from '../data/importedWords.json'
import type { VocabWord } from '../types'

/*
 * How common a word is, read off the order of the tier-1 bank: `importedWords`
 * is frequency-ranked, most common first. Curated entries carry their own ids,
 * so the rank is matched by written form, not id.
 */

let ranks: Map<string, number> | null = null

function build(): Map<string, number> {
  const map = new Map<string, number>()
  const list = importedWordsJson as { simplified: string; traditional: string }[]
  list.forEach((w, i) => {
    if (!map.has(w.traditional)) map.set(w.traditional, i + 1)
    if (!map.has(w.simplified)) map.set(w.simplified, i + 1)
  })
  return map
}

/** 1 = most common; null when the word isn't in the ranked bank. */
export function frequencyRank(word: VocabWord): number | null {
  ranks ??= build()
  return ranks.get(word.traditional) ?? ranks.get(word.simplified) ?? null
}

export function frequencyLabel(rank: number): string {
  if (rank <= 1000) return 'Very common'
  if (rank <= 5000) return 'Common'
  if (rank <= 12000) return 'Less common'
  return 'Uncommon'
}

/**
 * How common a word is, as a coarse band: 1 (about the 750 commonest) to 6, and 7
 * for a word with no rank. The same bands the bank's levels used to be, before
 * they became the HSK syllabus's — search ranks by these, since a learner
 * typing "cake" means the commonest word for it, whatever its HSK level.
 */
export function commonnessBand(word: VocabWord): number {
  const rank = frequencyRank(word)
  if (rank === null) return 7
  /* Where each old band began in bank order — the build's ranks ran a little
     ahead of the bank's positions, so these sit a little past 750/1600/…. */
  if (rank <= 763) return 1
  if (rank <= 1630) return 2
  if (rank <= 3055) return 3
  if (rank <= 6088) return 4
  if (rank <= 11054) return 5
  return 6
}
