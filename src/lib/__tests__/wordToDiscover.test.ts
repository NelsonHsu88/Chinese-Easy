import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { hskFrequency } from '../../data/hskFrequency'
import { isSimpleExample, wordToDiscover, DISCOVER_EXAMPLE_MAX } from '../dictionary'

/*
 * Word to discover leads with one example sentence, so that sentence has to be
 * a clean one. The corpus behind the bank keeps English names in Latin script
 * (意圖's sentence was "Tom沒有意圖去邀請Mary…"), which is invisible until the
 * day the card happens to land on it.
 */

describe('isSimpleExample', () => {
  test('rejects Latin letters, including a name inside the Chinese', () => {
    assert.equal(isSimpleExample('Tom沒有禮貌。'), false)
    assert.equal(isSimpleExample('UN代表聯合國。'), false)
  })

  test('rejects a transliterated English name, in either script', () => {
    assert.equal(isSimpleExample('給湯姆活路！'), false)
    assert.equal(isSimpleExample('玛丽通常不戴首饰。'), false)
  })

  test('rejects the stray variant characters from the corpus conversion', () => {
    assert.equal(isSimpleExample('㨿說這房子是個鬼屋。'), false)
    assert.equal(isSimpleExample('據說這房子是個鬼屋。'), true)
  })

  test('counts characters, not punctuation', () => {
    assert.equal(isSimpleExample('謝謝您的好意。'), true)
    assert.equal(isSimpleExample('一'.repeat(DISCOVER_EXAMPLE_MAX) + '！'), true)
    assert.equal(isSimpleExample('一'.repeat(DISCOVER_EXAMPLE_MAX + 1)), false)
  })
})

describe('wordToDiscover', () => {
  test('every level always has a word, for a year of days, and its sentence is simple', () => {
    for (let level = 1; level <= 6; level++) {
      const seen = new Set<string>()
      for (let d = 0; d < 365; d++) {
        const day = new Date(Date.UTC(2026, 0, 1 + d)).toISOString().slice(0, 10)
        const word = wordToDiscover(hskFrequency, level, day)
        assert.ok(word, `no word for HSK ${level} on ${day}`)
        assert.ok(isSimpleExample(word.example!.traditional), `${word.traditional}: ${word.example!.traditional}`)
        seen.add(word.id)
      }
      /* The filter must not shrink the pool to a handful of repeats. */
      assert.ok(seen.size > 100, `HSK ${level} only offered ${seen.size} different words in a year`)
    }
  })
})
