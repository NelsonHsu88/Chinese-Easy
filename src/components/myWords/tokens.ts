/*
 * The My Words screen's design system, built to the Beta 2.1 reference
 * (`SS928 Mywords Redesigned Screen.png`).
 *
 * My Words is reached from the Review hub and is the same room: Lora Bold
 * title, hairline-bordered cards, jade for the one action, watercolour in two
 * corners and nowhere else. So the palette is Review's, spread in, and only
 * what this screen adds is declared here.
 *
 * It adds favourites — the star on a New Words card and in the word sheet —
 * which get a filter chip, a count in the stats panel and a gold tag on the
 * card, exactly where the reference draws them.
 *
 * **This file is the only place a colour literal belongs.** Light-only, like
 * the rest of this family.
 */

import { playTints, type PlayTint } from '../dashboard/tokens'
import { revColors, revShadow } from '../review/tokens'
import type { Proficiency } from '../../lib/proficiency'
import { PAGE_SUBTITLE, PAGE_TITLE } from '../pageHeader'

export const mwColors = {
  ...revColors,

  /**
   * The page. Sampled from the reference, and the colour both paintings were
   * keyed against (`processMyWordsArt.mjs`) — change it and they grow a halo.
   */
  background: '#FFFFFF',
  /** The same, fully transparent — the top of the fade behind Start Review. */
  backgroundClear: 'rgba(255,255,255,0)',
  /** Text and icons on the jade chip. */
  onJade: '#FFFFFF',

  /** The search field and the neutral chips. */
  field: '#FDFCF9',
  fieldBorder: '#E2DFD8',
  placeholder: '#8B93A3',

  /** The filter panel under the HSK chip, and its section headings. */
  sheet: '#FFFFFF',
  sheetHeading: '#6B7486',

  /** The stats panel: the faintest wash of the jade, as drawn. */
  panel: '#F4F8F2',
  panelBorder: '#DCE7D9',

  /** A word card: white on the cream page, under a warm hairline. */
  wordCard: '#FFFFFF',
  wordCardBorder: '#E6E2DA',

  /** "Due today" — the reference's soft coral. */
  due: '#FBE7E3',
  dueInk: '#B04A3C',

  /** Favourites: the star, and the "Favorite" tag's cream. */
  star: '#E3A93A',
  favorite: '#FCF1D2',
  favoriteInk: '#8A6316',

  /** The stats panel's three icons. */
  savedIcon: '#4E9A64',
  dueIcon: '#D9826F',
} as const

/**
 * The HSK pill, tinted per level. The reference draws HSK 1 mint and HSK 2 grey;
 * the other four continue in the same quiet register so a level reads at a
 * glance down the list without any one of them shouting.
 */
export const mwHsk: Record<number, { bg: string; ink: string }> = {
  1: { bg: '#E3F1E3', ink: '#2F6B43' },
  2: { bg: '#ECEEF2', ink: '#4A5468' },
  3: { bg: '#E3EEF6', ink: '#35607F' },
  4: { bg: '#EEE8F5', ink: '#5E4A80' },
  5: { bg: '#F8EADF', ink: '#8A5430' },
  6: { bg: '#F6E4E8', ink: '#8C3F52' },
}
/** Custom words and the unranked lookup tail. */
export const mwHskOther = { bg: '#ECEEF2', ink: '#4A5468' }

/**
 * A card's learning-stage tag, in the slot the reference gives "Due today":
 * a breath of red for new, gold for still learning, green for proficient.
 */
export const mwTiers: Record<Proficiency, { label: string; bg: string; ink: string }> = {
  new: { label: 'New', bg: '#F8DFDA', ink: '#A5453A' },
  learning: { label: 'Still learning', bg: '#F6E8BF', ink: '#8A6316' },
  proficient: { label: 'Proficient', bg: '#DAECD7', ink: '#2F6B43' },
}

/** Each row's wash follows its proficiency, matching its tier tag (SS1017). */
export const mwRowTint: Record<Proficiency, PlayTint> = {
  new: playTints.blossom,
  learning: playTints.honey,
  proficient: playTints.jade,
}

export const mwSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  screen: 20,
} as const

/** Sizes and line heights; weight is the font family. */
export const mwType = {
  /** Lora Bold. */
  /*
   * The line height leaves room for Lora's descenders: at 52 the tail of the
   * "y" in "My" ran into the subtitle beneath it.
   */
  title: PAGE_TITLE,
  /** Nunito Regular. */
  subtitle: PAGE_SUBTITLE,
  search: { fontSize: 16, lineHeight: 20 },
  chip: { fontSize: 14.5, lineHeight: 19 },
  /** Lora Bold, a stat's number. */
  statValue: { fontSize: 26, lineHeight: 31 },
  /** Nunito Regular, under it. */
  statLabel: { fontSize: 14, lineHeight: 18 },
  /** Nunito Regular — the pinyin and the gloss. */
  reading: { fontSize: 16.5, lineHeight: 21 },
  gloss: { fontSize: 16, lineHeight: 21 },
  /** Nunito SemiBold, inside a tag. */
  tag: { fontSize: 12, lineHeight: 16 },
  /** Nunito Bold, a filter panel section heading. */
  sheetHeading: { fontSize: 12.5, lineHeight: 16, letterSpacing: 0.6 },
  empty: { fontSize: 15, lineHeight: 21 },
} as const

export const mwRadius = {
  card: 20,
  panel: 22,
  pill: 999,
} as const

export const mwCard = {
  /** The hanzi column. A word's size is fitted to it — see `WordRow`. */
  hanziWidth: 80,
  hanziMax: 36,
  minHeight: 78,
  /** The tag column, so every card's tags start on the same line. Fits "Still learning". */
  tagWidth: 96,
} as const

/** The two paintings' trimmed sizes. */
export const MW_BAMBOO_RATIO = 381 / 340
export const MW_BLOSSOM_RATIO = 226 / 232

export const mwShadow = revShadow

/** The design viewport. Wider windows centre the column rather than stretch it. */
export const MW_CONTENT_MAX = 430
