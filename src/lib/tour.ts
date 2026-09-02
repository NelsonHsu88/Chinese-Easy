import type { Href } from 'expo-router'

/*
 * Shifu's guided tour of the app, as data.
 *
 * Pure definitions — no React, no navigation, no side effects — so the whole
 * script can be read in one place and reordered without touching the component
 * that draws it. `components/tour/` is the only consumer.
 *
 * Three rules shaped this list:
 *
 * **The tour never takes the wheel for something it is asking the learner to
 * do.** A step that says "tap Watch" must leave them to tap Watch; the overlay
 * sits beside the app rather than over it, and every screen underneath stays
 * live. `goTo` exists only for the jumps between sections, where making somebody
 * find a screen they have never seen is a worse introduction than being taken
 * there.
 *
 * **A step that asks for an action waits for that action.** Steps carrying
 * `awaits` (or `advanceOn`) have no Next button at all — the tour moves when the
 * learner does the thing, and not before. A tour you can click past teaches
 * nothing, because clicking past it is easier than reading it.
 *
 * **Nobody is ever trapped.** "Skip tour" ends the whole thing and is on every
 * step including the gated ones. Removing the per-step Next is about making the
 * lazy path the useful one, not about locking the door.
 */

/** Something the learner does that a step can be waiting for. */
export type TourAction =
  | 'dictionary:search'
  | 'word:watch'
  | 'word:practice'
  | 'word:add'
  | 'learn:open'

/** A control the overlay draws attention to while its step is up. */
export type TourHighlight =
  | 'dictionary-search'
  | 'word-watch'
  | 'word-practice'
  | 'word-add'
  | 'learn-tab'

export interface TourStep {
  id: string
  /**
   * Route to open when this step begins, if the learner is not already there.
   * Left undefined for steps that ask the learner to navigate themselves.
   */
  goTo?: Href
  /** What Shifu says. Kept to a couple of sentences — it renders in a bubble. */
  body: string
  /**
   * The action this step is waiting for. Its presence removes the Next button:
   * the only way forward is to do it.
   */
  awaits?: TourAction
  /** Same gate, expressed as a route the learner has to reach. */
  advanceOn?: (pathname: string) => boolean
  /** Control to pulse while this step is up, so the instruction has a target. */
  highlight?: TourHighlight
  /**
   * This step is spoken while the Learn menu is open.
   *
   * A React Native `Modal` draws above every other layer, so the sheet hosts its
   * own copy of the card — and needs to know when the tour has moved on past it,
   * or it would still be sitting there over the next screen.
   */
  inSheet?: boolean
  /** Label for the forward button, on the steps that have one. */
  cta?: string
}

const isWordEntry = (pathname: string) => pathname.startsWith('/dictionary-tab/word/')

/** True when the learner has typed something that finds 水. */
export function matchesWaterSearch(query: string): boolean {
  const q = query.trim().toLowerCase()
  if (q.length < 3) return false
  return 'water'.startsWith(q) || q.includes('水') || q.startsWith('shui') || q.startsWith('shuǐ')
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'dashboard',
    goTo: '/',
    body: 'Welcome in. This is your dashboard — what is due, what you have done this week, and where you pick up each day. Let me show you where it all comes from.',
  },
  {
    id: 'dictionary-intro',
    goTo: '/dictionary-tab',
    body: 'This is the dictionary. Around twenty thousand words, all stored on your phone — it works with no signal at all.',
  },
  {
    id: 'dictionary-search',
    body: 'Let us look one up together. Type water into the search box.',
    awaits: 'dictionary:search',
    highlight: 'dictionary-search',
  },
  {
    id: 'dictionary-open',
    body: 'There it is — 水, shuǐ. Tap it to open the full entry.',
    advanceOn: isWordEntry,
  },
  {
    id: 'word-scroll',
    body: 'This is everything I know about a word. Scroll down: what it means, a real sentence using it, the radical it is built from, and other words that contain it.',
  },
  {
    id: 'word-watch',
    body: 'Tap Stroke order to see it drawn properly. Chinese characters have a fixed stroke order, and it is far easier to learn now than to correct later.',
    awaits: 'word:watch',
    highlight: 'word-watch',
  },
  {
    id: 'word-practice',
    body: 'Now tap Practice and write it yourself a few times. Tracing a character is what makes the shape stay with you.',
    awaits: 'word:practice',
    highlight: 'word-practice',
  },
  {
    id: 'word-add',
    body: 'Happy with it? Add it to your words. Your deck starts completely empty — everything in it will be a word you chose.',
    awaits: 'word:add',
    highlight: 'word-add',
  },
  {
    id: 'learn-tab',
    body: 'Now open Learn in the bar at the bottom. It gives you a short menu rather than a screen.',
    awaits: 'learn:open',
    highlight: 'learn-tab',
  },
  {
    id: 'learn-books',
    body: 'Books holds short stories in Chinese, graded by level. While you read, tap any word you do not know and it goes straight into your deck.',
    inSheet: true,
  },
  {
    id: 'learn-writing',
    body: 'How to write Chinese is a four-page primer — stroke order, radicals, and why characters are put together the way they are.',
    inSheet: true,
  },
  {
    id: 'challenges',
    goTo: '/challenges',
    body: 'Challenges give you something to aim at: a few each day, and longer milestones underneath. Finish one and come back to claim it.',
  },
  {
    id: 'settings',
    goTo: '/settings',
    body: 'Last stop — Settings. How many new words a day, when to remind you, pinyin or zhuyin, and how much you want to take on.',
  },
  {
    id: 'done',
    body: 'That is everything. Your deck is empty and your streak starts the day you add your first word. Take your time.',
    cta: 'Start learning',
  },
]

/** Whether a step waits on the learner rather than offering a button. */
export function isGated(step: TourStep): boolean {
  return step.awaits !== undefined || step.advanceOn !== undefined
}

/** Whether a pathname is one of the five screens that sit behind the tab bar. */
export function hasTabBar(pathname: string): boolean {
  if (pathname === '/' || pathname === '/settings') return true
  return pathname.startsWith('/dictionary-tab')
}
