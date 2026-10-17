import type { BasicsLesson, ZhItem } from './types'

/*
 * First Sentences: a few patterns, each met in a sentence first, then built
 * by the learner. Vocabulary is kept to a dozen words, each introduced where
 * it's used.
 *
 * Readings mark the tone a word is actually said with where a change is
 * standard in textbooks (不 before a 4th tone: bú shì). Readings inside prose
 * are written `[[bú shì]]`, so a zhuyin learner sees zhuyin.
 */

const W = {
  wo: { zh: '我', pinyin: 'wǒ', gloss: 'I, me' },
  ni: { zh: '你', pinyin: 'nǐ', gloss: 'you' },
  shi: { zh: '是', pinyin: 'shì', gloss: 'to be' },
  xuesheng: { zh: { t: '學生', s: '学生' }, pinyin: 'xué shēng', gloss: 'student' },
  laoshi: { zh: { t: '老師', s: '老师' }, pinyin: 'lǎo shī', gloss: 'teacher' },
  ma: { zh: { t: '嗎', s: '吗' }, pinyin: 'ma', gloss: 'question word' },
  bu: { zh: '不', pinyin: 'bù', gloss: 'not' },
  bu2: { zh: '不', pinyin: 'bú', gloss: 'not' },
  he: { zh: '喝', pinyin: 'hē', gloss: 'to drink' },
  cha: { zh: '茶', pinyin: 'chá', gloss: 'tea' },
  you: { zh: '有', pinyin: 'yǒu', gloss: 'to have' },
  meiyou: { zh: { t: '沒有', s: '没有' }, pinyin: 'méi yǒu', gloss: 'not have' },
  shu: { zh: { t: '書', s: '书' }, pinyin: 'shū', gloss: 'book' },
} satisfies Record<string, ZhItem>

