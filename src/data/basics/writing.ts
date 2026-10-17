import type { BasicsLesson } from './types'

/*
 * Writing Basics: forming characters by hand, on the app's own HanziStage
 * (hanzi-writer, real stroke data). Each new shape is watched before it's
 * traced, and help is withdrawn a step at a time: `guided` → `outline` → `free`.
 *
 * Stroke practice is never graded into the FSRS deck. These are handwriting
 * reps, not vocabulary reviews.
 *
 * No stroke data exists for the bare stroke glyphs (丨 丿 ㇏ …), so each basic
 * stroke is taught inside the simplest character that has it.
 */

export const WRITING_LESSONS: BasicsLesson[] = [
  {
    id: 'cb-w-strokes',
    group: 'writing',
    title: 'Basic Strokes',
    subtitle: 'Horizontal, vertical, falling, dot, hook and turn.',
    minutes: 7,
    objectives: ['Write the basic strokes in the right direction.'],
    steps: [
      {
        kind: 'explain',
        title: 'A small set of strokes',
        body: 'Every character is made from a handful of basic strokes, and each one is written in a set direction. You’ll watch each stroke, then write it yourself.',
      },
      { kind: 'stroke', title: 'Horizontal 一', body: 'Left to right, steady and level.', character: '一', guidance: 'watch' },
      { kind: 'stroke', title: 'Your turn', body: 'Write it left to right. The stroke flashes first to show you where.', character: '一', guidance: 'guided' },
      { kind: 'stroke', title: 'Vertical 丨', body: 'The second stroke of 十 is a vertical. It goes straight down, top to bottom.', character: '十', guidance: 'watch' },
      { kind: 'stroke', title: 'Your turn', body: 'The horizontal first, then the vertical down through it.', character: '十', guidance: 'guided' },
      { kind: 'stroke', title: 'Falling strokes 丿 ㇏', body: '八 is two falling strokes. The first sweeps down to the left, and the second goes down to the right, getting thicker as it goes.', character: '八', guidance: 'watch' },
      { kind: 'stroke', title: 'Your turn', body: 'The left one first, then the right one.', character: '八', guidance: 'guided' },
      { kind: 'stroke', title: 'Dot 丶', body: 'The first stroke of 六 is a dot, a short press down and to the right.', character: '六', guidance: 'watch' },
      { kind: 'stroke', title: 'Your turn', body: 'Start with the dot at the top.', character: '六', guidance: 'guided' },
      { kind: 'stroke', title: 'Rising ㇀', body: 'The third stroke of 打 rises. It starts at the lower left and flicks up to the right.', character: '打', guidance: 'watch' },
      { kind: 'stroke', title: 'Hook 亅', body: '小 starts with a vertical that hooks up and to the left at the bottom. The hook is part of the same stroke.', character: '小', guidance: 'watch' },
      { kind: 'stroke', title: 'Turn ㇕', body: 'The second stroke of 口 turns a corner. It runs along the top and down the right side without lifting the pen.', character: '口', guidance: 'watch' },
      {
        kind: 'choice',
        prompt: 'Which way does a horizontal stroke go?',
        options: [{ label: 'Left to right' }, { label: 'Right to left', why: 'Horizontals always run left to right.' }],
        answer: 0,
        explain: 'Always left to right.',
      },
      {
        kind: 'choice',
        prompt: 'How many strokes is 口?',
        zh: { zh: '口', pinyin: 'kǒu' },
        options: [{ label: '3' }, { label: '4', why: 'The top and the right side are one stroke that turns the corner.' }],
        answer: 0,
        explain: 'The left side, then the top and right side in one turning stroke, then the bottom.',
      },
      { kind: 'stroke', title: 'Write 口', body: 'Three strokes. Turn the corner in one go.', character: '口', guidance: 'outline' },
      { kind: 'recap', points: ['Horizontals go left to right, verticals top to bottom.', 'Falling strokes sweep down, and a rising stroke flicks up.', 'A hook or a turn is part of the stroke before it.'] },
    ],
  },
  {
    id: 'cb-w-order',
    group: 'writing',
    title: 'Stroke Order',
    subtitle: 'The habits behind most characters.',
    minutes: 5,
    objectives: ['Apply the common stroke-order rules.'],
    steps: [
      {
        kind: 'explain',
        title: 'A few habits',
        body: 'Stroke order follows a few habits that cover most characters. There are exceptions, so when you’re unsure, follow the animation.',
        more: 'For some characters, the mainland and Taiwan standards differ slightly. The animations here follow the standard for the script you chose.',
      },
      { kind: 'stroke', title: 'Top to bottom', body: 'The three horizontals of 三, from the top down.', character: '三', guidance: 'watch' },
      { kind: 'stroke', title: 'Left to right', body: '川 goes left stroke, middle, then right.', character: '川', guidance: 'watch' },
      { kind: 'stroke', title: 'Horizontal before vertical', body: 'Where two strokes cross, as in 十, the horizontal usually comes first.', character: '十', guidance: 'watch' },
      { kind: 'stroke', title: 'Outside, inside, then close', body: 'In 日 you write the frame first, then what’s inside, and close the bottom last.', character: '日', guidance: 'watch' },
      { kind: 'stroke', title: 'Middle before sides', body: '小 starts with the hook in the middle, then the left dot, then the right one.', character: '小', guidance: 'watch' },
      { kind: 'stroke', title: 'The bottom waits', body: 'In 王 the vertical comes before the last horizontal, because the bottom stroke closes the character.', character: '王', guidance: 'watch' },
      {
        kind: 'choice',
        prompt: 'In 日, which stroke comes last?',
        zh: { zh: '日', pinyin: 'rì' },
        options: [{ label: 'The bottom horizontal' }, { label: 'The middle horizontal', why: 'The inside goes before the bottom closes the box.' }, { label: 'The left side', why: 'The left side comes first.' }],
        answer: 0,
        explain: 'You close the box last.',
      },
      {
        kind: 'choice',
        prompt: 'In 小, which stroke comes first?',
        zh: { zh: '小', pinyin: 'xiǎo' },
        options: [{ label: 'The middle hook' }, { label: 'The left dot', why: 'In a symmetrical character, the middle usually comes first.' }],
        answer: 0,
        explain: 'The middle first, then the left, then the right.',
      },
      { kind: 'stroke', title: 'Try it', body: 'Write 日: the frame, the inside, then close it.', character: '日', guidance: 'guided' },
      { kind: 'stroke', title: 'And 小', body: 'Middle first, then the two sides.', character: '小', guidance: 'outline' },
      { kind: 'recap', points: ['Top to bottom, left to right.', 'Horizontal before vertical, most of the time.', 'Outside, inside, then close. Middle before the sides.'] },
    ],
  },
  {
    id: 'cb-w-first',
    group: 'writing',
    title: 'Your First Characters',
    subtitle: '一, 二, 三 and 十, from tracing to writing alone.',
    minutes: 6,
    objectives: ['Write 一, 二, 三 and 十 from memory.'],
    steps: [
      { kind: 'stroke', title: 'Watch: 二', body: 'Two is a short stroke on top and a longer one below.', character: '二', guidance: 'watch' },
      { kind: 'stroke', title: 'Trace: 二', body: 'Each stroke flashes before you write it.', character: '二', guidance: 'guided' },
      { kind: 'stroke', title: 'Less help: 三', body: 'Three, with only a faint outline this time. The bottom stroke is the longest.', character: '三', guidance: 'outline' },
      { kind: 'stroke', title: 'Watch: 十', body: 'Ten is a horizontal, then a vertical.', character: '十', guidance: 'watch' },
      { kind: 'stroke', title: 'Trace: 十', body: 'With the outline.', character: '十', guidance: 'outline' },
      { kind: 'stroke', title: 'On your own: 十', body: 'Now there’s only the grid. If you get stuck, a hint appears after a couple of tries.', character: '十', guidance: 'free' },
      { kind: 'stroke', title: 'On your own: 二', body: 'From memory. Keep the top stroke shorter.', character: '二', guidance: 'free' },
      { kind: 'stroke', title: 'On your own: 三', body: 'From memory.', character: '三', guidance: 'free' },
      { kind: 'recap', points: ['You wrote 二 三 十 from memory.', 'Watch, trace, then write alone. That works for any character.'] },
    ],
  },
  {
    id: 'cb-w-structures',
    group: 'writing',
    title: 'Writing Character Structures',
    subtitle: '人, 大, 木, 口, 日 and 好 in the square grid.',
    minutes: 7,
    objectives: ['Fit strokes and parts into the square grid.'],
    steps: [
      {
        kind: 'explain',
        title: 'Use the grid',
        body: 'The dashed lines split the square into quarters and diagonals. Use them to place each stroke: where it starts, where it crosses the middle and how far it reaches.',
      },
      { kind: 'stroke', title: '人', body: 'The left-falling stroke, then the right-falling one, meeting just above the middle.', character: '人', guidance: 'guided' },
      { kind: 'stroke', title: '大', body: 'This is 人 with a horizontal across the top. The horizontal comes first.', character: '大', guidance: 'outline' },
      { kind: 'stroke', title: '木', body: 'The horizontal, the vertical, then two strokes falling away from the centre.', character: '木', guidance: 'outline' },
      { kind: 'stroke', title: '口', body: 'Three strokes. Keep it square and close it last.', character: '口', guidance: 'outline' },
      { kind: 'stroke', title: '日', body: 'Taller than 口, with a line inside before you close it.', character: '日', guidance: 'free' },
      { kind: 'stroke', title: 'Two parts: 好', body: 'Left, then right. 女 is squeezed into the left half and 子 takes the right.', character: '好', guidance: 'watch' },
      { kind: 'stroke', title: 'Your turn: 好', body: 'Finish every stroke of the left part before you start the right.', character: '好', guidance: 'guided' },
      { kind: 'recap', points: ['Place strokes against the grid lines.', 'In a left–right character, finish the left part first.'] },
    ],
  },
  {
    id: 'cb-w-practice',
    group: 'writing',
    title: 'Independent Practice',
    subtitle: 'Choose any character you’ve learned and write it.',
    minutes: 5,
    objectives: ['Practise writing on your own.'],
    steps: [
      {
        kind: 'stroke-picker',
        title: 'Pick one to write',
        body: 'Choose a character. Watch it first if you like, then write it without the outline. Write as many as you want.',
        characters: [
          { zh: '一', pinyin: 'yī', gloss: 'one' },
          { zh: '二', pinyin: 'èr', gloss: 'two' },
          { zh: '三', pinyin: 'sān', gloss: 'three' },
          { zh: '十', pinyin: 'shí', gloss: 'ten' },
          { zh: '八', pinyin: 'bā', gloss: 'eight' },
          { zh: '人', pinyin: 'rén', gloss: 'person' },
          { zh: '大', pinyin: 'dà', gloss: 'big' },
          { zh: '小', pinyin: 'xiǎo', gloss: 'small' },
          { zh: '木', pinyin: 'mù', gloss: 'tree' },
          { zh: '口', pinyin: 'kǒu', gloss: 'mouth' },
          { zh: '日', pinyin: 'rì', gloss: 'sun' },
          { zh: '好', pinyin: 'hǎo', gloss: 'good' },
        ],
      },
      { kind: 'recap', points: ['Come back here whenever you want to practise.', 'Every word’s page in the Dictionary has writing practice too.'] },
    ],
  },
]
