import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import importedWords from '../../data/importedWords.json'
import { segmentText } from '../textSegmentation'
import { allSenses, shortGloss } from '../definitions'
import { sentencesForWord, sentencesWith } from '../dictionary'
import type { VocabWord } from '../../types'

/*
 * The word bank's example sentences, checked against the app's own segmenter.
 *
 * `scripts/repairExampleSenses.mjs` is what enforces this, and the reason the
 * check also lives here is that the script's copy of the segmenter **silently
 * stopped matching the app's**. `lib/textSegmentation.ts` keys its index on
 * *both* scripts; the script keyed on `traditional` alone, so it saw a word
 * survive where the app absorbed it into a longer simplified token. It reported
 * 6170/6170 clean while 60 entries were showing the learner a sentence that does
 * not contain their word — 后 ("empress") illustrated by 后退！, where 后退 is
 * simplified 後退 and the entry's own sense is nowhere in it.
 *
 * A generator that grades its own homework can drift like that without anything
 * failing. This asserts the property against the committed data using the module
 * the app actually renders through, so the next divergence is a red test rather
 * than a quietly wrong flashcard.
 *
 * Only the bulk bank is covered. The curated entries in `hskFrequency.ts` carry
 * hand-written sentences that deliberately show a word inside a longer compound
 * (吃 in 吃飯, 家 in 回家) — correct Chinese, and not this rule's business.
 */

const bank = importedWords as VocabWord[]
const withExample = bank.filter((w) => w.example?.traditional)

describe('example sentences contain the word they illustrate', () => {
  test('the bank has not lost its example coverage', () => {
    assert.ok(
      withExample.length > 5900,
      `only ${withExample.length} entries carry an example — expected >5900`,
    )
  })

  for (const script of ['traditional', 'simplified'] as const) {
    test(`every attached sentence survives segmentation as its own word (${script})`, () => {
      /* Both scripts: simplified 大家好 absorbs 大 into 大家 even where the
         traditional text (once 大傢好, a conversion error) did not. */
      const offenders: string[] = []

      for (const word of withExample) {
        const sentence = word.example![script]
        const segments = segmentText(sentence, bank)
        if (!segments.some((seg) => seg.word?.id === word.id)) {
          offenders.push(`${word.traditional} (${word.pinyin}) — "${sentence}"`)
        }
      }

      assert.deepEqual(
        offenders.slice(0, 10),
        [],
        `${offenders.length} example sentence(s) do not contain their own word as a token. ` +
          `Re-run npx tsx scripts/repairExampleSenses.mjs.`,
      )
    })
  }

  test('traditional sentences carry no archaic conversion variants', () => {
    /* The corpus's traditional text was converted with a table that picked
       咊 for 和, 㕥 for 以, 懽 for 歡, 旹 for 時. */
    const variants = /[咊㕥懽旹㝡㳒囙乹眎咲㽞幇㧱㕘尒]/
    const offenders = withExample.filter((w) => variants.test(w.example!.traditional))
    assert.deepEqual(offenders.slice(0, 5).map((w) => w.example!.traditional), [])
  })

  test('a word card shows the sense its sentence uses', () => {
    const byForm = (simplified: string) => bank.find((w) => w.simplified === simplified)!
    // 看 was stored as kān "to look after"; 月 led with "moon" beside "It took months".
    assert.equal(byForm('看').pinyin, 'kàn')
    assert.equal(byForm('跑').pinyin, 'pǎo')
    const month = byForm('月')
    assert.match(month.example!.translation, /month/i)
    assert.equal(shortGloss(month), 'month')
    assert.equal(allSenses(month)[0], 'month')
  })

  test('no example sentence is empty or missing its translation', () => {
    for (const word of withExample) {
      const example = word.example!
      assert.ok(example.traditional.trim(), `${word.id} has a blank traditional example`)
      assert.ok(example.simplified.trim(), `${word.id} has a blank simplified example`)
      assert.ok(example.translation.trim(), `${word.id} has an example with no translation`)
    }
  })

  test('both script forms of a sentence have the same character count', () => {
    /* The same equal-length invariant the reader depends on: the narration
       cursor and `segmentSpans` count canonical characters while a converted
       form is drawn, so a length change there would desynchronise them. */
    const drift = withExample.filter(
      (w) => [...w.example!.traditional].length !== [...w.example!.simplified].length,
    )
    assert.deepEqual(
      drift.slice(0, 5).map((w) => `${w.id}: "${w.example!.traditional}" vs "${w.example!.simplified}"`),
      [],
      `${drift.length} example sentence(s) change length between scripts`,
    )
  })
})

describe('a word page lists sentences that use the word', () => {
  const big = bank.find((w) => w.simplified === '大')!

  test('only sentences containing the word as a word', () => {
    // 加拿大 ("Canada") contains the character 大 but not the word.
    const hits = sentencesForWord(bank, big, 'simplified')
    assert.ok(hits.length > 0)
    for (const hit of hits) {
      const ids = segmentText(hit.example.simplified, bank).map((seg) => seg.word?.id)
      assert.ok(ids.includes(big.id), `"${hit.example.simplified}" does not use 大 as a word`)
    }
    assert.ok(!hits.some((hit) => hit.example.simplified.includes('加拿大')))
  })

  test('each sentence once', () => {
    for (const hits of [sentencesForWord(bank, big, 'simplified'), sentencesWith(bank, '大', 'simplified')]) {
      const texts = hits.map((hit) => hit.example.traditional)
      assert.equal(new Set(texts).size, texts.length)
    }
  })

  test("the card's own sentence leads", () => {
    assert.equal(sentencesForWord(bank, big, 'simplified')[0].example.traditional, big.example!.traditional)
  })
})
