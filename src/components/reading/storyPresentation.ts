import type { Story, StoryCollection } from '../../types'

/**
 * The library's shelves, in the order they appear. Everyday Life leads because
 * it's the graded set a beginner should start from; the rest follow the
 * reference layout.
 */
export const COLLECTIONS: { id: StoryCollection; title: string; tagline: string }[] = [
  { id: 'everyday', title: 'Everyday Life', tagline: 'Slices of ordinary days.' },
  { id: 'folk-tales', title: 'Folk Tales', tagline: 'Timeless tales from our culture.' },
  { id: 'chengyu', title: 'Chengyu Stories', tagline: 'Wisdom in four characters.' },
  { id: 'festival-legends', title: 'Festival Legends', tagline: 'Celebrate traditions and joy.' },
  { id: 'classical-myths', title: 'Classical Myths', tagline: 'Stories of heroes and seekers.' },
]

/*
 * Presentation helpers shared by the Reading Library and the Story Reader, kept
 * out of both screens so a story is described identically in the list and in the
 * reader header.
 */

/** One of the four muted colour families the reading UI draws story accents from. */
export interface StoryPalette {
  /** Badge / wash background. */
  soft: string
  /** Badge label and any ink drawn on `soft`. */
  strong: string
  /** Second wash stop, for the fallback art tile's gradient. */
  wash: string
}

const PALETTES: StoryPalette[] = [
  { soft: '#d9f2e0', strong: '#2e7d5b', wash: '#eaf7ef' },
  { soft: '#fde4e1', strong: '#b94b42', wash: '#fceae5' },
  { soft: '#fbebcf', strong: '#9c681b', wash: '#fdf4e4' },
  { soft: '#dfeff8', strong: '#47728d', wash: '#eef6fb' },
]

/**
 * Picks a story's colour family from its id rather than its HSK level. The
 * reference mockup gives neighbouring cards different accents regardless of
 * level — the variety is what stops a long list reading as a spreadsheet — and
 * hashing the id keeps each story's colour stable as filters change, which
 * indexing into the filtered list would not.
 */
export function paletteFor(story: Story): StoryPalette {
  let hash = 0
  for (let i = 0; i < story.id.length; i++) hash = (hash * 31 + story.id.charCodeAt(i)) >>> 0
  return PALETTES[hash % PALETTES.length]
}

export function formatCount(n: number): string {
  return n.toLocaleString('en-US')
}

/**
 * Percentage of a story read, from the furthest page reached. An unopened story
 * is 0; reaching the last page is 100.
 */
export function progressPercent(story: Story, furthestPageIndex: number | undefined): number {
  if (furthestPageIndex === undefined || story.pages.length === 0) return 0
  return Math.round(((furthestPageIndex + 1) / story.pages.length) * 100)
}
