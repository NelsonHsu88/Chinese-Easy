/*
 * Picking a Mandarin locale out of whatever "Chinese" a device offers.
 *
 * Shared by the two places that talk to a platform speech engine — `speech.ts`
 * (text-to-speech) and `speechRecognition.ts` (recognition). Both hit the same
 * trap: asking for a language alone is not enough, because an engine with no
 * voice or model for the exact tag falls back to any "Chinese" it does have,
 * and on a lot of Android builds that is Cantonese. So the tag is resolved
 * explicitly rather than left to the engine.
 *
 * Pure logic, no platform APIs — the callers own the actual engine.
 */

/**
 * Mandarin tags, best match first.
 *
 * zh-CN leads because it is the tag engines most reliably map to Mandarin.
 * zh-TW is Mandarin too and matches the app's traditional script, so it is
 * preferred over the generic tags but is no longer trusted on its own.
 */
const MANDARIN_TAGS = ['zh-cn', 'zh-hans', 'cmn-hans', 'cmn', 'zh-tw', 'zh-hant-tw', 'zh-hant', 'zh']

/** Cantonese tags. These are "Chinese" but must never be selected. */
const CANTONESE_TAGS = ['yue', 'zh-hk', 'zh-hant-hk', 'zh-yue', 'zh-cantonese']

/** Tag passed when no specific Mandarin locale could be resolved. */
export const FALLBACK_LANGUAGE = 'zh-CN'

function normaliseTag(tag: string | undefined): string {
  return (tag ?? '').toLowerCase().replace(/_/g, '-')
}

function isCantonese(tag: string | undefined): boolean {
  const t = normaliseTag(tag)
  return CANTONESE_TAGS.some((c) => t.startsWith(c))
}

/** Lower is better; Infinity means "not a Mandarin tag we want". */
export function rankMandarinTag(tag: string | undefined): number {
  const t = normaliseTag(tag)
  if (!t || isCantonese(t)) return Infinity
  const i = MANDARIN_TAGS.findIndex((m) => t.startsWith(m))
  return i === -1 ? Infinity : i
}

/** The best Mandarin tag among `tags`, or null if none of them are Mandarin. */
export function bestMandarinTag(tags: (string | undefined)[]): string | null {
  const ranked = tags
    .map((tag) => ({ tag, score: rankMandarinTag(tag) }))
    .filter((entry): entry is { tag: string; score: number } => entry.score !== Infinity && !!entry.tag)
    .sort((a, b) => a.score - b.score)
  return ranked[0]?.tag ?? null
}
