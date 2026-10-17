import type { Phon, SoundSymbol, ZhItem } from './types'

/*
 * The Mandarin sound inventory, written in both systems: the 21 initials and
 * the finals, each with where the mouth goes and one real syllable that
 * carries it. Drives the Sound Explorer and the symbols lessons draw.
 *
 * A sound is never spoken on its own (see `types.ts` → Audio): the example is
 * what plays. Examples are single characters with one common reading, so the
 * device voice has no choice of pronunciation to get wrong.
 */

export type SoundKind = 'initial' | 'final'

export interface SoundEntry extends SoundSymbol {
  kind: SoundKind
  /** Section in the Sound Explorer, per system. */
  group: { pinyin: string; zhuyin: string }
  how: Phon
  example: ZhItem
  /** Hidden from a system's chart (ê is a zhuyin symbol but not a pinyin final). */
  only?: 'pinyin' | 'zhuyin'
  /** The lesson that teaches it — the chart marks it once that lesson is done. */
  lesson: string
}

const g = (both: string) => ({ pinyin: both, zhuyin: both })

export const INITIALS: SoundEntry[] = [
  { kind: 'initial', pinyin: 'b', zhuyin: 'ㄅ', group: g('Lips'), lesson: 'cb-p-first-consonants',
    how: 'Lips together, then open with no puff of air. It’s crisp and quiet, without the buzz of an English “b”.',
    example: { zh: '爸', pinyin: 'bà', gloss: 'dad' } },
  { kind: 'initial', pinyin: 'p', zhuyin: 'ㄆ', group: g('Lips'), lesson: 'cb-p-first-consonants',
    how: 'Lips together, then open with a strong puff of air. Hold a hand in front of your mouth to feel it.',
    example: { zh: '怕', pinyin: 'pà', gloss: 'to fear' } },
  { kind: 'initial', pinyin: 'm', zhuyin: 'ㄇ', group: g('Lips'), lesson: 'cb-p-first-consonants',
    how: 'Close your lips and let the sound hum through your nose, then open into the vowel.',
    example: { zh: { t: '媽', s: '妈' }, pinyin: 'mā', gloss: 'mother' } },
  { kind: 'initial', pinyin: 'f', zhuyin: 'ㄈ', group: g('Lips'), lesson: 'cb-p-first-consonants',
    how: 'Rest your upper teeth lightly on your lower lip and push air between them.',
    example: { zh: { t: '飛', s: '飞' }, pinyin: 'fēi', gloss: 'to fly' } },

  { kind: 'initial', pinyin: 'd', zhuyin: 'ㄉ', group: g('Tongue tip'), lesson: 'cb-p-more-consonants',
    how: 'Tongue tip just behind the upper teeth, released with no puff of air.',
    example: { zh: '大', pinyin: 'dà', gloss: 'big' } },
  { kind: 'initial', pinyin: 't', zhuyin: 'ㄊ', group: g('Tongue tip'), lesson: 'cb-p-more-consonants',
    how: 'The same place as d, released with a strong puff of air.',
    example: { zh: '他', pinyin: 'tā', gloss: 'he' } },
  { kind: 'initial', pinyin: 'n', zhuyin: 'ㄋ', group: g('Tongue tip'), lesson: 'cb-p-more-consonants',
    how: 'Tongue tip up behind the teeth; the sound goes out through your nose.',
    example: { zh: '你', pinyin: 'nǐ', gloss: 'you' } },
  { kind: 'initial', pinyin: 'l', zhuyin: 'ㄌ', group: g('Tongue tip'), lesson: 'cb-p-more-consonants',
    how: 'Tongue tip up behind the teeth; air flows around the sides of the tongue.',
    example: { zh: { t: '來', s: '来' }, pinyin: 'lái', gloss: 'to come' } },

  { kind: 'initial', pinyin: 'g', zhuyin: 'ㄍ', group: g('Back of the tongue'), lesson: 'cb-p-more-consonants',
    how: 'The back of the tongue presses the soft palate, released with no puff of air.',
    example: { zh: '哥', pinyin: 'gē', gloss: 'older brother' } },
  { kind: 'initial', pinyin: 'k', zhuyin: 'ㄎ', group: g('Back of the tongue'), lesson: 'cb-p-more-consonants',
    how: 'The same place as g, released with a strong puff of air.',
    example: { zh: '口', pinyin: 'kǒu', gloss: 'mouth' } },
  { kind: 'initial', pinyin: 'h', zhuyin: 'ㄏ', group: g('Back of the tongue'), lesson: 'cb-p-more-consonants',
    how: 'Raise the back of the tongue close to the soft palate and let air scrape through. It’s rougher than an English “h”.',
    example: { zh: '好', pinyin: 'hǎo', gloss: 'good' } },

  { kind: 'initial', pinyin: 'j', zhuyin: 'ㄐ', group: g('Flat tongue'), lesson: 'cb-p-jqx',
    how: 'Tongue tip down behind the lower teeth, the middle of the tongue against the palate. No puff of air.',
    example: { zh: '家', pinyin: 'jiā', gloss: 'home' } },
  { kind: 'initial', pinyin: 'q', zhuyin: 'ㄑ', group: g('Flat tongue'), lesson: 'cb-p-jqx',
    how: 'The same place as j, released with a strong puff of air.',
    example: { zh: '七', pinyin: 'qī', gloss: 'seven' } },
  { kind: 'initial', pinyin: 'x', zhuyin: 'ㄒ', group: g('Flat tongue'), lesson: 'cb-p-jqx',
    how: 'The same flat tongue, held just apart from the palate: a soft hiss, lips spread.',
    example: { zh: '西', pinyin: 'xī', gloss: 'west' } },

  { kind: 'initial', pinyin: 'zh', zhuyin: 'ㄓ', group: g('Curled tongue'), lesson: 'cb-p-retroflex',
    how: 'Curl the tongue tip up and back toward the roof of the mouth, then release with no puff.',
    example: { zh: '中', pinyin: 'zhōng', gloss: 'middle' } },
  { kind: 'initial', pinyin: 'ch', zhuyin: 'ㄔ', group: g('Curled tongue'), lesson: 'cb-p-retroflex',
    how: 'The same curled tongue as zh, released with a strong puff of air.',
    example: { zh: '吃', pinyin: 'chī', gloss: 'to eat' } },
  { kind: 'initial', pinyin: 'sh', zhuyin: 'ㄕ', group: g('Curled tongue'), lesson: 'cb-p-retroflex',
    how: 'Tongue curled back, not touching: a hiss from further back than English “sh”.',
    example: { zh: { t: '書', s: '书' }, pinyin: 'shū', gloss: 'book' } },
  { kind: 'initial', pinyin: 'r', zhuyin: 'ㄖ', group: g('Curled tongue'), lesson: 'cb-p-retroflex',
    how: 'Hold the sh position and switch your voice on, so it buzzes softly. It sounds quite different from an English “r”.',
    example: { zh: '人', pinyin: 'rén', gloss: 'person' } },

  { kind: 'initial', pinyin: 'z', zhuyin: 'ㄗ', group: g('Front teeth'), lesson: 'cb-p-zcs',
    how: 'Tongue tip against the back of the upper teeth, released into a hiss with no puff, like the “ds” in “kids”.',
    example: { zh: '字', pinyin: 'zì', gloss: 'character' } },
  { kind: 'initial', pinyin: 'c', zhuyin: 'ㄘ', group: g('Front teeth'), lesson: 'cb-p-zcs',
    how: 'The same as z with a strong puff of air, like the “ts” in “cats” but breathier.',
    example: { zh: '菜', pinyin: 'cài', gloss: 'dish, vegetable' } },
  { kind: 'initial', pinyin: 's', zhuyin: 'ㄙ', group: g('Front teeth'), lesson: 'cb-p-zcs',
    how: 'Tongue tip near the upper teeth: a plain hiss.',
    example: { zh: '三', pinyin: 'sān', gloss: 'three' } },
]

