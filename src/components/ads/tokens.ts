import { dashColors, dashRadius, dashShadow } from '../dashboard/tokens'

/*
 * How an advert sits in Chinese Easy's layout.
 *
 * The creative belongs to the ad network and is not ours to restyle — what is
 * ours is the slot around it, and the job of that slot is to look like a
 * deliberate part of the page rather than something pasted over it. So it
 * borrows the Dashboard's own card language: warm ivory fill, the same hairline
 * border, the same corner radius, the same faint shadow.
 *
 * Values are spread from `dashboard/tokens.ts` rather than copied, because the
 * ivory-and-jade palette is one room and a second set of nearly-identical
 * creams is exactly how a design drifts. Same reason `settings/tokens.ts` and
 * `review/tokens.ts` extend it.
 */

/**
 * The app's three visual languages, as the ad slot needs to know them.
 *
 * This mirrors `ReadingSentence`'s `tone` prop, and exists for the same reason:
 * the ivory-and-jade family (Dashboard, Dictionary, Settings, Review), the
 * cream reading palette (Books, Story Reader) and the Challenges palette are
 * deliberately different, and CLAUDE.md is blunt that they must not be mixed.
 * A slot painted in Dashboard ivory on a Books page reads as a component from
 * another app — which, for an advert, is precisely the wrong impression.
 *
 * The fills are nearly identical across the three; it is the **borders** and
 * the muted text that actually diverge (#E8E5DE cool, #e9e4da warm, #ece7dd
 * warmer still), and those are the edges the eye picks up on a card.
 *
 * Callers never choose a tone — it is derived from the placement, so a screen
 * still says only where the advert goes.
 */
export type AdTone = 'ivory' | 'paper' | 'challenges'

export const adTones: Record<AdTone, { surface: string; border: string; label: string }> = {
  /** Dashboard, Dictionary — the ivory-and-jade family. */
  ivory: {
    surface: dashColors.card,
    border: dashColors.border,
    label: dashColors.textMuted,
  },
  /** Books — the reading system's cream paper. Values from the `read-*` scale. */
  paper: {
    surface: '#fffdf8',
    border: '#e9e4da',
    label: '#8a8a99',
  },
  /** Challenges — greyer greens and warmer lines. Values from `challenges/tokens.ts`. */
  challenges: {
    surface: '#fffdfc',
    border: '#ece7dd',
    label: '#b4c0b9',
  },
}

export const adSlot = {
  radius: dashRadius.card,
  /** Padding around the creative, so it never touches the border. */
  padding: 8,
  /** Gap between the slot and whatever sits above it. */
  marginTop: 20,
  /**
   * Height reserved while a banner is loading.
   *
   * An anchored adaptive banner is 50-62dp on phones; 60 covers the common
   * cases without leaving a visible gap under the shorter ones, and the slot
   * grows to the real height once `onAdLoaded` reports it. Reserving *something*
   * is what stops the page reflowing the instant an advert arrives.
   */
  reservedHeight: 60,
  /** Height of the little "Ad" caption row above the creative. */
  labelHeight: 14,
} as const

export const adShadow = dashShadow
