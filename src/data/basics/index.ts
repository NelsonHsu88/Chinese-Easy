/*
 * Chinese Basics: the course for someone who has never met pinyin, zhuyin or a
 * character. Opened from the Learn tab (`screens/ChineseBasicsHome.tsx`).
 *
 * Four groups of short interactive lessons. The shape of the content is in
 * `types.ts`; each group's lessons in its own file.
 */

import type { BasicsGroup, BasicsLesson } from './types'
import { PRONUNCIATION_LESSONS } from './pronunciation'
import { CHARACTER_LESSONS } from './characters'
import { WRITING_LESSONS } from './writing'
import { SENTENCE_LESSONS } from './sentences'

export * from './types'

export const BASICS_GROUPS: BasicsGroup[] = [
  {
    id: 'pronunciation',
    title: 'Pronunciation',
    description: 'Learn {phonetic}, tones and Mandarin sounds.',
    intro: 'Hear how Mandarin works: the parts of a syllable, the sounds one group at a time, and the four tones. Start at the top.',
  },
  {
    id: 'characters',
    title: 'Chinese Characters',
    description: 'Understand radicals, components and how characters work.',
    intro: 'What a character is made of, how its parts are arranged, and the clues they give you.',
  },
  {
    id: 'writing',
    title: 'Writing Basics',
    description: 'Learn strokes, stroke order and handwriting.',
    intro: 'Watch each stroke, trace it, then write on your own.',
  },
  {
    id: 'sentences',
    title: 'First Sentences',
    description: 'Learn how to build simple Mandarin sentences.',
    intro: 'A few patterns, a dozen words, and your first conversation.',
  },
]

export const BASICS_LESSONS: BasicsLesson[] = [
  ...PRONUNCIATION_LESSONS,
  ...CHARACTER_LESSONS,
  ...WRITING_LESSONS,
  ...SENTENCE_LESSONS,
]

/**
 * The order the Continue card suggests lessons in. Pronunciation's core path
 * comes first (sounds before anything that needs them), then the other three
 * groups interleave, then the rest of the sound system — a learner who reads
 * only the Continue card still gets a bit of everything early.
 *
 * Every lesson appears exactly once (enforced by the tests).
 */
export const COURSE_ORDER: string[] = [
  'cb-p-how-sounds-work',
  'cb-p-your-system',
  'cb-p-first-consonants',
  'cb-p-first-vowels',
  'cb-p-combine',
  'cb-p-four-tones',
  'cb-p-recognize-tones',
  'cb-p-tone-pairs',
  'cb-c-what-is',
  'cb-w-strokes',
  'cb-s-introduce',
  'cb-c-structure',
  'cb-w-order',
  'cb-s-questions',
  'cb-p-more-consonants',
  'cb-c-components',
  'cb-w-first',
  'cb-s-no',
  'cb-p-jqx',
  'cb-c-patterns',
  'cb-w-structures',
  'cb-s-have',
  'cb-p-retroflex',
  'cb-p-zcs',
  'cb-c-recognize',
  'cb-w-practice',
  'cb-s-conversation',
  'cb-p-compound',
  'cb-p-nasals',
  'cb-p-spelling',
  'cb-p-tone-changes',
]
