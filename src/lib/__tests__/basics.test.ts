import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BASICS_GROUPS, BASICS_LESSONS, COURSE_ORDER } from '../../data/basics'
import {
  EMPTY_BASICS_PROGRESS,
  featuredLesson,
  lessonAfter,
  lessonById,
  lessonKey,
  resumeStep,
  stepsFor,
  withFinished,
  withStep,
  basicsText,
  localizedSteps,
  objectivesFor,
} from '../basics'
import { toSimplifiedText } from '../scriptConversion'

const AT = '2026-01-01T00:00:00.000Z'

test('every lesson appears in COURSE_ORDER exactly once', () => {
  const ids = BASICS_LESSONS.map((l) => l.id)
  assert.equal(new Set(ids).size, ids.length, 'duplicate lesson id')
  assert.equal(new Set(COURSE_ORDER).size, COURSE_ORDER.length, 'duplicate in COURSE_ORDER')
  assert.deepEqual([...COURSE_ORDER].sort(), [...ids].sort())
})

test('every lesson belongs to a group, and every group has lessons', () => {
  const groups = new Set(BASICS_GROUPS.map((g) => g.id))
  for (const l of BASICS_LESSONS) assert.ok(groups.has(l.group), `${l.id}: ${l.group}`)
  for (const g of groups) assert.ok(BASICS_LESSONS.some((l) => l.group === g), g)
})

test('checks are answerable and sentence tiles never start solved', () => {
  for (const lesson of BASICS_LESSONS) {
    for (const phonetic of ['pinyin', 'zhuyin'] as const) {
      assert.ok(stepsFor(lesson, phonetic).length > 0, `${lesson.id} has no steps for ${phonetic}`)
    }
    for (const step of lesson.steps) {
      if (step.kind === 'choice') {
        assert.ok(step.answer >= 0 && step.answer < step.options.length, `${lesson.id}: answer out of range`)
      }
      if (step.kind === 'sentence-builder') {
        assert.deepEqual([...step.shuffled].sort(), step.words.map((_, i) => i), `${lesson.id}: shuffled isn't a permutation`)
        assert.notDeepEqual(step.shuffled, step.words.map((_, i) => i), `${lesson.id}: tiles start solved`)
      }
    }
  }
})

test('notation lessons keep progress per system; others share it', () => {
  const notation = BASICS_LESSONS.find((l) => l.notation)!
  const plain = BASICS_LESSONS.find((l) => !l.notation)!
  assert.notEqual(lessonKey(notation, 'pinyin'), lessonKey(notation, 'zhuyin'))
  assert.equal(lessonKey(plain, 'pinyin'), lessonKey(plain, 'zhuyin'))
})

test('a new learner is offered the first lesson in course order', () => {
  const offer = featuredLesson(EMPTY_BASICS_PROGRESS, [], 'pinyin')
  assert.equal(offer?.lesson.id, COURSE_ORDER[0])
  assert.equal(offer?.resumeAt, 0)
})

test('a lesson left part-way is offered again at its step', () => {
  const lesson = lessonById(COURSE_ORDER[3])!
  const key = lessonKey(lesson, 'pinyin')
  const progress = withStep(EMPTY_BASICS_PROGRESS, key, 2)
  const offer = featuredLesson(progress, [], 'pinyin')
  assert.equal(offer?.lesson.id, lesson.id)
  assert.equal(offer?.resumeAt, 2)
  // Switching systems doesn't resume a notation lesson's other track.
  if (lesson.notation) assert.equal(featuredLesson(progress, [], 'zhuyin')?.lesson.id, COURSE_ORDER[0])
})

test('finishing clears the resume point and records the result', () => {
  const key = COURSE_ORDER[0]
  const started = withStep(EMPTY_BASICS_PROGRESS, key, 3)
  const done = withFinished(started, key, { correct: 2, total: 3 }, AT)
  assert.equal(key in done.resume, false)
  assert.deepEqual(done.results[key], { correct: 2, total: 3, at: AT })
  assert.equal(resumeStep(done, key, 10), 0)
})

test('a resume point outside the lesson is ignored', () => {
  const progress = withStep(EMPTY_BASICS_PROGRESS, 'x', 9)
  assert.equal(resumeStep(progress, 'x', 5), 0)
  assert.equal(resumeStep(progress, 'x', 12), 9)
})

test('the course is complete only when every lesson is done', () => {
  const all = BASICS_LESSONS.map((l) => lessonKey(l, 'pinyin'))
  assert.equal(featuredLesson(EMPTY_BASICS_PROGRESS, all, 'pinyin'), null)
  const last = BASICS_LESSONS[BASICS_LESSONS.length - 1]
  assert.equal(lessonAfter(last.id, all, 'pinyin'), null)
})

/* ── What each learner is shown ───────────────────────────────────────────── */

/** Every string a learner can read in a lesson, with `Phon` pairs and markup resolved. */
function shownStrings(lesson: (typeof BASICS_LESSONS)[number], script: 'traditional' | 'simplified', phonetic: 'pinyin' | 'zhuyin'): string[] {
  const out: string[] = []
  const walk = (v: unknown, key = '') => {
    // Readings and sound symbols are drawn in the learner's system by the components.
    if (key === 'pinyin' || key === 'symbol' || key === 'zh' || key === 'audio' || key === 'character' || key === 'end') {
      if (key === 'zh' || key === 'audio' || key === 'character') {
        if (typeof v === 'string') out.push(v)
        else if (v && typeof v === 'object' && 's' in v) out.push(script === 'simplified' ? (v as unknown as { s: string }).s : (v as unknown as { t: string }).t)
      }
      return
    }
    if (typeof v === 'string') out.push(basicsText(v, script, phonetic))
    else if (Array.isArray(v)) v.forEach((x) => walk(x))
    else if (v && typeof v === 'object') {
      if ('pinyin' in v && 'zhuyin' in v && key !== 'symbol') return walk((v as Record<string, unknown>)[phonetic])
      for (const [k, x] of Object.entries(v)) walk(x, k)
    }
  }
  walk(lesson.title)
  walk(lesson.subtitle)
  walk(objectivesFor(lesson, phonetic))
  walk(localizedSteps(lesson, script, phonetic))
  return out
}

test('a simplified learner never sees a traditional-only character', () => {
  for (const lesson of BASICS_LESSONS) {
    for (const phonetic of ['pinyin', 'zhuyin'] as const) {
      for (const s of shownStrings(lesson, 'simplified', phonetic)) {
        // 或 is the traditional inner part of 國, shown only in the traditional gloss.
        assert.equal(toSimplifiedText(s), s, `${lesson.id}: “${s}”`)
      }
    }
  }
})

test('no markup reaches the screen', () => {
  for (const lesson of BASICS_LESSONS) {
    for (const script of ['traditional', 'simplified'] as const) {
      for (const s of shownStrings(lesson, script, 'zhuyin')) {
        assert.ok(!/\[\[|\]\]|\{\{|\}\}/.test(s), `${lesson.id}: “${s}”`)
      }
    }
  }
})

test('a zhuyin learner sees no pinyin outside the lessons that teach it', () => {
  const TONED = /[āáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜ]/
  for (const lesson of BASICS_LESSONS) {
    if (lesson.notation) continue
    for (const s of shownStrings(lesson, 'traditional', 'zhuyin')) {
      assert.ok(!TONED.test(s), `${lesson.id}: “${s}”`)
    }
  }
})
