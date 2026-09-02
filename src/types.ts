import type { ImageSourcePropType } from 'react-native'

export type ScriptMode = 'simplified' | 'traditional'
export type PhoneticScript = 'pinyin' | 'zhuyin'
export type WordCategory = 'food' | 'travel' | 'people' | 'work' | 'science' | 'daily'

export interface ExampleSentence {
  simplified: string
  traditional: string
  pinyin: string
  translation: string
}

export interface VocabWord {
  id: string
  simplified: string
  traditional: string
  pinyin: string
  definition: string
  hskLevel: number
  category: WordCategory
  /** Not every bulk-imported word has a verified example sentence. */
  example?: ExampleSentence
  custom?: boolean
}

/** FSRS's own card states, mirroring `State` in ts-fsrs. */
export type SrsState = 'new' | 'learning' | 'review' | 'relearning'

/**
 * A card in the deck: FSRS scheduling state plus the fields Chinese Easy owns.
 *
 * **Schema v2.** v1 was SM-2 (`intervalDays`/`easeFactor`/`stage`, with `dueDate`
 * an ISO *date*); `migrateDeck` in lib/srs.ts converts a persisted v1 deck in
 * place on hydrate. `v` is optional because a v1 card predates the field —
 * absent means 1.
 *
 * Everything FSRS owns is snake_case, matching the library's own `Card` shape
 * exactly so serialising is a date conversion and nothing else. Do not rename
 * them into camelCase: the round-trip through AsyncStorage is the one place a
 * silent field mismatch would show up as "scheduling looks a bit wrong" rather
 * than as an error.
 */
export interface SrsCard {
  wordId: string
  /** Schema version. Absent or 1 = SM-2, 2 = FSRS. */
  v?: number

  // --- FSRS state. Dates are ISO datetime strings; lib/srs.ts owns conversion.
  /** When the card comes up again — a datetime, not a date: steps can be minutes. */
  due: string
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  state: SrsState
  last_review?: string
  reps: number
  lapses: number

  // --- Chinese Easy's own fields, unchanged in meaning.
  /**
   * Mistakes made lately, as opposed to the all-time `lapses` count: bumped by
   * an "Again" grade and worked back down one per correct review. Drives the
   * demotion half of `proficiencyFor`. Optional because decks persisted before
   * this existed have no value for it — read it as `?? 0`.
   */
  recentLapses?: number
  /** extra remedial writing reps queued after an "Again" grade */
  practiceQueue: number
  practiceTotal: number
}

export type Grade = 'again' | 'hard' | 'good' | 'easy'

/**
 * One graded review, kept so scheduling decisions can be reconstructed later —
 * FSRS parameter optimisation, learning analytics, or debugging a due date that
 * looks wrong.
 *
 * "I don't know" is deliberately absent from this log: it submits no rating and
 * changes no schedule, so recording it here would put a review in the history
 * that never happened. Response time is analytics only and never feeds scheduling.
 */
export interface ReviewLogEntry {
  wordId: string
  /** The FSRS rating actually submitted. */
  grade: Grade
  /** When the review was graded, ISO datetime. */
  at: string
  /** The card's state *before* this review. */
  state: SrsState
  /** Scheduled interval in days after this review — 0 for a same-day step. */
  scheduledDays: number
  /** Milliseconds from the question appearing to the grade landing, capped. */
  durationMs: number
}

export interface DailyProgress {
  date: string // yyyy-mm-dd
  wordsLearned: number
  reviewsCompleted: number
}

export type ReviewDirection = 'recognition' | 'production' | 'mixed'
export type ReviewOrder = 'due' | 'shuffled' | 'hardest-first'

/** Why the learner says they're here. Chosen once during onboarding. */
export type LearningGoal = 'daily-life' | 'travel' | 'exam' | 'culture'

export interface AppSettings {
  username: string
  email: string
  script: ScriptMode
  phoneticScript: PhoneticScript
  reviewDirection: ReviewDirection
  dailyReviewLimit: number
  dailyNewWordLimit: number
  wrongAnswerReps: number
  reviewOrder: ReviewOrder
  reminderTime: string // HH:MM
  notificationsEnabled: boolean
  hskLevel: number
  learningGoal: LearningGoal
  /**
   * Sound effects and haptics, both on by default — Settings → General.
   *
   * They ride in the settings blob, which hydrates as
   * `{ ...DEFAULT_SETTINGS, ...loaded }`, so an install that predates them
   * simply picks up the default rather than needing a migration.
   */
  soundEnabled: boolean
  hapticsEnabled: boolean
}

