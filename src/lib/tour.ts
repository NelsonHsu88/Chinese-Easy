/*
 * Shifu's guided tour, as data.
 *
 * Pure definitions — no React, no navigation, no side effects — so the whole
 * script can be read in one place. `components/tour/` draws it.
 *
 * The tour teaches one mental model and stops: **learn new words → save the
 * useful ones → review them later.** It does not walk through every tab. The
 * old tour did (fourteen steps, Dictionary to Settings), and a slideshow of
 * features is something people click through rather than read.
 *
 * Three rules shaped it:
 *
 * - **The real app does the work.** Steps that point at something are finished
 *   by doing that thing — tapping the real New Words card, the real Add button —
 *   not by a Next button standing in for it.
 * - **It is offered, not imposed.** A small prompt asks first; "Maybe later"
 *   ends it for good, and Settings → General can replay it.
 * - **Nobody is ever trapped.** Every step has a way out, and a step whose
 *   target cannot be found falls back to a plain card with a button rather than
 *   leaving a dimmed screen with nothing to press.
 */

/** Where the tour is, in the terms the rest of the app cares about. */
export type TourStatus = 'not_started' | 'in_progress' | 'completed' | 'dismissed'

export type TourStepId = 'home' | 'new-words' | 'save' | 'review'

/** A control a step can put the spotlight on. Registered by `TourTarget`. */
export type TourTargetId =
  | 'dashboard-review'
  | 'dashboard-new-word'
  | 'new-words-add'
  // Screen guides (`lib/screenTours.ts`)
  | 'learn-new-words'
  | 'learn-books'
  | 'learn-third'
  | 'learn-writing'
  | 'dictionary-search'
  | 'dictionary-filters'
  | 'dictionary-explore'
  | 'dictionary-discover'
  | 'word-hero'
  | 'word-save'
  | 'word-meaning'
  | 'word-radicals'
  | 'settings-profile'
  | 'settings-study'
  | 'settings-app'
  | 'review-stats'
  | 'review-drills'
  | 'review-sessions'

/** Something the learner does that a step can be waiting for. */
export type TourAction = 'word:add'

/**
 * How a step is finished.
 *
 * - `nextButton` — the tooltip's own button.
 * - `targetPress` — the learner uses the real control in the spotlight; the
 *   tooltip's button does the same thing, for anyone who reads it first.
 * - `externalEvent` — a screen reports the action (`reportTourAction`).
 */
export type TourCompletion = 'nextButton' | 'targetPress' | 'externalEvent'

export type TourShifu = 'welcome' | 'point' | 'celebrate' | 'thinking'

export interface TourStep {
  id: TourStepId
  /** The route this step is about. The overlay opens it if the learner is elsewhere. */
  screen: '/' | '/new-words'
  targetId?: TourTargetId
  title: string
  body: string
  completion: TourCompletion
  /** The action an `externalEvent` step waits for. */
  awaits?: TourAction
  /** Label for the tooltip's button. Absent on a step only the action can finish. */
  primaryLabel?: string
  /** The small Shifu beside the copy. Every card carries one. */
  shifu: TourShifu
}

export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: 'home',
    screen: '/',
    targetId: 'dashboard-review',
    title: 'Your home base',
    body: 'See what to learn, review, and work toward today.',
    completion: 'nextButton',
    primaryLabel: 'Next',
    shifu: 'point',
  },
  {
    id: 'new-words',
    screen: '/',
    targetId: 'dashboard-new-word',
    title: 'Learn something new',
    body: 'Pick up a few useful words each day.',
    completion: 'targetPress',
    primaryLabel: 'Try New Words',
    shifu: 'welcome',
  },
  {
    id: 'save',
    screen: '/new-words',
    targetId: 'new-words-add',
    title: 'Save what matters',
    body: 'Add useful words and I’ll bring them back for review.',
    completion: 'externalEvent',
    awaits: 'word:add',
    shifu: 'point',
  },
  {
    id: 'review',
    screen: '/',
    targetId: 'dashboard-review',
    title: 'I’ll help you remember',
    body: 'Words come back at the right time so they stick.',
    completion: 'nextButton',
    primaryLabel: 'Got it',
    shifu: 'thinking',
  },
]

export const WELCOME_COPY = {
  title: 'Welcome to Chinese Easy!',
  body: 'Want me to show you how learning works?',
  accept: 'Show me',
  decline: 'Maybe later',
} as const

export const SAVED_TOAST = 'Nice! It’s in My Words.'

export function tourStepById(id: TourStepId | null): TourStep | null {
  if (id === null) return null
  return TOUR_STEPS.find((step) => step.id === id) ?? null
}

/** The step after this one, or null at the end. */
export function nextTourStep(id: TourStepId): TourStepId | null {
  const index = TOUR_STEPS.findIndex((step) => step.id === id)
  return TOUR_STEPS[index + 1]?.id ?? null
}

/** What the app persists. One object under the existing `tourStep` key. */
export interface TourState {
  status: TourStatus
  step: TourStepId | null
}

export const INITIAL_TOUR: TourState = { status: 'not_started', step: null }

const STATUSES: readonly TourStatus[] = ['not_started', 'in_progress', 'completed', 'dismissed']

/**
 * Reads whatever is stored under `tourStep` back into a `TourState`.
 *
 * Two older shapes can be there, both from the fourteen-step tour, which stored
 * a bare step index:
 *
 * - `null` was written when that tour ended, finished or skipped — so this
 *   install has had a tour, and is not offered another one unasked.
 * - A number is a tour that was interrupted. Its steps do not exist any more,
 *   so it is offered the new one, once, through the small prompt.
 *
 * A tour that was **in progress** when the app closed is not reopened mid-step
 * on launch — landing back on New Words with a spotlight on a button, out of
 * nowhere, is exactly the aggressive behaviour to avoid. It becomes
 * `not_started`, which offers it again through the prompt, where "Maybe later"
 * ends it for good.
 */
export function normalizeTour(raw: unknown): TourState {
  if (raw === null) return { status: 'completed', step: null }
  if (typeof raw === 'number') return INITIAL_TOUR
  if (typeof raw !== 'object' || raw === undefined) return INITIAL_TOUR
  const status = (raw as { status?: unknown }).status
  if (!STATUSES.includes(status as TourStatus)) return INITIAL_TOUR
  if (status === 'in_progress') return INITIAL_TOUR
  return { status: status as TourStatus, step: null }
}

/**
 * What a learner's action does to the tour.
 *
 * The step waiting for it moves on, as you would expect. One shortcut on top:
 * the Dashboard's word card has its own "Add this word" button, and it sits
 * inside the New Words spotlight. A learner who presses it has saved a word —
 * the thing the next step was going to ask for — so the tour goes straight to
 * Review rather than sending them to New Words to do it a second time.
 */
export function tourAfterAction(state: TourState, action: TourAction): TourState {
  if (state.status !== 'in_progress') return state
  const step = tourStepById(state.step)
  if (!step) return state
  if (step.awaits === action || (action === 'word:add' && step.id === 'new-words')) {
    const next = step.id === 'new-words' ? 'review' : nextTourStep(step.id)
    return next ? { status: 'in_progress', step: next } : { status: 'completed', step: null }
  }
  return state
}

/** Whether a pathname is one of the screens that sit behind the tab bar. */
export function hasTabBar(pathname: string): boolean {
  if (pathname === '/' || pathname === '/settings' || pathname === '/lessons-tab') return true
  return pathname.startsWith('/dictionary-tab')
}

/** Whether the current route is the screen a step belongs on. */
export function onStepScreen(step: TourStep, pathname: string): boolean {
  return pathname === step.screen
}
