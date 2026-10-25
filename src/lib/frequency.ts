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
