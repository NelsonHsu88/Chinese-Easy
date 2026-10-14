import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pinyinTextToZhuyin, splitPinyinWord, ZHUYIN_SYLLABLE_GAP } from '../zhuyin'
import { STORIES } from '../../data/stories'

test('run-together pinyin splits on syllable boundaries', () => {
  assert.deepEqual(splitPinyinWord('xīngqíliù'), ['xīng', 'qí', 'liù'])
  assert.deepEqual(splitPinyinWord('gūniang'), ['gū', 'niang'])
  assert.deepEqual(splitPinyinWord("Xī'ān"), ['Xī', 'ān'])
})

test('every story title converts to zhuyin, one syllable per character', () => {
  for (const story of STORIES) {
    const zhuyin = pinyinTextToZhuyin(story.titlePinyin)
    assert.doesNotMatch(zhuyin, /[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/i, `${story.title}: ${zhuyin}`)
    const hanzi = Array.from(story.title).filter((ch) => /\p{Script=Han}/u.test(ch)).length
    assert.equal(zhuyin.split(ZHUYIN_SYLLABLE_GAP).length, hanzi, `${story.title}: ${zhuyin}`)
  }
})
