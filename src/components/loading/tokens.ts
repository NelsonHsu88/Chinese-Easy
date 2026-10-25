/*
 * The learning loader's palette and type. Its own small language, between the
 * Review screens (Lora + Nunito, jade) and the painting it shows.
 */
import { SHIFU_LOOP } from './loop'

export const loadColors = {
  /** The painting's edges fade into exactly this (see loop.ts) — keep them equal. */
  page: SHIFU_LOOP.page,
  /** `page` at zero alpha: the fade under the words runs ivory-to-ivory, not through grey. */
  pageClear: 'rgba(250,249,246,0)',
  ink: '#1C263D',
  muted: '#748095',
  jade: '#5D906E',
  jadePressed: '#4C7A5B',
  onJade: '#FFFFFF',
  outline: '#C9CDD6',
  /** The quiet button's fill while pressed. */
  quietPressed: '#F1F0EC',
} as const

export const loadType = {
  /** Lora — the message under Shifu. */
  message: { fontFamily: 'NunitoSemiBold', fontSize: 17, lineHeight: 24 },
  /** Nunito SemiBold — the line under an error. */
  detail: { fontFamily: 'NunitoSemiBold', fontSize: 14, lineHeight: 20 },
  /** Lora Bold — buttons. */
  button: { fontFamily: 'NunitoExtraBold', fontSize: 16, lineHeight: 21 },
} as const

export const loadTiming = {
  /** Shown at least this long, however fast the activity is ready. */
  minDurationMs: 2000,
  /** Past this with no answer from the activity, offer a retry. */
  timeoutMs: 20000,
  /** After this long, the message softens to "Almost ready…". */
  slowMs: 5000,
  /** Shifu and the message easing in. */
  enterMs: 220,
  /** The loader fading off the prepared activity. */
  exitMs: 280,
  /** Longest we will wait for the brush to finish a stroke before leaving. */
  strokeGraceMs: 450,
} as const
