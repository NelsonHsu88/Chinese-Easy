import {
  BASICS_GROUPS,
  BASICS_LESSONS,
  COURSE_ORDER,
  type BasicsGroupId,
  type BasicsLesson,
  type BasicsStep,
  type Phon,
  type Phonetic,
  type SoundSymbol,
  type Tone,
  type Zh,
} from '../data/basics'
import { pinyinToZhuyin } from './zhuyin'
import type { ScriptMode } from '../types'

/*
 * The rules of Chinese Basics, apart from its screens: how content is drawn
 * for this learner, which lesson comes next, and how far along a group is.
 *
 * ── Progress ────────────────────────────────────────────────────────────────
 * A finished lesson is its *key* in `completedLessonIds` (which also awards
 * the XP, once). A lesson that teaches symbols is keyed per notation —
 * `cb-p-first-consonants@zhuyin` — so switching systems keeps what was done in
 * the other and shows these lessons as new, while lessons about sounds, tones,
 * characters and grammar carry straight over. Where a learner left off inside
 * a lesson, and how their checks went, live in `BasicsProgress`.
 */

export interface BasicsProgress {
  /** The lesson last opened, by key. */
  lastKey: string | null
  /** Step to reopen an unfinished lesson at, by key. Cleared on finishing. */
  resume: Record<string, number>
  /** The latest finished run's checks, by key. */
  results: Record<string, { correct: number; total: number; at: string }>
}

export const EMPTY_BASICS_PROGRESS: BasicsProgress = { lastKey: null, resume: {}, results: {} }

/* ── Drawing content ──────────────────────────────────────────────────────── */

/** Hanzi for the learner's script. */
export function zhText(zh: Zh, script: ScriptMode): string {
  return typeof zh === 'string' ? zh : script === 'simplified' ? zh.s : zh.t
}

/** One side of a `Phon` pair. */
export function phon<T>(value: Phon<T>, phonetic: Phonetic): T {
  if (value && typeof value === 'object' && 'pinyin' in value && 'zhuyin' in value) {
    return (value as { pinyin: T; zhuyin: T })[phonetic]
  }
  return value as T
}

/**
 * English copy with `{{trad|simp}}` pairs and the `{script}` / `{phonetic}`
 * placeholders resolved.
 */
export function basicsText(text: Phon, script: ScriptMode, phonetic: Phonetic): string {
  return localizeString(phon(text, phonetic), script, phonetic)
    .replace(/\{script\}/g, script === 'simplified' ? 'simplified' : 'traditional')
    .replace(/\{phonetic\}/g, phonetic === 'zhuyin' ? 'zhuyin' : 'pinyin')
}

/**
 * The two inline markups any content string may carry: `{{學|学}}` (hanzi in
 * the learner's script, traditional first) and `[[nǐ hǎo]]` (a reading, drawn
 * as zhuyin for a zhuyin learner). A reading in prose is always marked, so a
 * learner is never shown a system they haven't been taught.
 */
export function localizeString(text: string, script: ScriptMode, phonetic: Phonetic): string {
  return text
    .replace(/\{\{([^|}]+)\|([^}]+)\}\}/g, (_, t: string, s: string) => (script === 'simplified' ? s : t))
    .replace(/\[\[([^\]]+)\]\]/g, (_, pinyin: string) => basicsReading(pinyin, phonetic))
}

/** A step (or any content) with every string's markup resolved for this learner. */
export function localize<T>(value: T, script: ScriptMode, phonetic: Phonetic): T {
  if (typeof value === 'string') return localizeString(value, script, phonetic) as T
  if (Array.isArray(value)) return value.map((v) => localize(v, script, phonetic)) as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = localize(v, script, phonetic)
    return out as T
  }
  return value
}

/** A space-separated pinyin reading in the learner's system. */
export function basicsReading(pinyin: string, phonetic: Phonetic): string {
  return phonetic === 'zhuyin' ? pinyinToZhuyin(pinyin) : pinyin
}

export function soundLabel(symbol: SoundSymbol, phonetic: Phonetic): string {
  return symbol[phonetic]
}

export const TONE_NAMES: Record<Tone, string> = {
  1: '1st tone',
  2: '2nd tone',
  3: '3rd tone',
  4: '4th tone',
  5: 'Neutral tone',
}

export const TONE_SHAPES: Record<Tone, string> = {
  1: 'high and level',
  2: 'rising',
  3: 'low and dipping',
  4: 'falling',
  5: 'short and light',
}

