import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { hskFrequency } from '../../data/hskFrequency'
import { newWordsPool } from '../selectors'
import type { AppSettings, SrsCard } from '../../types'

/*
 * New Words serves the learner's level and one stretch level first. Once those
 * are used up it keeps going with the harder levels — commonest first — and
 * never drops below the learner's level.
 */

const settingsAt = (hskLevel: number) => ({ hskLevel, learningGoal: 'daily-life' }) as AppSettings
const cardsFor = (ids: string[]) => ids.map((wordId) => ({ wordId }) as SrsCard)

describe('newWordsPool', () => {
  test('leads with the learner’s level and the stretch level', () => {
    const pool = newWordsPool(hskFrequency, [], settingsAt(2))
    const firstBeyond = pool.findIndex((w) => w.hskLevel < 2 || w.hskLevel > 3)
    assert.ok(firstBeyond > 100, 'the window comes first')
    assert.ok(pool.slice(0, firstBeyond).every((w) => w.hskLevel === 2 || w.hskLevel === 3))
  })

  test('keeps offering words once the HSK window is used up', () => {
    const window = newWordsPool(hskFrequency, [], settingsAt(1)).filter((w) => w.hskLevel <= 2)
    const pool = newWordsPool(hskFrequency, cardsFor(window.map((w) => w.id)), settingsAt(1))
    assert.ok(pool.length > 1000, `still ${pool.length} words to learn`)
    assert.ok(pool.every((w) => w.hskLevel > 2), 'nothing already added comes back')
    // Above the window, commonest first: the next band leads.
    assert.equal(pool[0].hskLevel, 3)
  })

  test('never offers a word below the learner’s level', () => {
    for (const level of [2, 4, 6]) {
      assert.ok(newWordsPool(hskFrequency, [], settingsAt(level)).every((w) => w.hskLevel >= level))
    }
  })

  test('at the top level, only harder words follow once level 6 is done', () => {
    const top = newWordsPool(hskFrequency, [], settingsAt(6)).filter((w) => w.hskLevel === 6)
    const pool = newWordsPool(hskFrequency, cardsFor(top.map((w) => w.id)), settingsAt(6))
    assert.ok(pool.length > 0)
    assert.ok(pool.every((w) => w.hskLevel > 6))
  })

  test('the syllabus’s own words come before estimated ones', () => {
    const pool = newWordsPool(hskFrequency, [], settingsAt(3))
    const firstEstimate = pool.findIndex((w) => !w.hskOfficial)
    assert.ok(firstEstimate > 0)
    assert.ok(pool.slice(0, firstEstimate).every((w) => w.hskOfficial && (w.hskLevel === 3 || w.hskLevel === 4)))
  })

  test('HSK 3 never opens on HSK 1 words like 上学 or 下班', () => {
    const forms = newWordsPool(hskFrequency, [], settingsAt(3)).map((w) => w.simplified)
    for (const easy of ['上学', '下班', '米饭']) assert.ok(!forms.includes(easy), easy)
  })

  test('never offers the same word twice', () => {
    const pool = newWordsPool(hskFrequency, [], settingsAt(3))
    assert.equal(new Set(pool.map((w) => w.id)).size, pool.length)
  })
})
