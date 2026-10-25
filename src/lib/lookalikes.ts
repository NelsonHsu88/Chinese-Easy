import LOOKALIKES from '../data/lookalikes.json'
import { displayWord } from './hanzi'
import type { ScriptMode, VocabWord } from '../types'

/*
 * Characters that look like a given one — 大 → 太 犬 丈 天 — for the
 * "Related characters" lists. Computed offline from stroke shapes by
 * scripts/buildLookalikes.mjs, most similar first, both scripts mixed.
 *
 * Only characters the learner can open as a word in their own script are
 * offered: that keeps traditional-only forms away from a simplified learner,
 * and guarantees every row has a reading and a meaning to show.
 */

let index: Map<string, string[]> | null = null

function lookalikeIndex(): Map<string, string[]> {
  if (index) return index
  index = new Map()
  const chars = [...LOOKALIKES.chars]
  const lists = LOOKALIKES.lists.split('|')
  for (let i = 0; i < chars.length; i++) if (lists[i]) index.set(chars[i], [...lists[i]])
  return index
}

const entryCache = new WeakMap<VocabWord[], Partial<Record<ScriptMode, Map<string, VocabWord>>>>()

/** Single-character entries keyed by their form in `script`; commonest first wins. */
export function characterEntries(bank: VocabWord[], script: ScriptMode): Map<string, VocabWord> {
  let byScript = entryCache.get(bank)
  if (!byScript) entryCache.set(bank, (byScript = {}))
  let map = byScript[script]
  if (!map) {
    map = new Map()
    for (const word of bank) {
      const form = displayWord(word, script)
      if ([...form].length === 1 && !map.has(form)) map.set(form, word)
    }
    byScript[script] = map
  }
  return map
}

/** Up to `limit` look-alikes of `character`, in the learner's script. */
export function lookalikesFor(character: string, bank: VocabWord[], script: ScriptMode, limit = 8): string[] {
  const entries = characterEntries(bank, script)
  return (lookalikeIndex().get(character) ?? []).filter((c) => c !== character && entries.has(c)).slice(0, limit)
}
