import LOOKUP from './lookupWords.json'
import { foldPinyin } from '../lib/hanzi'
import type { VocabWord } from '../types'

/*
 * Tier 2 — the reference tail of the dictionary.
 *
 * ~81,000 CC-CEDICT forms that have no frequency data: chemical and medical
 * terms, place names, institutions, classical idioms, and a long tail of
 * genuinely useful rarer vocabulary mixed in with them. Built by
 * scripts/buildWordBank.mjs alongside the learning bank.
 *
 * These are deliberately NOT part of `hskFrequency`. Everything downstream of
 * that array treats its members as vocabulary a learner is being taught — the
 * SRS pool, the category browser, the HSK filters, the stroke-data bundle — and
 * none of that is true here. What tier 2 offers is exactly one thing: if you
 * search for it, you will find it. See `searchWords` in lib/dictionary.ts for
 * how the two tiers are ordered against each other.
 *
 * ── Why the data is one packed string ────────────────────────────────────────
 * Metro inlines JSON into the bundle and parses it at startup, so an array of
 * 81k records would cost ~320k string allocations before the first frame. One
 * string costs one. Records are split out lazily on the first search that
 * actually reaches this far, which in most sessions never happens.
 */

/**
 * `hskLevel` for a tier-2 entry: one past HSK 6, meaning "not ranked".
 *
 * A number is required by `VocabWord`, and every honest choice is a lie of some
 * kind — 中央宣傳部 is not HSK 6 vocabulary, and calling it HSK 1 would be
 * worse. The sentinel keeps the search ladder's level tiebreak working (these
 * sort below every real entry, which is exactly right) while giving the UI
 * something it can test against to avoid printing a level badge that would be
 * made up. See `isLookupWord`.
 */
export const LOOKUP_HSK_LEVEL = 7

/** Ids carry their own prefix so a tier-2 word is recognisable wherever it lands. */
const ID_PREFIX = 'lk-'

export function isLookupWord(word: VocabWord): boolean {
  return word.id.startsWith(ID_PREFIX)
}

/*
 * Raw records, and a tone-folded lowercase copy for matching, index-aligned.
 *
 * The folding is done on the whole packed string in one pass rather than per
 * record. `foldPinyin` is a Unicode normalise plus a regex — the single largest
 * cost in a search, and the reason tier 1 caches it per entry in a WeakMap — so
 * running it 81,000 times per keystroke is not an option. Running it once on
 * 4.5 MB is one native call, and splitting the *result* on newlines yields rows
 * that line up with the raw ones, because NFD leaves newlines alone.
 */
let rawRows: string[] | null = null
let foldedRows: string[] | null = null

function ensureRows(): void {
  if (rawRows) return
  rawRows = LOOKUP.packed.split('\n')
  foldedRows = foldPinyin(LOOKUP.packed).split('\n')
}

/**
 * Builds the row index up front, off the keystroke path.
 *
 * Worth calling when the Dictionary screen mounts: the work is a fixed ~100ms
 * of string processing, and paying it while the learner is still reading the
 * page is invisible, where paying it on the keystroke that first needs a rare
 * word is a visible stall in the middle of typing.
 */
export function warmLookup(): void {
  ensureRows()
}

/** A tier-2 record as the rest of the app expects to receive a word. */
function materialise(row: string): VocabWord {
  const [traditional, simplified, pinyin, definition] = row.split('|')
  // The simplified field is left empty at build time where it matches the
  // traditional form, which is true of about a third of the tail.
  const simp = simplified || traditional
  return {
    id: `${ID_PREFIX}${simp}`,
    simplified: simp,
    traditional,
    pinyin,
    definition,
    hskLevel: LOOKUP_HSK_LEVEL,
    // Never browsed by category — tier 2 is reachable by search alone — so this
    // is a required field with nothing meaningful to put in it.
    category: 'daily',
  }
}

/**
 * Whether the query starts one of the row's four fields rather than landing
 * somewhere in the middle of one.
 *
 * A row is `trad|simp|pinyin|gloss`, so "begins a field" is the start of the row
 * or the character after a separator. It is a coarse stand-in for the real
 * ladder in `relevance` — "latte" begins 拿鐵's gloss and merely appears inside
 * 佞's "flattery" — and it exists to decide *which* rows are worth scoring
 * properly, not what order they end up in.
 */
function beginsField(row: string, term: string): boolean {
  return row.startsWith(term) || row.includes(`|${term}`)
}

/**
 * Candidate rows for a query, as a coarse pre-filter.
 *
 * Substring containment only: it decides what is worth materialising and
 * scoring, not what ranks where. `searchWords` re-scores every survivor with the
 * same ladder it uses for tier 1, so this only has to be permissive and fast.
 * The raw row is tested for Han characters (which folding leaves alone but which
 * the caller types unfolded) and the folded row for everything else.
 *
 * **Capped, and the cap is why the two buckets exist.** A broad query matches
 * thousands of rows down here, and materialising them all — then folding pinyin
 * and splitting senses for each in `rank` — is far too much work for results
 * that appear below a full page of tier-1 answers. But cutting off at a fixed
 * count in row order means cutting off *alphabetically*, which for "acid" would
 * return whichever chemistry terms happen to start with 阿. Collecting
 * boundary matches separately and preferring them keeps the entry a learner
 * actually meant inside the cap even when several thousand rows mention it.
 */
export function lookupCandidates(raw: string, folded: string, limit: number): VocabWord[] {
  ensureRows()
  const rows = rawRows as string[]
  const folds = foldedRows as string[]

  const strong: string[] = []
  const weak: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const rawHit = rows[i].includes(raw)
    const foldHit = folds[i].includes(folded)
    if (!rawHit && !foldHit) continue

    if ((rawHit && beginsField(rows[i], raw)) || (foldHit && beginsField(folds[i], folded))) {
      strong.push(rows[i])
      if (strong.length >= limit) break
    } else if (weak.length < limit) {
      weak.push(rows[i])
    }
  }

  return [...strong, ...weak].slice(0, limit).map(materialise)
}

/**
 * One tier-2 entry by id, for a word that has been added to the deck.
 *
 * `wordById` in hskFrequency.ts falls through to this. Without it, adding a
 * rare word to My Words would produce a card whose word cannot be resolved —
 * and AppContext drops unresolvable cards on hydrate, so it would silently
 * vanish on the next launch.
 */
export function lookupWordById(id: string): VocabWord | undefined {
  if (!id.startsWith(ID_PREFIX)) return undefined
  ensureRows()
  const form = id.slice(ID_PREFIX.length)
  const rows = rawRows as string[]
  for (const row of rows) {
    const [traditional, simplified] = row.split('|')
    if ((simplified || traditional) === form) return materialise(row)
  }
  return undefined
}
