import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { hskFrequency } from '../../data/hskFrequency'
import {
  blankTranslation,
  buildMixedSteps,
  clozeFor,
  gapDistractors,
  pickMatchWords,
  isListeningPaused,
  withoutListening,
  MATCH_MIN_DECK,
  MATCH_PAIRS,
} from '../mixedDrills'
import { displayWord } from '../hanzi'
import { shortGloss } from '../definitions'
import type { ScriptMode, VocabWord } from '../../types'

/*
 * Mixed Drills' rules that nobody would see break by looking at one screen:
 * Match the Pairs only for a deck of more than five words, boards rotating
 * through the deck rather than repeating, and a gap that is always the word
 * itself, once, with options that can't be told apart by length.
 */

/** A deterministic random, so a failing run can be replayed. */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const SCRIPTS: ScriptMode[] = ['traditional', 'simplified']
/* Curated words: all carry an example, so there is a gap to cut. */
const withExamples = hskFrequency.filter((w) => w.example?.traditional && w.example.translation).slice(0, 40)
const deck = withExamples.slice(0, 20)

describe('match the pairs', () => {
  test(`is left out for a deck of ${MATCH_MIN_DECK - 1} words`, () => {
    const small = deck.slice(0, MATCH_MIN_DECK - 1)
    const steps = buildMixedSteps({ dueWords: small, deckWords: small, wordBank: hskFrequency, script: 'traditional', matchedAt: {}, random: seeded(1) })
    assert.ok(steps.length > 0)
    assert.ok(steps.every((s) => s.kind !== 'match'))
  })

  test(`is included for a deck of ${MATCH_MIN_DECK} words`, () => {
    const six = deck.slice(0, MATCH_MIN_DECK)
    const steps = buildMixedSteps({ dueWords: six, deckWords: six, wordBank: hskFrequency, script: 'traditional', matchedAt: {}, random: seeded(2) })
    assert.ok(steps.some((s) => s.kind === 'match'))
  })

  test('is left out when nothing is due, so an empty queue stays empty', () => {
    const steps = buildMixedSteps({ dueWords: [], deckWords: deck, wordBank: hskFrequency, script: 'traditional', matchedAt: {}, random: seeded(3) })
    assert.equal(steps.length, 0)
  })

  test('rotates through the whole deck before repeating a word', () => {
    const matchedAt: Record<string, string> = {}
    const seen = new Set<string>()
    let clock = Date.UTC(2026, 0, 1)
    const rounds = Math.floor(deck.length / MATCH_PAIRS)
    for (let r = 0; r < rounds; r++) {
      const words = pickMatchWords(deck, matchedAt, 'traditional', new Set(), MATCH_PAIRS, seeded(10 + r))
      assert.equal(words.length, MATCH_PAIRS)
      for (const w of words) {
        assert.ok(!seen.has(w.id), `${w.traditional} came back before the deck was through`)
        seen.add(w.id)
        matchedAt[w.id] = new Date(clock).toISOString()
      }
      clock += 60_000
    }
  })

  test('never puts two identical meanings or forms on one board', () => {
    for (const script of SCRIPTS) {
      for (let seed = 1; seed <= 10; seed++) {
        const words = pickMatchWords(hskFrequency.slice(0, 200), {}, script, new Set(), MATCH_PAIRS, seeded(seed))
        assert.equal(new Set(words.map((w) => shortGloss(w).toLowerCase())).size, words.length)
        assert.equal(new Set(words.map((w) => displayWord(w, script))).size, words.length)
      }
    }
  })
})