const SINGLE = { pinyin: 'Simple vowels', zhuyin: 'Single finals' }
const PAIR = { pinyin: 'Vowel pairs', zhuyin: 'Single finals' }
const NASAL = { pinyin: 'Nasal finals', zhuyin: 'Single finals' }
const WITH_I = { pinyin: 'Starting with i', zhuyin: 'Combinations' }
const WITH_U = { pinyin: 'Starting with u', zhuyin: 'Combinations' }
const WITH_UE = { pinyin: 'Starting with ü', zhuyin: 'Combinations' }

export const FINALS: SoundEntry[] = [
  { kind: 'final', pinyin: 'a', zhuyin: 'ㄚ', group: SINGLE, lesson: 'cb-p-first-vowels',
    how: 'Mouth wide open, tongue low and relaxed.',
    example: { zh: '八', pinyin: 'bā', gloss: 'eight' } },
  { kind: 'final', pinyin: 'o', zhuyin: 'ㄛ', group: SINGLE, lesson: 'cb-p-first-vowels',
    how: 'Lips rounded and slightly open. After b, p, m and f a short “w” glides in before it.',
    example: { zh: '波', pinyin: 'bō', gloss: 'wave' } },
  { kind: 'final', pinyin: 'e', zhuyin: 'ㄜ', group: SINGLE, lesson: 'cb-p-first-vowels',
    how: 'Keep your lips relaxed and pull your tongue back. The sound comes from the back of the mouth and is nothing like the “e” in “bed”.',
    example: { zh: '喝', pinyin: 'hē', gloss: 'to drink' } },
  { kind: 'final', pinyin: 'ê', zhuyin: 'ㄝ', group: SINGLE, lesson: 'cb-p-compound', only: 'zhuyin',
    how: 'Open your mouth halfway with your tongue forward, like the “e” in “yes”. It almost always follows ㄧ or ㄩ.',
    example: { zh: '也', pinyin: 'yě', gloss: 'also' } },
  { kind: 'final', pinyin: 'i', zhuyin: 'ㄧ', group: { pinyin: 'Simple vowels', zhuyin: 'Middle sounds' }, lesson: 'cb-p-first-vowels',
    how: 'Lips spread as if smiling, tongue high and forward.',
    example: { zh: '一', pinyin: 'yī', gloss: 'one' } },
  { kind: 'final', pinyin: 'u', zhuyin: 'ㄨ', group: { pinyin: 'Simple vowels', zhuyin: 'Middle sounds' }, lesson: 'cb-p-first-vowels',
    how: 'Lips tightly rounded and pushed forward, tongue pulled back.',
    example: { zh: '五', pinyin: 'wǔ', gloss: 'five' } },
  { kind: 'final', pinyin: 'ü', zhuyin: 'ㄩ', group: { pinyin: 'Simple vowels', zhuyin: 'Middle sounds' }, lesson: 'cb-p-first-vowels',
    how: 'Say i, then round your lips tightly without moving your tongue.',
    example: { zh: { t: '魚', s: '鱼' }, pinyin: 'yú', gloss: 'fish' } },
  { kind: 'final', pinyin: 'er', zhuyin: 'ㄦ', group: SINGLE, lesson: 'cb-p-spelling',
    how: 'Start the e of ㄜ and curl the tongue tip back as you say it.',
    example: { zh: '二', pinyin: 'èr', gloss: 'two' } },

  { kind: 'final', pinyin: 'ai', zhuyin: 'ㄞ', group: PAIR, lesson: 'cb-p-compound',
    how: 'Start at a and glide toward i.',
    example: { zh: { t: '愛', s: '爱' }, pinyin: 'ài', gloss: 'love' } },
  { kind: 'final', pinyin: 'ei', zhuyin: 'ㄟ', group: PAIR, lesson: 'cb-p-compound',
    how: 'Start at the “e” of “hey” and glide toward i.',
    example: { zh: '黑', pinyin: 'hēi', gloss: 'black' } },
  { kind: 'final', pinyin: 'ao', zhuyin: 'ㄠ', group: PAIR, lesson: 'cb-p-compound',
    how: 'Start at a and glide toward rounded lips.',
    example: { zh: '好', pinyin: 'hǎo', gloss: 'good' } },
  { kind: 'final', pinyin: 'ou', zhuyin: 'ㄡ', group: PAIR, lesson: 'cb-p-compound',
    how: 'Start at a rounded o and close toward u.',
    example: { zh: '狗', pinyin: 'gǒu', gloss: 'dog' } },

  { kind: 'final', pinyin: 'an', zhuyin: 'ㄢ', group: NASAL, lesson: 'cb-p-nasals',
    how: 'a, then the tongue tip closes behind the upper teeth: a front n.',
    example: { zh: '三', pinyin: 'sān', gloss: 'three' } },
  { kind: 'final', pinyin: 'en', zhuyin: 'ㄣ', group: NASAL, lesson: 'cb-p-nasals',
    how: 'A short, relaxed vowel closing into a front n.',
    example: { zh: '人', pinyin: 'rén', gloss: 'person' } },
  { kind: 'final', pinyin: 'ang', zhuyin: 'ㄤ', group: NASAL, lesson: 'cb-p-nasals',
    how: 'a, then the back of the tongue rises: a back ng. The tongue tip stays down.',
    example: { zh: '忙', pinyin: 'máng', gloss: 'busy' } },
  { kind: 'final', pinyin: 'eng', zhuyin: 'ㄥ', group: NASAL, lesson: 'cb-p-nasals',
    how: 'The back vowel of ㄜ closing into a back ng.',
    example: { zh: '冷', pinyin: 'lěng', gloss: 'cold' } },
  { kind: 'final', pinyin: 'ong', zhuyin: 'ㄨㄥ', group: { pinyin: 'Nasal finals', zhuyin: 'Combinations' }, lesson: 'cb-p-nasals',
    how: 'Rounded lips, closing into a back ng.',
    example: { zh: '中', pinyin: 'zhōng', gloss: 'middle' } },

  { kind: 'final', pinyin: 'ia', zhuyin: 'ㄧㄚ', group: WITH_I, lesson: 'cb-p-compound',
    how: 'A quick i sliding into a.', example: { zh: '家', pinyin: 'jiā', gloss: 'home' } },
  { kind: 'final', pinyin: 'ie', zhuyin: 'ㄧㄝ', group: WITH_I, lesson: 'cb-p-compound',
    how: 'A quick i sliding into the “e” of “yes”.', example: { zh: '姐', pinyin: 'jiě', gloss: 'older sister' } },
  { kind: 'final', pinyin: 'iao', zhuyin: 'ㄧㄠ', group: WITH_I, lesson: 'cb-p-compound',
    how: 'i, then ao.', example: { zh: '小', pinyin: 'xiǎo', gloss: 'small' } },
  { kind: 'final', pinyin: 'iu', zhuyin: 'ㄧㄡ', group: WITH_I, lesson: 'cb-p-compound',
    how: { pinyin: 'i, then ou. Pinyin writes iu, but the o is still said.', zhuyin: 'ㄧ, then ㄡ.' },
    example: { zh: '六', pinyin: 'liù', gloss: 'six' } },
  { kind: 'final', pinyin: 'ian', zhuyin: 'ㄧㄢ', group: WITH_I, lesson: 'cb-p-nasals',
    how: 'i, then an. The a rises toward the “e” in “yes”.', example: { zh: '天', pinyin: 'tiān', gloss: 'sky, day' } },
  { kind: 'final', pinyin: 'in', zhuyin: 'ㄧㄣ', group: WITH_I, lesson: 'cb-p-nasals',
    how: 'i, closing into a front n.', example: { zh: '心', pinyin: 'xīn', gloss: 'heart' } },
  { kind: 'final', pinyin: 'iang', zhuyin: 'ㄧㄤ', group: WITH_I, lesson: 'cb-p-nasals',
    how: 'i, then ang.', example: { zh: '想', pinyin: 'xiǎng', gloss: 'to think' } },
  { kind: 'final', pinyin: 'ing', zhuyin: 'ㄧㄥ', group: WITH_I, lesson: 'cb-p-nasals',
    how: 'i, closing into a back ng.', example: { zh: '星', pinyin: 'xīng', gloss: 'star' } },
  { kind: 'final', pinyin: 'iong', zhuyin: 'ㄩㄥ', group: WITH_I, lesson: 'cb-p-nasals',
    how: { pinyin: 'Rounded lips from the start, then ong. Written with i, said nearer ü.', zhuyin: 'ㄩ, then a back ng.' },
    example: { zh: '熊', pinyin: 'xióng', gloss: 'bear' } },

  { kind: 'final', pinyin: 'ua', zhuyin: 'ㄨㄚ', group: WITH_U, lesson: 'cb-p-compound',
    how: 'A quick u sliding into a.', example: { zh: '花', pinyin: 'huā', gloss: 'flower' } },
  { kind: 'final', pinyin: 'uo', zhuyin: 'ㄨㄛ', group: WITH_U, lesson: 'cb-p-compound',
    how: 'A quick u sliding into o.', example: { zh: '我', pinyin: 'wǒ', gloss: 'I, me' } },
  { kind: 'final', pinyin: 'uai', zhuyin: 'ㄨㄞ', group: WITH_U, lesson: 'cb-p-compound',
    how: 'u, then ai.', example: { zh: '快', pinyin: 'kuài', gloss: 'fast' } },
  { kind: 'final', pinyin: 'ui', zhuyin: 'ㄨㄟ', group: WITH_U, lesson: 'cb-p-compound',
    how: { pinyin: 'u, then ei. Pinyin writes ui, but the e is still said.', zhuyin: 'ㄨ, then ㄟ.' },
    example: { zh: '水', pinyin: 'shuǐ', gloss: 'water' } },
  { kind: 'final', pinyin: 'uan', zhuyin: 'ㄨㄢ', group: WITH_U, lesson: 'cb-p-nasals',
    how: 'u, then an.', example: { zh: '晚', pinyin: 'wǎn', gloss: 'late, evening' } },
  { kind: 'final', pinyin: 'un', zhuyin: 'ㄨㄣ', group: WITH_U, lesson: 'cb-p-nasals',
    how: { pinyin: 'u, then en. Pinyin writes un, but a short e is still said.', zhuyin: 'ㄨ, then ㄣ.' },
    example: { zh: '春', pinyin: 'chūn', gloss: 'spring' } },
  { kind: 'final', pinyin: 'uang', zhuyin: 'ㄨㄤ', group: WITH_U, lesson: 'cb-p-nasals',
    how: 'u, then ang.', example: { zh: { t: '黃', s: '黄' }, pinyin: 'huáng', gloss: 'yellow' } },

  { kind: 'final', pinyin: 'üe', zhuyin: 'ㄩㄝ', group: WITH_UE, lesson: 'cb-p-compound',
    how: 'ü, then the “e” of “yes”.', example: { zh: '月', pinyin: 'yuè', gloss: 'moon, month' } },
  { kind: 'final', pinyin: 'üan', zhuyin: 'ㄩㄢ', group: WITH_UE, lesson: 'cb-p-nasals',
    how: 'ü, then an with the a raised.', example: { zh: { t: '遠', s: '远' }, pinyin: 'yuǎn', gloss: 'far' } },
  { kind: 'final', pinyin: 'ün', zhuyin: 'ㄩㄣ', group: WITH_UE, lesson: 'cb-p-nasals',
    how: 'ü, closing into a front n.', example: { zh: { t: '雲', s: '云' }, pinyin: 'yún', gloss: 'cloud' } },
]