export const SENTENCE_LESSONS: BasicsLesson[] = [
  {
    id: 'cb-s-introduce',
    group: 'sentences',
    title: 'Introducing Yourself',
    subtitle: 'I am a student: 我 + 是 + noun.',
    minutes: 5,
    objectives: ['Say what you are with 是.', 'Put a simple sentence in order.'],
    steps: [
      {
        kind: 'explain',
        title: 'Four words',
        body: 'Tap each one to hear it. With just these four you can already make sentences.',
        items: [W.wo, W.ni, W.shi, W.xuesheng],
      },
      {
        kind: 'listen',
        title: 'Your first sentence',
        body: 'Who, then 是, then what. The order is the same as in English.',
        items: [{ zh: { t: '我是學生。', s: '我是学生。' }, pinyin: 'wǒ shì xué shēng', gloss: 'I am a student.' }],
      },
      {
        kind: 'sentence-builder',
        prompt: 'Build the sentence.',
        words: [W.wo, W.shi, W.xuesheng],
        shuffled: [2, 0, 1],
        end: '。',
        meaning: 'I am a student.',
        explain: '我 (I) · 是 (am) · {{學生|学生}} (student).',
      },
      {
        kind: 'choice',
        prompt: 'Listen. Who is the student?',
        audio: { t: '你是學生。', s: '你是学生。' },
        options: [{ label: 'You are' }, { label: 'I am', why: 'The sentence started with 你, “you”. “I” would be 我.' }],
        answer: 0,
        explain: '你是{{學生|学生}}: you are a student.',
      },
      {
        kind: 'sentence-builder',
        prompt: 'Now say it about someone else.',
        words: [W.ni, W.shi, W.xuesheng],
        shuffled: [1, 2, 0],
        end: '。',
        meaning: 'You are a student.',
        explain: '你 (you) · 是 (are) · {{學生|学生}} (student).',
      },
      {
        kind: 'choice',
        prompt: 'You meet your new teacher. How do you tell them you’re a student?',
        options: [
          { zh: { t: '我是學生。', s: '我是学生。' } },
          { zh: { t: '你是學生。', s: '你是学生。' }, why: '你 means “you”, so this says the teacher is a student.' },
          { zh: { t: '學生是我。', s: '学生是我。' }, why: 'This is back to front. It says “the student is me”.' },
        ],
        answer: 0,
        explain: '我是{{學生|学生}}: I am a student.',
      },
      { kind: 'recap', points: ['我 is I, 你 is you, 是 is to be.', 'Who, then 是, then what.'] },
    ],
  },
  {
    id: 'cb-s-questions',
    group: 'sentences',
    title: 'Basic Questions',
    subtitle: 'Add {{嗎|吗}} and a statement becomes a question.',
    minutes: 5,
    objectives: ['Turn a statement into a yes/no question with {{嗎|吗}}.', 'Answer yes with the verb.'],
    steps: [
      {
        kind: 'explain',
        title: 'Just add {{嗎|吗}}',
        body: 'Put {{嗎|吗}} at the end of a statement and it becomes a yes/no question. The other words stay where they are. English swaps “you are” to “are you”, and Mandarin doesn’t.',
        items: [
          { zh: { t: '你是學生。', s: '你是学生。' }, pinyin: 'nǐ shì xué shēng', gloss: 'You are a student.' },
          { zh: { t: '你是學生嗎？', s: '你是学生吗？' }, pinyin: 'nǐ shì xué shēng ma', gloss: 'Are you a student?' },
        ],
      },
      {
        kind: 'sentence-builder',
        prompt: 'Turn “You are a student” into a question.',
        words: [W.ni, W.shi, W.xuesheng, W.ma],
        shuffled: [3, 1, 0, 2],
        end: '？',
        meaning: 'Are you a student?',
        explain: 'The statement stays as it is, and {{嗎|吗}} goes on the end.',
      },
      {
        kind: 'explain',
        title: 'Answering yes',
        body: 'Mandarin has no single word for “yes”. You answer with the verb, 是 (“am”), or with the whole sentence.',
        items: [
          { zh: '是。', pinyin: 'shì', gloss: 'Yes (I am).' },
          { zh: { t: '是，我是學生。', s: '是，我是学生。' }, pinyin: 'shì wǒ shì xué shēng', gloss: 'Yes, I’m a student.' },
        ],
      },
      {
        kind: 'choice',
        prompt: 'Which one is a question?',
        options: [
          { zh: { t: '你是老師嗎？', s: '你是老师吗？' } },
          { zh: { t: '你是老師。', s: '你是老师。' }, why: 'Without {{嗎|吗}} it’s a statement: “you are a teacher”.' },
          { zh: { t: '嗎你是老師？', s: '吗你是老师？' }, why: '{{嗎|吗}} always goes at the very end.' },
        ],
        answer: 0,
        explain: '{{你是老師嗎|你是老师吗}}？ means “Are you a teacher?” ({{老師|老师}} is teacher.)',
      },
      {
        kind: 'choice',
        prompt: 'Someone asks {{你是學生嗎|你是学生吗}}？ You are. What do you say?',
        options: [
          { zh: '是。' },
          { zh: { t: '嗎。', s: '吗。' }, why: '{{嗎|吗}} only asks. It never answers.' },
          { zh: '你是。', why: 'That says “you are”. The answer is about you, so use 是 on its own or start with 我.' },
        ],
        answer: 0,
        explain: 'Answer with the verb: 是.',
      },
      { kind: 'recap', points: ['A statement plus {{嗎|吗}} is a question.', 'Answer yes with the verb, 是.'] },
    ],
  },
  {
    id: 'cb-s-no',
    group: 'sentences',
    title: 'Saying No',
    subtitle: '不 goes right before the verb.',
    minutes: 5,
    objectives: ['Make a sentence negative with 不.', 'Say 不 with the right tone before 是.'],
    steps: [
      {
        kind: 'explain',
        title: '不 before the verb',
        body: 'To say “not”, put 不 straight in front of the verb.',
        items: [
          { zh: { t: '我不是學生。', s: '我不是学生。' }, pinyin: 'wǒ bú shì xué shēng', gloss: 'I am not a student.' },
          { zh: '我不喝茶。', pinyin: 'wǒ bù hē chá', gloss: 'I don’t drink tea.' },
        ],
      },
      {
        kind: 'sentence-builder',
        prompt: 'Build the sentence.',
        words: [W.wo, W.bu, W.he, W.cha],
        shuffled: [2, 0, 3, 1],
        end: '。',
        meaning: 'I don’t drink tea.',
        explain: '我 (I) · 不 (not) · 喝 (drink) · 茶 (tea).',
      },
      {
        kind: 'explain',
        title: 'Hear the tone change',
        body: '不 is normally [[bù]]. Before a 4th tone like 是 ([[shì]]) it rises, so you say [[bú shì]]. Before 喝 ([[hē]]) it stays [[bù]].',
        items: [
          { zh: '不是', pinyin: 'bú shì', gloss: 'is not' },
          { zh: '不喝', pinyin: 'bù hē', gloss: 'don’t drink' },
        ],
      },
      {
        kind: 'choice',
        prompt: 'Listen. How is 不 said here?',
        audio: '不是',
        options: [{ pinyin: 'bú' }, { pinyin: 'bù', why: '是 is a 4th tone, so 不 rises before it.' }],
        answer: 0,
        explain: '不是 is said [[bú shì]].',
      },
      {
        kind: 'sentence-builder',
        prompt: 'Build the sentence.',
        words: [W.wo, W.bu2, W.shi, W.xuesheng],
        shuffled: [3, 1, 0, 2],
        end: '。',
        meaning: 'I am not a student.',
        explain: '不 goes right before 是.',
      },
      {
        kind: 'choice',
        prompt: 'Where does 不 go?',
        options: [
          { zh: '我不喝茶。' },
          { zh: '不我喝茶。', why: '不 negates the verb, so it goes right before 喝, not before 我.' },
          { zh: '我喝茶不。', why: 'In Mandarin, 不 comes before the verb.' },
        ],
        answer: 0,
        explain: '不 sits right before the verb 喝.',
      },
      { kind: 'recap', points: ['不 before a verb means “not”.', '不是 is said [[bú shì]].'] },
    ],
  },
  {
    id: 'cb-s-have',
    group: 'sentences',
    title: 'Saying What You Have',
    subtitle: '有, and its own negative {{沒有|没有}}.',
    minutes: 5,
    objectives: ['Say what you have with 有.', 'Use {{沒有|没有}}, never 不有.'],
    steps: [
      {
        kind: 'explain',
        title: '有 means have',
        body: '有 ([[yǒu]]) works like “have”.',
        items: [
          W.you,
          W.shu,
          { zh: { t: '我有書。', s: '我有书。' }, pinyin: 'wǒ yǒu shū', gloss: 'I have a book.' },
        ],
      },
      {
        kind: 'sentence-builder',
        prompt: 'Build the sentence.',
        words: [W.wo, W.you, W.shu],
        shuffled: [1, 2, 0],
        end: '。',
        meaning: 'I have a book.',
        explain: '我 · 有 · {{書|书}}.',
      },
      {
        kind: 'explain',
        title: 'Its own “not”',
        body: '有 is the one verb that never takes 不. To say you don’t have something, use {{沒有|没有}} ([[méi yǒu]]).',
        items: [{ zh: { t: '我沒有書。', s: '我没有书。' }, pinyin: 'wǒ méi yǒu shū', gloss: 'I don’t have a book.' }],
      },
      {
        kind: 'sentence-builder',
        prompt: 'Build the sentence.',
        words: [W.wo, W.meiyou, W.shu],
        shuffled: [2, 0, 1],
        end: '。',
        meaning: 'I don’t have a book.',
        explain: '{{沒有|没有}} goes where 有 was.',
      },
      {
        kind: 'choice',
        prompt: 'How do you say “I don’t have a book”?',
        options: [
          { zh: { t: '我沒有書。', s: '我没有书。' } },
          { zh: { t: '我不有書。', s: '我不有书。' }, why: '有 never takes 不. Its negative is {{沒有|没有}}.' },
          { zh: { t: '我有沒書。', s: '我有没书。' }, why: '{{沒有|没有}} stays together, in the place of 有.' },
        ],
        answer: 0,
        explain: 'Always {{沒有|没有}}, never 不有.',
      },
      {
        kind: 'choice',
        prompt: 'What does {{你有書嗎|你有书吗}}？ mean?',
        options: [{ label: 'Do you have a book?' }, { label: 'You have a book.', why: '{{嗎|吗}} at the end makes it a question.' }, { label: 'Are you a book?', why: 'That would use 是, not 有.' }],
        answer: 0,
        explain: '有 with {{嗎|吗}} asks “do you have…?”',
      },
      { kind: 'recap', points: ['有 means have.', 'To say you don’t have something, use {{沒有|没有}}.'] },
    ],
  },
  {
    id: 'cb-s-conversation',
    group: 'sentences',
    title: 'A Simple Conversation',
    subtitle: 'Put every pattern together.',
    minutes: 6,
    objectives: ['Follow and take part in a short exchange.'],
    steps: [
      {
        kind: 'dialogue',
        title: 'Listen first',
        body: 'Two people meet. Tap each line to hear it.',
        lines: [
          { speaker: 'A', item: { zh: '你好！', pinyin: 'nǐ hǎo', gloss: 'Hello!' } },
          { speaker: 'B', item: { zh: '你好！', pinyin: 'nǐ hǎo', gloss: 'Hello!' } },
          { speaker: 'A', item: { zh: { t: '你是老師嗎？', s: '你是老师吗？' }, pinyin: 'nǐ shì lǎo shī ma', gloss: 'Are you a teacher?' } },
          { speaker: 'B', item: { zh: { t: '我不是老師，我是學生。', s: '我不是老师，我是学生。' }, pinyin: 'wǒ bú shì lǎo shī wǒ shì xué shēng', gloss: 'I’m not a teacher, I’m a student.' } },
          { speaker: 'A', item: { zh: { t: '你有書嗎？', s: '你有书吗？' }, pinyin: 'nǐ yǒu shū ma', gloss: 'Do you have a book?' } },
          { speaker: 'B', item: { zh: '有。', pinyin: 'yǒu', gloss: 'I do.' } },
        ],
      },
      {
        kind: 'choice',
        prompt: 'You’re B. A asks {{你是老師嗎|你是老师吗}}？ You’re a student. What do you say?',
        options: [
          { zh: { t: '我不是老師。', s: '我不是老师。' } },
          { zh: { t: '我沒有老師。', s: '我没有老师。' }, why: 'That says “I don’t have a teacher”. Saying what you are takes 是.' },
          { zh: { t: '是，我是老師。', s: '是，我是老师。' }, why: 'That says yes, you are a teacher.' },
        ],
        answer: 0,
        explain: '不是 means “am not”.',
      },
      {
        kind: 'sentence-builder',
        prompt: 'Now ask A whether they have tea.',
        words: [W.ni, W.you, W.cha, W.ma],
        shuffled: [2, 3, 0, 1],
        end: '？',
        meaning: 'Do you have tea?',
        explain: '你 · 有 · 茶 · {{嗎|吗}}. It’s a statement with {{嗎|吗}} added.',
      },
      {
        kind: 'choice',
        prompt: 'A answers {{我沒有茶|我没有茶}}。 What did they say?',
        audio: { t: '我沒有茶。', s: '我没有茶。' },
        options: [
          { label: 'I don’t have tea.' },
          { label: 'I don’t drink tea.', why: 'Drinking is 喝. {{沒有|没有}} means “don’t have”.' },
          { label: 'I have tea.', why: 'Listen for {{沒|没}} ([[méi]]) before 有.' },
        ],
        answer: 0,
        explain: '{{沒有|没有}}茶 means they have no tea.',
      },
      {
        kind: 'dialogue',
        title: 'Your conversation',
        body: 'Here’s the whole exchange. Play it through once more.',
        lines: [
          { speaker: 'A', item: { zh: { t: '你是老師嗎？', s: '你是老师吗？' }, pinyin: 'nǐ shì lǎo shī ma', gloss: 'Are you a teacher?' } },
          { speaker: 'B', item: { zh: { t: '我不是老師。', s: '我不是老师。' }, pinyin: 'wǒ bú shì lǎo shī', gloss: 'I’m not a teacher.' } },
          { speaker: 'B', item: { zh: { t: '你有茶嗎？', s: '你有茶吗？' }, pinyin: 'nǐ yǒu chá ma', gloss: 'Do you have tea?' } },
          { speaker: 'A', item: { zh: { t: '我沒有茶。', s: '我没有茶。' }, pinyin: 'wǒ méi yǒu chá', gloss: 'I don’t have tea.' } },
        ],
      },
      { kind: 'recap', points: ['是 and 不是: am, am not.', '有 and {{沒有|没有}}: have, don’t have.', '{{嗎|吗}} asks, and the verb answers.'] },
    ],
  },
]
