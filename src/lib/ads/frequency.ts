import { loadStored, saveStored } from '../storage'
import { devNow } from '../devClock'
import { todayISO } from '../date'
import { FREQUENCY } from './adConfig'
import { trackAd } from './adEvents'

/*
 * How often a learner may meet an interstitial.
 *
 * All three caps in `FREQUENCY` are enforced here and nowhere else, so a screen
 * can only ever say "this is a natural stopping point" — never "show an advert
 * now". That separation is the point: every `show()` in the app goes through
 * one gate that already knows the history.
 *
 * ── Two decisions worth keeping ─────────────────────────────────────────────
 *
 * **This state lives in its own AsyncStorage key, not in AppContext.**
 * AppContext is the store for things the learner owns — deck, settings, streak,
 * progress — and adding a field there carries a documented protocol (hydrate
 * list, skipNextSave ref, guarded save effect). Ad pacing is machinery, no
 * screen renders it, and keeping it out means the global store stays about
 * learning.
 *
 * **Time comes from `devNow()`, never `new Date()`.** The app has a developer
 * clock override used for streak and daily-challenge testing, and a daily ad cap
 * that ignored it would be untestable without waiting for real midnights — the
 * same reasoning that put every other daily rule on that clock.
 */

const STORAGE_KEY = 'adFrequency'

interface FrequencyState {
  /** ISO datetime of the last interstitial actually shown. */
  lastShownAt: string | null
  /** Completed sessions since the last interstitial. */
  sessionsSinceLast: number
  /** Sessions completed ever, for the new-install grace period. */
  sessionsTotal: number
  /** Calendar day (dev clock) the daily count belongs to. */
  countedDay: string | null
  shownToday: number
}

const EMPTY: FrequencyState = {
  lastShownAt: null,
  sessionsSinceLast: 0,
  sessionsTotal: 0,
  countedDay: null,
  shownToday: 0,
}

let state: FrequencyState = EMPTY
let hydrated = false

async function hydrate(): Promise<void> {
  if (hydrated) return
  state = await loadStored<FrequencyState>(STORAGE_KEY, EMPTY)
  hydrated = true
}

function persist(): void {
  void saveStored(STORAGE_KEY, state)
}

/** Rolls the daily counter over when the dev-clock day has changed. */
function rollDay(): void {
  const today = todayISO()
  if (state.countedDay !== today) {
    state.countedDay = today
    state.shownToday = 0
  }
}

/** Why an interstitial was refused. Recorded so pacing can be tuned from data. */
export type SuppressionReason = 'grace-period' | 'session-gap' | 'time-gap' | 'daily-cap'

export interface FrequencyVerdict {
  allowed: boolean
  reason?: SuppressionReason
}

/**
 * Record that the learner finished something an interstitial *could* follow.
 *
 * Called at every natural stopping point, whether or not an advert is shown —
 * the counter is about sessions completed, not adverts served.
 */
export async function noteSessionComplete(): Promise<void> {
  await hydrate()
  state.sessionsSinceLast += 1
  state.sessionsTotal += 1
  persist()
}

/** Whether an interstitial may be shown right now. */
export async function mayShowInterstitial(): Promise<FrequencyVerdict> {
  await hydrate()
  rollDay()

  if (state.sessionsTotal <= FREQUENCY.gracePeriodSessions) {
    return { allowed: false, reason: 'grace-period' }
  }
  if (state.shownToday >= FREQUENCY.maximumInterstitialsPerDay) {
    return { allowed: false, reason: 'daily-cap' }
  }
  if (state.sessionsSinceLast < FREQUENCY.minimumSessionsBetweenInterstitials) {
    return { allowed: false, reason: 'session-gap' }
  }
  if (state.lastShownAt) {
    const elapsedMinutes = (devNow().getTime() - new Date(state.lastShownAt).getTime()) / 60_000
    if (elapsedMinutes < FREQUENCY.minimumMinutesBetweenInterstitials) {
      return { allowed: false, reason: 'time-gap' }
    }
  }
  return { allowed: true }
}

/** Record that one was actually shown. Only called on a real impression. */
export async function noteInterstitialShown(): Promise<void> {
  await hydrate()
  rollDay()
  state.lastShownAt = devNow().toISOString()
  state.sessionsSinceLast = 0
  state.shownToday += 1
  persist()
}

export function noteSuppressed(reason: SuppressionReason, trigger: string): void {
  trackAd('ad_interstitial_suppressed', { reason, trigger })
}

/** Development helper — clears pacing so the caps can be re-tested. */
export async function resetFrequency(): Promise<void> {
  state = { ...EMPTY }
  hydrated = true
  persist()
}