export const SOUNDS: SoundEntry[] = [...INITIALS, ...FINALS]

export function soundSymbol(pinyin: string): SoundSymbol {
  const found = SOUNDS.find((s) => s.pinyin === pinyin)
  if (!found) throw new Error(`Unknown sound ${pinyin}`)
  return { pinyin: found.pinyin, zhuyin: found.zhuyin }
}

/**
 * Syllables the builder accepts, by toneless pinyin, with a real character
 * for each tone that has a common one. A syllable with no tones listed exists
 * only as a neutral-tone particle and is accepted but not voiced.
 *
 * Only the builder's initials and finals are listed — b p m f d t n l with
 * a o e i u ü. Anything absent is not a Mandarin syllable.
 */
export const BUILDER_SYLLABLES: Record<string, { initial: string; final: string; tones: Partial<Record<1 | 2 | 3 | 4, ZhItem>> }> = {
  ba: { initial: 'b', final: 'a', tones: {
    1: { zh: '八', pinyin: 'bā', gloss: 'eight' }, 2: { zh: '拔', pinyin: 'bá', gloss: 'to pull out' },
    3: { zh: '把', pinyin: 'bǎ', gloss: 'to hold' }, 4: { zh: '爸', pinyin: 'bà', gloss: 'dad' } } },
  bo: { initial: 'b', final: 'o', tones: { 1: { zh: '波', pinyin: 'bō', gloss: 'wave' } } },
  bi: { initial: 'b', final: 'i', tones: {
    1: { zh: '逼', pinyin: 'bī', gloss: 'to force' }, 2: { zh: '鼻', pinyin: 'bí', gloss: 'nose' },
    3: { zh: { t: '筆', s: '笔' }, pinyin: 'bǐ', gloss: 'pen' }, 4: { zh: '必', pinyin: 'bì', gloss: 'must' } } },
  bu: { initial: 'b', final: 'u', tones: {
    3: { zh: { t: '補', s: '补' }, pinyin: 'bǔ', gloss: 'to mend' }, 4: { zh: '布', pinyin: 'bù', gloss: 'cloth' } } },
  pa: { initial: 'p', final: 'a', tones: {
    1: { zh: '趴', pinyin: 'pā', gloss: 'to lie face down' }, 2: { zh: '爬', pinyin: 'pá', gloss: 'to climb' },
    4: { zh: '怕', pinyin: 'pà', gloss: 'to fear' } } },
  po: { initial: 'p', final: 'o', tones: {
    1: { zh: '坡', pinyin: 'pō', gloss: 'slope' }, 2: { zh: '婆', pinyin: 'pó', gloss: 'old woman' },
    4: { zh: '破', pinyin: 'pò', gloss: 'broken' } } },
  pi: { initial: 'p', final: 'i', tones: {
    1: { zh: '批', pinyin: 'pī', gloss: 'batch' }, 2: { zh: '皮', pinyin: 'pí', gloss: 'skin' },
    3: { zh: '匹', pinyin: 'pǐ', gloss: '(measure word for horses)' }, 4: { zh: '屁', pinyin: 'pì', gloss: 'fart' } } },
  pu: { initial: 'p', final: 'u', tones: {
    2: { zh: '葡', pinyin: 'pú', gloss: '(in “grape”)' }, 3: { zh: '普', pinyin: 'pǔ', gloss: 'general' } } },
  ma: { initial: 'm', final: 'a', tones: {
    1: { zh: { t: '媽', s: '妈' }, pinyin: 'mā', gloss: 'mother' }, 2: { zh: '麻', pinyin: 'má', gloss: 'hemp' },
    3: { zh: { t: '馬', s: '马' }, pinyin: 'mǎ', gloss: 'horse' }, 4: { zh: { t: '罵', s: '骂' }, pinyin: 'mà', gloss: 'to scold' } } },
  mo: { initial: 'm', final: 'o', tones: {
    1: { zh: '摸', pinyin: 'mō', gloss: 'to touch' }, 2: { zh: '魔', pinyin: 'mó', gloss: 'demon' },
    4: { zh: '墨', pinyin: 'mò', gloss: 'ink' } } },
  me: { initial: 'm', final: 'e', tones: {} },
  mi: { initial: 'm', final: 'i', tones: {
    1: { zh: '咪', pinyin: 'mī', gloss: '(a cat’s meow)' }, 2: { zh: '迷', pinyin: 'mí', gloss: 'lost' },
    3: { zh: '米', pinyin: 'mǐ', gloss: 'rice' }, 4: { zh: '密', pinyin: 'mì', gloss: 'dense, secret' } } },
  mu: { initial: 'm', final: 'u', tones: {
    3: { zh: '母', pinyin: 'mǔ', gloss: 'mother (formal)' }, 4: { zh: '木', pinyin: 'mù', gloss: 'wood' } } },
  fa: { initial: 'f', final: 'a', tones: {
    1: { zh: { t: '發', s: '发' }, pinyin: 'fā', gloss: 'to send' }, 2: { zh: { t: '罰', s: '罚' }, pinyin: 'fá', gloss: 'to punish' },
    3: { zh: '法', pinyin: 'fǎ', gloss: 'law, method' } } },
  fo: { initial: 'f', final: 'o', tones: { 2: { zh: '佛', pinyin: 'fó', gloss: 'Buddha' } } },
  fu: { initial: 'f', final: 'u', tones: {
    1: { zh: '夫', pinyin: 'fū', gloss: 'husband' }, 2: { zh: '服', pinyin: 'fú', gloss: 'clothes' },
    3: { zh: '府', pinyin: 'fǔ', gloss: 'mansion' }, 4: { zh: '父', pinyin: 'fù', gloss: 'father' } } },
  da: { initial: 'd', final: 'a', tones: {
    2: { zh: { t: '達', s: '达' }, pinyin: 'dá', gloss: 'to reach' }, 3: { zh: '打', pinyin: 'dǎ', gloss: 'to hit' },
    4: { zh: '大', pinyin: 'dà', gloss: 'big' } } },
  de: { initial: 'd', final: 'e', tones: { 2: { zh: '德', pinyin: 'dé', gloss: 'virtue' } } },
  di: { initial: 'd', final: 'i', tones: {
    1: { zh: '低', pinyin: 'dī', gloss: 'low' }, 2: { zh: { t: '敵', s: '敌' }, pinyin: 'dí', gloss: 'enemy' },
    3: { zh: '底', pinyin: 'dǐ', gloss: 'bottom' }, 4: { zh: '第', pinyin: 'dì', gloss: '(ordinal prefix)' } } },
  du: { initial: 'd', final: 'u', tones: {
    2: { zh: { t: '讀', s: '读' }, pinyin: 'dú', gloss: 'to read' }, 3: { zh: { t: '賭', s: '赌' }, pinyin: 'dǔ', gloss: 'to gamble' },
    4: { zh: '度', pinyin: 'dù', gloss: 'degree' } } },
  ta: { initial: 't', final: 'a', tones: {
    1: { zh: '他', pinyin: 'tā', gloss: 'he' }, 3: { zh: '塔', pinyin: 'tǎ', gloss: 'tower' },
    4: { zh: '踏', pinyin: 'tà', gloss: 'to step' } } },
  te: { initial: 't', final: 'e', tones: { 4: { zh: '特', pinyin: 'tè', gloss: 'special' } } },
  ti: { initial: 't', final: 'i', tones: {
    1: { zh: '踢', pinyin: 'tī', gloss: 'to kick' }, 2: { zh: { t: '題', s: '题' }, pinyin: 'tí', gloss: 'question' },
    3: { zh: { t: '體', s: '体' }, pinyin: 'tǐ', gloss: 'body' }, 4: { zh: '替', pinyin: 'tì', gloss: 'to replace' } } },
  tu: { initial: 't', final: 'u', tones: {
    2: { zh: { t: '圖', s: '图' }, pinyin: 'tú', gloss: 'picture' }, 3: { zh: '土', pinyin: 'tǔ', gloss: 'earth' },
    4: { zh: '兔', pinyin: 'tù', gloss: 'rabbit' } } },
  na: { initial: 'n', final: 'a', tones: {
    2: { zh: '拿', pinyin: 'ná', gloss: 'to take' }, 4: { zh: '那', pinyin: 'nà', gloss: 'that' } } },
  ne: { initial: 'n', final: 'e', tones: {} },
  ni: { initial: 'n', final: 'i', tones: {
    2: { zh: '泥', pinyin: 'ní', gloss: 'mud' }, 3: { zh: '你', pinyin: 'nǐ', gloss: 'you' },
    4: { zh: '逆', pinyin: 'nì', gloss: 'against' } } },
  nu: { initial: 'n', final: 'u', tones: {
    2: { zh: '奴', pinyin: 'nú', gloss: 'slave' }, 3: { zh: '努', pinyin: 'nǔ', gloss: 'to strive' },
    4: { zh: '怒', pinyin: 'nù', gloss: 'anger' } } },
  nü: { initial: 'n', final: 'ü', tones: { 3: { zh: '女', pinyin: 'nǚ', gloss: 'woman' } } },
  la: { initial: 'l', final: 'a', tones: {
    1: { zh: '拉', pinyin: 'lā', gloss: 'to pull' }, 4: { zh: '辣', pinyin: 'là', gloss: 'spicy' } } },
  le: { initial: 'l', final: 'e', tones: {} },
  li: { initial: 'l', final: 'i', tones: {
    2: { zh: { t: '離', s: '离' }, pinyin: 'lí', gloss: 'to leave' }, 3: { zh: '李', pinyin: 'lǐ', gloss: 'plum' },
    4: { zh: '立', pinyin: 'lì', gloss: 'to stand' } } },
  lu: { initial: 'l', final: 'u', tones: {
    2: { zh: { t: '盧', s: '卢' }, pinyin: 'lú', gloss: '(a surname)' }, 3: { zh: { t: '魯', s: '鲁' }, pinyin: 'lǔ', gloss: '(a surname)' },
    4: { zh: '路', pinyin: 'lù', gloss: 'road' } } },
  lü: { initial: 'l', final: 'ü', tones: {
    2: { zh: { t: '驢', s: '驴' }, pinyin: 'lǘ', gloss: 'donkey' }, 3: { zh: '旅', pinyin: 'lǚ', gloss: 'to travel' },
    4: { zh: { t: '綠', s: '绿' }, pinyin: 'lǜ', gloss: 'green' } } },
}
