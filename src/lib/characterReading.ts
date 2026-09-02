import CHARACTER_PINYIN from '../data/characterPinyin.json'
import { pinyinSyllableToZhuyin } from './zhuyin'
import type { PhoneticScript } from '../types'

/*
 * A reading for any character, not just the ones the word bank knows as words.
 *
 * The reader and the dictionary both show a reading under each segmented word,
 * and both used to show nothing at all for a segment the bank couldn't match —
 * a name, a rare character, a bound form that only ever appears inside longer
 * words. Those are exactly the characters a learner most needs the sound of,
 * and leaving them blank made the gap look like a rendering fault.
 *
 * Data is `characterPinyin.json` (Unihan's kMandarin, via
 * scripts/buildCharacterPinyin.mjs). One reading per character, the commonest —
 * so a character with several (了 le/liǎo, 行 xíng/háng) shows its usual one
 * when it isn't part of a matched word. A matched word always wins, because its
 * own `pinyin` field knows which reading this particular word takes.
 */

let readings: Map<string, string> | null = null

/** The bundled reading for a single character, tone marks included. */
export function pinyinForCharacter(character: string): string | null {
  if (!readings) {
    readings = new Map()
    const chars = [...CHARACTER_PINYIN.chars]
    const pinyin = CHARACTER_PINYIN.pinyin.split(' ')
    for (let i = 0; i < chars.length; i++) readings.set(chars[i], pinyin[i])
  }
  return readings.get(character) ?? null
}

/**
 * A reading for a run of text, one syllable per character, in the learner's
 * chosen script.
 *
 * Empty when nothing in the run has a reading — punctuation, latin text, a
 * character outside the bundled index — so callers can treat '' as "show
 * nothing" rather than testing for it themselves. A partially covered run keeps
 * the characters it does know rather than being dropped whole.
 */
export function readingForText(text: string, phoneticScript: PhoneticScript): string {
  const parts: string[] = []
  let found = false

  for (const character of text) {
    const pinyin = pinyinForCharacter(character)
    if (!pinyin) continue
    found = true
    parts.push(phoneticScript === 'zhuyin' ? pinyinSyllableToZhuyin(pinyin) : pinyin)
  }

  return found ? parts.join(' ') : ''
}
