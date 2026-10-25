import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { hskFrequency } from '../../data/hskFrequency'
import { searchWords } from '../dictionary'

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
})