describe('fill the gap', () => {
  for (const script of SCRIPTS) {
    test(`the gap is the word itself, and options match its length (${script})`, () => {
      let built = 0
      for (const word of withExamples) {
        const cloze = clozeFor(word, script, hskFrequency)
        if (!cloze) continue
        built++
        assert.equal(cloze.segments[cloze.gap].word?.id, word.id)
        assert.equal(cloze.segments.filter((s) => s.word?.id === word.id).length, 1)

        const options = gapDistractors(word, cloze, deck, hskFrequency, script, seeded(built))
        const length = [...displayWord(word, script)].length
        const forms = new Set([displayWord(word, script)])
        for (const option of options) {
          assert.equal([...displayWord(option, script)].length, length)
          forms.add(displayWord(option, script))
        }
        assert.equal(forms.size, options.length + 1, 'two options look the same')
      }
      assert.ok(built > 20, `only ${built} curated words produced a gap`)
    })
  }

  test('blanks the meaning in the translation only when it is plainly there', () => {
    const drink = { pinyin: 'hē', definition: 'to drink', traditional: '喝', simplified: '喝' } as VocabWord
    assert.equal(blankTranslation('Every morning I drink a cup of tea.', drink), 'Every morning I ___ a cup of tea.')
    assert.equal(blankTranslation('He drinks tea.', drink), 'He ___ tea.')
    assert.equal(blankTranslation('Tea, please.', drink), 'Tea, please.')
    assert.equal(blankTranslation('I drink, you drink.', drink), 'I drink, you drink.')
  })
})

describe("can't listen now", () => {
  const byId = new Map(hskFrequency.map((w) => [w.id, w]))
  const getWord = (id: string) => byId.get(id)
  const sentenceOf = (id: string) => getWord(id)?.example?.traditional

  test('a paused session plans no listening, and no word or sentence twice', () => {
    for (const script of SCRIPTS) {
      for (let seed = 1; seed <= 5; seed++) {
        const steps = buildMixedSteps({ dueWords: deck, deckWords: deck, wordBank: hskFrequency, script, matchedAt: {}, listening: false, random: seeded(seed) })
        const gaps = steps.filter((s) => s.kind === 'fillGap')
        assert.ok(gaps.length > 0)
        assert.ok(steps.every((s) => s.kind !== 'listening'))
        assert.equal(new Set(gaps.map((s) => s.wordId)).size, gaps.length)
        assert.equal(new Set(gaps.map((s) => sentenceOf(s.wordId))).size, gaps.length)
        assert.ok(steps.some((s) => s.kind === 'match'), 'boards stay in')
      }
    }
  })

  test('swaps the rest of a session to gaps, leaving what was done alone and repeating nothing', () => {
    for (let seed = 1; seed <= 5; seed++) {
      const steps = buildMixedSteps({ dueWords: deck, deckWords: deck, wordBank: hskFrequency, script: 'traditional', matchedAt: {}, random: seeded(seed) })
      const at = steps.findIndex((s, i) => i > 0 && s.kind === 'listening')
      assert.ok(at > 0)
      // An "I don't know" re-queue: the word on screen also waits at the end.
      const withCopy = [...steps, steps[at]]
      const next = withoutListening(withCopy, at, { getWord, deckWords: deck, wordBank: hskFrequency, script: 'traditional', random: seeded(seed) })

      assert.deepEqual(next.slice(0, at), withCopy.slice(0, at))
      assert.ok(next.slice(at).every((s) => s.kind !== 'listening'))
      const gaps = next.filter((s) => s.kind === 'fillGap')
      assert.equal(new Set(gaps.map((s) => s.wordId)).size, gaps.length)
      assert.equal(new Set(gaps.map((s) => sentenceOf(s.wordId))).size, gaps.length)
      assert.equal(next.filter((s) => s.kind === 'match').length, steps.filter((s) => s.kind === 'match').length)
    }
  })

  test('lasts until its time and no longer', () => {
    const now = Date.UTC(2026, 9, 2, 12)
    const in30 = new Date(now + 30 * 60_000).toISOString()
    assert.equal(isListeningPaused(in30, now), true)
    assert.equal(isListeningPaused(in30, now + 30 * 60_000), false)
    assert.equal(isListeningPaused(null, now), false)
    assert.equal(isListeningPaused('garbage', now), false)
  })
})
