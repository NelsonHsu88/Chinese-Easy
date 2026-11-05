/*
 * The Radicals screen's design system: the ivory-and-jade family (Dashboard,
 * My Words, Challenges), so it reads as the same app as the Dictionary that
 * opens it. Big left-aligned title over a corner painting, a pill search
 * field, cream tiles on a hairline — the Dictionary's own tiles.
 *
 * **This file is the only place a colour literal belongs.** Light-only.
 */

import { dashColors, playTints, playHueAt, refSurface, type PlayTint } from '../dashboard/tokens'
import { mwColors } from '../myWords/tokens'
import { PAGE_SUBTITLE, PAGE_TITLE } from '../pageHeader'

export const radColors = {
  background: dashColors.background,
  navy: dashColors.navy,
  slate: dashColors.textSecondary,
  muted: dashColors.textMuted,
  /** A tile: the Dictionary's warm paper under a hairline. */
  tile: refSurface.cream,
  tileBorder: refSurface.creamBorder,
  /** The search field, exactly as My Words draws it. */
  field: mwColors.field,
  fieldBorder: mwColors.fieldBorder,
  fieldFocus: dashColors.greenRing,
  placeholder: mwColors.placeholder,
  /** A section's rule, after its heading. */
  rule: dashColors.border,
} as const

/**
 * Each stroke count keeps one hue (by its number, so a search never recolours
 * a group); it tints only the heading's badge and the tiles' pinyin.
 */
export function strokeTint(strokeCount: number): PlayTint {
  return playTints[playHueAt(strokeCount - 1)]
}

export const radSpacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, screen: 20 } as const

export const radType = {
  title: PAGE_TITLE,
  subtitle: PAGE_SUBTITLE,
  search: { fontSize: 16, lineHeight: 20 },
  /** NunitoExtraBold, "2 strokes". */
  section: { fontSize: 19, lineHeight: 24 },
  /** NunitoBold, the count after it and the number in its badge. */
  count: { fontSize: 13, lineHeight: 17 },
  hanzi: { fontSize: 30, lineHeight: 38 },
  pinyin: { fontSize: 13, lineHeight: 17 },
  meaning: { fontSize: 12, lineHeight: 16 },
  note: { fontSize: 13.5, lineHeight: 19 },
} as const

export const radRadius = { tile: 18, pill: 999 } as const

/** Content column, as every full-screen layout caps it. */
export const RAD_CONTENT_MAX = 430
/** `dashboard/bonsai.png`, the Dictionary's Radicals tile art. */
export const RAD_BONSAI_RATIO = 290 / 197
/** `new-words/foot-scenery.png`, the bamboo and mist along the foot. */
export const RAD_FOOT_RATIO = 941 / 168
