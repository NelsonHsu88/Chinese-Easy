import { FEATURES } from './features'
import type { TourShifu, TourTargetId } from './tour'

/*
 * Shifu's screen guides, as data — a short walk round one tab, shown the first
 * time the learner opens it.
 *
 * The guided tour (`lib/tour.ts`) teaches the one loop the app is built round
 * and deliberately stops there. These are its companions for the three tabs it
 * does not visit: Learn, Dictionary (and its word card), Settings and the Review hub. Each is a few `nextButton`
 * steps — reading, not doing — drawn by `ScreenTourOverlay` with the tour's own
 * spotlight and card, so the two read as one voice.
 *
 * Rules carried over from the tour:
 *
 * - **Once per screen, per device.** Seeing a guide through or skipping it both
 *   mark it seen. Settings → General → "Replay the app tour" clears them.
 * - **Never shown over the tour itself**, nor before onboarding has finished.
 * - **A step whose target is not on screen is passed over**, not shown as a card
 *   describing something the learner cannot see (the Dictionary's word to
 *   discover on a day there is none, its Explore grid while a search is open).
 */

export type ScreenTourId = 'learn' | 'dictionary' | 'word' | 'settings' | 'review'

export interface ScreenTourStep {
  targetId: TourTargetId
  title: string
  body: string
  /** The small Shifu beside the copy. Every card carries one. */
  shifu: TourShifu
}

export interface ScreenTour {
  id: ScreenTourId
  /** The pathname the guide belongs to, as `usePathname()` reports it. */
  pathname: string
  /**
   * Also matches anything under these prefixes — for a screen whose path
   * carries an id, like a dictionary card (`/dictionary-tab/word/…`).
   */
  prefixes?: readonly string[]
  steps: readonly ScreenTourStep[]
}

export const SCREEN_TOURS: readonly ScreenTour[] = [
  {
    id: 'learn',
    pathname: '/lessons-tab',
    steps: [
      {
        targetId: 'learn-new-words',
        title: 'New words, every day',
        body: 'A few useful words at a time, each with an example and audio. Save the ones you want to keep.',
        shifu: 'point',
      },
      {
        targetId: 'learn-books',
        title: 'Read real stories',
        body: 'Folk tales and legends at your level. Tap any word you don’t know to look it up or save it.',
        shifu: 'welcome',
      },
      FEATURES.lessons
        ? {
            targetId: 'learn-third',
            title: 'Follow the path',
            body: 'Short lessons that build on each other, from your first words to fluent reading.',
            shifu: 'celebrate',
          }
        : {
            targetId: 'learn-third',
            title: 'Start from zero',
            body: 'Short lessons on how Chinese works: tones, characters, writing and your first sentences.',
            shifu: 'celebrate',
          },
    ],
  },
  {
    id: 'dictionary',
    pathname: '/dictionary-tab',
    steps: [
      {
        targetId: 'dictionary-search',
        title: 'Look anything up',
        body: 'Type Chinese, pinyin or English. Pinyin works without tone marks.',
        shifu: 'point',
      },
      {
        targetId: 'dictionary-filters',
        title: 'Narrow it down',
        body: 'Keep results to your HSK level, switch between traditional and simplified, or choose what to search in.',
        shifu: 'thinking',
      },
      {
        targetId: 'dictionary-explore',
        title: 'Browse without searching',
        body: 'Words and characters by HSK level, radicals, and every word you’ve saved.',
        shifu: 'welcome',
      },
      {
        targetId: 'dictionary-discover',
        title: 'A word a day',
        body: 'A new word to discover each day, picked for your level. Add it in one tap.',
        shifu: 'celebrate',
      },
    ],
  },
  {
    /*
     * The dictionary card, the first time one is opened — from the Dictionary
     * tab or from My Words. Steps a card leaves out (no radical row for a word
     * the index cannot file) are passed over like any other missing target.
     */
    id: 'word',
    pathname: '/word',
    prefixes: ['/dictionary-tab/word/', '/word/'],
    steps: [
      {
        targetId: 'word-hero',
        title: 'Everything about one word',
        body: 'Its reading and HSK level. Tap the speaker to hear it, Stroke order to watch it written, or Practice to write it yourself.',
        shifu: 'point',
      },
      {
        targetId: 'word-save',
        title: 'Keep the ones you want',
        body: 'Add puts it in My Words, and I’ll bring it back for review. The star saves it to your Favorites.',
        shifu: 'welcome',
      },
      {
        targetId: 'word-meaning',
        title: 'What it means',
        body: 'The clearest meaning first, then every other sense the word has.',
        shifu: 'thinking',
      },
      {
        targetId: 'word-radicals',
        title: 'How it’s built',
        body: 'The radical inside each character, a clue to its meaning. Tap a character to look at it on its own.',
        shifu: 'celebrate',
      },
    ],
  },
  {
    id: 'review',
    pathname: '/review-tab',
    steps: [
      {
        targetId: 'review-stats',
        title: 'Your review at a glance',
        body: 'What’s due today, your streak, and the words that keep slipping. Tap Due today to see them.',
        shifu: 'point',
      },
      {
        targetId: 'review-drills',
        title: 'Three ways to practise',
        body: 'Flashcards for writing and recall, Mixed Drills for listening and context, and Mistakes for the words you’ve missed.',
        shifu: 'thinking',
      },
      {
        targetId: 'review-sessions',
        title: 'Or let me choose',
        body: 'A full session runs flashcards then drills. Short on time? Try the 5-minute review. My Words shows everything you’ve saved.',
        shifu: 'celebrate',
      },
    ],
  },
  {
    id: 'settings',
    pathname: '/settings',
    steps: [
      {
        targetId: 'settings-profile',
        title: 'Your profile',
        body: 'Your name, photo and level. Tap to change them.',
        shifu: 'point',
      },
      {
        targetId: 'settings-study',
        title: 'Make it yours',
        body: 'Script and pinyin, daily reminders, and how many new words a day suit you.',
        shifu: 'welcome',
      },
      {
        targetId: 'settings-app',
        title: 'Everything else',
        body: 'Your progress over time, sounds and appearance, and a replay of these guides under General.',
        shifu: 'thinking',
      },
    ],
  },
]

/** The guide that belongs on this pathname, if any. */
export function screenTourFor(pathname: string): ScreenTour | null {
  return (
    SCREEN_TOURS.find(
      (tour) => tour.pathname === pathname || (tour.prefixes ?? []).some((prefix) => pathname.startsWith(prefix)),
    ) ?? null
  )
}

/** Reads the stored list back, dropping anything that is not a guide this build knows. */
export function normalizeSeenScreenTours(raw: unknown): ScreenTourId[] {
  if (!Array.isArray(raw)) return []
  const known = new Set<string>(SCREEN_TOURS.map((tour) => tour.id))
  return raw.filter((id): id is ScreenTourId => typeof id === 'string' && known.has(id))
}
