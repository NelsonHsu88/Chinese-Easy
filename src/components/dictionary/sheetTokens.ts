/*
 * Colours for the "Explore" sheet on the dictionary detail pages, built to the
 * SS1021 Writing Cards reference: white cards on a warm paper sheet, each card
 * headed by a soft round badge in its own colour.
 */

export const sheetColors = {
  /** The sheet itself, behind the cards. */
  paper: '#F7F5F0',
  card: '#FFFFFF',
  cardBorder: '#EFEAE0',
  line: '#EEE9DF',
  heading: '#18263A',
  body: '#42526B',
  muted: '#8290A6',
  green: '#4AA54B',
  greenDark: '#3E9845',
  greenPale: '#EAF5E8',
  /** The "View all" pill and Start practice button. */
  greenWash: '#EDF5EA',
  /** The raised "View all" pill's shoulder, a step under its wash. */
  greenWashShoulder: '#CFE3C9',
  /** Watch stroke order. */
  greenButton: '#5C9A55',
  pill: '#EFECE5',
  handle: '#D9D1C2',
  /** Stroke tiles: strokes not yet written, and the newest one. */
  strokeGhost: '#E6E2DA',
  strokeDone: '#18263A',
  strokeNew: '#4AA54B',
} as const

/** Each card's badge: background, icon. */
export const sheetBadges = {
  meaning: { bg: '#F6A27A', icon: '#FFFFFF' },
  example: { bg: '#E4E9F1', icon: '#8C9DB8' },
  characters: { bg: '#E7EEF0', icon: '#3F5A62' },
  words: { bg: '#E6F1E2', icon: '#4AA54B' },
  related: { bg: '#FBE3D3', icon: '#E58A5C' },
  info: { bg: '#E9E3F7', icon: '#8C78C8' },
  stroke: { bg: '#DDEBFA', icon: '#5B8FD0' },
  practice: { bg: '#E9E3F7', icon: '#6F5BB5' },
} as const

export type SheetBadge = keyof typeof sheetBadges

export const sheetCardShadow = {
  shadowColor: '#18263A',
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 8,
  shadowOpacity: 0.04,
  elevation: 1,
} as const
