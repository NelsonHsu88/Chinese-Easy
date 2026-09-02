import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card as FsrsCard,
  type Grade as FsrsGrade,
  type RecordLog,
} from 'ts-fsrs'
import { devNow } from './devClock'
import type { Grade, ReviewLogEntry, SrsCard, SrsState } from '../types'

/*
 * Chinese Easy's scheduling boundary.
 *
 * **This is the only module that imports ts-fsrs.** Screens ask for previews and
 * commit grades through the API below; nothing outside here knows what algorithm
 * is running, which is what made replacing SM-2 with FSRS a change to one file
 * plus its callers rather than to every review surface.
 *
 * The rules, in short:
 *
 *   Again          = failed recall. The only rating that counts a lapse.
 *   Hard/Good/Easy = successful recall, of increasing ease. **Hard is a pass.**
 *   "I don't know" = not a rating at all. See `gradeCard`'s note; it never
 *                    reaches this module.
 *
 * The displayed next-interval on each button comes from the very same scheduling
 * result that gets committed when the button is pressed — see `previewReview`.
 */

/**
 * Scheduler configuration, in one place.
 *
 * `request_retention` is the probability of recall FSRS aims for at the moment a
 * card comes due — 0.90 is the library default and a sensible starting point.
 * It is deliberately **not** a user-facing setting yet: it is the single number
 * that changes how much work the app asks of someone every day, and exposing it
 * before there is any guidance around it invites people to wreck their own
 * schedule.
 *
 * The learning and relearning steps are short and same-day on purpose. They are
 * the fast loop that gets a card into the learner's head; FSRS's long-term
 * scheduling takes over once the card reaches Review state, and the two stay
 * clearly separated rather than being blended into one set of multipliers the
 * way the old SM-2 implementation did.
 *
 * Fuzz is on. Without it every card learned in the same session comes back on
 * exactly the same future day forever, and a learner who did one big session
 * gets one enormous review day months later. It is what makes `previewReview`'s
 * caching contract matter — see there.
 */
export const FSRS_CONFIG = {
  request_retention: 0.9,
  maximum_interval: 36500,
  enable_fuzz: true,
  /** Same-day steps before a card graduates to long-term scheduling. */
  learning_steps: ['1m', '10m'],
  /** Same-day steps after a lapse, before it returns to long-term scheduling. */
  relearning_steps: ['10m'],
} as const

const scheduler = fsrs(generatorParameters({ ...FSRS_CONFIG }))

/** Chinese Easy's grade names ↔ FSRS's ratings. Hard is a *pass*, never a fail. */
const RATINGS: Record<Grade, FsrsGrade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
}

const STATES: Record<number, SrsState> = {
  [State.New]: 'new',
  [State.Learning]: 'learning',
  [State.Review]: 'review',
  [State.Relearning]: 'relearning',
}

const STATE_VALUES: Record<SrsState, State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
}

/** Current schema version for a persisted card. */
export const SRS_SCHEMA_VERSION = 2

// --- Serialisation ------------------------------------------------------------

/*
 * FSRS works in `Date`s and AsyncStorage stores strings, so the boundary between
 * them is exactly here and nowhere else.
 *
 * This is the trap the whole file is arranged to avoid: JSON turns a Date into a
 * string silently, and handing that string back to FSRS as though it were a Date
 * does not throw — it produces arithmetic on `NaN` and a due date of "Invalid
 * Date", which surfaces days later as a card that never comes up again.
 */

function toFsrs(card: SrsCard): FsrsCard {
  return {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: STATE_VALUES[card.state],
    last_review: card.last_review ? new Date(card.last_review) : undefined,
  }
}

/** Merges an FSRS result back onto the app's own fields, which FSRS never sees. */
function fromFsrs(fsrsCard: FsrsCard, previous: SrsCard, overrides: Partial<SrsCard> = {}): SrsCard {
  return {
    ...previous,
    v: SRS_SCHEMA_VERSION,
    due: fsrsCard.due.toISOString(),
    stability: fsrsCard.stability,
    difficulty: fsrsCard.difficulty,
    elapsed_days: fsrsCard.elapsed_days,
    scheduled_days: fsrsCard.scheduled_days,
    learning_steps: fsrsCard.learning_steps,
    state: STATES[fsrsCard.state],
    last_review: fsrsCard.last_review ? fsrsCard.last_review.toISOString() : undefined,
    reps: fsrsCard.reps,
    lapses: fsrsCard.lapses,
    ...overrides,
  }
}

// --- Creating and reading cards ----------------------------------------------

export function createNewCard(wordId: string, now: Date = devNow()): SrsCard {
  const empty = createEmptyCard(now)
  return {
    wordId,
    v: SRS_SCHEMA_VERSION,
    due: empty.due.toISOString(),
    stability: empty.stability,
    difficulty: empty.difficulty,
    elapsed_days: empty.elapsed_days,
    scheduled_days: empty.scheduled_days,
    learning_steps: empty.learning_steps,
    state: 'new',
    reps: 0,
    lapses: 0,
    recentLapses: 0,
    practiceQueue: 0,
    practiceTotal: 0,
  }
}

