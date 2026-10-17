import type { BasicsLesson, BasicsStep, ChoiceOption, Tone, ZhItem } from './types'
import { soundSymbol as S } from './sounds'

/*
 * Pronunciation: how Mandarin sounds, taught by ear first.
 *
 * Module A–C (getting started, first sounds, tones) is the core path; Module D
 * fills in the rest of the sound system a group at a time. Lessons that teach
 * symbols are `notation: true` and branch with `only` / `Phon` where the two
 * systems genuinely differ; they share the sounds, not the spelling.
 *
 * Every listening question plays a single character or a common word, chosen
 * so it has one everyday reading (see `types.ts` → Audio). Readings inside
 * prose are written `[[mā]]`, so a zhuyin learner sees them in zhuyin.
 */

const MA: ZhItem[] = [
  { zh: { t: '媽', s: '妈' }, pinyin: 'mā', gloss: 'mother' },
  { zh: '麻', pinyin: 'má', gloss: 'hemp' },
  { zh: { t: '馬', s: '马' }, pinyin: 'mǎ', gloss: 'horse' },
  { zh: { t: '罵', s: '骂' }, pinyin: 'mà', gloss: 'to scold' },
]

const ALL_TONES: ChoiceOption[] = [{ tone: 1 }, { tone: 2 }, { tone: 3 }, { tone: 4 }]
const tones = (...t: Tone[]): ChoiceOption[] => t.map((tone) => ({ tone }))

/** A listening question: play `zh`, pick its tone. `answer` indexes `options`. */
function toneQuestion(zh: ZhItem, options: ChoiceOption[], explain: string): BasicsStep {
  const tone = toneOf(zh.pinyin!)
  return {
    kind: 'choice',
    prompt: 'Listen. Which tone did you hear?',
    audio: zh.zh,
    options,
    answer: options.findIndex((o) => o.tone === tone),
    explain,
  }
}

function toneOf(pinyin: string): Tone {
  if (/[āōēīūǖ]/.test(pinyin)) return 1
  if (/[áóéíúǘ]/.test(pinyin)) return 2
  if (/[ǎǒěǐǔǚ]/.test(pinyin)) return 3
  if (/[àòèìùǜ]/.test(pinyin)) return 4
  return 5
}

/** A listening question whose options are sound symbols. */
function hearSound(audio: ZhItem, symbols: string[], answer: string, explain: string, why: Record<string, string> = {}): BasicsStep {
  return {
    kind: 'choice',
    prompt: 'Listen. Which sound does it start with?',
    audio: audio.zh,
    options: symbols.map((p) => ({ symbol: S(p), why: why[p] })),
    answer: symbols.indexOf(answer),
    explain,
  }
}

