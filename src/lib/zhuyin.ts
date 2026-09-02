const TONE_VOWELS: Record<string, [string, number]> = {
  ā: ['a', 1], á: ['a', 2], ǎ: ['a', 3], à: ['a', 4],
  ō: ['o', 1], ó: ['o', 2], ǒ: ['o', 3], ò: ['o', 4],
  ē: ['e', 1], é: ['e', 2], ě: ['e', 3], è: ['e', 4],
  ī: ['i', 1], í: ['i', 2], ǐ: ['i', 3], ì: ['i', 4],
  ū: ['u', 1], ú: ['u', 2], ǔ: ['u', 3], ù: ['u', 4],
  ǖ: ['ü', 1], ǘ: ['ü', 2], ǚ: ['ü', 3], ǜ: ['ü', 4],
}

const INITIALS: Record<string, string> = {
  b: 'ㄅ', p: 'ㄆ', m: 'ㄇ', f: 'ㄈ',
  d: 'ㄉ', t: 'ㄊ', n: 'ㄋ', l: 'ㄌ',
  g: 'ㄍ', k: 'ㄎ', h: 'ㄏ',
  j: 'ㄐ', q: 'ㄑ', x: 'ㄒ',
  zh: 'ㄓ', ch: 'ㄔ', sh: 'ㄕ', r: 'ㄖ',
  z: 'ㄗ', c: 'ㄘ', s: 'ㄙ',
}

const FINALS: Record<string, string> = {
  a: 'ㄚ', o: 'ㄛ', e: 'ㄜ', ai: 'ㄞ', ei: 'ㄟ', ao: 'ㄠ', ou: 'ㄡ',
  an: 'ㄢ', en: 'ㄣ', ang: 'ㄤ', eng: 'ㄥ', ong: 'ㄨㄥ', er: 'ㄦ',
  i: 'ㄧ', ia: 'ㄧㄚ', ie: 'ㄧㄝ', iao: 'ㄧㄠ', iu: 'ㄧㄡ', iou: 'ㄧㄡ',
  ian: 'ㄧㄢ', in: 'ㄧㄣ', iang: 'ㄧㄤ', ing: 'ㄧㄥ', iong: 'ㄩㄥ',
  u: 'ㄨ', ua: 'ㄨㄚ', uo: 'ㄨㄛ', uai: 'ㄨㄞ', ui: 'ㄨㄟ', uei: 'ㄨㄟ',
  uan: 'ㄨㄢ', un: 'ㄨㄣ', uen: 'ㄨㄣ', uang: 'ㄨㄤ', ueng: 'ㄨㄥ',
  ü: 'ㄩ', üe: 'ㄩㄝ', üan: 'ㄩㄢ', ün: 'ㄩㄣ',
}

// Zero-initial syllables (start with a bare vowel, or the glides y-/w-) are
// spelled irregularly in pinyin, so they get a direct lookup instead of
// being decomposed into initial + final.
const ZERO_INITIAL: Record<string, string> = {
  a: 'ㄚ', o: 'ㄛ', e: 'ㄜ', ai: 'ㄞ', ei: 'ㄟ', ao: 'ㄠ', ou: 'ㄡ',
  an: 'ㄢ', en: 'ㄣ', ang: 'ㄤ', eng: 'ㄥ', er: 'ㄦ',
  yi: 'ㄧ', ya: 'ㄧㄚ', ye: 'ㄧㄝ', yao: 'ㄧㄠ', you: 'ㄧㄡ', yan: 'ㄧㄢ',
  yin: 'ㄧㄣ', yang: 'ㄧㄤ', ying: 'ㄧㄥ', yong: 'ㄩㄥ',
  wu: 'ㄨ', wa: 'ㄨㄚ', wo: 'ㄨㄛ', wai: 'ㄨㄞ', wei: 'ㄨㄟ', wan: 'ㄨㄢ',
  wen: 'ㄨㄣ', wang: 'ㄨㄤ', weng: 'ㄨㄥ',
  yu: 'ㄩ', yue: 'ㄩㄝ', yuan: 'ㄩㄢ', yun: 'ㄩㄣ',
}

const TONE_MARKS: Record<number, string> = { 1: '', 2: 'ˊ', 3: 'ˇ', 4: 'ˋ', 5: '˙' }

/**
 * Splits a pinyin syllable into its toneless base and tone number, 5 for
 * neutral. Shared with the pronunciation scorer, which needs the same reading of
 * a tone mark that the zhuyin converter does.
 */
export function splitTone(rawSyllable: string): { base: string; tone: number } {
  let base = ''
  let tone = 5
  for (const ch of rawSyllable) {
    const marked = TONE_VOWELS[ch]
    if (marked) {
      base += marked[0]
      tone = marked[1]
    } else {
      base += ch
    }
  }
  return { base, tone }
}

function syllableToZhuyin(base: string): string | null {
  if (ZERO_INITIAL[base]) return ZERO_INITIAL[base]

  let initial = ''
  let rest = base
  if (base.startsWith('zh') || base.startsWith('ch') || base.startsWith('sh')) {
    initial = base.slice(0, 2)
    rest = base.slice(2)
  } else if (/^[bpmfdtnlgkhjqxrzcs]/.test(base)) {
    initial = base[0]
    rest = base.slice(1)
  }

  if (!initial) return null

  // "Empty rime" — zhi/chi/shi/ri/zi/ci/si have no vowel symbol in zhuyin.
  if (rest === 'i' && ['zh', 'ch', 'sh', 'r', 'z', 'c', 's'].includes(initial)) {
    return INITIALS[initial]
  }

  // j/q/x are always followed by ü, but pinyin drops the umlaut in writing.
  if (initial === 'j' || initial === 'q' || initial === 'x') {
    if (rest === 'u') rest = 'ü'
    else if (rest === 'ue') rest = 'üe'
    else if (rest === 'uan') rest = 'üan'
    else if (rest === 'un') rest = 'ün'
  }

  const initialZhuyin = INITIALS[initial]
  const finalZhuyin = FINALS[rest]
  if (!initialZhuyin || !finalZhuyin) return null
  return initialZhuyin + finalZhuyin
}

/**
 * Converts a single space-delimited pinyin token (one syllable, tone marks
 * included) to zhuyin. Falls back to the original token when it can't be
 * confidently parsed (e.g. multiple syllables run together with no space).
 */
export function pinyinSyllableToZhuyin(token: string): string {
  const cleaned = token.trim().toLowerCase()
  if (!cleaned) return token
  const { base, tone } = splitTone(cleaned)
  const zhuyin = syllableToZhuyin(base)
  if (!zhuyin) return token
  return tone === 5 ? TONE_MARKS[5] + zhuyin : zhuyin + TONE_MARKS[tone]
}

/** Converts space-separated pinyin (one syllable per token) to zhuyin. */
export function pinyinToZhuyin(pinyin: string): string {
  return pinyin
    .split(' ')
    .map((token) => pinyinSyllableToZhuyin(token))
    .join(' ')
}
