import type { Lesson } from '../types'

/** Hand-authored lesson content, 3 lessons per unit mixing match/scramble/fill-blank exercises. */
export const LESSONS: Lesson[] = [
  {
    id: 'basics-1-radicals',
    unitId: 'the-basics',
    title: 'Radicals & Strokes',
    exercises: [
      {
        type: 'match',
        prompt: 'Match each radical to its meaning',
        pairs: [
          { hanzi: '人', pinyin: 'rén', english: 'person' },
          { hanzi: '水', pinyin: 'shuǐ', english: 'water' },
          { hanzi: '木', pinyin: 'mù', english: 'tree / wood' },
          { hanzi: '口', pinyin: 'kǒu', english: 'mouth' },
          { hanzi: '心', pinyin: 'xīn', english: 'heart' },
        ],
      },
      {
        type: 'fill-blank',
        dialogue: [
          { speaker: '老師', line: '你好！我姓王。' },
          { speaker: '學生', line: '___，王老師！' },
        ],
        options: ['你好', '再見', '謝謝', '不客氣'],
        answer: '你好',
        english: 'Teacher: Hello! My surname is Wang. Student: Hello, Teacher Wang!',
      },
    ],
  },
  {
    id: 'basics-2-numbers',
    unitId: 'the-basics',
    title: 'Numbers & Counting',
    exercises: [
      {
        type: 'match',
        prompt: 'Match each number',
        pairs: [
          { hanzi: '一', pinyin: 'yī', english: 'one' },
          { hanzi: '二', pinyin: 'èr', english: 'two' },
          { hanzi: '三', pinyin: 'sān', english: 'three' },
          { hanzi: '四', pinyin: 'sì', english: 'four' },
          { hanzi: '五', pinyin: 'wǔ', english: 'five' },
        ],
      },
      {
        type: 'scramble',
        instruction: 'Build the sentence',
        chinese: '我有三本書。',
        tokens: ['我', '有', '三本', '書。'],
        pinyin: 'Wǒ yǒu sān běn shū.',
        english: 'I have three books.',
      },
    ],
  },
  {
    id: 'basics-3-grammar',
    unitId: 'the-basics',
    title: 'Grammar & Punctuation',
    exercises: [
      {
        type: 'fill-blank',
        dialogue: [
          { speaker: '小明', line: '你是老師嗎？' },
          { speaker: '小華', line: '不，我___學生。' },
        ],
        options: ['是', '有', '在', '的'],
        answer: '是',
        english: 'Xiaoming: Are you a teacher? Xiaohua: No, I am a student.',
      },
      {
        type: 'scramble',
        instruction: 'Build the sentence',
        chinese: '你叫什麼名字？',
        tokens: ['你', '叫', '什麼', '名字？'],
        pinyin: 'Nǐ jiào shénme míngzi?',
        english: 'What is your name?',
      },
      {
        type: 'match',
        prompt: 'Match each punctuation mark to its use',
        pairs: [
          { hanzi: '。', pinyin: 'jùhào', english: 'period — ends a statement' },
          { hanzi: '？', pinyin: 'wènhào', english: 'question mark — ends a question' },
          { hanzi: '，', pinyin: 'dòuhào', english: 'comma — pause within a sentence' },
          { hanzi: '！', pinyin: 'gǎntànhào', english: 'exclamation mark — strong feeling' },
        ],
      },
    ],
  },
  {
    id: 'basics-4-pronouns',
    unitId: 'the-basics',
    title: 'Articles & Pronouns',
    exercises: [
      {
        type: 'match',
        prompt: 'Match each pronoun',
        pairs: [
          { hanzi: '我', pinyin: 'wǒ', english: 'I / me' },
          { hanzi: '你', pinyin: 'nǐ', english: 'you' },
          { hanzi: '他', pinyin: 'tā', english: 'he / him' },
          { hanzi: '她', pinyin: 'tā', english: 'she / her' },
          { hanzi: '我們', pinyin: 'wǒmen', english: 'we / us' },
        ],
      },
      {
        type: 'fill-blank',
        dialogue: [
          { speaker: '安娜', line: '這是誰___書？' },
          { speaker: '大衛', line: '這是我的書。' },
        ],
        options: ['的', '是', '嗎', '了'],
        answer: '的',
        english: 'Anna: Whose book is this? David: This is my book.',
      },
    ],
  },

  // --- Unit 2: Basic Food ---
  {
    id: 'food-1-dishes',
    unitId: 'basic-food',
    title: 'Meals & Dishes',
    exercises: [
      {
        type: 'match',
        prompt: 'Match each dish',
        pairs: [
          { hanzi: '米飯', pinyin: 'mǐfàn', english: 'rice' },
          { hanzi: '麵條', pinyin: 'miàntiáo', english: 'noodles' },
          { hanzi: '餃子', pinyin: 'jiǎozi', english: 'dumplings' },
          { hanzi: '湯', pinyin: 'tāng', english: 'soup' },
          { hanzi: '豆腐', pinyin: 'dòufu', english: 'tofu' },
        ],
      },
      {
        type: 'fill-blank',
        dialogue: [
          { speaker: '服務員', line: '你要吃什麼？' },
          { speaker: '客人', line: '我要一碗___。' },
        ],
        options: ['麵條', '電腦', '汽車', '眼鏡'],
        answer: '麵條',
        english: "Waiter: What would you like to eat? Customer: I'd like a bowl of noodles.",
      },
    ],
  },
  {
    id: 'food-2-restaurant',
    unitId: 'basic-food',
    title: 'At the Restaurant',
    exercises: [
      {
        type: 'scramble',
        instruction: 'Build the sentence',
        chinese: '這個菜很好吃。',
        tokens: ['這個', '菜', '很', '好吃。'],
        pinyin: 'Zhège cài hěn hǎochī.',
        english: 'This dish is very delicious.',
      },
      {
        type: 'match',
        prompt: 'Match each drink',
        pairs: [
          { hanzi: '茶', pinyin: 'chá', english: 'tea' },
          { hanzi: '咖啡', pinyin: 'kāfēi', english: 'coffee' },
          { hanzi: '牛奶', pinyin: 'niúnǎi', english: 'milk' },
          { hanzi: '果汁', pinyin: 'guǒzhī', english: 'juice' },
          { hanzi: '水', pinyin: 'shuǐ', english: 'water' },
        ],
      },
    ],
  },
  {
    id: 'food-3-tastes',
    unitId: 'basic-food',
    title: 'Tastes & Preferences',
    exercises: [
      {
        type: 'fill-blank',
        dialogue: [
          { speaker: '媽媽', line: '這個湯怎麼樣？' },
          { speaker: '小明', line: '很___，我喜歡！' },
        ],
        options: ['好喝', '便宜', '遠', '高'],
        answer: '好喝',
        english: "Mom: How's the soup? Xiaoming: It's tasty, I like it!",
      },
      {
        type: 'match',
        prompt: 'Match each taste',
        pairs: [
          { hanzi: '甜', pinyin: 'tián', english: 'sweet' },
          { hanzi: '辣', pinyin: 'là', english: 'spicy' },
          { hanzi: '酸', pinyin: 'suān', english: 'sour' },
          { hanzi: '鹹', pinyin: 'xián', english: 'salty' },
          { hanzi: '苦', pinyin: 'kǔ', english: 'bitter' },
        ],
      },
    ],
  },

  // --- Unit 3: Friendship ---
  {
    id: 'friend-1-meeting',
    unitId: 'friendship',
    title: 'Meeting Someone New',
    exercises: [
      {
        type: 'match',
        prompt: 'Match each word',
        pairs: [
          { hanzi: '朋友', pinyin: 'péngyǒu', english: 'friend' },
          { hanzi: '認識', pinyin: 'rènshi', english: 'to know / meet' },
          { hanzi: '介紹', pinyin: 'jièshào', english: 'to introduce' },
          { hanzi: '同學', pinyin: 'tóngxué', english: 'classmate' },
          { hanzi: '名字', pinyin: 'míngzi', english: 'name' },
        ],
      },
      {
        type: 'fill-blank',
        dialogue: [
          { speaker: '小美', line: '很高興___你。' },
          { speaker: '大衛', line: '我也是，我叫大衛。' },
        ],
        options: ['認識', '喜歡', '討厭', '忘記'],
        answer: '認識',
        english: 'Xiaomei: Nice to meet you. David: Me too, I’m David.',
      },
    ],
  },
  {
    id: 'friend-2-plans',
    unitId: 'friendship',
    title: 'Making Plans',
    exercises: [
      {
        type: 'scramble',
        instruction: 'Build the sentence',
        chinese: '我們星期六一起去看電影。',
        tokens: ['我們', '星期六', '一起', '去看', '電影。'],
        pinyin: 'Wǒmen xīngqíliù yìqǐ qù kàn diànyǐng.',
        english: "We're going to watch a movie together on Saturday.",
      },
      {
        type: 'match',
        prompt: 'Match each time word',
        pairs: [
          { hanzi: '今天', pinyin: 'jīntiān', english: 'today' },
          { hanzi: '明天', pinyin: 'míngtiān', english: 'tomorrow' },
          { hanzi: '週末', pinyin: 'zhōumò', english: 'weekend' },
          { hanzi: '晚上', pinyin: 'wǎnshàng', english: 'evening' },
          { hanzi: '下午', pinyin: 'xiàwǔ', english: 'afternoon' },
        ],
      },
    ],
  },
  {
    id: 'friend-3-describing',
    unitId: 'friendship',
    title: 'Talking About Friends',
    exercises: [
      {
        type: 'fill-blank',
        dialogue: [
          { speaker: '安娜', line: '你的朋友怎麼樣？' },
          { speaker: '小華', line: '他很___，常常幫助我。' },
        ],
        options: ['友善', '便宜', '遙遠', '安靜'],
        answer: '友善',
        english: "Anna: What's your friend like? Xiaohua: He's very friendly, he often helps me.",
      },
      {
        type: 'match',
        prompt: 'Match each personality trait',
        pairs: [
          { hanzi: '友善', pinyin: 'yǒushàn', english: 'friendly' },
          { hanzi: '幽默', pinyin: 'yōumò', english: 'humorous' },
          { hanzi: '誠實', pinyin: 'chéngshí', english: 'honest' },
          { hanzi: '熱情', pinyin: 'rèqíng', english: 'warm / enthusiastic' },
          { hanzi: '聰明', pinyin: 'cōngmíng', english: 'smart' },
        ],
      },
    ],
  },

  // --- Unit 4: Travel ---
  {
    id: 'travel-1-directions',
    unitId: 'travel',
    title: 'Asking Directions',
    exercises: [
      {
        type: 'match',
        prompt: 'Match each direction word',
        pairs: [
          { hanzi: '左邊', pinyin: 'zuǒbiān', english: 'left side' },
          { hanzi: '右邊', pinyin: 'yòubiān', english: 'right side' },
          { hanzi: '前面', pinyin: 'qiánmiàn', english: 'in front' },
          { hanzi: '後面', pinyin: 'hòumiàn', english: 'behind' },
          { hanzi: '地圖', pinyin: 'dìtú', english: 'map' },
        ],
      },
      {
        type: 'fill-blank',
        dialogue: [
          { speaker: '遊客', line: '請問，車站在哪裡？' },
          { speaker: '路人', line: '在___邊，走五分鐘就到了。' },
        ],
        options: ['左', '高', '貴', '甜'],
        answer: '左',
        english: "Tourist: Excuse me, where's the train station? Passerby: It's on the left, five minutes' walk.",
      },
    ],
  },
  {
    id: 'travel-2-airport',
    unitId: 'travel',
    title: 'At the Airport',
    exercises: [
      {
        type: 'scramble',
        instruction: 'Build the sentence',
        chinese: '我的飛機八點起飛。',
        tokens: ['我的', '飛機', '八點', '起飛。'],
        pinyin: 'Wǒ de fēijī bā diǎn qǐfēi.',
        english: 'My flight takes off at 8 o’clock.',
      },
      {
        type: 'match',
        prompt: 'Match each word',
        pairs: [
          { hanzi: '飛機', pinyin: 'fēijī', english: 'airplane' },
          { hanzi: '火車', pinyin: 'huǒchē', english: 'train' },
          { hanzi: '公車', pinyin: 'gōngchē', english: 'bus' },
          { hanzi: '地鐵', pinyin: 'dìtiě', english: 'subway' },
          { hanzi: '護照', pinyin: 'hùzhào', english: 'passport' },
        ],
      },
    ],
  },
  {
    id: 'travel-3-hotel',
    unitId: 'travel',
    title: 'Booking a Hotel',
    exercises: [
      {
        type: 'fill-blank',
        dialogue: [
          { speaker: '客人', line: '我想___一個房間。' },
          { speaker: '櫃檯', line: '好的，住幾天呢？' },
        ],
        options: ['訂', '賣', '修', '洗'],
        answer: '訂',
        english: "Guest: I'd like to book a room. Front desk: Sure, how many days will you stay?",
      },
      {
        type: 'match',
        prompt: 'Match each travel verb',
        pairs: [
          { hanzi: '出發', pinyin: 'chūfā', english: 'to depart' },
          { hanzi: '到達', pinyin: 'dàodá', english: 'to arrive' },
          { hanzi: '預訂', pinyin: 'yùdìng', english: 'to reserve' },
          { hanzi: '旅行', pinyin: 'lǚxíng', english: 'to travel' },
          { hanzi: '迷路', pinyin: 'mílù', english: 'to get lost' },
        ],
      },
    ],
  },

  // --- Unit 5: Electronics ---
  {
    id: 'elec-1-phones',
    unitId: 'electronics',
    title: 'Phones & Apps',
    exercises: [
      {
        type: 'match',
        prompt: 'Match each word',
        pairs: [
          { hanzi: '手機', pinyin: 'shǒujī', english: 'cell phone' },
          { hanzi: '應用程式', pinyin: 'yìngyòng chéngshì', english: 'app' },
          { hanzi: '電池', pinyin: 'diànchí', english: 'battery' },
          { hanzi: '螢幕', pinyin: 'píngmù', english: 'screen' },
          { hanzi: '充電器', pinyin: 'chōngdiànqì', english: 'charger' },
        ],
      },
      {
        type: 'fill-blank',
        dialogue: [
          { speaker: '朋友', line: '你的手機沒電了嗎？' },
          { speaker: '小林', line: '對，我需要一個___。' },
        ],
        options: ['充電器', '雨傘', '鑰匙', '帽子'],
        answer: '充電器',
        english: 'Friend: Is your phone out of battery? Xiaolin: Yes, I need a charger.',
      },
    ],
  },
  {
    id: 'elec-2-internet',
    unitId: 'electronics',
    title: 'The Internet',
    exercises: [
      {
        type: 'scramble',
        instruction: 'Build the sentence',
        chinese: '我每天都上網看新聞。',
        tokens: ['我', '每天', '都', '上網', '看新聞。'],
        pinyin: 'Wǒ měitiān dōu shàngwǎng kàn xīnwén.',
        english: 'I go online to read the news every day.',
      },
      {
        type: 'match',
        prompt: 'Match each verb',
        pairs: [
          { hanzi: '上網', pinyin: 'shàngwǎng', english: 'to go online' },
          { hanzi: '下載', pinyin: 'xiàzài', english: 'to download' },
          { hanzi: '打字', pinyin: 'dǎzì', english: 'to type' },
          { hanzi: '搜尋', pinyin: 'sōuxún', english: 'to search' },
          { hanzi: '分享', pinyin: 'fēnxiǎng', english: 'to share' },
        ],
      },
    ],
  },
  {
    id: 'elec-3-trouble',
    unitId: 'electronics',
    title: 'Tech Trouble',
    exercises: [
      {
        type: 'fill-blank',
        dialogue: [
          { speaker: '同事', line: '電腦忽然壞了，怎麼辦？' },
          { speaker: '小陳', line: '別擔心，我幫你___一下。' },
        ],
        options: ['修', '買', '賣', '借'],
        answer: '修',
        english: "Coworker: The computer suddenly broke, what should I do? Xiaochen: Don't worry, let me fix it for you.",
      },
      {
        type: 'match',
        prompt: 'Match each word',
        pairs: [
          { hanzi: '密碼', pinyin: 'mìmǎ', english: 'password' },
          { hanzi: '網路', pinyin: 'wǎnglù', english: 'internet / network' },
          { hanzi: '軟體', pinyin: 'ruǎntǐ', english: 'software' },
          { hanzi: '硬體', pinyin: 'yìngtǐ', english: 'hardware' },
          { hanzi: '訊號', pinyin: 'xùnhào', english: 'signal' },
        ],
      },
    ],
  },

  // --- Unit 6: Lifestyle ---
  {
    id: 'life-1-routine',
    unitId: 'lifestyle',
    title: 'Daily Routine',
    exercises: [
      {
        type: 'match',
        prompt: 'Match each verb',
        pairs: [
          { hanzi: '起床', pinyin: 'qǐchuáng', english: 'to get up' },
          { hanzi: '刷牙', pinyin: 'shuāyá', english: 'to brush teeth' },
          { hanzi: '上班', pinyin: 'shàngbān', english: 'to go to work' },
          { hanzi: '睡覺', pinyin: 'shuìjiào', english: 'to sleep' },
          { hanzi: '休息', pinyin: 'xiūxí', english: 'to rest' },
        ],
      },
      {
        type: 'fill-blank',
        dialogue: [
          { speaker: '媽媽', line: '你每天幾點___？' },
          { speaker: '小美', line: '我七點起床。' },
        ],
        options: ['起床', '唱歌', '游泳', '畫畫'],
        answer: '起床',
        english: 'Mom: What time do you get up every day? Xiaomei: I get up at 7.',
      },
    ],
  },
  {
    id: 'life-2-health',
    unitId: 'lifestyle',
    title: 'Health & Exercise',
    exercises: [
      {
        type: 'scramble',
        instruction: 'Build the sentence',
        chinese: '他每天早上跑步。',
        tokens: ['他', '每天', '早上', '跑步。'],
        pinyin: 'Tā měitiān zǎoshang pǎobù.',
        english: 'He goes running every morning.',
      },
      {
        type: 'match',
        prompt: 'Match each word',
        pairs: [
          { hanzi: '運動', pinyin: 'yùndòng', english: 'exercise' },
          { hanzi: '健康', pinyin: 'jiànkāng', english: 'health' },
          { hanzi: '睡眠', pinyin: 'shuìmián', english: 'sleep' },
          { hanzi: '壓力', pinyin: 'yālì', english: 'stress' },
          { hanzi: '放鬆', pinyin: 'fàngsōng', english: 'to relax' },
        ],
      },
    ],
  },
  {
    id: 'life-3-hobbies',
    unitId: 'lifestyle',
    title: 'Hobbies',
    exercises: [
      {
        type: 'fill-blank',
        dialogue: [
          { speaker: '朋友', line: '你週末喜歡做什麼？' },
          { speaker: '小王', line: '我喜歡___和看書。' },
        ],
        options: ['畫畫', '上班', '開會', '打針'],
        answer: '畫畫',
        english: 'Friend: What do you like to do on weekends? Xiaowang: I like drawing and reading.',
      },
      {
        type: 'match',
        prompt: 'Match each hobby',
        pairs: [
          { hanzi: '畫畫', pinyin: 'huàhuà', english: 'to draw / paint' },
          { hanzi: '彈鋼琴', pinyin: 'tán gāngqín', english: 'to play piano' },
          { hanzi: '釣魚', pinyin: 'diàoyú', english: 'to fish' },
          { hanzi: '攝影', pinyin: 'shèyǐng', english: 'photography' },
          { hanzi: '園藝', pinyin: 'yuányì', english: 'gardening' },
        ],
      },
    ],
  },

  // --- Unit 7: Beauty ---
  {
    id: 'beauty-1-skincare',
    unitId: 'beauty',
    title: 'Skincare',
    exercises: [
      {
        type: 'match',
        prompt: 'Match each word',
        pairs: [
          { hanzi: '洗面乳', pinyin: 'xǐmiànrǔ', english: 'facial cleanser' },
          { hanzi: '保濕', pinyin: 'bǎoshī', english: 'moisturizing' },
          { hanzi: '防曬', pinyin: 'fángshài', english: 'sunscreen' },
          { hanzi: '面膜', pinyin: 'miànmó', english: 'face mask' },
          { hanzi: '皮膚', pinyin: 'pífū', english: 'skin' },
        ],
      },
      {
        type: 'fill-blank',
        dialogue: [
          { speaker: '店員', line: '您的皮膚有點乾，需要___的乳液。' },
          { speaker: '顧客', line: '好，我買這瓶。' },
        ],
        options: ['保濕', '便宜', '快樂', '安靜'],
        answer: '保濕',
        english: "Clerk: Your skin is a bit dry, you need a moisturizing lotion. Customer: Okay, I'll buy this bottle.",
      },
    ],
  },
  {
    id: 'beauty-2-clothes',
    unitId: 'beauty',
    title: 'Shopping for Clothes',
    exercises: [
      {
        type: 'scramble',
        instruction: 'Build the sentence',
        chinese: '這件外套非常好看。',
        tokens: ['這件', '外套', '非常', '好看。'],
        pinyin: 'Zhè jiàn wàitào fēicháng hǎokàn.',
        english: 'This jacket looks really nice.',
      },
      {
        type: 'match',
        prompt: 'Match each clothing item',
        pairs: [
          { hanzi: '外套', pinyin: 'wàitào', english: 'jacket / coat' },
          { hanzi: '裙子', pinyin: 'qúnzi', english: 'skirt' },
          { hanzi: '褲子', pinyin: 'kùzi', english: 'pants' },
          { hanzi: '鞋子', pinyin: 'xiézi', english: 'shoes' },
          { hanzi: '帽子', pinyin: 'màozi', english: 'hat' },
        ],
      },
    ],
  },
  {
    id: 'beauty-3-style',
    unitId: 'beauty',
    title: 'Style & Colors',
    exercises: [
      {
        type: 'fill-blank',
        dialogue: [
          { speaker: '朋友', line: '你喜歡什麼顏色？' },
          { speaker: '小美', line: '我最喜歡___色，很優雅。' },
        ],
        options: ['紫', '重', '遠', '早'],
        answer: '紫',
        english: 'Friend: What color do you like? Xiaomei: I like purple the most, it’s elegant.',
      },
      {
        type: 'match',
        prompt: 'Match each color',
        pairs: [
          { hanzi: '紅色', pinyin: 'hóngsè', english: 'red' },
          { hanzi: '藍色', pinyin: 'lánsè', english: 'blue' },
          { hanzi: '紫色', pinyin: 'zǐsè', english: 'purple' },
          { hanzi: '金色', pinyin: 'jīnsè', english: 'gold' },
          { hanzi: '黑色', pinyin: 'hēisè', english: 'black' },
        ],
      },
    ],
  },

  // --- Unit 8: Pop Culture ---
  {
    id: 'pop-1-music-movies',
    unitId: 'pop-culture',
    title: 'Music & Movies',
    exercises: [
      {
        type: 'match',
        prompt: 'Match each word',
        pairs: [
          { hanzi: '電影', pinyin: 'diànyǐng', english: 'movie' },
          { hanzi: '音樂', pinyin: 'yīnyuè', english: 'music' },
          { hanzi: '歌手', pinyin: 'gēshǒu', english: 'singer' },
          { hanzi: '演員', pinyin: 'yǎnyuán', english: 'actor' },
          { hanzi: '演唱會', pinyin: 'yǎnchànghuì', english: 'concert' },
        ],
      },
      {
        type: 'fill-blank',
        dialogue: [
          { speaker: '同學', line: '這個週末有什麼活動？' },
          { speaker: '小林', line: '我朋友的偶像有___，我們一起去。' },
        ],
        options: ['演唱會', '考試', '會議', '手術'],
        answer: '演唱會',
        english: 'Classmate: Any plans this weekend? Xiaolin: My friend’s idol has a concert, we’re going together.',
      },
    ],
  },
  {
    id: 'pop-2-fans',
    unitId: 'pop-culture',
    title: 'Celebrities & Fans',
    exercises: [
      {
        type: 'scramble',
        instruction: 'Build the sentence',
        chinese: '她是我最喜歡的歌手。',
        tokens: ['她', '是', '我', '最喜歡的', '歌手。'],
        pinyin: 'Tā shì wǒ zuì xǐhuān de gēshǒu.',
        english: 'She is my favorite singer.',
      },
      {
        type: 'match',
        prompt: 'Match each word',
        pairs: [
          { hanzi: '偶像', pinyin: 'ǒuxiàng', english: 'idol' },
          { hanzi: '粉絲', pinyin: 'fěnsī', english: 'fan' },
          { hanzi: '明星', pinyin: 'míngxīng', english: 'star / celebrity' },
          { hanzi: '流行', pinyin: 'liúxíng', english: 'popular / trendy' },
          { hanzi: '紅', pinyin: 'hóng', english: 'famous / hot (colloquial)' },
        ],
      },
    ],
  },
  {
    id: 'pop-3-social-media',
    unitId: 'pop-culture',
    title: 'Social Media',
    exercises: [
      {
        type: 'fill-blank',
        dialogue: [
          { speaker: '朋友', line: '你今天拍了什麼照片？' },
          { speaker: '小陳', line: '我拍了貓咪，準備___到網路上。' },
        ],
        options: ['分享', '修理', '借用', '販賣'],
        answer: '分享',
        english: 'Friend: What photos did you take today? Xiaochen: I took photos of my cat, about to share them online.',
      },
      {
        type: 'match',
        prompt: 'Match each word',
        pairs: [
          { hanzi: '貼文', pinyin: 'tiēwén', english: 'post' },
          { hanzi: '留言', pinyin: 'liúyán', english: 'comment' },
          { hanzi: '按讚', pinyin: 'ànzàn', english: 'to like (a post)' },
          { hanzi: '追蹤', pinyin: 'zhuīzōng', english: 'to follow' },
          { hanzi: '直播', pinyin: 'zhíbò', english: 'livestream' },
        ],
      },
    ],
  },
]

export function lessonsForUnit(unitId: string): Lesson[] {
  return LESSONS.filter((l) => l.unitId === unitId)
}

export function lessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id)
}