/**
 * Whether a card is ready to be reviewed.
 *
 * A timestamp comparison rather than a calendar-day one, because the learning
 * steps are minutes: a card due in ten minutes is not due now even though it is
 * due "today". Day-scale intervals are unaffected — a card due last Tuesday is
 * past its instant too — so this one test covers both scales, and it cannot
 * drift when the device's timezone or DST offset changes the way comparing
 * local calendar dates could.
 */
export function isCardDue(card: SrsCard, now: Date = devNow()): boolean {
  return new Date(card.due).getTime() <= now.getTime()
}

// --- Previewing and committing ------------------------------------------------

/** One of the four outcomes on offer, ready to display and ready to commit. */
export interface ReviewOutcome {
  /** The card exactly as it will be persisted if this grade is chosen. */
  card: SrsCard
  /** When it would next come up. */
  due: Date
  /** Compact interval for the button — "10m", "4d". */
  label: string
}

export interface ReviewPreview {
  /** The single instant all four outcomes were computed against. */
  now: string
  again: ReviewOutcome
  hard: ReviewOutcome
  good: ReviewOutcome
  easy: ReviewOutcome
}

/**
 * All four possible outcomes for a card, from one scheduling call.
 *
 * **The caller must hold this and pass it back to `gradeCard`.** FSRS's fuzz is
 * seeded from the card *and the review instant*, so asking again a few seconds
 * later — which is exactly how long a learner takes to choose — returns a
 * different interval. Previewing and committing separately is therefore not a
 * rounding difference but a real disagreement: the button says 4d and the deck
 * records 5d. Computing once and committing the outcome that was shown is the
 * only way the number on the button is a promise.
 */
export function previewReview(card: SrsCard, wrongAnswerReps: number, now: Date = devNow()): ReviewPreview {
  const record: RecordLog = scheduler.repeat(toFsrs(card), now)

  const outcome = (grade: Grade): ReviewOutcome => {
    const result = record[RATINGS[grade]]
    const next = fromFsrs(result.card, card, appFieldsFor(card, grade, wrongAnswerReps))
    const due = result.card.due
    return { card: next, due, label: formatReviewInterval(now, due) }
  }

  return {
    now: now.toISOString(),
    again: outcome('again'),
    hard: outcome('hard'),
    good: outcome('good'),
    easy: outcome('easy'),
  }
}

/**
 * The fields FSRS knows nothing about, which Chinese Easy maintains itself.
 *
 * `recentLapses` is the demotion signal behind My Words' proficiency tiers —
 * FSRS's own `lapses` only ever grows, so it can never say "and they have
 * stopped getting it wrong". `practiceQueue` is the remedial writing reps an
 * "Again" queues up. Both keep exactly the behaviour they had under SM-2.
 */
function appFieldsFor(card: SrsCard, grade: Grade, wrongAnswerReps: number): Partial<SrsCard> {
  if (grade === 'again') {
    return {
      recentLapses: (card.recentLapses ?? 0) + 1,
      practiceQueue: wrongAnswerReps,
      practiceTotal: wrongAnswerReps,
    }
  }
  return {
    // One correct review pays off one recent mistake.
    recentLapses: Math.max(0, (card.recentLapses ?? 0) - 1),
    practiceQueue: 0,
    practiceTotal: 0,
  }
}

/**
 * Commits a grade.
 *
 * Pass the `preview` the learner was actually shown and that exact outcome is
 * stored — see `previewReview` for why recomputing would not agree. Without one
 * it schedules fresh, which is right for the callers that never showed a
 * preview: the listening drill grades from whether the answer was correct, with
 * no four-way choice on screen.
 */
export function gradeCard(
  card: SrsCard,
  grade: Grade,
  wrongAnswerReps: number,
  preview?: ReviewPreview,
): SrsCard {
  if (preview) return preview[grade].card
  return previewReview(card, wrongAnswerReps)[grade].card
}

/**
 * The log entry for a graded review, for the caller to persist.
 *
 * Separate from `gradeCard` so that grading stays a pure function of the card:
 * the log needs the response duration, which is a fact about the session rather
 * than about the schedule.
 */
export function reviewLogEntry(
  before: SrsCard,
  after: SrsCard,
  grade: Grade,
  durationMs: number,
  now: Date = devNow(),
): ReviewLogEntry {
  return {
    wordId: before.wordId,
    grade,
    at: now.toISOString(),
    state: before.state,
    scheduledDays: after.scheduled_days,
    durationMs: Math.min(Math.max(0, Math.round(durationMs)), MAX_LOGGED_DURATION_MS),
  }
}

/**
 * Longest response time worth recording.
 *
 * A card left on screen while someone answers the door is not a 40-minute
 * recall, and left uncapped one such card dominates any average taken over the
 * log. Capping rather than discarding keeps the review itself in the history,
 * which is what the scheduling side of the log is for.
 */
