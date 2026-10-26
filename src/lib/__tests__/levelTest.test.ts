import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { hskFrequency } from '../../data/hskFrequency'
import {
  buildLevelTest,
  levelTestOutcome,
  nextTestLevel,
  LEVEL_TEST_MAX_MISTAKES,
  LEVEL_TEST_QUESTIONS,
} from '../levelTest'
import { HSK_MAX_LEVEL } from '../selectors'

/*
 * The level-up test: twenty different words from the next level, never the
 * same set twice, only questions that can be marked, and two mistakes allowed.
 */

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const byId = new Map(hskFrequency.map((w) => [w.id, w]))

describe('level test', () => {
  for (const level of [2, 4, 6]) {
    for (const listening of [true, false]) {
      test(`HSK ${level}${listening ? '' : ', listening off'}: ${LEVEL_TEST_QUESTIONS} questions on distinct words of that level`, () => {
        const steps = buildLevelTest({ wordBank: hskFrequency, level, script: 'traditional', listening, random: seeded(level) })
        assert.equal(steps.length, LEVEL_TEST_QUESTIONS)
        const ids = steps.map((s) => (s.kind === 'match' || s.kind === 'flashcards' ? '' : s.wordId))
        assert.ok(steps.every((s) => s.kind === 'listening' || s.kind === 'fillGap'))
        if (!listening) assert.ok(steps.every((s) => s.kind === 'fillGap'))
        assert.equal(new Set(ids).size, ids.length)
        for (const id of ids) assert.equal(byId.get(id)?.hskLevel, level)
      })
    }
  }

  test('a new attempt asks a different set of words', () => {
    const words = (seed: number) =>
      new Set(
        buildLevelTest({ wordBank: hskFrequency, level: 3, script: 'simplified', listening: true, random: seeded(seed) }).map((s) =>
          s.kind === 'match' ? '' : s.wordId,
        ),
      )
    const a = words(1)
    const b = words(2)
    const shared = [...a].filter((id) => b.has(id)).length
    assert.ok(shared < LEVEL_TEST_QUESTIONS / 2, `attempts shared ${shared} words`)
  })

  test(`passes with ${LEVEL_TEST_MAX_MISTAKES} mistakes, fails on the next`, () => {
    assert.equal(levelTestOutcome(LEVEL_TEST_MAX_MISTAKES, 20, 20), 'pass')
    assert.equal(levelTestOutcome(LEVEL_TEST_MAX_MISTAKES + 1, 3, 20), 'fail')
    assert.equal(levelTestOutcome(0, 19, 20), 'running')
  })

  test('there is no test above the top level', () => {
    assert.equal(nextTestLevel(HSK_MAX_LEVEL), null)
    assert.equal(nextTestLevel(1), 2)
  })
})
