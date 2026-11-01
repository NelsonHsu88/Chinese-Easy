import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { newPlacementSeed, placementSplit } from '../../data/placementTest'
import { buildPlacementQuestion } from '../placementQuiz'
import {
  estimatePlacement,
  planPlacement,
  PLACEMENT_QUESTIONS,
  PLACEMENT_WARMUP,
} from '../placement'
import { shortGloss } from '../definitions'
import { displayWord } from '../hanzi'
import type { PlacementAnswer, ScriptMode, VocabWord } from '../../types'

/*
 * The adaptive placement test: easy warm-up, then up a level on a right
 * answer and down on a miss; a fair estimate at the end; and wrong answers that
 * are never another question's answer.
 */

const SEEDS = [1, 7, 42, 1234, 99999]
const SCRIPTS: ScriptMode[] = ['traditional', 'simplified']

/** Sits a whole attempt as a learner who knows every word up to `level` (with optional misses at given question numbers). */
function sit(seed: number, level: number, missAt: number[] = []) {
  const { questionWords } = placementSplit(seed)
  const answers: PlacementAnswer[] = []
  for (;;) {
    const plan = planPlacement(questionWords, answers)
    if (!plan.next) return { asked: plan.asked, answers, estimate: estimatePlacement(plan.asked, answers) }
    const right = plan.next.hskLevel <= level && !missAt.includes(answers.length + 1)
    answers.push({ wordId: plan.next.id, rating: right ? 'know' : 'unknown' })
  }
}

describe('the test adapts', () => {
  test(`opens on ${PLACEMENT_WARMUP} easy HSK 1 questions`, () => {
    for (const seed of SEEDS) {
      const { asked } = sit(seed, 6)
      assert.deepEqual(asked.slice(0, PLACEMENT_WARMUP).map((w) => w.hskLevel), [1, 1, 1])
    }
  })

  test('climbs a level after each right answer', () => {
    const { asked } = sit(42, 6)
    assert.deepEqual(asked.slice(PLACEMENT_WARMUP, PLACEMENT_WARMUP + 5).map((w) => w.hskLevel), [2, 3, 4, 5, 6])
  })

  test('steps down a level after a miss', () => {
    const { asked, answers } = sit(42, 3)
    // The first ten: later on, a level hovered around runs out of words and its neighbour stands in.
    for (let i = PLACEMENT_WARMUP; i + 1 < Math.min(asked.length, 10); i++) {
      const expected = Math.min(6, Math.max(1, asked[i].hskLevel + (answers[i].rating === 'know' ? 1 : -1)))
      assert.equal(asked[i + 1].hskLevel, expected, `question ${i + 2}`)
    }
  })

  test(`asks at most ${PLACEMENT_QUESTIONS} questions, never the same word twice`, () => {
    for (const seed of SEEDS) {
      for (const level of [1, 2, 3, 4, 5, 6]) {
        const { asked } = sit(seed, level)
        assert.ok(asked.length <= PLACEMENT_QUESTIONS)
        assert.equal(new Set(asked.map((w) => w.id)).size, asked.length)
      }
    }
  })

  test('a complete beginner stops after the warm-up', () => {
    const { asked, estimate } = sit(7, 0)
    assert.equal(asked.length, PLACEMENT_WARMUP)
    assert.equal(estimate, 1)
  })
})

describe('the estimate', () => {
  for (const level of [1, 2, 3, 4, 5, 6]) {
    test(`a learner who knows HSK 1–${level} is placed at HSK ${level}`, () => {
      for (const seed of SEEDS) assert.equal(sit(seed, level).estimate, level, `seed ${seed}`)
    })
  }

  test('one early slip does not sink a fluent learner', () => {
    for (const seed of SEEDS) assert.equal(sit(seed, 6, [2]).estimate, 6)
    for (const seed of SEEDS) assert.equal(sit(seed, 6, [5]).estimate, 6)
  })

  test('one lucky guess at a hard level is not enough', () => {
    const word = (id: string, hskLevel: number) => ({ id, hskLevel }) as VocabWord
    const asked = [word('a', 1), word('b', 1), word('c', 1), word('d', 5)]
    const answers: PlacementAnswer[] = asked.map((w) => ({ wordId: w.id, rating: 'know' }))
    assert.equal(estimatePlacement(asked, answers), 1)
  })

  test('a saved attempt replays to the same next word', () => {
    const { questionWords } = placementSplit(42)
    const { answers } = sit(42, 3)
    const half = answers.slice(0, 6)
    assert.equal(planPlacement(questionWords, half).next?.id, sit(42, 3).asked[6].id)
  })

  test('answers that no longer fit the attempt are dropped', () => {
    const { questionWords } = placementSplit(42)
    const plan = planPlacement(questionWords, [{ wordId: 'not-a-word', rating: 'know' }])
    assert.equal(plan.asked.length, 0)
    assert.ok(plan.next)
  })
})

describe('the questions are fair', () => {
  test('every word sits at its own official HSK level', () => {
    const { questionWords, distractors } = placementSplit(1)
    questionWords.forEach((words, i) => words.forEach((w) => assert.equal(w.hskLevel, i + 1, w.simplified)))
    for (const w of [...questionWords.flat(), ...distractors]) assert.ok(w.hskOfficial, `${w.simplified} is on the syllabus`)
  })

  for (const script of SCRIPTS) {
    test(`no wrong option is ever a word the test could ask (${script})`, () => {
      for (const seed of SEEDS) {
        const { questionWords, distractors } = placementSplit(seed)
        const candidates = questionWords.flat()
        const glosses = new Set(candidates.map(shortGloss))
        const hanzi = new Set(candidates.map((w) => displayWord(w, script)))
        candidates.forEach((word, index) => {
          const q = buildPlacementQuestion(word, index, { distractors, candidates, script })
          const correct = q.options[q.answerIndex]
          assert.equal(q.options.length, 4)
          assert.equal(new Set(q.options).size, 4)
          for (const option of q.options) {
            if (option === correct) continue
            assert.ok(!(q.kind === 'meaning' ? glosses : hanzi).has(option), `seed ${seed}: "${option}" is a candidate`)
          }
          if (q.kind === 'cloze') {
            assert.ok(q.sentence?.includes('____'))
            assert.ok(!q.sentence?.includes(correct), 'the gap must not still contain the answer')
          }
        })
      }
    })
  }

  test('cloze questions carry no translation', () => {
    const { questionWords, distractors } = placementSplit(1)
    const candidates = questionWords.flat()
    const qs = candidates.map((w, i) => buildPlacementQuestion(w, i, { distractors, candidates, script: 'simplified' }))
    assert.ok(qs.some((q) => q.kind === 'cloze'))
    for (const q of qs) assert.ok(!('translation' in q))
  })

  test('a retake gets different words', () => {
    const firsts = new Set(SEEDS.map((s) => sit(s, 3).asked.map((w) => w.id).join(',')))
    assert.ok(firsts.size > 1)
  })

  test('newPlacementSeed produces varied seeds', () => {
    const seeds = new Set(Array.from({ length: 50 }, newPlacementSeed))
    assert.ok(seeds.size > 45)
  })
})