export const MAX_LOGGED_DURATION_MS = 60_000

// --- Interval formatting ------------------------------------------------------

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const MONTH = 30 * DAY
const YEAR = 365 * DAY

/**
 * A duration as a review button shows it: `<1m`, `10m`, `4d`, `3w`, `2mo`, `1y`.
 *
 * Presentation only — the scheduler stores real timestamps and nothing ever
 * parses these back. Deliberately not in `lib/date.ts`, whose helpers all work
 * on `yyyy-mm-dd` strings and calendar days; this is elapsed time between two
 * instants, which is a different question and would be a confusing neighbour.
 */
export function formatReviewInterval(from: Date, to: Date): string {
  const ms = to.getTime() - from.getTime()
  if (ms < MINUTE) return '<1m'
  if (ms < HOUR) return `${Math.round(ms / MINUTE)}m`
  if (ms < DAY) return `${Math.round(ms / HOUR)}h`
  if (ms < 7 * DAY) return `${Math.round(ms / DAY)}d`
  if (ms < MONTH) return `${Math.round(ms / (7 * DAY))}w`
  if (ms < YEAR) return `${Math.round(ms / MONTH)}mo`
  return `${Math.round((ms / YEAR) * 10) / 10}y`.replace('.0y', 'y')
}

// --- Migration ----------------------------------------------------------------

/** A persisted SM-2 card, as schema v1 wrote it. */
interface LegacySrsCard {
  wordId: string
  stage?: 'new' | 'learning' | 'review'
  intervalDays?: number
  easeFactor?: number
  dueDate?: string
  reps?: number
  lapses?: number
  recentLapses?: number
  lastReviewed?: string
  practiceQueue?: number
  practiceTotal?: number
}

/**
 * Converts one SM-2 card to FSRS state, conservatively.
 *
 * **The deck is not reset and nothing becomes due that was not already due.**
 * The old due date is kept as-is (at the start of that local day, which is what
 * an ISO date meant under v1), so someone who had forty cards waiting still has
 * exactly forty, and someone whose next review was in three weeks still waits
 * three weeks.
 *
 * The interesting part is `stability`. FSRS needs a memory-strength estimate
 * that v1 never stored, and the honest available proxy is the interval the old
 * scheduler had worked its way up to: a card SM-2 was willing to leave for 30
 * days is one the learner has held for about 30 days. That is what FSRS's own
 * "reschedule from a previous scheduler" guidance does, and it is a estimate
 * that the first real review corrects. `difficulty` is mapped off the old ease
 * factor across its 1.3–2.8 range, inverted: low ease meant a hard card.
 *
 * **No fake review history is fabricated.** v1 stored no per-review records, so
 * there is nothing to replay and inventing plausible-looking ones would poison
 * the very log a future parameter optimisation would read. `reps` and `lapses`
 * carry over as the counts they always were; the review log starts empty and
 * fills from here on.
 */
export function migrateCard(legacy: LegacySrsCard | SrsCard): SrsCard {
  const existing = legacy as SrsCard
  if (existing.v === SRS_SCHEMA_VERSION) return existing

  const old = legacy as LegacySrsCard
  const reps = old.reps ?? 0
  const lapses = old.lapses ?? 0
  const intervalDays = old.intervalDays ?? 0
  const ease = old.easeFactor ?? 2.5

  // v1 wrote a plain yyyy-mm-dd; read it as that local day's start.
  const due = old.dueDate ? startOfLocalDay(old.dueDate) : devNow()
  const lastReview = old.lastReviewed ? startOfLocalDay(old.lastReviewed) : undefined

  const state: SrsState =
    reps === 0 ? 'new' : old.stage === 'review' ? 'review' : old.stage === 'learning' ? 'relearning' : 'learning'

  /* Clamped low so an unreviewed or barely-reviewed card cannot claim strong
     memory, and so `stability` is always a positive number FSRS can work with. */
  const stability = state === 'new' ? 0 : Math.max(0.5, intervalDays)

  /* Ease 2.8 (easiest SM-2 got) → difficulty 1; ease 1.3 (its floor) → 10. */
  const difficulty = state === 'new' ? 0 : clamp(1 + ((2.8 - ease) / 1.5) * 9, 1, 10)

  return {
    wordId: old.wordId,
    v: SRS_SCHEMA_VERSION,
    due: due.toISOString(),
    stability,
    difficulty,
    elapsed_days: 0,
    scheduled_days: intervalDays,
    learning_steps: 0,
    state,
    last_review: lastReview?.toISOString(),
    reps,
    lapses,
    recentLapses: old.recentLapses ?? 0,
    practiceQueue: old.practiceQueue ?? 0,
    practiceTotal: old.practiceTotal ?? 0,
  }
}

/** Migrates a whole persisted deck. A no-op once every card is already v2. */
export function migrateDeck(deck: (LegacySrsCard | SrsCard)[]): SrsCard[] {
  return deck.map(migrateCard)
}

function startOfLocalDay(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return new Date(iso)
  return new Date(y, m - 1, d)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
