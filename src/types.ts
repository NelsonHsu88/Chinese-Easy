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

export interface Story {
  id: string
  title: string
  hskLevel: number
  difficulty: StoryDifficulty
  /** Empty until the story is authored — Books.tsx shows these as "coming soon". */
  pages: StoryPage[]
}

/** A Kangxi radical — not a vocabulary word, so it's never addable to My Words. */
export interface Radical {
  id: string
  character: string
  pinyin: string
  meaning: string
  strokeCount: number
}