export interface PlacementAnswer {
  wordId: string
  rating: 'know' | 'recognize' | 'unknown'
}

export interface PlacementResult {
  estimatedHsk: number
  completedAt: string
}

export interface TownBuilding {
  id: string
  name: string
  description: string
  xpCost: number
}

export interface Unit {
  id: string
  title: string
  description: string
  order: number
  hanzi: string
  pinyin: string
}

export interface MatchPair {
  hanzi: string
  pinyin: string
  english: string
}

export interface MatchExercise {
  type: 'match'
  prompt: string
  pairs: MatchPair[]
}

export interface ScrambleExercise {
  type: 'scramble'
  instruction: string
  chinese: string
  tokens: string[]
  pinyin: string
  english: string
}

export interface DialogueLine {
  speaker: string
  line: string
}

export interface FillBlankExercise {
  type: 'fill-blank'
  dialogue: DialogueLine[]
  options: string[]
  answer: string
  english: string
}

export type LessonExercise = MatchExercise | ScrambleExercise | FillBlankExercise

export interface Lesson {
  id: string
  unitId: string
  title: string
  exercises: LessonExercise[]
}

export interface StoryPage {
  chinese: string
  pinyin: string
  translation: string
}

export type StoryDifficulty = 'easy' | 'hard'

/** The shelf a story sits on in the Reading Library. */
export type StoryCollection =
  | 'everyday'
  | 'folk-tales'
  | 'chengyu'
  | 'festival-legends'
  | 'classical-myths'

export interface Story {
  id: string
  /** Traditional-hanzi title, e.g. 嫦娥奔月. */
  title: string
  /** Reading for `title`, shown under it on the library card. */
  titlePinyin: string
  titleEnglish: string
  /** One line of flavour for the library card — never the first line of the story. */
  description: string
  /**
   * Words across all pages, precomputed by scripts/injectWordCounts.
   * Segmenting every story against the 20k-entry word bank is far too slow to
   * do at mount, so the library reads this rather than counting at runtime.
   */
  wordCount: number
  collection: StoryCollection
  hskLevel: number
  difficulty: StoryDifficulty
  /**
   * Cover illustration. Optional: no story art ships with the app yet, and the
   * library falls back to a tinted glyph tile, so adding a `require(...)` here
   * is all it takes to give one story real artwork.
   */
  art?: ImageSourcePropType
  /** Empty until the story is authored — Books.tsx shows these as "coming soon". */
  pages: StoryPage[]
}

/** A character or word built with a radical, shown in the radical detail sheet. */
export interface RadicalExample {
  word: string
  pinyin: string
  meaning: string
}

/**
 * One of the 214 Kangxi radicals, reduced to what a lookup needs.
 *
 * Every character is filed under exactly one of these, so this is the table the
 * dictionary falls back to for the radicals `RADICALS` doesn't teach in depth.
 */
export interface KangxiRadical {
  /** Its Kangxi index, 1–214. The join key with `characterRadicals.json`. */
  number: number
  character: string
  pinyin: string
  /** A word or two, not a definition — "water", "short-tailed bird". */
  meaning: string
  /** Combining forms the radical takes inside a character, e.g. 水 → 氵. */
  variants?: string[]
}

/** A Kangxi radical — not a vocabulary word, so it's never addable to My Words. */
export interface Radical {
  id: string
  character: string
  pinyin: string
  meaning: string
  strokeCount: number
  /** Combining forms the radical takes inside a character, e.g. 水 → 氵. */
  variants?: string[]
  /** What the radical tells you about a character's meaning. */
  explanation: string
  /** Where the shape came from — the pictograph it descends from. */
  origin: string
  /**
   * Characters built with the radical. A few radicals (血, 高, 鼻…) barely occur
   * as components in everyday characters, so those show common words containing
   * the character itself instead.
   */
  examples: RadicalExample[]
}
