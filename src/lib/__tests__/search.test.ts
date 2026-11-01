import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { hskFrequency } from '../../data/hskFrequency'
import { searchWords } from '../dictionary'
import { shortGloss } from '../definitions'
import { wordById } from '../../data/hskFrequency'

/*
 * Dictionary search should answer an English word with the word for it, the way
 * a translator would — not with phrases that mention it, and not with entries
 * whose pinyin happens to start with the same letters.
 */

const top = (query: string, n = 5) => searchWords(hskFrequency, query, 'all', 20).slice(0, n).map((w) => w.traditional)

describe('searchWords', () => {
  test('"ship" finds 船 first', () => {
    assert.equal(top('ship')[0], '船')
  })

  test('an English query is not answered by sound-alike pinyin', () => {
    const results = top('ship', 8)
    for (const coincidence of ['視頻', '食品', '失陪']) assert.ok(!results.includes(coincidence), `${coincidence} in ${results}`)
  })

  test('typed pinyin still finds its word', () => {
    assert.equal(top('shipin')[0], '視頻')
    assert.equal(top('ni')[0], '你')
  })

  test('everyday English words lead with the everyday word', () => {
    assert.equal(top('boat')[0], '船')
    assert.equal(top('car')[0], '車')
    assert.equal(top('cake')[0], '蛋糕')
    assert.equal(top('water')[0], '水')
  })

  test('a word that means the query first beats one that means it third', () => {
    // 酒店 is "wine shop; pub; hotel; … (Taiwan) hostess club".
    assert.equal(top('hotel')[0], '旅館')
    assert.equal(top('listen')[0], '聽')
  })

  test('a note in brackets is found, but ranks below the word itself', () => {
    assert.ok(top('alcohol', 20).includes('喝酒'))
    assert.ok(top('rice').indexOf('米') < top('rice').indexOf('酒') || !top('rice').includes('酒'))
  })

  test('a label in front keeps a specialist sense from being an exact answer', () => {
    // 睇 is "(Cantonese) to look; to see".
    assert.notEqual(top('see')[0], '睇')
  })
})

describe('glosses', () => {
  test('a meaning-narrowing note survives onto the card', () => {
    assert.equal(shortGloss(wordById('cc-喝酒')!), 'to drink (alcohol)')
  })

  test('grammar labels stay off the card', () => {
    assert.equal(shortGloss(wordById('cc-他')!), 'he')
  })

  test('simplified forms stand for the everyday traditional word', () => {
    for (const [id, trad] of [['cc-几', '幾'], ['cc-叶', '葉'], ['cc-价', '價'], ['cc-听', '聽'], ['cc-于', '於']]) {
      assert.equal(wordById(id)?.traditional, trad, id)
    }
  })

  test('米 is taught as rice, beside a sentence about rice', () => {
    assert.equal(shortGloss(wordById('cc-米')!), 'uncooked rice')
  })
})