/** The steps this learner sees: those for the other notation are left out. */
export function stepsFor(lesson: BasicsLesson, phonetic: Phonetic): BasicsStep[] {
  return lesson.steps.filter((s) => !s.only || s.only === phonetic)
}

/** The steps as this learner draws them: their notation's, with markup resolved. */
export function localizedSteps(lesson: BasicsLesson, script: ScriptMode, phonetic: Phonetic): BasicsStep[] {
  return stepsFor(lesson, phonetic).map((s) => localize(s, script, phonetic))
}

export function objectivesFor(lesson: BasicsLesson, phonetic: Phonetic): Phon[] {
  const o = lesson.objectives
  return Array.isArray(o) ? o : o[phonetic]
}

/* ── Lessons and progress ─────────────────────────────────────────────────── */

export function lessonById(id: string): BasicsLesson | undefined {
  return BASICS_LESSONS.find((l) => l.id === id)
}

export function lessonsInGroup(group: BasicsGroupId): BasicsLesson[] {
  return BASICS_LESSONS.filter((l) => l.group === group)
}

export function groupById(id: string) {
  return BASICS_GROUPS.find((g) => g.id === id)
}

/** Where this lesson's progress is recorded. */
export function lessonKey(lesson: BasicsLesson, phonetic: Phonetic): string {
  return lesson.notation ? `${lesson.id}@${phonetic}` : lesson.id
}

export function isLessonDone(lesson: BasicsLesson, completed: readonly string[], phonetic: Phonetic): boolean {
  return completed.includes(lessonKey(lesson, phonetic))
}

export function groupProgress(group: BasicsGroupId, completed: readonly string[], phonetic: Phonetic) {
  const lessons = lessonsInGroup(group)
  const done = lessons.filter((l) => isLessonDone(l, completed, phonetic)).length
  return { done, total: lessons.length }
}

function ordered(): BasicsLesson[] {
  return COURSE_ORDER.map((id) => lessonById(id)).filter((l): l is BasicsLesson => !!l)
}

/** The first unfinished lesson in course order, or null once all are done. */
export function nextBasicsLesson(completed: readonly string[], phonetic: Phonetic): BasicsLesson | null {
  return ordered().find((l) => !isLessonDone(l, completed, phonetic)) ?? null
}

/**
 * The lesson the hub's Continue card offers: the one the learner is part-way
 * through if there is one, else the next unfinished lesson.
 */
export function featuredLesson(
  progress: BasicsProgress,
  completed: readonly string[],
  phonetic: Phonetic,
): { lesson: BasicsLesson; resumeAt: number } | null {
  const last = progress.lastKey ? lessonForKey(progress.lastKey) : null
  if (last && lessonKey(last, phonetic) === progress.lastKey && !isLessonDone(last, completed, phonetic)) {
    const at = progress.resume[progress.lastKey] ?? 0
    if (at > 0) return { lesson: last, resumeAt: at }
  }
  const next = nextBasicsLesson(completed, phonetic)
  return next ? { lesson: next, resumeAt: progress.resume[lessonKey(next, phonetic)] ?? 0 } : null
}

/**
 * Where "Next lesson" goes from a finished one: the next lesson in its own
 * group, else the first unfinished lesson in the course.
 */
export function lessonAfter(id: string, completed: readonly string[], phonetic: Phonetic): BasicsLesson | null {
  const lesson = lessonById(id)
  if (!lesson) return null
  const group = lessonsInGroup(lesson.group)
  const at = group.findIndex((l) => l.id === id)
  const inGroup = group.slice(at + 1).find((l) => !isLessonDone(l, completed, phonetic)) ?? group[at + 1]
  if (inGroup) return inGroup
  return ordered().find((l) => l.id !== id && !isLessonDone(l, completed, phonetic)) ?? null
}

export function lessonForKey(key: string): BasicsLesson | undefined {
  return lessonById(key.split('@')[0])
}

/** A step to reopen at, if it's still inside the lesson as this learner sees it. */
export function resumeStep(progress: BasicsProgress, key: string, stepCount: number): number {
  const at = progress.resume[key] ?? 0
  return at > 0 && at < stepCount ? at : 0
}

/* ── Updating progress (pure — AppContext stores the result) ─────────────── */

export function withStep(progress: BasicsProgress, key: string, index: number): BasicsProgress {
  return { ...progress, lastKey: key, resume: { ...progress.resume, [key]: index } }
}

export function withFinished(
  progress: BasicsProgress,
  key: string,
  result: { correct: number; total: number },
  at: string,
): BasicsProgress {
  const { [key]: _, ...resume } = progress.resume
  return { lastKey: key, resume, results: { ...progress.results, [key]: { ...result, at } } }
}
