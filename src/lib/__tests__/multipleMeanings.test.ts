import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { hskFrequency } from '../../data/hskFrequency'
import { hasMultipleMeanings, isTeachableWord } from '../definitions'
import type { VocabWord } from '../../types'

/*
 * The "Multiple meanings" tag: on words whose senses really differ, off words
 * whose senses are CC-CEDICT synonyms. Pinned on real bank entries, so a bank
 * rebuild that changes a definition shows up here.
 */

const bySimplified = (simplified: string): VocabWord => {
  const word = hskFrequency.find((w) => w.simplified === simplified)
  assert.ok(word, `${simplified} is in the bank`)
  return word
}

describe('hasMultipleMeanings', () => {
  test('flags characters with clearly different senses', () => {
    // speak / theory, quilt / passive, wait / rank, hit / from, flower / spend, book / to write
    for (const s of ['说', '被', '等', '打', '花', '书', '白', '长']) {
      assert.equal(hasMultipleMeanings(bySimplified(s)), true, s)
    }
  })

  test('leaves synonym lists alone', () => {
    // I; me; my — to know; to become aware of — very; quite — to thank; thanks
    for (const s of ['我', '我们', '知道', '很', '如果', '谢谢', '你好', '苹果', '告诉']) {
      assert.equal(hasMultipleMeanings(bySimplified(s)), false, s)
    }
  })

  test('contractions meet their spelled-out form', () => {
    // "haven't; hasn't; … to not have" is one meaning.
    assert.equal(hasMultipleMeanings(bySimplified('没有')), false)
  })

  test('a verb and the same idea as a noun is one meaning', () => {
    for (const s of ['旅行', '记忆', '讲话', '失望', '规定']) {
      assert.equal(hasMultipleMeanings(bySimplified(s)), false, s)
    }
  })

  test('"to this day" and "to one\'s surprise" are not verbs', () => {
    for (const s of ['至今', '居然']) assert.equal(hasMultipleMeanings(bySimplified(s)), false, s)
  })

  test('second everyday meanings the rules miss are listed by hand', () => {
    // to miss, to boast, to learn by heart, hotel, temple (of the head), to let down…
    for (const s of ['想', '找', '吹', '背', '牛', '老', '还是', '明白', '对不起', '加油', '厉害', '酒店', '太阳', '便宜', '出口']) {
      assert.equal(hasMultipleMeanings(bySimplified(s)), true, s)
    }
  })

  test('one idea seen from two sides carries no tag', () => {
    // song; to sing — to steal; thief — can; ability — hungry; to starve
    for (const s of ['歌', '偷', '能', '饿', '姓', '忙', '病', '感受', '恐怕', '加上']) {
      assert.equal(hasMultipleMeanings(bySimplified(s)), false, s)
    }
  })

  test('stays a minority of the common words', () => {
    const common = hskFrequency.filter(isTeachableWord).slice(0, 3000)
    const flagged = common.filter(hasMultipleMeanings).length
    assert.ok(flagged > 100 && flagged < common.length * 0.15, `${flagged} of ${common.length}`)
  })
})
