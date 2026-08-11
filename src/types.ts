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

export type SrsStage = 'new' | 'learning' | 'review'

export interface SrsCard {
  wordId: string
  stage: SrsStage
  intervalDays: number
  easeFactor: number
  dueDate: string // ISO date, yyyy-mm-dd
  reps: number
  lapses: number
  /**
   * Mistakes made lately, as opposed to the all-time `lapses` count: bumped by
   * an "Again" grade and worked back down one per correct review. Drives the
   * demotion half of `proficiencyFor`. Optional because decks persisted before
   * this existed have no value for it — read it as `?? 0`.
   */
  recentLapses?: number
  lastReviewed?: string
  /** extra remedial writing reps queued after an "Again" grade */
  practiceQueue: number
  practiceTotal: number
}

export type Grade = 'again' | 'hard' | 'good' | 'easy'

export interface DailyProgress {
  date: string // yyyy-mm-dd
  wordsLearned: number
  reviewsCompleted: number
}

export type ReviewDirection = 'recognition' | 'production' | 'mixed'
export type ReviewOrder = 'due' | 'shuffled' | 'hardest-first'

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
