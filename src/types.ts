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
  script: ScriptMode
  phoneticScript: PhoneticScript
  reviewDirection: ReviewDirection
  dailyReviewLimit: number
  dailyNewWordLimit: number
  wrongAnswerReps: number
  reviewOrder: ReviewOrder
  reminderTime: string // HH:MM
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