export const PRONUNCIATION_LESSONS: BasicsLesson[] = [
  /* ── Module A: Getting started ─────────────────────────────────────────── */
  {
    id: 'cb-p-how-sounds-work',
    group: 'pronunciation',
    module: 'Getting started',
    title: 'How Mandarin Works',
    subtitle: 'Syllables, their parts, and the tone on top.',
    minutes: 4,
    objectives: [
      'Split a syllable into initial, final and tone.',
      'Know that a change of tone can change the word.',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'Characters don’t spell sounds',
        body: {
          pinyin: 'You can’t read a character’s sound from its shape, so learners write the sounds down separately. This course uses pinyin, which writes Mandarin with Latin letters.',
          zhuyin: 'You can’t read a character’s sound from its shape, so learners write the sounds down separately. This course uses zhuyin, a set of symbols made for Mandarin.',
        },
        items: [{ zh: { t: '媽', s: '妈' }, pinyin: 'mā', gloss: 'mother (tap to hear it)' }],
      },
      {
        kind: 'syllable-parts',
        title: 'One syllable, three parts',
        body: 'Most syllables have an initial (the consonant at the start), a final (the vowel part) and a tone (the pitch). Tap each part to hear it.',
        whole: { zh: { t: '媽', s: '妈' }, pinyin: 'mā', gloss: 'mother' },
        initial: { symbol: S('m'), note: 'The initial. Close your lips and hum through your nose.' },
        final: { symbol: S('a'), note: 'The final. Open your mouth wide.', audio: { zh: '啊', pinyin: 'a', gloss: 'the vowel on its own' } },
        tone: 1,
      },
      {
        kind: 'explain',
        title: 'Some have no initial',
        body: 'A syllable can be just a final. {{愛|爱}} is [[ài]], with nothing in front of the vowel.',
        items: [
          { zh: { t: '愛', s: '爱' }, pinyin: 'ài', gloss: 'love' },
          { zh: '二', pinyin: 'èr', gloss: 'two' },
        ],
      },
      {
        kind: 'listen',
        title: 'Pitch changes the word',
        body: 'These two have the same initial and the same final. Only the pitch differs, and they mean different things. Play both.',
        items: [MA[0], MA[2]],
      },
      {
        kind: 'choice',
        prompt: 'Listen. Which word did you hear?',
        audio: { t: '馬', s: '马' },
        options: [
          { pinyin: 'mā', label: 'mother, high and level' },
          { pinyin: 'mǎ', label: 'horse, low and dipping' },
        ],
        answer: 1,
        explain: '[[mǎ]] is horse. Your voice dips low on it, while [[mā]] stays high and flat.',
      },
      {
        kind: 'choice',
        prompt: 'In [[mā]], which part is the initial?',
        options: [
          { symbol: S('m') },
          { symbol: S('a'), why: 'That’s the final, the vowel part after the initial.' },
          { label: 'The tone', why: 'The tone is the pitch you say the whole syllable on.' },
        ],
        answer: 0,
        explain: { pinyin: 'm is the initial and a is the final. The line over the a shows the tone.', zhuyin: 'ㄇ is the initial and ㄚ is the final. The 1st tone has no mark.' },
      },
      {
        kind: 'recap',
        points: ['A syllable is an initial, a final and a tone.', 'Some syllables have no initial.', 'Change the tone and you change the word.'],
      },
    ],
  },
  {
    id: 'cb-p-your-system',
    group: 'pronunciation',
    module: 'Getting started',
    notation: true,
    title: { pinyin: 'Understanding Pinyin', zhuyin: 'Understanding Zhuyin' },
    subtitle: { pinyin: 'Latin letters, Mandarin sounds.', zhuyin: '37 symbols, one sound each.' },
    minutes: 5,
    objectives: {
      pinyin: ['Read pinyin as Mandarin sounds.', 'Recognise the four tone marks and where they go.'],
      zhuyin: ['Know how zhuyin symbols combine into a syllable.', 'Recognise zhuyin tone marks, and the unmarked first tone.'],
    },
    steps: [
      /* Pinyin */
      {
        only: 'pinyin',
        kind: 'explain',
        title: 'Familiar letters, new sounds',
        body: 'Pinyin uses the Latin alphabet, but each letter stands for a Mandarin sound. Some are close to English. Many, like q and x, are nothing like their English versions.',
        items: [
          { zh: '你好', pinyin: 'nǐ hǎo', gloss: 'hello' },
          { zh: '七', pinyin: 'qī', gloss: 'seven' },
          { zh: '西', pinyin: 'xī', gloss: 'west' },
        ],
        more: 'Pinyin was designed in the 1950s as a consistent way to write Mandarin sounds. Its spellings follow Mandarin, so q, x, zh and c each get a lesson of their own later on.',
      },
      {
        only: 'pinyin',
        kind: 'choice',
        prompt: 'Listen to 西 (xī). Is its x the x in “box”?',
        audio: '西',
        options: [
          { label: 'No, it’s a different sound' },
          { label: 'Yes, it’s “ks”', why: 'Listen again. There’s no k at all, just a soft hiss with the tongue flat.' },
        ],
        answer: 0,
        explain: 'Pinyin x is a soft hiss, made with the tongue flat behind your lower teeth.',
      },
      {
        only: 'pinyin',
        kind: 'explain',
        title: 'Tone marks',
        body: 'A mark over the vowel shows the tone: ā is high and level, á rises, ǎ dips and à falls. A syllable with no mark is said lightly, in the neutral tone.',
        items: [...MA, { zh: { t: '媽媽', s: '妈妈' }, pinyin: 'mā ma', gloss: 'mum (the second ma is neutral)' }],
      },
      {
        only: 'pinyin',
        kind: 'choice',
        prompt: 'Which tone mark shows a falling pitch?',
        options: [
          { pinyin: 'mā', why: 'The flat line is the 1st tone, high and level.' },
          { pinyin: 'má', why: 'This one rises, like the line drawn over it.' },
          { pinyin: 'mǎ', why: 'This one dips down and back up.' },
          { pinyin: 'mà' },
        ],
        answer: 3,
        explain: 'The mark on à slopes down, and so does the pitch.',
      },
      {
        only: 'pinyin',
        kind: 'explain',
        title: 'Where the mark goes',
        body: 'If there’s an a or an e, the mark goes on it. In ou it goes on the o. Otherwise it sits on the second of two vowels, as in shuǐ and liù.',
        items: [
          { zh: '好', pinyin: 'hǎo', gloss: 'the a takes it' },
          { zh: '狗', pinyin: 'gǒu', gloss: 'the o of ou' },
          { zh: '水', pinyin: 'shuǐ', gloss: 'the second vowel' },
          { zh: '六', pinyin: 'liù', gloss: 'the second vowel' },
        ],
      },
      {
        only: 'pinyin',
        kind: 'choice',
        prompt: 'How is 好 (good) written?',
        options: [{ pinyin: 'hǎo' }, { label: 'haǒ', why: 'When there’s an a, the mark goes on the a.' }],
        answer: 0,
        explain: 'hǎo. The a always takes the mark.',
      },

      /* Zhuyin */
      {
        only: 'zhuyin',
        kind: 'explain',
        title: 'Symbols made for Mandarin',
        body: 'Zhuyin (注音) is used in Taiwan. Its 37 symbols each stand for one sound. People also call it bopomofo, after the first four symbols: ㄅ ㄆ ㄇ ㄈ.',
        items: [
          { zh: '你好', pinyin: 'nǐ hǎo', gloss: 'hello' },
          { zh: '七', pinyin: 'qī', gloss: 'seven' },
        ],
        more: 'Many symbols come from old characters that had the sound: ㄅ from 勹, ㄇ from 冂. Since they don’t come from any alphabet, you won’t be tempted to read them as English.',
      },
      {
        only: 'zhuyin',
        kind: 'explain',
        title: 'Symbols combine',
        body: 'A syllable is one to three symbols: an initial, sometimes a middle sound (ㄧ ㄨ ㄩ), and a final. ㄇ and ㄚ make ㄇㄚ. ㄒ, ㄧ and ㄠ make ㄒㄧㄠ.',
        items: [
          { zh: { t: '媽', s: '妈' }, pinyin: 'mā', gloss: 'ㄇ + ㄚ' },
          { zh: '小', pinyin: 'xiǎo', gloss: 'ㄒ + ㄧ + ㄠ' },
        ],
      },
      {
        only: 'zhuyin',
        kind: 'choice',
        prompt: 'How many symbols spell 小 (small)?',
        zh: { zh: '小', pinyin: 'xiǎo' },
        options: [{ label: 'One', why: 'Look again: ㄒ, ㄧ and ㄠ are each a symbol.' }, { label: 'Two', why: 'The middle sound ㄧ counts too.' }, { label: 'Three' }],
        answer: 2,
        explain: 'ㄒ is the initial, ㄧ the middle sound and ㄠ the final.',
      },
      {
        only: 'zhuyin',
        kind: 'explain',
        title: 'Tone marks',
        body: 'The tone mark comes after the syllable. The 1st tone has no mark. ˊ rises, ˇ dips and ˋ falls. The light neutral tone is a dot, ˙, written in front.',
        items: [...MA, { zh: { t: '媽媽', s: '妈妈' }, pinyin: 'mā ma', gloss: 'mum (the second one is neutral)' }],
      },
      {
        only: 'zhuyin',
        kind: 'choice',
        prompt: 'Which one is the 1st tone?',
        options: [
          { pinyin: 'mā' },
          { pinyin: 'má', why: 'ˊ rises. That’s the 2nd tone.' },
          { pinyin: 'mǎ', why: 'ˇ dips. That’s the 3rd tone.' },
          { pinyin: 'mà', why: 'ˋ falls. That’s the 4th tone.' },
        ],
        answer: 0,
        explain: 'The 1st tone is the one with no mark: ㄇㄚ.',
      },
      {
        only: 'zhuyin',
        kind: 'choice',
        prompt: 'Where does the neutral-tone dot go?',
        options: [{ label: 'In front: ˙ㄇㄚ' }, { label: 'After: ㄇㄚ˙', why: 'The other marks come after the syllable, but the dot goes in front.' }],
        answer: 0,
        explain: 'The dot comes first: ˙ㄇㄚ.',
      },
      {
        kind: 'recap',
        points: [
          { pinyin: 'Pinyin letters stand for Mandarin sounds.', zhuyin: 'Each zhuyin symbol is one sound.' },
          { pinyin: 'The marks are ā á ǎ à, and no mark means neutral.', zhuyin: 'No mark, then ˊ ˇ ˋ after the syllable, and ˙ in front for neutral.' },
          { pinyin: 'The mark goes on a or e first.', zhuyin: 'Up to three symbols make a syllable.' },
        ],
      },
    ],
  },

  /* ── Module B: Individual sounds ───────────────────────────────────────── */
  {
    id: 'cb-p-first-consonants',
    group: 'pronunciation',
    module: 'Individual sounds',
    notation: true,
    title: 'Your First Consonants',
    subtitle: { pinyin: 'b, p, m and f, all made with the lips.', zhuyin: 'ㄅ ㄆ ㄇ ㄈ, all made with the lips.' },
    minutes: 6,
    objectives: [
      { pinyin: 'Recognise b, p, m and f by ear.', zhuyin: 'Recognise ㄅ, ㄆ, ㄇ and ㄈ by ear.' },
      { pinyin: 'Tell b from p by the puff of air.', zhuyin: 'Tell ㄅ from ㄆ by the puff of air.' },
    ],
    steps: [
      {
        kind: 'explain',
        title: 'Four lip sounds',
        body: {
          pinyin: 'You make b, p, m and f at the lips. A consonant is hard to hear on its own, so each one plays inside a real syllable.',
          zhuyin: 'You make ㄅ ㄆ ㄇ ㄈ at the lips. They’re the four that give bopomofo its name. A consonant is hard to hear on its own, so each one plays inside a real syllable.',
        },
        more: {
          pinyin: 'b and p differ by air. English b buzzes in the throat, and Mandarin b doesn’t. Both are quiet, and p adds a puff of breath.',
          zhuyin: 'ㄅ and ㄆ differ by air. Both are quiet, and ㄆ adds a puff of breath.',
        },
      },
      {
        kind: 'sound',
        symbol: S('b'),
        how: 'Press your lips together and open them without a puff of air. It’s crisp and quiet. Your voice doesn’t buzz first the way it does on an English “b”.',
        examples: [{ zh: '爸', pinyin: 'bà', gloss: 'dad' }, { zh: '八', pinyin: 'bā', gloss: 'eight' }],
        contrast: { symbol: S('p'), example: { zh: '怕', pinyin: 'pà', gloss: 'to fear' }, note: 'Same lips, plus a strong puff of air.' },
      },
      {
        kind: 'sound',
        symbol: S('p'),
        how: 'Press your lips together, then open them with a strong puff of air. Hold your hand in front of your mouth and you should feel it.',
        examples: [{ zh: '怕', pinyin: 'pà', gloss: 'to fear' }, { zh: '爬', pinyin: 'pá', gloss: 'to climb' }],
        contrast: { symbol: S('b'), example: { zh: '爸', pinyin: 'bà', gloss: 'dad' }, note: 'No puff at all.' },
      },
      hearSound({ zh: '怕', pinyin: 'pà' }, ['b', 'p'], 'p', '怕 [[pà]]. You can hear the breath as the lips open.', {
        b: 'Listen for the burst of air after the lips open. That’s the puff.',
      }),
      {
        kind: 'sound',
        symbol: S('m'),
        how: 'Close your lips, let the sound hum through your nose, then open into the vowel.',
        examples: [{ zh: { t: '媽', s: '妈' }, pinyin: 'mā', gloss: 'mother' }, { zh: '米', pinyin: 'mǐ', gloss: 'rice' }],
      },
      {
        kind: 'sound',
        symbol: S('f'),
        how: 'Rest your upper teeth lightly on your lower lip and push air between them.',
        examples: [{ zh: { t: '飛', s: '飞' }, pinyin: 'fēi', gloss: 'to fly' }, { zh: '父', pinyin: 'fù', gloss: 'father' }],
      },
      hearSound({ zh: '八', pinyin: 'bā' }, ['b', 'p', 'm', 'f'], 'b', '八 [[bā]]. The lips open with no puff of air.', {
        p: 'Close. Same lips, but there was no puff of air.',
        m: 'That one hums through the nose first. This one starts with a clean release.',
        f: 'That one uses teeth on the lip. This one starts with both lips.',
      }),
      hearSound({ zh: '米', pinyin: 'mǐ' }, ['b', 'p', 'm', 'f'], 'm', '米 [[mǐ]]. There’s a hum through the nose before the vowel.', {
        b: 'Listen for the hum at the start.',
        p: 'There’s no puff here. It begins with a hum.',
      }),
      hearSound({ zh: '父', pinyin: 'fù' }, ['b', 'p', 'm', 'f'], 'f', '父 [[fù]]. Air hisses between teeth and lip.'),
      hearSound({ zh: '爬', pinyin: 'pá' }, ['b', 'p'], 'p', '爬 [[pá]]. Lips, then a puff of air.', {
        b: 'There was a puff of air, and that one has none.',
      }),
      {
        kind: 'recap',
        points: [
          { pinyin: 'b and p both use the lips. p adds a puff of air.', zhuyin: 'ㄅ and ㄆ both use the lips. ㄆ adds a puff of air.' },
          { pinyin: 'm hums through the nose.', zhuyin: 'ㄇ hums through the nose.' },
          { pinyin: 'f puts your teeth on your lower lip.', zhuyin: 'ㄈ puts your teeth on your lower lip.' },
        ],
      },
    ],
  },
  {
    id: 'cb-p-first-vowels',
    group: 'pronunciation',
    module: 'Individual sounds',
    notation: true,
    title: 'Your First Vowels',
    subtitle: { pinyin: 'a, o, e, i, u and ü.', zhuyin: 'ㄚ ㄛ ㄜ ㄧ ㄨ ㄩ.' },
    minutes: 6,
    objectives: [
      { pinyin: 'Shape the six simple vowels.', zhuyin: 'Shape the six simple finals.' },
      { pinyin: 'Hear the difference between i, u and ü.', zhuyin: 'Hear the difference between ㄧ, ㄨ and ㄩ.' },
    ],
    steps: [
      {
        kind: 'explain',
        title: 'Six building blocks',
        body: {
          pinyin: 'Every final is built on these six vowels. Learn each one by the shape of your mouth, since the English letter can point you to the wrong sound.',
          zhuyin: 'Every final is built on these six. Each has its own mouth shape.',
        },
      },
      {
        kind: 'sound',
        symbol: S('a'),
        how: 'Open your mouth wide and keep your tongue low and relaxed.',
        examples: [{ zh: '八', pinyin: 'bā', gloss: 'eight' }, { zh: '他', pinyin: 'tā', gloss: 'he' }],
      },
      {
        kind: 'sound',
        symbol: S('o'),
        how: {
          pinyin: 'Round your lips and open them a little. After b, p, m and f, a short “w” slips in first, so bō sounds close to “bwo”.',
          zhuyin: 'Round your lips and open them a little. After ㄅ ㄆ ㄇ ㄈ, a short ㄨ slips in first.',
        },
        examples: [{ zh: '波', pinyin: 'bō', gloss: 'wave' }, { zh: '破', pinyin: 'pò', gloss: 'broken' }],
      },
      {
        kind: 'sound',
        symbol: S('e'),
        how: 'Keep your lips relaxed and pull your tongue back. It comes from the back of the mouth and sounds nothing like the “e” in “bed”.',
        examples: [{ zh: '喝', pinyin: 'hē', gloss: 'to drink' }, { zh: '哥', pinyin: 'gē', gloss: 'older brother' }],
        contrast: { symbol: S('o'), example: { zh: '波', pinyin: 'bō', gloss: 'wave' }, note: { pinyin: 'o rounds the lips, and e keeps them relaxed.', zhuyin: 'ㄛ rounds the lips, and ㄜ keeps them relaxed.' } },
      },
      {
        kind: 'sound',
        symbol: S('i'),
        how: 'Spread your lips as if smiling, with your tongue high and forward.',
        examples: [{ zh: '一', pinyin: 'yī', gloss: 'one' }, { zh: '米', pinyin: 'mǐ', gloss: 'rice' }],
      },
      {
        kind: 'sound',
        symbol: S('u'),
        how: 'Round your lips tightly and push them forward, with your tongue pulled back.',
        examples: [{ zh: '五', pinyin: 'wǔ', gloss: 'five' }, { zh: '路', pinyin: 'lù', gloss: 'road' }],
      },
      {
        kind: 'sound',
        symbol: S('ü'),
        how: {
          pinyin: 'Say i and keep your tongue where it is. Now round your lips tightly, as for u. That’s ü.',
          zhuyin: 'Say ㄧ and keep your tongue where it is. Now round your lips tightly, as for ㄨ. That’s ㄩ.',
        },
        examples: [{ zh: { t: '魚', s: '鱼' }, pinyin: 'yú', gloss: 'fish' }, { zh: '女', pinyin: 'nǚ', gloss: 'woman' }],
        contrast: { symbol: S('i'), example: { zh: '移', pinyin: 'yí', gloss: 'to move' }, note: 'Same tongue, with the lips spread instead of rounded.' },
      },
      {
        only: 'pinyin',
        kind: 'explain',
        title: 'Spelled differently alone',
        body: 'When there’s no initial in front, pinyin adds a y or a w: i is written yi, u is wu and ü is yu. The sound stays the same.',
        items: [
          { zh: '一', pinyin: 'yī', gloss: 'i on its own' },
          { zh: '五', pinyin: 'wǔ', gloss: 'u on its own' },
          { zh: { t: '魚', s: '鱼' }, pinyin: 'yú', gloss: 'ü on its own' },
        ],
      },
      {
        only: 'zhuyin',
        kind: 'explain',
        title: 'They can stand alone',
        body: 'When there’s no initial in front, the symbol stands on its own: ㄧ, ㄨ, ㄩ. Nothing gets added.',
        items: [
          { zh: '一', pinyin: 'yī', gloss: 'ㄧ' },
          { zh: '五', pinyin: 'wǔ', gloss: 'ㄨ' },
          { zh: { t: '魚', s: '鱼' }, pinyin: 'yú', gloss: 'ㄩ' },
        ],
      },
      {
        kind: 'choice',
        prompt: 'Listen. Which vowel do you hear?',
        audio: { t: '魚', s: '鱼' },
        options: [
          { symbol: S('i'), why: 'Close. The tongue is in the same place, but the lips were rounded.' },
          { symbol: S('u'), why: 'That one pulls the tongue back. Here it stays forward, under rounded lips.' },
          { symbol: S('ü') },
        ],
        answer: 2,
        explain: { pinyin: '{{魚|鱼}} [[yú]]. The tongue sits where it does for i, and the lips are rounded.', zhuyin: '{{魚|鱼}} [[yú]]. The tongue sits where it does for ㄧ, and the lips are rounded.' },
      },
      {
        kind: 'choice',
        prompt: 'Listen. Which vowel do you hear?',
        audio: '五',
        options: [{ symbol: S('u') }, { symbol: S('ü'), why: 'The lips are rounded, but the tongue is back.' }, { symbol: S('o'), why: 'That one is more open. This one is tightly rounded.' }],
        answer: 0,
        explain: '五 [[wǔ]]. Lips tightly rounded, tongue back.',
      },
      {
        kind: 'choice',
        prompt: 'Listen. Which vowel do you hear?',
        audio: '喝',
        options: [{ symbol: S('a'), why: 'That one opens the mouth wide. This one is more closed, from the back.' }, { symbol: S('o'), why: 'The lips weren’t rounded.' }, { symbol: S('e') }],
        answer: 2,
        explain: '喝 [[hē]]. Relaxed lips, tongue back.',
      },
      {
        kind: 'recap',
        points: [
          { pinyin: 'a is open, o is rounded, e is relaxed and from the back.', zhuyin: 'ㄚ is open, ㄛ is rounded, ㄜ is relaxed and from the back.' },
          { pinyin: 'i is spread, u is rounded, and ü is i with rounded lips.', zhuyin: 'ㄧ is spread, ㄨ is rounded, and ㄩ is ㄧ with rounded lips.' },
        ],
      },
    ],
  },
  {
    id: 'cb-p-combine',
    group: 'pronunciation',
    module: 'Individual sounds',
    notation: true,
    title: 'Combine Sounds',
    subtitle: 'Build real syllables from an initial, a final and a tone.',
    minutes: 5,
    objectives: [
      'Build a syllable from an initial, a final and a tone.',
      'Know that not every combination is a real syllable.',
    ],
    steps: [
      {
        kind: 'syllable-parts',
        title: 'Putting it together',
        body: 'An initial, a final and a tone make one syllable. Tap each part, then the whole thing.',
        whole: { zh: '米', pinyin: 'mǐ', gloss: 'rice' },
        initial: { symbol: S('m'), note: 'Lips closed, humming.' },
        final: { symbol: S('i'), note: 'Lips spread, tongue high.', audio: { zh: '一', pinyin: 'yī', gloss: 'the vowel on its own' } },
        tone: 3,
      },
      {
        kind: 'explain',
        title: 'Not every pair is a word',
        body: {
          pinyin: 'Mandarin has only about 400 syllables, so many pairings never occur. For example, ü never follows b, p, m or f. In the builder, you’ll hear a syllable only if it really exists.',
          zhuyin: 'Mandarin has only about 400 syllables, so many pairings never occur. For example, ㄩ never follows ㄅ ㄆ ㄇ ㄈ. In the builder, you’ll hear a syllable only if it really exists.',
        },
      },
      {
        kind: 'syllable-builder',
        title: 'Build these three',
        body: 'Pick an initial, a final and a tone. When the result is a real syllable, it plays along with a character that uses it.',
        initials: ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l'],
        finals: ['a', 'o', 'e', 'i', 'u', 'ü'],
        targets: ['mā', 'bà', 'pí'],
      },
      {
        kind: 'choice',
        prompt: 'Which of these is not a Mandarin syllable?',
        options: [
          { pinyin: 'nǚ', why: { pinyin: 'That one is real: 女, woman. ü can follow n and l.', zhuyin: 'That one is real: 女, woman. ㄩ can follow ㄋ and ㄌ.' } },
          { pinyin: 'bǚ' },
          { pinyin: 'lǜ', why: 'That one is real: {{綠|绿}}, green.' },
        ],
        answer: 1,
        explain: { pinyin: 'ü never comes after b, p, m or f.', zhuyin: 'ㄩ never comes after ㄅ ㄆ ㄇ ㄈ.' },
      },
      {
        kind: 'choice',
        prompt: 'Listen. Which syllable is it?',
        audio: '米',
        options: [
          { pinyin: 'mǐ' },
          { pinyin: 'nǐ', why: 'That one is made with the tongue tip. This one closes the lips.' },
          { pinyin: 'bǐ', why: 'That one has a crisp release. This one hums first.' },
        ],
        answer: 0,
        explain: '米 [[mǐ]], rice, in the 3rd tone.',
      },
      {
        kind: 'choice',
        prompt: 'Listen. Which syllable is it?',
        audio: '土',
        options: [
          { pinyin: 'dǔ', why: 'There was a puff of air after the tongue let go.' },
          { pinyin: 'tǔ' },
          { pinyin: 'nǔ', why: 'That one goes through the nose. This one is a burst of air.' },
        ],
        answer: 1,
        explain: '土 [[tǔ]], earth. The puff of air after the tongue gives it away.',
      },
      {
        kind: 'recap',
        points: ['An initial, a final and a tone make a syllable.', 'Only about 400 combinations exist.'],
      },
    ],
  },

  /* ── Module C: Tones ───────────────────────────────────────────────────── */
  {
    id: 'cb-p-four-tones',
    group: 'pronunciation',
    module: 'Tones',
    title: 'The Four Tones',
    subtitle: 'High, rising, dipping and falling, plus the light neutral tone.',
    minutes: 6,
    objectives: ['Describe the shape of each tone.', 'Hear that the 3rd tone stays low in running speech.'],
    steps: [
      {
        kind: 'tones',
        title: 'Four pitch shapes',
        body: 'Every syllable has a pitch shape. Tap each one and watch the line while you listen. Replay them as often as you like.',
        items: [
          { tone: 1, item: MA[0], note: 'High and level. Hold it steady.' },
          { tone: 2, item: MA[1], note: 'Rises from middle to high, like a surprised “what?”' },
          { tone: 3, item: MA[2], note: 'Low and dipping. Said alone, it comes back up a little.' },
          { tone: 4, item: MA[3], note: 'Drops sharply from high to low.' },
        ],
      },
      {
        kind: 'choice',
        prompt: 'Which tone falls?',
        options: ALL_TONES.map((o) => ({ ...o, why: o.tone === 2 ? 'This one goes up.' : o.tone === 1 ? 'This one stays level.' : o.tone === 3 ? 'This one dips low.' : undefined })),
        answer: 3,
        explain: 'The 4th tone drops from high to low, like a firm “No!”',
      },
      toneQuestion(MA[3], tones(1, 4), '[[mà]] starts high and drops.'),
      toneQuestion(MA[1], tones(2, 4), '[[má]] climbs from the middle to the top.'),
      {
        kind: 'explain',
        title: 'The 3rd tone in real speech',
        body: 'Said alone, the 3rd tone dips and comes back up. In the middle of a sentence it usually just stays low, and you only hear the rise at the end of a phrase, if at all. Listen to how low it sits in the second word.',
        items: [
          { zh: { t: '馬', s: '马' }, pinyin: 'mǎ', gloss: 'alone, it dips and rises' },
          { zh: { t: '馬上', s: '马上' }, pinyin: 'mǎ shàng', gloss: 'right away (the first syllable stays low)' },
        ],
      },
      {
        kind: 'tones',
        title: 'The neutral tone',
        body: 'Some syllables have no tone of their own. They’re short and light, and their pitch depends on the syllable before them.',
        items: [{ tone: 5, item: { zh: { t: '媽媽', s: '妈妈' }, pinyin: 'mā ma', gloss: 'mum' }, note: 'The second syllable is quick and light.' }],
      },
      {
        kind: 'recap',
        points: ['1st high and level, 2nd rising, 3rd low and dipping, 4th falling.', 'In a sentence, the 3rd tone stays low.', 'Neutral tones are short and light.'],
      },
    ],
  },
  {
    id: 'cb-p-recognize-tones',
    group: 'pronunciation',
    module: 'Tones',
    title: 'Recognizing Tones',
    subtitle: 'Listen and pick the shape, from easy pairs up to all four.',
    minutes: 5,
    objectives: ['Identify the tone of a single syllable by ear.'],
    steps: [
      {
        kind: 'explain',
        title: 'Train your ear',
        body: 'You’ll hear one syllable at a time and pick its shape. The first few pairs are easy to tell apart, and it gets harder from there. Replay as often as you need.',
      },
      toneQuestion({ zh: '八', pinyin: 'bā' }, tones(1, 4), '八 [[bā]] stays high and steady.'),
      toneQuestion({ zh: '爸', pinyin: 'bà' }, tones(1, 4), '爸 [[bà]] drops quickly.'),
      toneQuestion({ zh: '麻', pinyin: 'má' }, tones(2, 4), '麻 [[má]] rises.'),
      toneQuestion({ zh: '米', pinyin: 'mǐ' }, tones(1, 3), '米 [[mǐ]] sits low and dips.'),
      toneQuestion({ zh: { t: '魚', s: '鱼' }, pinyin: 'yú' }, tones(2, 3), '{{魚|鱼}} [[yú]] rises smoothly. A 3rd tone would sink low first.'),
      toneQuestion({ zh: '好', pinyin: 'hǎo' }, tones(2, 3), '好 [[hǎo]] sinks low before it comes up.'),
      toneQuestion({ zh: '大', pinyin: 'dà' }, ALL_TONES, '大 [[dà]] falls.'),
      toneQuestion({ zh: '他', pinyin: 'tā' }, ALL_TONES, '他 [[tā]] is high and level.'),
      toneQuestion({ zh: { t: '來', s: '来' }, pinyin: 'lái' }, ALL_TONES, '{{來|来}} [[lái]] rises.'),
      toneQuestion({ zh: '你', pinyin: 'nǐ' }, ALL_TONES, '你 [[nǐ]] is low.'),
      {
        kind: 'recap',
        points: ['1st and 4th are the easiest to tell apart, 2nd and 3rd the hardest.', 'The 3rd tone sinks low first. The 2nd climbs straight up.'],
      },
    ],
  },
  {
    id: 'cb-p-tone-pairs',
    group: 'pronunciation',
    module: 'Tones',
    title: 'Combining Tones',
    subtitle: 'Two-syllable words, and the 3rd-tone change.',
    minutes: 6,
    objectives: ['Hear tones inside two-syllable words.', 'Apply the 3rd + 3rd tone change.'],
    steps: [
      {
        kind: 'listen',
        title: 'Tones side by side',
        body: 'Most words have two syllables, and each keeps its own tone. Listen for both shapes.',
        items: [
          { zh: { t: '學生', s: '学生' }, pinyin: 'xué shēng', gloss: 'student (rising, then high)' },
          { zh: { t: '老師', s: '老师' }, pinyin: 'lǎo shī', gloss: 'teacher (low, then high)' },
          { zh: { t: '媽媽', s: '妈妈' }, pinyin: 'mā ma', gloss: 'mum (high, then light)' },
        ],
      },
      {
        kind: 'choice',
        prompt: 'Listen. Which tones do you hear?',
        audio: { t: '學生', s: '学生' },
        options: [{ label: '2nd + 1st' }, { label: '4th + 1st', why: 'The first syllable climbed. A 4th tone would fall.' }, { label: '3rd + 1st', why: 'The first syllable rose straight up without sinking low.' }],
        answer: 0,
        explain: '{{學生|学生}} [[xué shēng]]. It rises, then stays high and level.',
      },
      {
        kind: 'choice',
        prompt: 'Listen. Which tones do you hear?',
        audio: { t: '老師', s: '老师' },
        options: [{ label: '3rd + 1st' }, { label: '2nd + 1st', why: 'The first syllable sat low before the high one. A 2nd tone would climb.' }, { label: '1st + 1st', why: 'The first syllable started low, not high.' }],
        answer: 0,
        explain: '{{老師|老师}} [[lǎo shī]]. Before another syllable, the 3rd tone just stays low.',
      },
      {
        kind: 'explain',
        title: 'Two 3rd tones in a row',
        body: 'When two 3rd tones meet, you say the first one as a 2nd tone. 你好 is written [[nǐ hǎo]] but said [[ní hǎo]]. The spelling stays the same, and only the sound changes.',
        items: [
          { zh: '你好', pinyin: 'nǐ hǎo', gloss: 'hello (said [[ní hǎo]])' },
          { zh: '很好', pinyin: 'hěn hǎo', gloss: 'very good (said [[hén hǎo]])' },
        ],
      },
      {
        kind: 'choice',
        prompt: 'How is 你好 actually said?',
        audio: '你好',
        options: [{ pinyin: 'ní hǎo' }, { pinyin: 'nǐ hǎo', why: 'That’s how it’s written. With two 3rd tones together, the first one rises.' }, { pinyin: 'nǐ háo', why: 'The first of the pair changes, not the second.' }],
        answer: 0,
        explain: 'With two 3rd tones, the first one rises: [[ní hǎo]].',
      },
      {
        kind: 'choice',
        prompt: 'Which of these has the 3rd-tone change?',
        options: [
          { zh: '很好', pinyin: 'hěn hǎo' },
          { zh: { t: '老師', s: '老师' }, pinyin: 'lǎo shī', why: 'Only the first syllable is a 3rd tone, so nothing changes.' },
          { zh: { t: '學生', s: '学生' }, pinyin: 'xué shēng', why: 'There’s no 3rd tone in this one at all.' },
        ],
        answer: 0,
        explain: '很 and 好 are both 3rd tones, so 很 rises: [[hén hǎo]].',
      },
      {
        kind: 'recap',
        points: ['Each syllable keeps its own tone.', 'Two 3rd tones together: the first one is said as a 2nd.', 'Before another syllable, a 3rd tone stays low.'],
      },
    ],
  },

  /* ── Module D: The rest of the sound system ────────────────────────────── */
  {
    id: 'cb-p-more-consonants',
    group: 'pronunciation',
    module: 'More sounds',
    notation: true,
    title: 'Tongue Tip and Throat',
    subtitle: { pinyin: 'd t n l, and g k h.', zhuyin: 'ㄉ ㄊ ㄋ ㄌ, and ㄍ ㄎ ㄏ.' },
    minutes: 6,
    objectives: [
      { pinyin: 'Recognise d, t, n, l, g, k and h.', zhuyin: 'Recognise ㄉ ㄊ ㄋ ㄌ ㄍ ㄎ ㄏ.' },
      'Hear the puff of air in the second sound of each pair.',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'The same trick again',
        body: {
          pinyin: 'd and t are a pair, and so are g and k. Like b and p, each pair differs only by a puff of air: t and k have it, d and g don’t.',
          zhuyin: 'ㄉ and ㄊ are a pair, and so are ㄍ and ㄎ. Like ㄅ and ㄆ, each pair differs only by a puff of air: ㄊ and ㄎ have it, ㄉ and ㄍ don’t.',
        },
      },
      {
        kind: 'sound',
        symbol: S('d'),
        how: 'Put your tongue tip just behind your upper teeth and let go without a puff of air.',
        examples: [{ zh: '大', pinyin: 'dà', gloss: 'big' }],
        contrast: { symbol: S('t'), example: { zh: '踏', pinyin: 'tà', gloss: 'to step' }, note: 'Same place, plus a puff of air.' },
      },
      {
        kind: 'sound',
        symbol: S('n'),
        how: 'Raise your tongue tip behind your teeth and let the sound go out through your nose.',
        examples: [{ zh: '你', pinyin: 'nǐ', gloss: 'you' }],
        contrast: { symbol: S('l'), example: { zh: '李', pinyin: 'lǐ', gloss: 'plum' }, note: 'Air flows around the sides of the tongue instead of through the nose.' },
      },
      hearSound({ zh: '他', pinyin: 'tā' }, ['d', 't'], 't', '他 [[tā]]. There’s a puff of air as the tongue lets go.', {
        d: 'There was a puff of air, and that one has none.',
      }),
      hearSound({ zh: { t: '來', s: '来' }, pinyin: 'lái' }, ['n', 'l'], 'l', '{{來|来}} [[lái]]. The air goes around the tongue, and nothing comes through the nose.', {
        n: 'That one hums through the nose, and this one doesn’t.',
      }),
      {
        kind: 'sound',
        symbol: S('g'),
        how: 'Press the back of your tongue against the soft part of the roof of your mouth, then let go without a puff.',
        examples: [{ zh: '哥', pinyin: 'gē', gloss: 'older brother' }],
        contrast: { symbol: S('k'), example: { zh: '口', pinyin: 'kǒu', gloss: 'mouth' }, note: 'Same place, plus a puff of air.' },
      },
      {
        kind: 'sound',
        symbol: S('h'),
        how: 'Lift the back of your tongue close to the roof of your mouth and let the air scrape through. It’s rougher than an English “h”.',
        examples: [{ zh: '好', pinyin: 'hǎo', gloss: 'good' }, { zh: '喝', pinyin: 'hē', gloss: 'to drink' }],
      },
      hearSound({ zh: '哥', pinyin: 'gē' }, ['g', 'k', 'h'], 'g', '哥 [[gē]]. A clean release with no puff.', {
        k: 'No puff of air this time.',
        h: 'That one is a long scrape. This one is a short release.',
      }),
      hearSound({ zh: '口', pinyin: 'kǒu' }, ['g', 'k', 'h'], 'k', '口 [[kǒu]]. A burst of air from the back of the mouth.'),
      {
        kind: 'recap',
        points: [
          { pinyin: 'd/t and g/k: the second of each pair adds a puff.', zhuyin: 'ㄉ/ㄊ and ㄍ/ㄎ: the second of each pair adds a puff.' },
          { pinyin: 'n goes through the nose, l around the tongue.', zhuyin: 'ㄋ goes through the nose, ㄌ around the tongue.' },
          { pinyin: 'h scrapes at the back of the mouth.', zhuyin: 'ㄏ scrapes at the back of the mouth.' },
        ],
      },
    ],
  },
  {
    id: 'cb-p-jqx',
    group: 'pronunciation',
    module: 'More sounds',
    notation: true,
    title: { pinyin: 'j, q and x', zhuyin: 'ㄐ ㄑ ㄒ' },
    subtitle: 'Three sounds made with a flat tongue.',
    minutes: 5,
    objectives: [
      { pinyin: 'Recognise j, q and x.', zhuyin: 'Recognise ㄐ, ㄑ and ㄒ.' },
      { pinyin: 'Know they only come before an i or ü sound.', zhuyin: 'Know they only come before ㄧ or ㄩ.' },
    ],
    steps: [
      {
        kind: 'explain',
        title: 'A flat tongue',
        body: {
          pinyin: 'For j, q and x, rest your tongue tip behind your lower teeth and lift the middle of your tongue toward the roof of your mouth. An i or ü sound always comes next.',
          zhuyin: 'For ㄐ ㄑ ㄒ, rest your tongue tip behind your lower teeth and lift the middle of your tongue toward the roof of your mouth. ㄧ or ㄩ always comes next.',
        },
      },
      {
        kind: 'sound',
        symbol: S('j'),
        how: 'Press the flat middle of your tongue against the roof of your mouth and let go without a puff of air.',
        examples: [{ zh: '家', pinyin: 'jiā', gloss: 'home' }],
        contrast: { symbol: S('q'), example: { zh: '七', pinyin: 'qī', gloss: 'seven' }, note: 'The same, plus a puff of air.' },
      },
      {
        kind: 'sound',
        symbol: S('q'),
        how: 'Press the flat middle of your tongue against the roof of your mouth and let go with a strong puff of air.',
        examples: [{ zh: '七', pinyin: 'qī', gloss: 'seven' }, { zh: '去', pinyin: 'qù', gloss: 'to go' }],
      },
      {
        kind: 'sound',
        symbol: S('x'),
        how: 'Keep the same flat tongue, held just off the roof of your mouth, and hiss softly with your lips spread.',
        examples: [{ zh: '西', pinyin: 'xī', gloss: 'west' }, { zh: '小', pinyin: 'xiǎo', gloss: 'small' }],
      },
      {
        only: 'pinyin',
        kind: 'explain',
        title: 'ü in disguise',
        body: 'After j, q and x, pinyin drops the dots from ü, but you still say ü. 去 is spelled qù and said with rounded lips. A plain u can never follow j, q or x, so there’s nothing to mix it up with.',
        items: [
          { zh: '去', pinyin: 'qù', gloss: 'to go, said with ü' },
          { zh: '女', pinyin: 'nǚ', gloss: 'woman (after n the dots stay)' },
        ],
      },
      {
        only: 'zhuyin',
        kind: 'explain',
        title: 'Always ㄧ or ㄩ',
        body: 'Zhuyin writes what you say. ㄐ ㄑ ㄒ are always followed by ㄧ or ㄩ, and you can see which one. 去 is ㄑㄩˋ.',
        items: [
          { zh: '去', pinyin: 'qù', gloss: 'ㄑ + ㄩ' },
          { zh: '七', pinyin: 'qī', gloss: 'ㄑ + ㄧ' },
        ],
      },
      hearSound({ zh: '七', pinyin: 'qī' }, ['j', 'q', 'x'], 'q', '七 [[qī]]. A burst of air off a flat tongue.', {
        j: 'There was a puff of air.',
        x: 'That one is a steady hiss. This one starts with a release.',
      }),
      hearSound({ zh: '西', pinyin: 'xī' }, ['j', 'q', 'x'], 'x', '西 [[xī]]. A soft, steady hiss.'),
      {
        only: 'pinyin',
        kind: 'choice',
        prompt: 'Listen to 去 (qù). Which vowel is it?',
        audio: '去',
        options: [{ symbol: S('ü') }, { symbol: S('u'), why: 'It’s written u, but after q it’s always ü. Listen for rounded lips with the tongue forward.' }],
        answer: 0,
        explain: 'qù is said with ü. After j, q and x the dots are left off.',
      },
      {
        kind: 'recap',
        points: [
          { pinyin: 'j, q and x use a flat tongue, and q adds the puff.', zhuyin: 'ㄐ ㄑ ㄒ use a flat tongue, and ㄑ adds the puff.' },
          { pinyin: 'ju, qu and xu are all said with ü.', zhuyin: 'They’re always followed by ㄧ or ㄩ.' },
        ],
      },
    ],
  },
  {
    id: 'cb-p-retroflex',
    group: 'pronunciation',
    module: 'More sounds',
    notation: true,
    title: { pinyin: 'zh, ch, sh and r', zhuyin: 'ㄓ ㄔ ㄕ ㄖ' },
    subtitle: 'The curled-tongue sounds.',
    minutes: 6,
    objectives: [
      { pinyin: 'Recognise zh, ch, sh and r.', zhuyin: 'Recognise ㄓ, ㄔ, ㄕ and ㄖ.' },
      { pinyin: 'Tell them apart from j, q and x.', zhuyin: 'Tell them apart from ㄐ, ㄑ and ㄒ.' },
    ],
    steps: [
      {
        kind: 'explain',
        title: 'Curl the tongue back',
        body: {
          pinyin: 'For zh, ch, sh and r, curl your tongue tip up and back toward the roof of your mouth. They sound deeper and darker than j, q and x.',
          zhuyin: 'For ㄓ ㄔ ㄕ ㄖ, curl your tongue tip up and back toward the roof of your mouth. They sound deeper and darker than ㄐ ㄑ ㄒ.',
        },
      },
      {
        kind: 'sound',
        symbol: S('zh'),
        how: 'Curl your tongue tip back against the roof of your mouth and let go without a puff.',
        examples: [{ zh: '中', pinyin: 'zhōng', gloss: 'middle' }, { zh: '知', pinyin: 'zhī', gloss: 'to know' }],
        contrast: { symbol: S('j'), example: { zh: { t: '雞', s: '鸡' }, pinyin: 'jī', gloss: 'chicken' }, note: 'Here the tongue stays flat and forward.' },
      },
      {
        kind: 'sound',
        symbol: S('ch'),
        how: 'Curl your tongue the same way, then let go with a strong puff of air.',
        examples: [{ zh: '吃', pinyin: 'chī', gloss: 'to eat' }],
        contrast: { symbol: S('q'), example: { zh: '七', pinyin: 'qī', gloss: 'seven' }, note: 'Here the tongue stays flat and forward.' },
      },
      {
        kind: 'sound',
        symbol: S('sh'),
        how: 'Curl your tongue back without letting it touch, and hiss. The sound comes from further back than English “sh”.',
        examples: [{ zh: { t: '書', s: '书' }, pinyin: 'shū', gloss: 'book' }],
        contrast: { symbol: S('x'), example: { zh: '西', pinyin: 'xī', gloss: 'west' }, note: 'A brighter hiss, with a flat tongue and spread lips.' },
      },
      {
        kind: 'sound',
        symbol: S('r'),
        how: {
          pinyin: 'Hold the sh position and switch your voice on, so it buzzes softly. It sounds quite different from an English “r”.',
          zhuyin: 'Hold the ㄕ position and switch your voice on, so it buzzes softly. It sounds quite different from an English “r”.',
        },
        examples: [{ zh: '人', pinyin: 'rén', gloss: 'person' }, { zh: '日', pinyin: 'rì', gloss: 'sun, day' }],
      },
      {
        only: 'pinyin',
        kind: 'explain',
        title: 'This i doesn’t say “ee”',
        body: 'In zhi, chi, shi and ri, the i is silent as a vowel. It tells you to hold the consonant and let your voice carry on. 吃 chī is a buzzing ch, never “chee”.',
        items: [
          { zh: '吃', pinyin: 'chī', gloss: 'to eat' },
          { zh: '是', pinyin: 'shì', gloss: 'to be' },
        ],
      },
      {
        only: 'zhuyin',
        kind: 'explain',
        title: 'A symbol on its own',
        body: 'ㄓ ㄔ ㄕ ㄖ can each be a whole syllable, with the voice carrying on from the consonant. 吃 is just ㄔ.',
        items: [
          { zh: '吃', pinyin: 'chī', gloss: 'ㄔ' },
          { zh: '是', pinyin: 'shì', gloss: 'ㄕˋ' },
        ],
      },
      hearSound({ zh: '吃', pinyin: 'chī' }, ['zh', 'ch', 'q'], 'ch', '吃 [[chī]]. A curled tongue and a puff of air.', {
        zh: 'There was a puff of air.',
        q: 'That one keeps the tongue flat and sounds bright. This one is darker because the tongue curls.',
      }),
      hearSound({ zh: { t: '師', s: '师' }, pinyin: 'shī' }, ['sh', 'x'], 'sh', '{{師|师}} [[shī]]. The darker hiss of a curled tongue.', {
        x: 'That one is brighter, with a flat tongue and spread lips.',
      }),
      {
        kind: 'recap',
        points: [
          { pinyin: 'zh, ch, sh and r curl the tongue back.', zhuyin: 'ㄓ ㄔ ㄕ ㄖ curl the tongue back.' },
          { pinyin: 'zhi, chi, shi and ri have no “ee” sound.', zhuyin: 'Each can be a syllable on its own.' },
        ],
      },
    ],
  },
  {
    id: 'cb-p-zcs',
    group: 'pronunciation',
    module: 'More sounds',
    notation: true,
    title: { pinyin: 'z, c and s', zhuyin: 'ㄗ ㄘ ㄙ' },
    subtitle: 'The front-teeth sounds.',
    minutes: 5,
    objectives: [
      { pinyin: 'Recognise z, c and s.', zhuyin: 'Recognise ㄗ, ㄘ and ㄙ.' },
      { pinyin: 'Hear z/zh, c/ch and s/sh apart.', zhuyin: 'Hear ㄗ/ㄓ, ㄘ/ㄔ and ㄙ/ㄕ apart.' },
    ],
    steps: [
      {
        kind: 'sound',
        symbol: S('z'),
        how: 'Touch your tongue tip to the back of your upper teeth and release it into a hiss, with no puff. It’s like the “ds” in “kids”.',
        examples: [{ zh: '字', pinyin: 'zì', gloss: 'character' }],
        contrast: { symbol: S('zh'), example: { zh: '志', pinyin: 'zhì', gloss: 'will, aim' }, note: 'The tongue curls back for this one.' },
      },
      {
        kind: 'sound',
        symbol: S('c'),
        how: 'Make the same sound with a strong puff of air. It’s the “ts” in “cats”, only breathier, and never a k.',
        examples: [{ zh: '菜', pinyin: 'cài', gloss: 'dish, vegetable' }],
        contrast: { symbol: S('ch'), example: { zh: '柴', pinyin: 'chái', gloss: 'firewood' }, note: 'The tongue curls back for this one.' },
      },
      {
        kind: 'sound',
        symbol: S('s'),
        how: 'Hold your tongue tip near your upper teeth and hiss.',
        examples: [{ zh: '三', pinyin: 'sān', gloss: 'three' }],
        contrast: { symbol: S('sh'), example: { zh: '山', pinyin: 'shān', gloss: 'mountain' }, note: 'The tongue curls back for this one.' },
      },
      {
        only: 'pinyin',
        kind: 'explain',
        title: 'Another quiet i',
        body: 'Just like zhi and shi, the i in zi, ci and si only carries the buzz of the consonant. 字 zì is never “zee”.',
        items: [{ zh: '字', pinyin: 'zì', gloss: 'character' }, { zh: '四', pinyin: 'sì', gloss: 'four' }],
      },
      {
        only: 'zhuyin',
        kind: 'explain',
        title: 'Alone again',
        body: 'Like ㄓ ㄔ ㄕ ㄖ, the symbols ㄗ ㄘ ㄙ can each be a syllable on their own. 字 is ㄗˋ and 四 is ㄙˋ.',
        items: [{ zh: '字', pinyin: 'zì', gloss: 'ㄗˋ' }, { zh: '四', pinyin: 'sì', gloss: 'ㄙˋ' }],
      },
      hearSound({ zh: '三', pinyin: 'sān' }, ['s', 'sh'], 's', '三 [[sān]]. A flat hiss at the front of the mouth.', {
        sh: 'That one is darker, with the tongue curled back. This one is at the teeth.',
      }),
      hearSound({ zh: '山', pinyin: 'shān' }, ['s', 'sh'], 'sh', '山 [[shān]]. A curled tongue gives a darker hiss.', {
        s: 'This one was darker, because the tongue curled back.',
      }),
      hearSound({ zh: '菜', pinyin: 'cài' }, ['z', 'c', 'ch'], 'c', '菜 [[cài]]. A “ts” with a puff of air.', {
        z: 'There was a puff of air.',
        ch: 'The tongue stayed at the teeth instead of curling back.',
      }),
      {
        kind: 'recap',
        points: [
          { pinyin: 'z, c and s are made at the teeth. zh, ch and sh curl back.', zhuyin: 'ㄗ ㄘ ㄙ are made at the teeth. ㄓ ㄔ ㄕ curl back.' },
          { pinyin: 'c is a “ts” with a puff, never a k.', zhuyin: 'ㄘ is a “ts” with a puff.' },
        ],
      },
    ],
  },
  {
    id: 'cb-p-compound',
    group: 'pronunciation',
    module: 'More sounds',
    notation: true,
    title: 'Vowel Pairs',
    subtitle: { pinyin: 'ai, ei, ao and ou, and finals that start with i, u or ü.', zhuyin: 'ㄞ ㄟ ㄠ ㄡ ㄝ, and ㄧ ㄨ ㄩ in the middle.' },
    minutes: 6,
    objectives: [
      { pinyin: 'Hear ai, ei, ao and ou.', zhuyin: 'Hear ㄞ, ㄟ, ㄠ and ㄡ.' },
      { pinyin: 'Read finals that start with i, u or ü.', zhuyin: 'Read syllables with a middle sound.' },
    ],
    steps: [
      {
        kind: 'sound',
        symbol: S('ai'),
        how: {
          pinyin: 'Start on a and glide toward i.',
          zhuyin: 'Start on ㄚ and glide toward ㄧ.',
        },
        examples: [{ zh: { t: '愛', s: '爱' }, pinyin: 'ài', gloss: 'love' }, { zh: { t: '來', s: '来' }, pinyin: 'lái', gloss: 'to come' }],
        contrast: { symbol: S('ei'), example: { zh: '黑', pinyin: 'hēi', gloss: 'black' }, note: 'This one starts higher, on the “e” of “hey”.' },
      },
      {
        kind: 'sound',
        symbol: S('ao'),
        how: {
          pinyin: 'Start on a and glide toward rounded lips.',
          zhuyin: 'Start on ㄚ and glide toward rounded lips.',
        },
        examples: [{ zh: '好', pinyin: 'hǎo', gloss: 'good' }],
        contrast: { symbol: S('ou'), example: { zh: '狗', pinyin: 'gǒu', gloss: 'dog' }, note: 'This one starts with the lips already rounded.' },
      },
      {
        only: 'zhuyin',
        kind: 'sound',
        symbol: S('ê'),
        how: 'Open your mouth halfway with your tongue forward, like the “e” in “yes”. It almost always follows ㄧ or ㄩ.',
        examples: [{ zh: '也', pinyin: 'yě', gloss: 'also' }, { zh: '月', pinyin: 'yuè', gloss: 'moon' }],
      },
      {
        kind: 'explain',
        title: { pinyin: 'Finals with i, u or ü in front', zhuyin: 'A middle sound' },
        body: {
          pinyin: 'Many finals start with a quick i, u or ü that glides into another vowel: ia, ie, iao, ua, uo, üe. Keep the first part short and slide on.',
          zhuyin: 'ㄧ, ㄨ or ㄩ can sit between the initial and the final as a quick glide: ㄐㄧㄚ, ㄏㄨㄚ, ㄩㄝ. Keep it short and slide into the final.',
        },
        items: [
          { zh: '家', pinyin: 'jiā', gloss: 'home' },
          { zh: '姐', pinyin: 'jiě', gloss: 'older sister' },
          { zh: '花', pinyin: 'huā', gloss: 'flower' },
          { zh: '我', pinyin: 'wǒ', gloss: 'I' },
          { zh: '月', pinyin: 'yuè', gloss: 'moon' },
        ],
      },
      {
        only: 'pinyin',
        kind: 'explain',
        title: 'Letters pinyin leaves out',
        body: 'Pinyin shortens three finals: iou is written iu, uei is written ui and uen is written un. You still say the missing vowel faintly. There’s an o in 六 liù and an e in 水 shuǐ.',
        items: [
          { zh: '六', pinyin: 'liù', gloss: 'six · i-o-u' },
          { zh: '水', pinyin: 'shuǐ', gloss: 'water · u-e-i' },
          { zh: '春', pinyin: 'chūn', gloss: 'spring · u-e-n' },
        ],
      },
      {
        only: 'zhuyin',
        kind: 'explain',
        title: 'Every part is written',
        body: 'Zhuyin writes every part you say: 六 is ㄌㄧㄡˋ and 水 is ㄕㄨㄟˇ. Pinyin shortens these, which is one reason zhuyin readers often find them easier.',
        items: [
          { zh: '六', pinyin: 'liù', gloss: 'ㄌ ㄧ ㄡ' },
          { zh: '水', pinyin: 'shuǐ', gloss: 'ㄕ ㄨ ㄟ' },
        ],
      },
      {
        kind: 'choice',
        prompt: 'Listen. Which final do you hear?',
        audio: '狗',
        options: [{ symbol: S('ao'), why: 'That one opens wide first. This one starts already rounded.' }, { symbol: S('ou') }],
        answer: 1,
        explain: '狗 [[gǒu]]. It’s rounded from the start.',
      },
      {
        kind: 'choice',
        prompt: 'Listen. Which final do you hear?',
        audio: { t: '愛', s: '爱' },
        options: [{ symbol: S('ai') }, { symbol: S('ei'), why: 'That one starts higher. This one opens wide first.' }],
        answer: 0,
        explain: '{{愛|爱}} [[ài]]. It starts wide open and glides up.',
      },
      {
        only: 'pinyin',
        kind: 'choice',
        prompt: 'What is liù really made of?',
        options: [{ label: 'l + i + o + u' }, { label: 'l + i + u', why: 'Pinyin hides an o. iu is short for iou.' }],
        answer: 0,
        explain: 'iu is the short spelling of iou.',
      },
      {
        kind: 'recap',
        points: [
          { pinyin: 'ai/ei and ao/ou differ in where the glide starts.', zhuyin: 'ㄞ/ㄟ and ㄠ/ㄡ differ in where the glide starts.' },
          { pinyin: 'iu means iou, ui means uei, un means uen.', zhuyin: 'ㄧ ㄨ ㄩ glide in the middle.' },
        ],
      },
    ],
  },
  {
    id: 'cb-p-nasals',
    group: 'pronunciation',
    module: 'More sounds',
    notation: true,
    title: 'Nasal Finals',
    subtitle: { pinyin: '-n and -ng, at the front and at the back.', zhuyin: 'ㄢ ㄣ and ㄤ ㄥ, at the front and at the back.' },
    minutes: 6,
    objectives: [{ pinyin: 'Hear the difference between -n and -ng.', zhuyin: 'Hear ㄢ/ㄤ and ㄣ/ㄥ apart.' }],
    steps: [
      {
        kind: 'explain',
        title: 'Two ways to close',
        body: {
          pinyin: 'A final can end in n, with your tongue tip touching behind your upper teeth, or in ng, with the back of your tongue raised and the tip down. The ending changes the word: 三 sān is three and 桑 sāng is mulberry.',
          zhuyin: 'ㄢ and ㄣ end with your tongue tip touching behind your upper teeth. ㄤ and ㄥ end with the back of your tongue raised. The ending changes the word: 三 ㄙㄢ is three and 桑 ㄙㄤ is mulberry.',
        },
      },
      {
        kind: 'sound',
        symbol: S('an'),
        how: {
          pinyin: 'Say a, then close with your tongue tip behind your upper teeth.',
          zhuyin: 'Say ㄚ, then close with your tongue tip behind your upper teeth.',
        },
        examples: [{ zh: '三', pinyin: 'sān', gloss: 'three' }],
        contrast: { symbol: S('ang'), example: { zh: '桑', pinyin: 'sāng', gloss: 'mulberry' }, note: 'The tip stays down and it closes at the back, so it sounds deeper.' },
      },
      {
        kind: 'sound',
        symbol: S('en'),
        how: 'A short, relaxed vowel that closes into a front n.',
        examples: [{ zh: '根', pinyin: 'gēn', gloss: 'root' }],
        contrast: { symbol: S('eng'), example: { zh: '耕', pinyin: 'gēng', gloss: 'to plough' }, note: 'This one closes at the back.' },
      },
      {
        kind: 'sound',
        symbol: S('in'),
        how: { pinyin: 'Say i, then close into a front n.', zhuyin: 'Say ㄧ, then close into a front n: ㄧㄣ.' },
        examples: [{ zh: '心', pinyin: 'xīn', gloss: 'heart' }],
        contrast: { symbol: S('ing'), example: { zh: '星', pinyin: 'xīng', gloss: 'star' }, note: 'This one closes at the back.' },
      },
      {
        kind: 'sound',
        symbol: S('ong'),
        how: 'Round your lips and close into a back ng.',
        examples: [{ zh: '中', pinyin: 'zhōng', gloss: 'middle' }, { zh: { t: '東', s: '东' }, pinyin: 'dōng', gloss: 'east' }],
      },
      {
        kind: 'choice',
        prompt: 'Listen. Front or back?',
        audio: '星',
        options: [{ symbol: S('in'), why: 'This one closed at the back of the mouth, so it sounded deeper.' }, { symbol: S('ing') }],
        answer: 1,
        explain: '星 [[xīng]] closes at the back.',
      },
      {
        kind: 'choice',
        prompt: 'Listen. Front or back?',
        audio: '三',
        options: [{ symbol: S('an') }, { symbol: S('ang'), why: 'This one closed with the tongue tip at the teeth. That’s the front ending.' }],
        answer: 0,
        explain: '三 [[sān]]. The tongue tip closes it.',
      },
      {
        kind: 'choice',
        prompt: 'Listen. Front or back?',
        audio: '忙',
        options: [{ symbol: S('an'), why: 'Listen to the deeper, open ending. That’s the back one.' }, { symbol: S('ang') }],
        answer: 1,
        explain: '忙 [[máng]] closes at the back.',
      },
      {
        kind: 'recap',
        points: [
          { pinyin: '-n lifts the tongue tip. -ng lifts the back of the tongue.', zhuyin: 'ㄢ ㄣ lift the tongue tip. ㄤ ㄥ lift the back of the tongue.' },
          'The ending changes the word.',
        ],
      },
    ],
  },
  {
    id: 'cb-p-spelling',
    group: 'pronunciation',
    module: 'More sounds',
    notation: true,
    title: { pinyin: 'Pinyin Spelling Rules', zhuyin: 'Reading Zhuyin Fluently' },
    subtitle: { pinyin: 'y, w, dropped dots and the apostrophe.', zhuyin: 'Order, ㄦ, and syllables you’ll see often.' },
    minutes: 5,
    objectives: {
      pinyin: ['Read y, w and the ü rules correctly.', 'Split syllables at an apostrophe.'],
      zhuyin: ['Read any zhuyin syllable in order.', 'Say ㄦ.'],
    },
    steps: [
      {
        only: 'pinyin',
        kind: 'explain',
        title: 'y and w are spelling',
        body: 'When a final starting with i, u or ü has no initial, pinyin rewrites it: ia becomes ya, ie becomes ye, uo becomes wo and üe becomes yue. The y and w add no sound. They just start the syllable.',
        items: [
          { zh: '也', pinyin: 'yě', gloss: 'ie on its own' },
          { zh: '我', pinyin: 'wǒ', gloss: 'uo on its own' },
          { zh: '月', pinyin: 'yuè', gloss: 'üe on its own' },
        ],
      },
      {
        only: 'pinyin',
        kind: 'choice',
        prompt: 'Which vowel do you say in yue?',
        options: [{ symbol: S('ü') }, { symbol: S('u'), why: 'After y, u is always ü: yu, yue, yuan and yun.' }],
        answer: 0,
        explain: 'A u after y always means ü.',
      },
      {
        only: 'pinyin',
        kind: 'explain',
        title: 'When ü keeps its dots',
        body: 'ü keeps its dots only after n and l, because a plain u can follow them too: nǚ (woman) and nǔ (to strive) are different words. After j, q, x and y the dots are dropped.',
        items: [
          { zh: '女', pinyin: 'nǚ', gloss: 'woman' },
          { zh: '努', pinyin: 'nǔ', gloss: 'to strive' },
        ],
      },
      {
        only: 'pinyin',
        kind: 'choice',
        prompt: 'Listen. Which is it?',
        audio: '女',
        options: [{ pinyin: 'nǚ' }, { pinyin: 'nǔ', why: 'The tongue stayed forward under rounded lips, so it’s ü.' }],
        answer: 0,
        explain: '女 nǚ means woman.',
      },
      {
        only: 'pinyin',
        kind: 'explain',
        title: 'The apostrophe',
        body: 'When a syllable starting with a, o or e follows another syllable, an apostrophe marks the break. Xī’ān is two syllables. Without the mark it would read as xian, one syllable.',
        items: [{ zh: '西安', pinyin: 'xī ān', gloss: 'Xi’an, a city' }],
      },
      {
        only: 'pinyin',
        kind: 'choice',
        prompt: 'How many syllables are in Tiān’ānmén?',
        options: [{ label: 'Three: tiān, ān, mén' }, { label: 'Two: tiā, nānmén', why: 'The apostrophe marks a break, so ān starts a new syllable.' }],
        answer: 0,
        explain: 'The apostrophe splits tiān from ān, so there are three syllables.',
      },

      {
        only: 'zhuyin',
        kind: 'explain',
        title: 'Always in the same order',
        body: 'Every zhuyin syllable reads initial, middle sound, final, then tone: ㄒ ㄧ ㄠ ˇ. Any part except the final can be missing.',
        items: [
          { zh: '小', pinyin: 'xiǎo', gloss: 'all four parts' },
          { zh: '我', pinyin: 'wǒ', gloss: 'no initial: ㄨㄛˇ' },
          { zh: '是', pinyin: 'shì', gloss: 'no final symbol: ㄕˋ' },
        ],
      },
      {
        only: 'zhuyin',
        kind: 'sound',
        symbol: S('er'),
        how: 'Start saying ㄜ and curl your tongue tip back as you go.',
        examples: [{ zh: '二', pinyin: 'èr', gloss: 'two' }, { zh: '耳', pinyin: 'ěr', gloss: 'ear' }],
      },
      {
        only: 'zhuyin',
        kind: 'choice',
        prompt: 'Which spelling of 家 (home) is in the right order?',
        options: [{ pinyin: 'jiā' }, { label: 'ㄧㄐㄚ', why: 'The initial always comes first, then the middle sound.' }],
        answer: 0,
        explain: 'Initial, middle, final: ㄐㄧㄚ.',
      },
      {
        only: 'zhuyin',
        kind: 'choice',
        prompt: 'Listen. Which syllable is it?',
        audio: '耳',
        options: [{ pinyin: 'ěr' }, { pinyin: 'è', why: 'The tongue curled back at the end. That’s ㄦ.' }],
        answer: 0,
        explain: '耳 ㄦˇ, ear. You can hear the tongue curl.',
      },
      {
        only: 'zhuyin',
        kind: 'explain',
        title: 'Zhuyin in daily life',
        body: 'In Taiwan you’ll see zhuyin printed beside characters in children’s books, and many people use it to type on their phones.',
      },
      {
        kind: 'recap',
        points: [
          { pinyin: 'y and w only start syllables. They add no sound.', zhuyin: 'Initial, middle, final, then tone.' },
          { pinyin: 'ü keeps its dots only after n and l.', zhuyin: 'ㄦ is ㄜ with the tongue curled back.' },
        ],
      },
    ],
  },
  {
    id: 'cb-p-tone-changes',
    group: 'pronunciation',
    module: 'More sounds',
    title: 'Tone Changes',
    subtitle: 'The neutral tone, and how 不 and 一 shift.',
    minutes: 6,
    objectives: ['Hear neutral tones.', 'Apply the tone changes of 不 and 一.'],
    steps: [
      {
        kind: 'listen',
        title: 'Light syllables',
        body: 'In each of these, the second syllable is in the neutral tone. It’s short and light.',
        items: [
          { zh: { t: '媽媽', s: '妈妈' }, pinyin: 'mā ma', gloss: 'mum' },
          { zh: '爸爸', pinyin: 'bà ba', gloss: 'dad' },
          { zh: { t: '謝謝', s: '谢谢' }, pinyin: 'xiè xie', gloss: 'thank you' },
        ],
      },
      {
        kind: 'choice',
        prompt: 'Listen. Which syllable is light?',
        audio: { t: '謝謝', s: '谢谢' },
        options: [{ label: 'The second one' }, { label: 'The first one', why: 'The first syllable falls with full weight. The second is the quick, light one.' }],
        answer: 0,
        explain: '{{謝謝|谢谢}} [[xiè xie]]. The second syllable is neutral.',
      },
      {
        kind: 'explain',
        title: '不 before a 4th tone',
        body: '不 ([[bù]], not) becomes a 2nd tone when a 4th tone follows it, so 不是 is said [[bú shì]]. Before any other tone it stays [[bù]].',
        items: [
          { zh: '不是', pinyin: 'bú shì', gloss: 'is not' },
          { zh: '不好', pinyin: 'bù hǎo', gloss: 'not good' },
        ],
      },
      {
        kind: 'choice',
        prompt: 'How is 不是 said?',
        audio: '不是',
        options: [{ pinyin: 'bú shì' }, { pinyin: 'bù shì', why: '是 is a 4th tone, and 不 changes before a 4th tone.' }],
        answer: 0,
        explain: '是 is a 4th tone, so 不 rises: [[bú shì]].',
      },
      {
        kind: 'choice',
        prompt: 'How is 不好 said?',
        audio: '不好',
        options: [{ pinyin: 'bù hǎo' }, { pinyin: 'bú hǎo', why: '好 is a 3rd tone. 不 only changes before a 4th.' }],
        answer: 0,
        explain: '好 is a 3rd tone, so 不 keeps its falling tone: [[bù hǎo]].',
      },
      {
        kind: 'explain',
        title: '一 changes too',
        body: '一 ([[yī]], one) keeps its 1st tone on its own and when you count. Before a 4th tone it becomes [[yí]], and before any other tone it becomes [[yì]].',
        items: [
          { zh: { t: '一個', s: '一个' }, pinyin: 'yí gè', gloss: 'one (of something)' },
          { zh: '一天', pinyin: 'yì tiān', gloss: 'one day' },
        ],
      },
      {
        kind: 'choice',
        prompt: 'How is 一天 (one day) said?',
        audio: '一天',
        options: [
          { pinyin: 'yì tiān' },
          { pinyin: 'yí tiān', why: '一 becomes a 2nd tone only before a 4th tone, and 天 is a 1st tone.' },
          { pinyin: 'yī tiān', why: 'Before another syllable, 一 changes.' },
        ],
        answer: 0,
        explain: '天 is a 1st tone, so 一 falls: [[yì tiān]].',
      },
      {
        kind: 'recap',
        points: ['Neutral tones are short and light.', '不 becomes a 2nd tone before a 4th tone.', '一 becomes a 2nd tone before a 4th tone, and a 4th tone before the others.'],
      },
    ],
  },
]
