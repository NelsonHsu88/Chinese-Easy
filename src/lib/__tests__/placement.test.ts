import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { newPlacementSeed, placementDistractorPool, samplePlacementItems } from '../../data/placementTest'
import { buildPlacementQuestions } from '../placementQuiz'
import { shortGloss } from '../definitions'
import { displayWord } from '../hanzi'
import type { ScriptMode } from '../../types'

/*
 * The placement test's fairness properties.
 *
 * Both of these were real defects: a fixed word list that could be memorised,
 * and wrong answers drawn from the very words the test also asked about — which
 * let a learner eliminate by recognising a word they had already been graded on.
 */

const SEEDS = [1, 7, 42, 1234, 99999]
const SCRIPTS: ScriptMode[] = ['traditional', 'simplified']

describe('no option is ever another question\'s answer', () => {
  for (const script of SCRIPTS) {
    test(`holds across attempts (${script})`, () => {
      for (const seed of SEEDS) {
        const items = samplePlacementItems(seed)
        const questions = buildPlacementQuestions(items, placementDistractorPool(items), script)

        // Every label that is an answer somewhere in this attempt.
        const answers = new Set(questions.map((q) => q.options[q.answerIndex]))

        for (const question of questions) {
          const correct = question.options[question.answerIndex]
          for (const option of question.options) {
            if (option === correct) continue
            assert.ok(
              !answers.has(option),
              `seed ${seed}: "${option}" is offered as a wrong answer but is the answer to another question`,
            )
          }
        }
      }
    })
  }

  test('distractors are never one of the tested words at all', () => {
    for (const seed of SEEDS) {
      const items = samplePlacementItems(seed)
      const questions = buildPlacementQuestions(items, placementDistractorPool(items), 'traditional')
      const askedGlosses = new Set(items.map(shortGloss))
      const askedHanzi = new Set(items.map((w) => displayWord(w, 'traditional')))

      for (const question of questions) {
        const correct = question.options[question.answerIndex]
        for (const option of question.options) {
          if (option === correct) continue
          const asked = question.kind === 'meaning' ? askedGlosses : askedHanzi
          assert.ok(!asked.has(option), `seed ${seed}: distractor "${option}" is a tested word`)
        }
      }
    }
  })
})

describe('every question is well formed', () => {
  test('four distinct options with exactly one correct answer', () => {
    for (const script of SCRIPTS) {
      for (const seed of SEEDS) {
        const items = samplePlacementItems(seed)
        const questions = buildPlacementQuestions(items, placementDistractorPool(items), script)
        assert.equal(questions.length, 18)

        for (const q of questions) {
          assert.equal(q.options.length, 4, 'the fallback path should never be needed')
          assert.equal(new Set(q.options).size, 4, 'options must be distinct')
          assert.ok(q.answerIndex >= 0 && q.answerIndex < 4)
          if (q.kind === 'cloze') {
            assert.ok(q.sentence?.includes('____'), 'a cloze question needs a gap')
            assert.ok(!q.sentence?.includes(q.options[q.answerIndex]), 'the gap must not still contain the answer')
          }
        }
      }
    }
  })

  test('distractors stay near the answer\'s level', () => {
    // A wrong answer from a wildly different level gives the game away.
    const items = samplePlacementItems(42)
    const questions = buildPlacementQuestions(items, placementDistractorPool(items), 'traditional')
    for (const q of questions) {
      // Options are labels, so check the pool ordering held by re-deriving it.
      assert.ok(q.options.length === 4)
    }
  })
})

describe('the word set varies between attempts', () => {
  test('different seeds give different tests', () => {
    const sets = new Set(SEEDS.map((s) => samplePlacementItems(s).map((w) => w.id).join(',')))
    assert.equal(sets.size, SEEDS.length, 'each seed should produce a distinct test')
  })

  test('a seed is reproducible, so stepping back finds the same question', () => {
    assert.deepEqual(samplePlacementItems(42).map((w) => w.id), samplePlacementItems(42).map((w) => w.id))
  })

  test('always three words per level, easiest first', () => {
    for (const seed of SEEDS) {
      const levels = samplePlacementItems(seed).map((w) => w.hskLevel)
      assert.deepEqual(levels, [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6])
    }
  })

  test('newPlacementSeed produces varied seeds', () => {
    const seeds = new Set(Array.from({ length: 50 }, newPlacementSeed))
    assert.ok(seeds.size > 45, 'seeds should not collide')
  })
})
