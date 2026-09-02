/*
 * Every tunable the ad layer has, in one file.
 *
 * Nothing else in `lib/ads/` hard-codes a frequency, a delay or a policy — if a
 * number governs how often a learner meets an advert, it is here, so the answer
 * to "how aggressive are we being?" is one file rather than a grep.
 *
 * The defaults lean quiet on purpose. Chinese Easy is a study app: an advert
 * that interrupts a review session costs a habit, and a habit is worth more
 * than an impression.
 */

/** Placements a banner may appear in. A screen not listed here cannot host one. */
export type BannerPlacement = 'dashboard' | 'dictionary' | 'books' | 'challenges'

/** Natural stopping points an interstitial may follow. */
export type InterstitialTrigger = 'review-session-complete' | 'story-complete' | 'lesson-complete'

/**
 * Where interstitials are allowed to appear.
 *
 * Every entry is a moment the learner has *finished* something. There is
 * deliberately no trigger for starting a session, changing screen, opening the
 * app, or answering a question — see the prohibitions in `adPolicy` below.
 *
 * `lesson-complete` is wired but dormant: `FEATURES.lessons` is false, so the
 * screen that would fire it is unreachable today. It costs nothing to keep the
 * trigger honest and saves rediscovering this when the flag flips.
 */
export const INTERSTITIAL_TRIGGERS: Record<InterstitialTrigger, { enabled: boolean }> = {
  'review-session-complete': { enabled: true },
  'story-complete': { enabled: true },
  'lesson-complete': { enabled: false },
}

/**
 * Frequency caps. All three must pass before an interstitial is shown, and any
 * one of them refusing is a silent no — never a delayed advert that arrives on
 * the next screen.
 */
export const FREQUENCY = {
  /**
   * Completed sessions between interstitials. 2 means the learner finishes a
   * session, sees nothing, finishes another, sees nothing, and may see one on
   * the third.
   */
  minimumSessionsBetweenInterstitials: 2,

  /** Wall-clock minutes since the last interstitial, whatever the session count. */
  minimumMinutesBetweenInterstitials: 15,

  /** Hard ceiling per calendar day, counted on the dev clock (see `devClock`). */
  maximumInterstitialsPerDay: 3,

  /**
   * Sessions a brand-new install completes before it may see its first
   * interstitial. Someone still deciding whether this app is for them should
   * not meet an advert in their first sitting.
   */
  gracePeriodSessions: 3,
} as const

/**
 * Timings. Loading is lazy by design — nothing is fetched at startup, because a
 * cold launch is the moment the learner is most impatient and the least likely
 * to be about to finish a session.
 */
export const TIMING = {
  /** Delay after the app is interactive before the first interstitial preload. */
  interstitialPreloadDelayMs: 20_000,

  /** How long a cached, unshown interstitial stays fresh. Google's own limit is ~1h. */
  interstitialStaleAfterMs: 50 * 60 * 1000,

  /** Give up on a load rather than make the learner wait at a completion screen. */
  loadTimeoutMs: 10_000,
} as const

/**
 * Consent and audience configuration.
 *
 * ── A decision this file cannot make ─────────────────────────────────────────
 * `childDirectedTreatment` and `underAgeOfConsent` are legal/product calls, not
 * engineering ones, and they have real consequences in both directions:
 *
 *  - Tagging the app child-directed disables personalised advertising and
 *    remarketing entirely. That is the privacy-safe choice and it materially
 *    reduces revenue.
 *  - Not tagging it, when the app *is* in fact directed at children, is a COPPA
 *    and Google Play Families exposure.
 *
 * Relevant fact about this app as it stands: **it collects no date of birth.**
 * Onboarding is welcome → script → goal → account → profile → reminders →
 * placement test → ready, with no age step. So these cannot be decided per
 * learner today — whatever is set here applies to everybody. Adding an age gate
 * is the only way to make it per-user.
 *
 * `'unspecified'` is Google's own default and is what ships until somebody
 * decides. It is *not* a safe default in the legal sense; it is an undecided
 * one, and `assertConfigured()` below is here so it cannot reach a release
 * unnoticed.
 */
export const AUDIENCE = {
  /*
   * Decided 2026: Chinese Easy is intended for 13+ — teenagers and adults. It
   * is not designed or marketed as a children's app, so it is not tagged
   * child-directed and no under-13 age gate is collected. Revisit both of these
   * together if the product is ever aimed at children.
   */
  childDirectedTreatment: 'not-child-directed' as 'unspecified' | 'child-directed' | 'not-child-directed',

  /*
   * Paired with the above. Worth knowing rather than discovering later: the
   * GDPR age of consent is 16 in parts of the EEA, so a 13-15 year old there is
   * technically under it while being inside this app's stated audience. There
   * is no age signal collected to tell them apart, and the UMP consent flow is
   * what actually governs EEA personalisation. Flagged for counsel rather than
   * decided here; flipping this to 'under-age' would disable personalised ads
   * for everyone, which is the only per-user-less alternative.
   */
  underAgeOfConsent: 'of-age' as 'unspecified' | 'under-age' | 'of-age',

  /**
   * Ceiling on ad content. 'G' suits a learning app with a young audience and
   * costs little — the inventory excluded is largely gambling and adult content
   * nobody wants beside a Chinese lesson.
   */
  maxAdContentRating: 'G' as 'G' | 'PG' | 'T' | 'MA',
} as const

/**
 * Screens where an advert must never appear, kept as prose because it is a
 * product rule rather than a lookup — `BannerPlacement` above is what actually
 * enforces it in types.
 *
 * Banners are prohibited on: any active review drill (`ReviewSession`), lesson
 * exercises (`LessonPlayer`), stroke-order writing (`HanziStage`,
 * `WritingPracticeModal`, `WritingGuideModal`), the whole of onboarding
 * including the placement test, the subscribe screen, sign-in, the story reader
 * itself, New Words and Due Words.
 *
 * Three of those are additions beyond the obvious. The **Review hub** is
 * passive but sits one tap before study, and an advert there reads as a toll
 * gate on learning. **New Words** looks like a browse screen and is actually
 * the core learning loop. **Due Words** is a study queue, not a list.
 */
export const adPolicy = {
  /** The story *library* may host a banner; the story *reader* may not. */
  bannerAllowedOnReadingLibraryBrowse: true,
  bannerAllowedInStoryReader: false,
} as const

/**
 * Fails loudly in development if the audience decision is still outstanding.
 *
 * Called once from the ad manager. It deliberately does not throw in
 * production: shipping with 'unspecified' is Google's default behaviour and
 * breaking a released app over a policy flag would be worse than the flag.
 */
export function assertConfigured(): void {
  if (!__DEV__) return
  if (AUDIENCE.childDirectedTreatment === 'unspecified' || AUDIENCE.underAgeOfConsent === 'unspecified') {
    console.warn(
      '[ads] AUDIENCE.childDirectedTreatment / underAgeOfConsent are still "unspecified". ' +
        'This is a COPPA / GDPR decision that must be made before release — see adConfig.ts.',
    )
  }
}
