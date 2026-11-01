import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { mistakeCardsFor, weakCardsFor } from '../selectors'
import type { SrsCard } from '../../types'

/*
 * "I don't know" counts as a miss: the word shows under Weak words and in the
 * Mistakes drill, and a later right answer pays it back.
 */

const card = (wordId: string, lapses: number, recentLapses = 0, difficulty = 5) =>
  ({ wordId, lapses, recentLapses, difficulty }) as SrsCard

describe('weak words and mistakes', () => {
  test('a word never missed is in neither', () => {
    const deck = [card('a', 0)]
    assert.equal(weakCardsFor(deck).length, 0)
    assert.equal(mistakeCardsFor(deck).length, 0)
  })

  test('one "I don\'t know" (a recent miss, no FSRS lapse) puts a word in both', () => {
    const deck = [card('a', 0, 1)]
    assert.deepEqual(weakCardsFor(deck).map((c) => c.wordId), ['a'])
    assert.deepEqual(mistakeCardsFor(deck).map((c) => c.wordId), ['a'])
  })

  test('once paid back, a single old lapse is weak but no longer a mistake', () => {
    const deck = [card('a', 1, 0)]
    assert.equal(weakCardsFor(deck).length, 1)
    assert.equal(mistakeCardsFor(deck).length, 0)
  })

  test('two lapses stay a mistake', () => {
    assert.equal(mistakeCardsFor([card('a', 2, 0)]).length, 1)
  })

  test('the most recently missed come first', () => {
    const deck = [card('a', 3, 0), card('b', 0, 2), card('c', 0, 1)]
    assert.deepEqual(mistakeCardsFor(deck).map((c) => c.wordId), ['b', 'c', 'a'])
  })
})
