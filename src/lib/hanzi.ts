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
 * The serif hanzi font family for a screen that follows the learner's script.
 *
 * Not a fallback chain. `font-hanzi` lists Noto Serif SC ahead of TC, which does
 * cover both character sets — but the two faces draw a good many shared
 * codepoints differently (骨 and 直 among them), so a traditional learner reading
 * through an SC-first chain gets mainland glyph forms for most of the screen.
 * Picking the face from the preference is the only way each script gets its own
 * regional forms, and doing it here keeps the mapping in one place rather than
 * as a conditional at every call site.
 *
 * Only for surfaces that render *vocabulary*. The reading library and story
 * reader are authored in traditional and are not converted, so they stay on the
 * `hanzi-tc*` families directly.
 */
const HANZI_FONTS = {
  /*
   * Spelled out rather than assembled from parts. Tailwind finds classes by
   * scanning source text for literal strings, so a template literal
   * (`font-hanzi-${face}-regular`) generates no CSS at all and every hanzi on
   * these screens silently falls back to the system serif — the kind of break
   * that type-checks, bundles and only shows up as slightly wrong-looking text.
   */
  traditional: {
    regular: 'font-hanzi-tc-regular',
    // The Medium face, which the story reader sets its prose in.
    medium: 'font-hanzi-tc',
    semibold: 'font-hanzi-tc-semibold',
  },
  simplified: {
    regular: 'font-hanzi-sc-regular',
    medium: 'font-hanzi-sc',
    semibold: 'font-hanzi-sc-semibold',
  },
} as const

export function hanziFont(
  script: ScriptMode,
  weight: 'regular' | 'medium' | 'semibold' = 'regular',
): string {
  return HANZI_FONTS[script][weight]
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
