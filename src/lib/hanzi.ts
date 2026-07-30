import type { PhoneticScript, ScriptMode, VocabWord } from '../types'
import { pinyinToZhuyin } from './zhuyin'

export function displayWord(word: VocabWord, script: ScriptMode): string {
  return script === 'simplified' ? word.simplified : word.traditional
}

export function displayExample(word: VocabWord, script: ScriptMode): string {
  if (!word.example) return ''
  return script === 'simplified' ? word.example.simplified : word.example.traditional
}

/**
 * Word-level pinyin (one syllable per character) can be shown as zhuyin.
 * Example-sentence pinyin is always left as pinyin prose.
 */
export function displayPinyin(word: VocabWord, phoneticScript: PhoneticScript): string {
  return phoneticScript === 'zhuyin' ? pinyinToZhuyin(word.pinyin) : word.pinyin
}

/**
 * Folds tone marks off pinyin so a plain-ASCII query matches: "xue" finds "xué",
 * "lu" finds "lǜ". Decomposing to NFD splits the base letter from its combining
 * diacritic, which the range below then strips. Needed anywhere the user types
 * pinyin, since the word bank stores it fully accented.
 */
export function foldPinyin(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}
