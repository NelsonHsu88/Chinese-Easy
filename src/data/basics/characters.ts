import type { BasicsLesson } from './types'

/*
 * Chinese Characters: what a character is, how its parts are arranged, and
 * what those parts hint at. Recognition and understanding; writing them is
 * Writing Basics' job.
 *
 * Component claims are kept to the textbook cases and phrased as clues:
 * a meaning part suggests a category, a sound part suggests a reading, and
 * neither is a rule. Readings inside prose are written `[[mǎ]]`.
 */

export const CHARACTER_LESSONS: BasicsLesson[] = [
  {
    id: 'cb-c-what-is',
    group: 'characters',
    title: 'What Is a Character?',
    subtitle: 'Five characters that began as pictures.',
    minutes: 4,
    objectives: ['Recognise 人, 口, 日, 月 and 木.', 'Know that one character is one syllable.'],
    steps: [
      {
        kind: 'explain',
        title: 'One character, one syllable',
        body: 'Each character is one syllable, and most have a meaning of their own. A few of the oldest started out as drawings, and you can still see the picture in these five.',
        items: [
          { zh: '人', pinyin: 'rén', gloss: 'person, a figure walking' },
          { zh: '口', pinyin: 'kǒu', gloss: 'mouth, drawn open' },
          { zh: '日', pinyin: 'rì', gloss: 'sun, with a line inside' },
          { zh: '月', pinyin: 'yuè', gloss: 'moon, a crescent' },
          { zh: '木', pinyin: 'mù', gloss: 'tree: trunk, branches and roots' },
        ],
      },
      {
        kind: 'character-explorer',
        title: 'Look closely',
        body: 'Tap the character to hear it. The panel below explains what you’re looking at.',
        character: { zh: '木', pinyin: 'mù', gloss: 'tree, wood' },
        layout: 'single',
        parts: [
          {
            zh: '木', role: 'shape', gloss: 'tree', slot: 'whole',
            note: 'A trunk with a branch across it and two roots spreading below.',
            related: [{ zh: '林', pinyin: 'lín', gloss: 'woods (two trees)' }, { zh: '森', pinyin: 'sēn', gloss: 'forest (three trees)' }],
          },
        ],
      },
      {
        kind: 'choice',
        prompt: 'Which one means “sun”?',
        options: [{ zh: '日' }, { zh: '月', why: '月 is the moon, drawn as a crescent.' }, { zh: '口', why: '口 is a mouth, drawn as an empty box.' }],
        answer: 0,
        explain: '日 is a sun with a line through the middle.',
      },
      {
        kind: 'choice',
        prompt: 'What does 人 mean?',
        zh: { zh: '人', pinyin: 'rén' },
        options: [{ label: 'Person' }, { label: 'Tree', why: 'Tree is 木, with a stroke across it for the branches.' }, { label: 'Mouth', why: 'Mouth is 口.' }],
        answer: 0,
        explain: '人 is two strokes, like a pair of legs walking.',
      },
      {
        kind: 'choice',
        prompt: 'Which one is “mouth”?',
        options: [{ zh: '日', why: '日 has a line inside. It’s the sun.' }, { zh: '口' }, { zh: '木', why: '木 is a tree.' }],
        answer: 1,
        explain: '口 is an open mouth, drawn as a box.',
      },
      {
        kind: 'explain',
        title: 'Two ways to write',
        body: 'Some characters have a simplified form, used in mainland China, and a traditional form, used in Taiwan and Hong Kong. The five you just met are the same in both. You’re learning {script} characters, and you can switch in Settings at any time.',
        bothScripts: true,
        items: [
          { zh: { t: '馬', s: '马' }, pinyin: 'mǎ', gloss: 'horse, which changed' },
          { zh: '人', pinyin: 'rén', gloss: 'person, the same in both' },
        ],
      },
      { kind: 'recap', points: ['One character is one syllable.', '人 口 日 月 木 began as pictures.'] },
    ],
  },
  {
    id: 'cb-c-structure',
    group: 'characters',
    title: 'How Characters Are Organized',
    subtitle: 'Single, left–right, top–bottom and enclosed.',
    minutes: 5,
    objectives: ['Name the four common layouts.', 'Spot the layout of a new character.'],
    steps: [
      {
        kind: 'explain',
        title: 'Every character fills a square',
        body: 'However many parts a character has, it takes up the same square, and the parts share it in a few common layouts. In each example, tap the parts to see where they sit.',
      },
      {
        kind: 'character-explorer',
        title: 'Left and right',
        body: 'A woman and a child side by side mean “good”.',
        character: { zh: '好', pinyin: 'hǎo', gloss: 'good' },
        layout: 'left-right',
        parts: [
          { zh: '女', role: 'meaning', gloss: 'woman', slot: 'a', note: 'On the left, squeezed narrow.' },
          { zh: '子', role: 'meaning', gloss: 'child', slot: 'b', note: 'On the right.' },
        ],
      },
      {
        kind: 'character-explorer',
        title: 'Left and right',
        body: 'The sun and the moon, the two lights in the sky, together mean “bright”.',
        character: { zh: '明', pinyin: 'míng', gloss: 'bright' },
        layout: 'left-right',
        parts: [
          { zh: '日', role: 'meaning', gloss: 'sun', slot: 'a', note: 'The sun, made narrow on the left.' },
          { zh: '月', role: 'meaning', gloss: 'moon', slot: 'b', note: 'The moon, on the right.' },
        ],
      },
      {
        kind: 'character-explorer',
        title: 'Left and right',
        body: 'A person leaning against a tree means “to rest”.',
        character: { zh: '休', pinyin: 'xiū', gloss: 'to rest' },
        layout: 'left-right',
        parts: [
          { zh: '亻', role: 'meaning', gloss: 'person', slot: 'a', note: '人 squeezed into a narrow side form, 亻.' },
          { zh: '木', role: 'meaning', gloss: 'tree', slot: 'b', note: 'The tree.' },
        ],
      },
      {
        kind: 'character-explorer',
        title: 'Top and bottom',
        body: 'A woman under a roof means “peaceful” or “safe”.',
        character: { zh: '安', pinyin: 'ān', gloss: 'peaceful, safe' },
        layout: 'top-bottom',
        parts: [
          { zh: '宀', role: 'meaning', gloss: 'roof', slot: 'a', note: 'A roof across the top.' },
          { zh: '女', role: 'meaning', gloss: 'woman', slot: 'b', note: 'Underneath, sheltered.' },
        ],
      },
      {
        kind: 'character-explorer',
        title: 'Enclosed',
        body: 'A border drawn around what’s inside means “country”.',
        character: { zh: { t: '國', s: '国' }, pinyin: 'guó', gloss: 'country' },
        layout: 'enclosure',
        parts: [
          { zh: '囗', role: 'meaning', gloss: 'enclosure', slot: 'a', note: 'A border on all four sides.' },
          { zh: { t: '或', s: '玉' }, role: 'shape', gloss: '{{或, once a word for a territory|玉, jade, a treasure kept inside}}', slot: 'b', note: 'What the border holds.' },
        ],
      },
      {
        kind: 'choice',
        prompt: 'How is 明 built?',
        zh: { zh: '明', pinyin: 'míng' },
        options: [{ label: 'Left and right' }, { label: 'Top and bottom', why: '日 and 月 sit side by side, not one above the other.' }, { label: 'Enclosed', why: 'Nothing wraps around the outside.' }],
        answer: 0,
        explain: '日 is on the left and 月 is on the right.',
      },
      {
        kind: 'choice',
        prompt: 'How is 安 built?',
        zh: { zh: '安', pinyin: 'ān' },
        options: [{ label: 'Left and right', why: 'The roof sits over the woman, not beside her.' }, { label: 'Top and bottom' }, { label: 'Enclosed', why: 'The roof only covers the top.' }],
        answer: 1,
        explain: '宀 is on top and 女 is below.',
      },
      { kind: 'recap', points: ['Every character fits one square.', 'Parts sit side by side, one above the other, or inside a border.'] },
    ],
  },
  {
    id: 'cb-c-components',
    group: 'characters',
    title: 'Radicals and Components',
    subtitle: 'Parts that hint at meaning, and parts that hint at sound.',
    minutes: 6,
    objectives: ['Tell a meaning part from a sound part.', 'Recognise 氵, 亻 and 女.'],
    steps: [
      {
        kind: 'explain',
        title: 'Three words for parts',
        body: 'A component is any part of a character. The radical is the component a dictionary files the character under, and it’s usually the meaning part. Many characters also have a sound part.',
        more: 'Dictionaries use 214 traditional radicals. Most of the time the radical is also the part that hints at meaning. Sometimes, though, it was chosen just to give the character a place in the dictionary.',
      },
      {
        kind: 'explain',
        title: 'Meaning parts',
        body: 'Some components change shape when they sit at the side. 水 (water) becomes 氵 and 人 (person) becomes 亻. Characters that share one often have related meanings.',
        items: [
          { zh: '河', pinyin: 'hé', gloss: 'river · 氵' },
          { zh: '海', pinyin: 'hǎi', gloss: 'sea · 氵' },
          { zh: '洗', pinyin: 'xǐ', gloss: 'to wash · 氵' },
          { zh: '你', pinyin: 'nǐ', gloss: 'you · 亻' },
          { zh: '他', pinyin: 'tā', gloss: 'he · 亻' },
        ],
      },
      {
        kind: 'choice',
        prompt: 'Which one probably has to do with water?',
        options: [{ zh: '洗' }, { zh: '他', why: '他 has 亻, the person part. It means “he”.' }, { zh: '好', why: '好 is 女 and 子, woman and child.' }],
        answer: 0,
        explain: '洗 has 氵 on the left. It means “to wash”.',
      },
      {
        kind: 'character-explorer',
        title: 'Meaning + sound',
        body: 'Most characters pair a meaning part with a sound part. Tap each half of {{媽|妈}}.',
        character: { zh: { t: '媽', s: '妈' }, pinyin: 'mā', gloss: 'mother' },
        layout: 'left-right',
        parts: [
          {
            zh: '女', role: 'meaning', gloss: 'woman', slot: 'a',
            note: 'The meaning clue: this word has to do with a woman.',
            related: [{ zh: '好', pinyin: 'hǎo', gloss: 'good' }, { zh: '她', pinyin: 'tā', gloss: 'she' }, { zh: '姐', pinyin: 'jiě', gloss: 'older sister' }],
          },
          {
            zh: { t: '馬', s: '马' }, role: 'sound', gloss: 'horse · [[mǎ]]', slot: 'b',
            note: 'The sound clue. {{馬|马}} is [[mǎ]] and {{媽|妈}} is [[mā]], the same syllable with a different tone. Horses have nothing to do with it.',
            related: [{ zh: { t: '嗎', s: '吗' }, pinyin: 'ma', gloss: 'question word' }, { zh: { t: '罵', s: '骂' }, pinyin: 'mà', gloss: 'to scold' }],
          },
        ],
      },
      {
        kind: 'explain',
        title: 'Clues, not rules',
        body: 'A component gives you a hint. A sound part may give the right syllable with a different tone, and after centuries of change some no longer match at all. Use them to help you remember, and don’t rely on them to guess.',
        items: [
          { zh: '他', pinyin: 'tā', gloss: '亻 fits: a person' },
          { zh: '海', pinyin: 'hǎi', gloss: '每 ([[měi]]) is no help with the sound' },
        ],
      },
      {
        kind: 'choice',
        prompt: '河, 海 and 洗 all have 氵. What is it a clue to?',
        options: [{ label: 'Water' }, { label: 'A person', why: 'The person part is 亻, a slanted stroke and a vertical.' }, { label: 'The sound', why: 'They sound different: [[hé]], [[hǎi]], [[xǐ]]. 氵 is a meaning clue.' }],
        answer: 0,
        explain: '氵 is the side form of 水, water. River, sea and wash all involve water.',
      },
      {
        kind: 'choice',
        prompt: 'In {{媽|妈}} ([[mā]]), what does {{馬|马}} add?',
        zh: { zh: { t: '媽', s: '妈' }, pinyin: 'mā' },
        options: [{ label: 'The sound' }, { label: 'The meaning', why: 'Mother has nothing to do with horses. {{馬|马}} ([[mǎ]]) lends its sound.' }],
        answer: 0,
        explain: '女 gives the meaning and {{馬|马}} gives the sound.',
      },
      { kind: 'recap', points: ['Meaning parts suggest a category: 氵 water, 亻 person, 女 woman.', 'Sound parts suggest a reading.', 'Both are hints you can’t always rely on.'] },
    ],
  },
  {
    id: 'cb-c-patterns',
    group: 'characters',
    title: 'Discovering Character Patterns',
    subtitle: 'Take characters apart and find their relatives.',
    minutes: 5,
    objectives: ['Use a component to find related characters.'],
    steps: [
      {
        kind: 'character-explorer',
        title: 'A person beside a tree',
        body: 'Tap each part to see what it does and which other characters share it.',
        character: { zh: '休', pinyin: 'xiū', gloss: 'to rest' },
        layout: 'left-right',
        parts: [
          {
            zh: '亻', role: 'meaning', gloss: 'person', slot: 'a',
            note: 'The person radical, one of the most common.',
            related: [{ zh: '你', pinyin: 'nǐ', gloss: 'you' }, { zh: '他', pinyin: 'tā', gloss: 'he' }, { zh: '住', pinyin: 'zhù', gloss: 'to live' }],
          },
          {
            zh: '木', role: 'meaning', gloss: 'tree', slot: 'b',
            note: 'Tree or wood. Here it’s part of the picture and says nothing about the sound.',
            related: [{ zh: '林', pinyin: 'lín', gloss: 'woods' }, { zh: '本', pinyin: 'běn', gloss: 'root, origin' }],
          },
        ],
      },
      {
        kind: 'character-explorer',
        title: 'Speech and a sound',
        body: 'The meaning part comes from speech, and the sound part is 青 ([[qīng]]).',
        character: { zh: { t: '請', s: '请' }, pinyin: 'qǐng', gloss: 'please' },
        layout: 'left-right',
        parts: [
          {
            zh: { t: '言', s: '讠' }, role: 'meaning', gloss: 'speech', slot: 'a',
            note: '{{言, written narrow at the side|讠, the simplified side form of 言}}. It marks words and speaking.',
            related: [{ zh: { t: '說', s: '说' }, pinyin: 'shuō', gloss: 'to speak' }, { zh: { t: '話', s: '话' }, pinyin: 'huà', gloss: 'words' }],
          },
          {
            zh: '青', role: 'sound', gloss: '[[qīng]]', slot: 'b',
            note: '青 is [[qīng]] and {{請|请}} is [[qǐng]]. The syllable carries over and the tone changes.',
            related: [{ zh: '晴', pinyin: 'qíng', gloss: 'clear sky' }, { zh: '清', pinyin: 'qīng', gloss: 'clear water' }, { zh: '情', pinyin: 'qíng', gloss: 'feeling' }],
          },
        ],
      },
      {
        kind: 'choice',
        prompt: '晴, 清 and 情 all share 青 ([[qīng]]). What do they have in common?',
        options: [{ label: 'A similar sound' }, { label: 'The same meaning', why: 'Clear sky, clear water and feeling mean different things. Their left sides tell them apart.' }],
        answer: 0,
        explain: 'All three are read [[qīng]] or [[qíng]], because 青 is their sound part. The left side gives the meaning: 日 sun, 氵 water, 忄 heart.',
      },
      {
        kind: 'choice',
        prompt: 'Which character has the person component?',
        options: [{ zh: '你' }, { zh: '好', why: '好 is 女 (woman) and 子 (child).' }, { zh: '明', why: '明 is the sun and the moon.' }],
        answer: 0,
        explain: '你 has 亻 on its left.',
      },
      { kind: 'recap', points: ['A part you already know gives you a way into a new character.', 'Sound parts link whole families, like 青 晴 清 情.'] },
    ],
  },
  {
    id: 'cb-c-recognize',
    group: 'characters',
    title: 'Recognize Characters',
    subtitle: 'Match, compare and tell look-alikes apart.',
    minutes: 4,
    objectives: ['Recognise the characters from this unit.', 'Tell similar-looking characters apart.'],
    steps: [
      {
        kind: 'choice',
        prompt: 'Which character means “tree”?',
        options: [{ zh: '木' }, { zh: '本', why: '本 is 木 with a mark at the root. It means origin.' }, { zh: '休', why: '休 is a person beside a tree, and means to rest.' }],
        answer: 0,
        explain: '木 on its own is a tree.',
      },
      {
        kind: 'choice',
        prompt: 'What do 你, 他 and 休 share?',
        options: [{ zh: '亻' }, { zh: '女', why: '女 is in 好 and 她.' }, { zh: '氵', why: '氵 is in 河 and 海.' }],
        answer: 0,
        explain: 'All three have the person part 亻 on the left.',
      },
      {
        kind: 'choice',
        prompt: 'These look alike. Which one is “sun”?',
        options: [{ zh: '日' }, { zh: '目', why: '目 is an eye. It’s taller, with two lines inside.' }, { zh: '白', why: '白 (white) has a small stroke on top.' }],
        answer: 0,
        explain: '日 is nearly square, with one line inside.',
      },
      {
        kind: 'choice',
        prompt: 'How is 好 built?',
        zh: { zh: '好', pinyin: 'hǎo' },
        options: [{ label: 'Left and right' }, { label: 'Top and bottom', why: '女 and 子 sit side by side.' }, { label: 'Enclosed', why: 'Nothing surrounds it.' }],
        answer: 0,
        explain: '女 is on the left and 子 is on the right.',
      },
      {
        kind: 'choice',
        prompt: 'Which means “to rest”?',
        options: [{ zh: '休' }, { zh: '你', why: '你 means “you”. It’s 亻 with 尔 on the right.' }, { zh: '林', why: '林 is woods, two trees side by side.' }],
        answer: 0,
        explain: '休 is a person leaning on a tree.',
      },
      {
        kind: 'choice',
        prompt: 'What does 明 mean?',
        zh: { zh: '明', pinyin: 'míng' },
        options: [{ label: 'Bright' }, { label: 'Moon', why: 'The moon on its own is 月. With the sun beside it, 明 means bright.' }, { label: 'Day', why: 'That’s 日 on its own.' }],
        answer: 0,
        explain: 'The sun and the moon together make “bright”.',
      },
      { kind: 'recap', points: ['Look at the whole shape first, then its parts.', 'Look-alikes like 日 目 白 differ by a stroke or two.'] },
    ],
  },
]
