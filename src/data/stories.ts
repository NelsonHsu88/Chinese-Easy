import type { Story } from '../types'

/** Hand-authored reading library, 2 stories per HSK level (an easy 1-pager and a harder 2-pager), progressively more complex by level. */
export const STORIES: Story[] = [
  {
    id: 'hsk1-easy-my-family',
    title: '我的家',
    titlePinyin: 'wǒ de jiā',
    titleEnglish: 'My Family',
    description: 'Wang Ming introduces the people he loves most.',
    wordCount: 27,
    collection: 'everyday',
    hskLevel: 1,
    difficulty: 'easy',
    pages: [
      {
        chinese: '我叫王明。我是學生。我家有爸爸、媽媽和我。我有一隻貓，牠很可愛。我愛我的家。',
        pinyin: "Wǒ jiào Wáng Míng. Wǒ shì xuéshēng. Wǒ jiā yǒu bàba, māma hé wǒ. Wǒ yǒu yì zhī māo, tā hěn kě'ài. Wǒ ài wǒ de jiā.",
        translation:
          "My name is Wang Ming. I am a student. My family has my dad, my mom, and me. I have a cat — it's very cute. I love my family.",
      },
    ],
  },
  {
    id: 'hsk1-hard-saturday',
    title: '星期六',
    titlePinyin: 'xīngqíliù',
    titleEnglish: 'Saturday',
    description: 'A sunny morning at the park with mum.',
    wordCount: 80,
    collection: 'everyday',
    hskLevel: 1,
    difficulty: 'hard',
    pages: [
      {
        chinese: '今天是星期六，天氣很好。小美很高興，因為她要去公園。她和媽媽一起走路去公園。公園裡有很多人，他們在跑步、看書，還有吃東西。',
        pinyin:
          'Jīntiān shì xīngqíliù, tiānqì hěn hǎo. Xiǎoměi hěn gāoxìng, yīnwèi tā yào qù gōngyuán. Tā hé māma yìqǐ zǒulù qù gōngyuán. Gōngyuán lǐ yǒu hěn duō rén, tāmen zài pǎobù, kànshū, hái yǒu chī dōngxi.',
        translation:
          'Today is Saturday, and the weather is very nice. Xiaomei is very happy because she is going to the park. She walks to the park together with her mom. There are many people in the park — they are running, reading, and eating.',
      },
      {
        chinese: '小美看見一隻小狗。小狗很可愛，牠在跟一個小男孩玩。小美問：「這是你的狗嗎？」男孩說：「對，牠叫多多。」小美很喜歡多多。她和媽媽玩了很久才回家。',
        pinyin:
          "Xiǎoměi kànjiàn yì zhī xiǎo gǒu. Xiǎo gǒu hěn kě'ài, tā zài gēn yí ge xiǎo nánhái wán. Xiǎoměi wèn: 'Zhè shì nǐ de gǒu ma?' Nánhái shuō: 'Duì, tā jiào Duōduo.' Xiǎoměi hěn xǐhuān Duōduo. Tā hé māma wánle hěn jiǔ cái huí jiā.",
        translation:
          'Xiaomei sees a little dog. The dog is very cute, and it is playing with a little boy. Xiaomei asks: "Is this your dog?" The boy says: "Yes, his name is Duoduo." Xiaomei really likes Duoduo. She played for a long time with her mom before going home.',
      },
    ],
  },
  {
    id: 'hsk2-easy-shopping',
    title: '買東西',
    titlePinyin: 'mǎi dōngxi',
    titleEnglish: 'Going Shopping',
    description: 'A quick trip to the market for dinner.',
    wordCount: 41,
    collection: 'everyday',
    hskLevel: 2,
    difficulty: 'easy',
    pages: [
      {
        chinese:
          '星期天，我和姐姐去商店買東西。商店裡的衣服很漂亮，可是有點貴。姐姐買了一件紅色的裙子，我買了一雙白色的鞋子。我們花了不少錢，但是很開心。',
        pinyin:
          'Xīngqítiān, wǒ hé jiějie qù shāngdiàn mǎi dōngxi. Shāngdiàn lǐ de yīfú hěn piàoliang, kěshì yǒudiǎn guì. Jiějie mǎile yí jiàn hóngsè de qúnzi, wǒ mǎile yì shuāng báisè de xiézi. Wǒmen huāle bù shǎo qián, dànshì hěn kāixīn.',
        translation:
          'On Sunday, my older sister and I went to the store to shop. The clothes in the store were very pretty, but a little expensive. My sister bought a red skirt, and I bought a pair of white shoes. We spent quite a bit of money, but we were very happy.',
      },
    ],
  },
  {
    id: 'hsk2-hard-birthday',
    title: '生日聚會',
    titlePinyin: 'shēngrì jùhuì',
    titleEnglish: 'The Birthday Party',
    description: 'Friends, cake, and a wish worth making.',
    wordCount: 85,
    collection: 'everyday',
    hskLevel: 2,
    difficulty: 'hard',
    pages: [
      {
        chinese:
          '下星期五是我朋友小林的生日。我們決定給她辦一個生日聚會。我和同學們一起準備了蛋糕、氣球和禮物。小林最喜歡的顏色是粉紅色，所以我們把房間布置成粉紅色的。',
        pinyin:
          'Xià xīngqíwǔ shì wǒ péngyǒu Xiǎolín de shēngrì. Wǒmen juédìng gěi tā bàn yí ge shēngrì jùhuì. Wǒ hé tóngxuémen yìqǐ zhǔnbèile dàngāo, qìqiú hé lǐwù. Xiǎolín zuì xǐhuān de yánsè shì fěnhóngsè, suǒyǐ wǒmen bǎ fángjiān bùzhì chéng fěnhóngsè de.',
        translation:
          "Next Friday is my friend Xiaolin's birthday. We decided to throw her a birthday party. My classmates and I prepared a cake, balloons, and gifts together. Xiaolin's favorite color is pink, so we decorated the room in pink.",
      },
      {
        chinese:
          '生日那天，小林走進房間的時候非常驚訝，她沒想到我們為她準備了這麼多。大家一起唱生日歌，小林許了願，然後我們一起吃蛋糕、玩遊戲。這是她過得最快樂的生日。',
        pinyin:
          "Shēngrì nà tiān, Xiǎolín zǒujìn fángjiān de shíhòu fēicháng jīngyà, tā méi xiǎngdào wǒmen wèi tā zhǔnbèile zhème duō. Dàjiā yìqǐ chàng shēngrì gē, Xiǎolín xǔle yuàn, ránhòu wǒmen yìqǐ chī dàngāo, wán yóuxì. Zhè shì tā guò de zuì kuàilè de shēngrì.",
        translation:
          "On her birthday, Xiaolin was very surprised when she walked into the room — she hadn't expected we'd prepared so much for her. Everyone sang the birthday song together, Xiaolin made a wish, and then we ate cake and played games together. It was the happiest birthday she'd ever had.",
      },
    ],
  },
  {
    id: 'hsk3-easy-weather',
    title: '天氣預報',
    titlePinyin: 'tiānqì yùbào',
    titleEnglish: 'The Weather Forecast',
    description: 'Rain or shine, the plans change quickly.',
    wordCount: 39,
    collection: 'everyday',
    hskLevel: 3,
    difficulty: 'easy',
    pages: [
      {
        chinese:
          '根據今天的天氣預報，明天會下雨，氣溫也會下降不少。如果你打算出門，最好帶一把傘，穿暖和一點的衣服。後天天氣應該會轉晴，適合出去運動或者跟朋友見面。',
        pinyin:
          'Gēnjù jīntiān de tiānqì yùbào, míngtiān huì xiàyǔ, qìwēn yě huì xiàjiàng bù shǎo. Rúguǒ nǐ dǎsuàn chūmén, zuì hǎo dài yì bǎ sǎn, chuān nuǎnhuo yìdiǎn de yīfú. Hòutiān tiānqì yīnggāi huì zhuǎnqíng, shìhé chūqù yùndòng huòzhě gēn péngyǒu jiànmiàn.',
        translation:
          "According to today's weather forecast, it will rain tomorrow and the temperature will drop quite a bit. If you're planning to go out, you'd better bring an umbrella and wear warmer clothes. The day after tomorrow the weather should clear up, which is good for going out to exercise or meeting friends.",
      },
    ],
  },
  {
    id: 'hsk3-hard-first-trip',
    title: '第一次旅行',
    titlePinyin: 'dì yī cì lǚxíng',
    titleEnglish: 'The First Trip',
    description: 'Leaving home alone for the very first time.',
    wordCount: 102,
    collection: 'everyday',
    hskLevel: 3,
    difficulty: 'hard',
    pages: [
      {
        chinese:
          '這是我第一次一個人旅行，心裡又緊張又興奮。出發前，我做了很多準備：訂機票、訂旅館、查地圖，還跟當地的朋友聯絡。雖然爸媽有點擔心，但是他們還是支持我去嘗試新的經驗。',
        pinyin:
          'Zhè shì wǒ dì-yī cì yí ge rén lǚxíng, xīnlǐ yòu jǐnzhāng yòu xīngfèn. Chūfā qián, wǒ zuòle hěn duō zhǔnbèi: dìng jīpiào, dìng lǚguǎn, chá dìtú, hái gēn dāngdì de péngyǒu liánluò. Suīrán bàmā yǒudiǎn dānxīn, dànshì tāmen háishì zhīchí wǒ qù chángshì xīn de jīngyàn.',
        translation:
          "This is my first time traveling alone, and I feel both nervous and excited. Before setting off, I made a lot of preparations: booking a flight, booking a hotel, checking the map, and also getting in touch with a local friend. Although my parents were a bit worried, they still supported me in trying this new experience.",
      },
      {
        chinese:
          '到了目的地以後，一開始我有點迷路，不過當地人都很友善，願意幫我指路。我參觀了博物館、老街和夜市，也吃了很多沒吃過的美食。這趟旅行讓我學會了獨立，也讓我更有自信面對未來的挑戰。',
        pinyin:
          "Dàole mùdìdì yǐhòu, yìkāishǐ wǒ yǒudiǎn mílù, búguò dāngdìrén dōu hěn yǒushàn, yuànyì bāng wǒ zhǐlù. Wǒ cānguānle bówùguǎn, lǎojiē hé yèshì, yě chīle hěn duō méi chīguò de měishí. Zhè tàng lǚxíng ràng wǒ xuéhuìle dúlì, yě ràng wǒ gèng yǒu zìxìn miànduì wèilái de tiǎozhàn.",
        translation:
          "After arriving at my destination, I got a bit lost at first, but the locals were all very friendly and willing to help point the way. I visited a museum, an old street, and a night market, and also tried lots of delicious food I'd never had before. This trip taught me independence and gave me more confidence to face future challenges.",
      },
    ],
  },
  {
    id: 'hsk4-easy-workday',
    title: '工作的一天',
    titlePinyin: 'gōngzuò de yì tiān',
    titleEnglish: 'A Day at Work',
    description: 'One ordinary morning from desk to dusk.',
    wordCount: 65,
    collection: 'everyday',
    hskLevel: 4,
    difficulty: 'easy',
    pages: [
      {
        chinese:
          '小張是一家科技公司的員工，每天的工作都排得滿滿的。早上他先開會，討論這個月的計畫；中午和同事一起吃飯，順便聊聊最近的生活；下午則要處理客戶的問題，常常忙到忘記時間。雖然工作辛苦，但他覺得能學到很多東西，也很有成就感。',
        pinyin:
          'Xiǎozhāng shì yì jiā kējì gōngsī de yuángōng, měitiān de gōngzuò dōu pái de mǎnmǎn de. Zǎoshang tā xiān kāihuì, tǎolùn zhège yuè de jìhuà; zhōngwǔ hé tóngshì yìqǐ chīfàn, shùnbiàn liáoliao zuìjìn de shēnghuó; xiàwǔ zé yào chǔlǐ kèhù de wèntí, chángcháng máng dào wàngjì shíjiān. Suīrán gōngzuò xīnkǔ, dàn tā juéde néng xuédào hěn duō dōngxi, yě hěn yǒu chéngjiùgǎn.',
        translation:
          "Xiaozhang is an employee at a tech company, and his schedule is packed every day. In the morning he starts with a meeting to discuss this month's plans; at noon he eats with coworkers and catches up on recent life; in the afternoon he handles client issues, often getting so busy he loses track of time. Although the work is tough, he feels he learns a lot and gets a real sense of accomplishment.",
      },
    ],
  },
  {
    id: 'hsk4-hard-misunderstanding',
    title: '誤會',
    titlePinyin: 'wùhuì',
    titleEnglish: 'The Misunderstanding',
    description: 'A few wrong words between good friends.',
    wordCount: 102,
    collection: 'everyday',
    hskLevel: 4,
    difficulty: 'hard',
    pages: [
      {
        chinese:
          '上個星期，小美和男朋友吵架了，原因其實只是一場誤會。那天小美傳訊息給他，約他一起吃晚餐，可是他一直沒有回覆。小美等了很久，越想越生氣，覺得自己被忽略了，於是決定不再理他。',
        pinyin:
          'Shàng ge xīngqí, Xiǎoměi hé nánpéngyǒu chǎojià le, yuányīn qíshí zhǐshì yì chǎng wùhuì. Nà tiān Xiǎoměi chuán xùnxí gěi tā, yuē tā yìqǐ chī wǎncān, kěshì tā yìzhí méiyǒu huífù. Xiǎoměi děngle hěn jiǔ, yuè xiǎng yuè shēngqì, juéde zìjǐ bèi hūlüè le, yúshì juédìng bú zài lǐ tā.',
        translation:
          'Last week, Xiaomei and her boyfriend had a fight, but the reason was actually just a misunderstanding. That day Xiaomei sent him a message inviting him to dinner, but he never replied. Xiaomei waited a long time, and the more she thought about it the angrier she got, feeling ignored, so she decided to stop talking to him.',
      },
      {
        chinese:
          '後來她才知道，原來他的手機那天壞了，根本沒收到訊息，還特地跑去買了一束花想給她驚喜。誤會解開以後，兩個人都覺得很不好意思，也明白了以後有問題應該直接說清楚，而不是自己亂猜。',
        pinyin:
          "Hòulái tā cái zhīdào, yuánlái tā de shǒujī nà tiān huài le, gēnběn méi shōudào xùnxí, hái tèdì pǎo qù mǎile yí shù huā xiǎng gěi tā jīngxǐ. Wùhuì jiěkāi yǐhòu, liǎng ge rén dōu juéde hěn bù hǎoyìsi, yě míngbáile yǐhòu yǒu wèntí yīnggāi zhíjiē shuō qīngchǔ, ér búshì zìjǐ luàn cāi.",
        translation:
          "Later she found out that his phone had actually broken that day, so he never received the message at all — he'd even specially gone out to buy her a bouquet of flowers as a surprise. After the misunderstanding was cleared up, they both felt embarrassed, and realized that in the future, when there's a problem, they should just talk it through directly instead of guessing.",
      },
    ],
  },
  {
    id: 'hsk5-easy-festival',
    title: '傳統節日',
    titlePinyin: 'chuántǒng jiérì',
    titleEnglish: 'Traditional Festivals',
    description: 'The customs that mark a Chinese year.',
    wordCount: 60,
    collection: 'everyday',
    hskLevel: 5,
    difficulty: 'easy',
    pages: [
      {
        chinese:
          '中秋節是華人重要的傳統節日之一，象徵著團圓與感恩。每逢這一天，家家戶戶都會準備月餅、水果，一家人圍坐在一起賞月、聊天。人們相信滿月代表著圓滿，因此無論多忙，大家都會盡量回家團聚，珍惜與家人相處的時光。',
        pinyin:
          "Zhōngqiūjié shì Huárén zhòngyào de chuántǒng jiérì zhī yī, xiàngzhēngzhe tuányuán yǔ gǎn'ēn. Měiféng zhè yì tiān, jiājiāhùhù dōu huì zhǔnbèi yuèbǐng, shuǐguǒ, yì jiā rén wéizuò zài yìqǐ shǎngyuè, liáotiān. Rénmen xiāngxìn mǎnyuè dàibiǎozhe yuánmǎn, yīncǐ wúlùn duō máng, dàjiā dōu huì jǐnliàng huí jiā tuánjù, zhēnxī yǔ jiārén xiāngchǔ de shíguāng.",
        translation:
          'The Mid-Autumn Festival is one of the important traditional festivals for Chinese people, symbolizing reunion and gratitude. Every year on this day, every household prepares mooncakes and fruit, and families sit together to admire the moon and chat. People believe the full moon represents completeness, so no matter how busy they are, everyone tries their best to go home and reunite, cherishing the time spent with family.',
      },
    ],
  },
  {
    id: 'hsk5-hard-old-friends',
    title: '老朋友',
    titlePinyin: 'lǎo péngyǒu',
    titleEnglish: 'Old Friends',
    description: 'Two lives meet again after many years.',
    wordCount: 120,
    collection: 'everyday',
    hskLevel: 5,
    difficulty: 'hard',
    pages: [
      {
        chinese:
          '畢業十年後，我和大學時代的室友終於在同一個城市重逢。剛見面的時候，我們都有點不知所措，畢竟已經好幾年沒見了，彼此的生活也發生了很大的變化。他成了一名律師，而我則從事設計工作，兩人的生活軌跡完全不同。',
        pinyin:
          'Bìyè shí nián hòu, wǒ hé dàxué shídài de shìyǒu zhōngyú zài tóng yí ge chéngshì chóngféng. Gāng jiànmiàn de shíhòu, wǒmen dōu yǒudiǎn bùzhī suǒcuò, bìjìng yǐjīng hǎo jǐ nián méi jiàn le, bǐcǐ de shēnghuó yě fāshēngle hěn dà de biànhuà. Tā chéngle yì míng lǜshī, ér wǒ zé cóngshì shèjì gōngzuò, liǎng rén de shēnghuó guǐjì wánquán bùtóng.',
        translation:
          'Ten years after graduation, my college roommate and I finally reunited in the same city. When we first met up, we both felt a bit awkward — after all, we hadn’t seen each other in years, and both our lives had changed a great deal. He had become a lawyer, while I was working in design; our life paths had turned out completely different.',
      },
      {
        chinese:
          '不過聊著聊著，那種熟悉的感覺又回來了。我們聊起大學時荒唐的往事，笑得眼淚都流出來了。那一刻我才明白，真正的友情不會因為時間或距離而消失，反而會在重逢的瞬間，把彼此重新拉回最真實、最自在的樣子。',
        pinyin:
          "Búguò liáozhe liáozhe, nà zhǒng shúxī de gǎnjué yòu huílái le. Wǒmen liáoqǐ dàxué shí huāngtáng de wǎngshì, xiào de yǎnlèi dōu liú chūlái le. Nà yíkè wǒ cái míngbái, zhēnzhèng de yǒuqíng bú huì yīnwèi shíjiān huò jùlí ér xiāoshī, fǎn'ér huì zài chóngféng de shùnjiān, bǎ bǐcǐ chóngxīn lā huí zuì zhēnshí, zuì zìzài de yàngzi.",
        translation:
          "But as we kept talking, that familiar feeling came back. We talked about ridiculous things from our college days, laughing until we cried. In that moment I finally understood — true friendship doesn't fade because of time or distance; instead, in the instant of reunion, it pulls you both back to your truest, most comfortable selves.",
      },
    ],
  },
  {
    id: 'hsk6-easy-city-changes',
    title: '城市的變化',
    titlePinyin: 'chéngshì de biànhuà',
    titleEnglish: 'How the City Changed',
    description: 'Old lanes give way to glass towers.',
    wordCount: 85,
    collection: 'everyday',
    hskLevel: 6,
    difficulty: 'easy',
    pages: [
      {
        chinese:
          '這座城市在過去二十年間經歷了翻天覆地的變化。曾經低矮的老房子如今已被高樓大廈取代，狹窄的巷弄也拓寬成車水馬龍的大道。然而，在快速發展的背後，一些傳統市集與老字號店鋪逐漸消失，取而代之的是連鎖商店與購物中心。有人為此感到惋惜，認為城市失去了原有的人情味；也有人認為，這正是進步不可避免的代價。',
        pinyin:
          "Zhè zuò chéngshì zài guòqù èrshí nián jiān jīnglìle fāntiān-fùdì de biànhuà. Céngjīng dī'ǎi de lǎo fángzi rújīn yǐ bèi gāolóu-dàshà qǔdài, xiázhǎi de xiàng-nòng yě tuòkuān chéng chēshuǐ-mǎlóng de dàdào. Rán'ér, zài kuàisù fāzhǎn de bèihòu, yìxiē chuántǒng shìjí yǔ lǎozìhào diànpù zhújiàn xiāoshī, qǔ'ér-dàizhī de shì liànsuǒ shāngdiàn yǔ gòuwù zhōngxīn. Yǒurén wèicǐ gǎndào wǎnxī, rènwéi chéngshì shīqùle yuányǒu de rénqíngwèi; yě yǒurén rènwéi, zhè zhèng shì jìnbù bùkě-bìmiǎn de dàijià.",
        translation:
          'This city has undergone earth-shaking changes over the past twenty years. The once low-rise old houses have now been replaced by tall buildings, and the narrow lanes have been widened into bustling boulevards. However, behind this rapid development, some traditional markets and time-honored shops have gradually disappeared, replaced by chain stores and shopping malls. Some people feel regret over this, believing the city has lost its original human warmth; others believe this is simply the unavoidable price of progress.',
      },
    ],
  },
  {
    id: 'hsk6-hard-lifes-choices',
    title: '人生的選擇',
    titlePinyin: 'rénshēng de xuǎnzé',
    titleEnglish: 'Life\'s Choices',
    description: 'The road not taken, and no regrets.',
    wordCount: 154,
    collection: 'everyday',
    hskLevel: 6,
    difficulty: 'hard',
    pages: [
      {
        chinese:
          '每個人的一生中，總會面臨幾個關鍵的十字路口。是該按照父母的期望選擇穩定的職業，還是勇敢追求自己真正熱愛卻充滿不確定性的夢想？這樣的抉擇往往沒有標準答案，卻足以左右一個人往後幾十年的人生軌跡。我的表哥便是如此——他放棄了令人稱羨的醫生工作，轉而投身於獨立音樂創作。',
        pinyin:
          "Měi ge rén de yìshēng zhōng, zǒng huì miànlín jǐ ge guānjiàn de shízì-lùkǒu. Shì gāi ànzhào fùmǔ de qīwàng xuǎnzé wěndìng de zhíyè, háishì yǒnggǎn zhuīqiú zìjǐ zhēnzhèng rè'ài què chōngmǎn bú quèdìngxìng de mèngxiǎng? Zhèyàng de juézé wǎngwǎng méiyǒu biāozhǔn dá'àn, què zúyǐ zuǒyòu yí ge rén wǎnghòu jǐshí nián de rénshēng guǐjì. Wǒ de biǎogē biàn shì rúcǐ — tā fàngqìle lìng rén chēngxiàn de yīshēng gōngzuò, zhuǎn'ér tóushēn yú dúlì yīnyuè chuàngzuò.",
        translation:
          "In everyone's life, there are always a few key crossroads to face. Should one choose a stable career in line with their parents' expectations, or bravely pursue a dream they truly love but which is full of uncertainty? Such decisions often have no standard answer, yet they're enough to shape the course of a person's life for decades to come. My cousin was exactly like this — he gave up an enviable job as a doctor and turned instead to pursue independent music-making.",
      },
      {
        chinese:
          '起初，家人強烈反對，認為這個決定太過冒險，甚至帶點任性。表哥花了將近三年，一邊打工維持生計，一邊創作、發表作品，過程並不順利，也曾一度懷疑自己是否做錯了選擇。直到他的音樂逐漸受到聽眾肯定，家人才慢慢理解並支持他。表哥常說，人生的選擇沒有絕對的對錯，重要的是願不願意為自己的決定負責，並且堅持到底。',
        pinyin:
          "Qǐchū, jiārén qiángliè fǎnduì, rènwéi zhège juédìng tàiguò màoxiǎn, shènzhì dàidiǎn rènxìng. Biǎogē huāle jiāngjìn sān nián, yìbiān dǎgōng wéichí shēngjì, yìbiān chuàngzuò, fābiǎo zuòpǐn, guòchéng bìng bú shùnlì, yě céng yídù huáiyí zìjǐ shìfǒu zuò cuò le xuǎnzé. Zhídào tā de yīnyuè zhújiàn shòudào tīngzhòng kěndìng, jiārén cái mànmàn lǐjiě bìng zhīchí tā. Biǎogē cháng shuō, rénshēng de xuǎnzé méiyǒu juéduì de duìcuò, zhòngyào de shì yuàn bú yuànyì wèi zìjǐ de juédìng fùzé, bìngqiě jiānchí dàodǐ.",
        translation:
          "At first, his family strongly objected, feeling this decision was too risky, even somewhat willful. My cousin spent nearly three years working odd jobs to make ends meet while creating and releasing his music; the process wasn't smooth, and he even once doubted whether he'd made the wrong choice. It wasn't until his music gradually won recognition from listeners that his family slowly came to understand and support him. My cousin often says that in life's choices, there's no absolute right or wrong — what matters is whether you're willing to take responsibility for your own decision, and see it through to the end.",
      },
    ],
  },

  // Classic folk tales, HSK 1-2. Short retellings, two pages each.
  {
    id: 'hsk1-tale-hongmao',
    title: '小紅帽',
    titlePinyin: 'xiǎo hóngmào',
    titleEnglish: 'Little Red Riding Hood',
    description: 'A red hood, a forest path, and a wolf.',
    wordCount: 128,
    collection: 'folk-tales',
    art: require('../assets/images/covers/hsk1-tale-hongmao.jpg'),
    hskLevel: 1,
    difficulty: 'easy',
    pages: [
      {
        chinese:
          '從前，有一個女孩。她喜歡戴紅色的帽子，所以大家都叫她「小紅帽」。一天，媽媽說：「奶奶生病了，你去看她吧。」小紅帽拿著蛋糕，走進森林。森林裡有一隻大灰狼。狼問：「你去哪裡？」小紅帽說：「我去奶奶家。」',
        pinyin: '',
        translation:
          'Once upon a time there was a girl. She liked to wear a red hood, so everyone called her "Little Red Riding Hood." One day her mother said, "Grandmother is ill — go and see her." Little Red Riding Hood took a cake and walked into the forest. In the forest there was a big grey wolf. The wolf asked, "Where are you going?" She said, "I am going to Grandmother\'s house."',
      },
      {
        chinese:
          '狼很快跑到奶奶家，把奶奶藏起來，然後穿上奶奶的衣服，躺在床上。小紅帽到了，說：「奶奶，你的耳朵好大！」狼說：「這樣才能聽清你說話。」小紅帽說：「奶奶，你的嘴好大！」狼說：「這樣才能吃掉你！」這時，一個獵人聽到聲音，跑進來救了小紅帽和奶奶。從此，小紅帽記住了：不要隨便和陌生人說話。',
        pinyin: '',
        translation:
          'The wolf ran quickly to Grandmother\'s house, hid Grandmother away, then put on her clothes and lay down in the bed. Little Red Riding Hood arrived and said, "Grandmother, what big ears you have!" The wolf said, "All the better to hear you with." She said, "Grandmother, what a big mouth you have!" The wolf said, "All the better to eat you with!" Just then a hunter heard the noise, ran in, and saved both of them. From then on Little Red Riding Hood remembered: do not talk carelessly to strangers.',
      },
    ],
  },
  {
    id: 'hsk1-tale-sanzhuzhu',
    title: '三隻小豬',
    titlePinyin: 'sān zhī xiǎo zhū',
    titleEnglish: 'The Three Little Pigs',
    description: 'Straw, sticks, and one very solid brick house.',
    wordCount: 146,
    collection: 'folk-tales',
    art: require('../assets/images/covers/hsk1-tale-sanzhuzhu.jpg'),
    hskLevel: 1,
    difficulty: 'easy',
    pages: [
      {
        chinese:
          '有三隻小豬，他們都要蓋自己的房子。第一隻小豬很懶，用稻草蓋了房子。第二隻小豬用木頭蓋了房子。第三隻小豬很努力，用磚頭蓋了房子。有一隻大灰狼來了。他對第一隻小豬說：「開門！」小豬不開門。狼用力一吹，稻草房子倒了。小豬跑到第二隻小豬家。',
        pinyin: '',
        translation:
          'There were three little pigs, and each wanted to build his own house. The first was lazy and built his house of straw. The second built his house of wood. The third worked hard and built his house of brick. A big grey wolf came along. He said to the first pig, "Open the door!" The pig would not. The wolf blew hard and the straw house fell down. The pig ran to the second pig\'s house.',
      },
      {
        chinese:
          '狼又吹倒了木頭房子。兩隻小豬都跑到第三隻小豬的磚頭房子裡。狼用力吹，可是磚頭房子很結實，怎麼也吹不倒。狼很生氣，想從煙囪爬進去，結果掉進了熱水裡，跑走了。三隻小豬從此過上了安全快樂的生活。',
        pinyin: '',
        translation:
          'The wolf blew down the wooden house too. Both pigs ran to the third pig\'s brick house. The wolf blew with all his might, but the brick house was solid and would not fall no matter what. Furious, the wolf tried to climb down the chimney, fell into hot water, and ran away. From then on the three little pigs lived safely and happily.',
      },
    ],
  },
  {
    id: 'hsk1-tale-guitu',
    title: '龜兔賽跑',
    titlePinyin: 'guī tù sàipǎo',
    titleEnglish: 'The Tortoise and the Hare',
    description: 'Slow and steady still wins the race.',
    wordCount: 89,
    collection: 'folk-tales',
    art: require('../assets/images/covers/hsk1-tale-guitu.jpg'),
    hskLevel: 1,
    difficulty: 'easy',
    pages: [
      {
        chinese:
          '兔子跑得很快，烏龜走得很慢。兔子總是笑話烏龜。有一天，烏龜說：「我們比賽跑步吧！」兔子笑著說：「好啊，你肯定輸！」比賽開始了，兔子一下子跑得很遠。他回頭看看烏龜，覺得自己太快了，就在樹下睡覺。',
        pinyin: '',
        translation:
          'The hare ran fast; the tortoise walked slowly. The hare was always laughing at the tortoise. One day the tortoise said, "Let us race!" The hare laughed and said, "Fine — you are certain to lose!" The race began and the hare shot far ahead. He looked back at the tortoise, decided he was much too fast, and lay down to sleep under a tree.',
      },
      {
        chinese:
          '烏龜一直慢慢地走，沒有停下來。兔子醒來的時候，發現烏龜已經到了終點。兔子輸了比賽。他才明白：驕傲和偷懶會讓人失敗，堅持才能成功。',
        pinyin: '',
        translation:
          'The tortoise kept walking slowly and never stopped. When the hare woke, he found the tortoise had already reached the finish line. The hare had lost the race. Only then did he understand: pride and idleness lead to failure, and only perseverance brings success.',
      },
    ],
  },
  {
    id: 'hsk1-tale-kongrong',
    title: '孔融讓梨',
    titlePinyin: 'Kǒng Róng ràng lí',
    titleEnglish: 'Kong Rong Gives Up the Pears',
    description: 'A small boy reaches for the smallest pear.',
    wordCount: 96,
    collection: 'folk-tales',
    art: require('../assets/images/covers/hsk1-tale-kongrong.jpg'),
    hskLevel: 1,
    difficulty: 'easy',
    pages: [
      {
        chinese:
          '孔融是一個四歲的小孩，他有五個哥哥。有一天，家裡買了一些梨，大梨小梨都有。爸爸讓孔融先拿一個。孔融拿了一個最小的梨。',
        pinyin: '',
        translation:
          'Kong Rong was a four-year-old boy with five older brothers. One day the family bought some pears, both large and small. His father let Kong Rong take one first. Kong Rong took the smallest pear.',
      },
      {
        chinese:
          '爸爸問他：「為什麼不拿大的？」孔融說：「我年紀小，應該吃小的。大的應該給哥哥們吃。」大家都很驚訝，也很喜歡這個懂事的孩子。從此，「孔融讓梨」成了中國人教育孩子懂禮貌、會分享的故事。',
        pinyin: '',
        translation:
          'His father asked, "Why not take a big one?" Kong Rong said, "I am the youngest, so I should eat the small one. The big ones should go to my brothers." Everyone was surprised, and everyone liked this thoughtful child. Ever since, "Kong Rong gives up the pear" has been the story Chinese people use to teach children courtesy and sharing.',
      },
    ],
  },
  {
    id: 'hsk2-tale-jinfa',
    title: '金髮姑娘和三隻熊',
    titlePinyin: 'jīnfà gūniang hé sān zhī xióng',
    titleEnglish: 'Goldilocks and the Three Bears',
    description: 'Too hot, too cold, and just right.',
    wordCount: 143,
    collection: 'folk-tales',
    art: require('../assets/images/covers/hsk2-tale-jinfa.jpg'),
    hskLevel: 2,
    difficulty: 'easy',
    pages: [
      {
        chinese:
          '森林裡住著熊爸爸、熊媽媽和小熊。一天，他們煮了粥，粥太熱了，就出去散步。一個叫金髮姑娘的女孩走進了他們的房子。她看到三碗粥：一碗太熱，一碗太冷，一碗剛好，她就把剛好的粥喝完了。她又坐了三把椅子，大的太硬，中的太軟，小的正合適——可是坐壞了小熊的椅子。',
        pinyin: '',
        translation:
          'In the forest lived Father Bear, Mother Bear and Baby Bear. One day they made porridge, but it was too hot, so they went out for a walk. A girl called Goldilocks came into their house. She saw three bowls of porridge: one too hot, one too cold, and one just right — and she ate all of the one that was just right. Then she sat in three chairs: the big one too hard, the middle one too soft, the small one just right — but she broke Baby Bear\'s chair.',
      },
      {
        chinese:
          '她很累，找到三張床。大床太硬，中床太軟，小床正合適，她就睡著了。三隻熊回來了，發現粥被喝了，椅子壞了，還看到床上睡著一個女孩。金髮姑娘被嚇醒了，趕緊跑出房子，再也沒有回來。',
        pinyin: '',
        translation:
          'She was tired and found three beds. The big bed was too hard, the middle too soft, the small one just right — and she fell asleep. The three bears came home, found the porridge eaten and the chair broken, and then saw a girl asleep in the bed. Goldilocks woke in fright, ran out of the house, and never came back.',
      },
    ],
  },
  {
    id: 'hsk2-tale-langlaile',
    title: '狼來了',
    titlePinyin: 'láng lái le',
    titleEnglish: 'The Boy Who Cried Wolf',
    description: 'Lie twice and nobody comes the third time.',
    wordCount: 100,
    collection: 'folk-tales',
    art: require('../assets/images/covers/hsk2-tale-langlaile.jpg'),
    hskLevel: 2,
    difficulty: 'easy',
    pages: [
      {
        chinese:
          '一個牧羊的孩子每天在山上放羊，覺得很無聊。他大喊：「狼來了！狼來了！」村民們都跑來幫忙，可是根本沒有狼。孩子哈哈大笑。過了幾天，他又喊了一次，村民們又跑來了，還是沒有狼。大家都很生氣。',
        pinyin: '',
        translation:
          'A shepherd boy who tended sheep on the hillside every day found it very dull. He shouted, "Wolf! Wolf!" The villagers all came running to help, but there was no wolf at all. The boy roared with laughter. A few days later he shouted again, the villagers came running again, and again there was no wolf. Everyone was angry.',
      },
      {
        chinese:
          '後來，真的有一隻狼來了。孩子拼命大喊：「狼來了！救命啊！」可是這一次，沒有人相信他，也沒有人來救他。從此，「狼來了」提醒大家：說謊的人，最後不會有人相信他。',
        pinyin: '',
        translation:
          'Later, a wolf really did come. The boy shouted with all his strength, "Wolf! Help!" But this time nobody believed him, and nobody came to save him. Ever since, "the wolf is coming" reminds us that in the end, no one believes a liar.',
      },
    ],
  },
  {
    id: 'hsk2-tale-shouzhu',
    title: '守株待兔',
    titlePinyin: 'shǒu zhū dài tù',
    titleEnglish: 'Waiting by the Tree Stump',
    description: 'One lucky rabbit, a lifetime of waiting.',
    wordCount: 94,
    collection: 'folk-tales',
    art: require('../assets/images/covers/hsk2-tale-shouzhu.jpg'),
    hskLevel: 2,
    difficulty: 'easy',
    pages: [
      {
        chinese:
          '古時候，宋國有一個農民在田裡幹活。有一天，一隻兔子跑得太快，撞到田邊的樹樁上，死了。農民不用花力氣，白白得到一隻兔子，非常高興。',
        pinyin: '',
        translation:
          'In ancient times a farmer in the state of Song was working in his field. One day a rabbit ran so fast that it struck a tree stump at the edge of the field and died. Without any effort the farmer had got himself a rabbit for nothing, and he was delighted.',
      },
      {
        chinese:
          '從此，他不再種地，每天坐在樹樁旁邊，等著再有兔子撞上來。可是，兔子再也沒有出現。他的田裡長滿了雜草，什麼收成也沒有了。這個故事告訴我們：不能靠運氣過日子，要靠自己的努力才能有收穫。',
        pinyin: '',
        translation:
          'From then on he stopped farming and sat beside the stump every day, waiting for another rabbit to run into it. But no rabbit ever came again. His field filled with weeds and he harvested nothing at all. The story tells us that you cannot live on luck; only your own effort brings a harvest.',
      },
    ],
  },
  {
    id: 'hsk2-tale-caochong',
    title: '曹沖稱象',
    titlePinyin: 'Cáo Chōng chēng xiàng',
    titleEnglish: 'Cao Chong Weighs the Elephant',
    description: 'A clever child solves what the adults cannot.',
    wordCount: 107,
    collection: 'folk-tales',
    art: require('../assets/images/covers/hsk2-tale-caochong.jpg'),
    hskLevel: 2,
    difficulty: 'hard',
    pages: [
      {
        chinese:
          '三國時期，有人送給曹操一頭大象。曹操很想知道大象有多重，可是當時沒有那麼大的秤。大臣們想了很多辦法，都沒有用。曹操的小兒子曹沖，才六歲，說他有辦法。',
        pinyin: '',
        translation:
          'During the Three Kingdoms period, someone presented Cao Cao with an elephant. Cao Cao badly wanted to know how much it weighed, but there was no scale large enough at the time. His ministers thought of many methods, none of which worked. Cao Cao\'s young son Cao Chong, only six years old, said he had a way.',
      },
      {
        chinese:
          '曹沖讓人把大象牽到船上，在船身沉下去的地方做記號。然後把大象牽下來，往船上裝石頭，裝到船沉到同樣的地方為止。最後，只要稱一稱船上所有石頭的重量，加起來，就是大象的重量。大家都很佩服曹沖的聰明。',
        pinyin: '',
        translation:
          'Cao Chong had the elephant led onto a boat, and marked the point to which the hull sank. Then the elephant was led off and stones were loaded onto the boat until it sank to exactly the same mark. Finally, one had only to weigh all the stones and add them up — that was the weight of the elephant. Everyone admired Cao Chong\'s cleverness.',
      },
    ],
  },
  // ---------------------------------------------------------------------------
  // HSK 4 — longer folk tales and chengyu stories. Like the other later stories
  // these carry no page-level pinyin: at this length a full transliteration adds
  // clutter, and the reader already gives per-word readings on tap.
  // ---------------------------------------------------------------------------
  {
    id: 'hsk4-tale-jack-modou',
    title: '傑克與魔豆',
    titlePinyin: 'Jiékè yǔ módòu',
    titleEnglish: 'Jack and the Beanstalk',
    description: 'Five beans, one giant, and a very long climb.',
    wordCount: 468,
    collection: 'folk-tales',
    art: require('../assets/images/covers/hsk4-tale-jack-modou.jpg'),
    hskLevel: 4,
    difficulty: 'hard',
    pages: [
      {
        chinese:
          '傑克和母親相依為命，家裡越來越窮，最後只剩下一頭奶牛可以賣錢換糧食。母親嘆了口氣，讓傑克把牛牽到集市上賣掉，好換一些錢回來買麵包。\n\n傑克牽著牛，走在去集市的路上，遇到了一位奇怪的老人。老人從口袋裡掏出幾顆顏色鮮豔的豆子，對傑克說：「這些可不是普通的豆子，是會施魔法的豆子，用你的牛跟我換，怎麼樣？」傑克覺得很新奇，想都沒想就答應了，高高興興地拿著豆子回了家。\n\n母親一聽傑克用牛換回來的只是幾顆豆子，氣得眼淚都流了出來，隨手就把豆子扔出了窗外，讓傑克餓著肚子上床睡覺。',
        pinyin: '',
        translation:
          'Jack and his mother depended on each other, and the household grew poorer and poorer until all they had left to sell for food was a single dairy cow. His mother sighed and told Jack to lead the cow to market and sell it, so they could bring back some money for bread.\n\nLeading the cow along the road to market, Jack met a strange old man. The old man drew a few brightly coloured beans from his pocket and said, "These are no ordinary beans — they are magic beans. How about trading your cow for them?" Jack thought this wonderfully novel and agreed without a second thought, carrying the beans home in high spirits.\n\nWhen his mother heard that all Jack had got for the cow was a handful of beans, she was so angry that tears ran down her face. She flung the beans out of the window and sent Jack to bed on an empty stomach.',
      },
      {
        chinese:
          '第二天清晨，傑克被一陣陰影驚醒，推開窗戶一看，驚呆了：窗外竟然長出了一根粗壯的豆莖，頂端伸進雲層裡，都看不到盡頭。傑克按捺不住好奇心，順著豆莖一直往上爬，爬了很久很久，終於爬到了雲層之上。\n\n雲層上有一條筆直的道路，盡頭是一座巨大無比的城堡。傑克敲了敲門，開門的是一位巨人的妻子。她心地善良，見傑克又餓又累，就給了他一些食物，還提醒他：「我丈夫最愛吃小男孩了，你可要小心，等他睡著了趕緊躲起來。」\n\n不一會兒，巨人回來了，一邊喊著「我聞到人類的味道了」，一邊四處張望。巨人妻子謊稱他聞錯了，巨人這才作罷，吃過晚飯倒頭就睡。傑克趁機溜進大廳，看到一隻會下金蛋的母雞，趕緊抱起它就往豆莖跑，一口氣爬回了家。',
        pinyin: '',
        translation:
          'Early the next morning Jack was woken by a shadow. He pushed open the window and stared in astonishment: a thick beanstalk had sprung up outside, its top pushing into the clouds with no end in sight. Unable to contain his curiosity, Jack climbed the stalk, up and up for a very long time, until at last he came out above the clouds.\n\nAbove the clouds ran a straight road, and at the end of it stood an enormous castle. Jack knocked, and the door was opened by a giant\'s wife. She was kind-hearted, and seeing that Jack was hungry and tired she gave him some food, warning him: "My husband loves nothing better than eating little boys. Be careful — hide the moment he falls asleep."\n\nBefore long the giant came home, calling out "I smell the smell of a human" and looking all around. The giant\'s wife lied and said his nose had deceived him, so he let it go, ate his supper and dropped straight off to sleep. Jack seized his chance, slipped into the great hall, and saw a hen that laid golden eggs. He snatched it up, ran for the beanstalk, and climbed all the way home without stopping.',
      },
      {
        chinese:
          '母子倆靠著金蛋賣錢，日子漸漸好了起來。可是傑克心裡還惦記著城堡，沒過多久又偷偷爬了上去，這一次他偷走了幾袋金幣；第三次，他又拿走了一把會自己彈奏美妙音樂的金豎琴。\n\n沒想到，豎琴突然大聲呼喊：「主人，救命啊！」巨人被驚醒，發現寶物被偷，勃然大怒，追著傑克一路爬下了豆莖。\n\n傑克飛快地爬到地面，抓起斧頭拼命朝豆莖砍去。豆莖轟然倒下，巨人也從半空中摔了下來，再也沒有起來。\n\n從此，傑克和母親靠著金蛋、金幣和豎琴，過上了衣食無憂、幸福美滿的生活。',
        pinyin: '',
        translation:
          'Mother and son sold the golden eggs, and little by little their life improved. But the castle stayed on Jack\'s mind, and before long he crept up again — this time stealing away several bags of gold coins. On a third trip he carried off a golden harp that played beautiful music of its own accord.\n\nTo his dismay, the harp suddenly cried out: "Master, help!" The giant woke, found his treasures gone, flew into a rage, and chased Jack all the way down the beanstalk.\n\nJack scrambled to the ground, grabbed an axe and hacked at the stalk with all his might. The beanstalk came crashing down, and the giant fell out of the sky and never got up again.\n\nFrom then on, Jack and his mother lived on the golden eggs, the gold coins and the harp — never short of food or clothing, and happy together.',
      },
    ],
  },
  {
    id: 'hsk4-tale-tangguowu',
    title: '糖果屋',
    titlePinyin: 'tángguǒ wū',
    titleEnglish: 'Hansel and Gretel',
    description: 'A house made of sweets hides something bitter.',
    wordCount: 505,
    collection: 'folk-tales',
    art: require('../assets/images/covers/hsk4-tale-tangguowu.jpg'),
    hskLevel: 4,
    difficulty: 'hard',
    pages: [
      {
        chinese:
          '樵夫和繼母帶著一雙兒女漢賽爾和格萊特住在森林邊緣，家境十分貧窮，常常吃了上頓沒下頓。繼母見家裡的糧食越來越少，便一直慫恿樵夫把兩個孩子丟進森林裡，好省下兩張嘴的口糧。樵夫心中不忍，卻拗不過繼母的堅持，最終還是含淚答應了。\n\n躲在門後的兄妹倆聽到了父母的對話，嚇得渾身發抖。聰明的漢賽爾安慰妹妹說不用擔心，他半夜偷偷出門，在口袋裡裝滿了白色的小石子。\n\n第二天，父母把兄妹倆帶進森林深處，藉口去砍柴，便悄悄離開了。天黑之後，兄妹倆沿著漢賽爾一路上悄悄留下的小石子，深一腳淺一腳地摸回了家。',
        pinyin: '',
        translation:
          'A woodcutter and his second wife lived at the edge of the forest with his two children, Hansel and Gretel. The family was desperately poor, often not knowing where the next meal would come from. Seeing the food running low, the stepmother kept urging the woodcutter to abandon the two children in the forest and save two mouths\' worth of rations. He could not bear the thought, but he could not stand against her insistence either, and in the end he tearfully agreed.\n\nHiding behind the door, the brother and sister overheard their parents and shook with fright. Clever Hansel comforted his sister and told her not to worry; in the middle of the night he slipped outside and filled his pockets with small white pebbles.\n\nThe next day their parents led them deep into the forest, made an excuse about cutting wood, and quietly left. After dark the two children followed the pebbles Hansel had been dropping along the way and stumbled their way home.',
      },
      {
        chinese:
          '沒想到沒過多久，家裡的糧食又見了底，繼母又生一計，這一次她把兄妹倆帶到森林更深處。這一次，漢賽爾身上沒有石子，只好用麵包屑代替，一路作記號。誰知麵包屑早被林中的小鳥啄食乾淨，兄妹倆這一次真的迷失在了茫茫森林裡。\n\n他們又累又餓，走了整整一天，忽然聞到一股香甜的氣味。順著味道走去，眼前竟出現了一座用糖果、餅乾和巧克力磚搭成的房子！兄妹倆再也顧不上禮貌，撲上去就啃了起來。\n\n這時，房子的主人——一個滿臉皺紋的老婆婆走了出來，笑眯眯地把他們請進屋裡，端出豐盛的晚餐。兄妹倆哪裡知道，這個老婆婆其實是一個專吃小孩的女巫，糖果屋正是她設下的陷阱。',
        pinyin: '',
        translation:
          'Before long, though, the food ran out again. The stepmother hatched a second plan and this time took the children deeper still into the forest. Hansel had no pebbles now and had to use breadcrumbs instead, marking the trail as they walked. But the birds of the forest had long since pecked the crumbs clean, and this time the two really were lost in the endless woods.\n\nTired and hungry, they walked for a whole day, until suddenly they caught a sweet fragrance. Following the smell, they came upon a house built of sweets, biscuits and bricks of chocolate! Manners forgotten, the two threw themselves at it and began to eat.\n\nJust then the owner came out — an old woman with a face full of wrinkles. Smiling, she invited them inside and set out a lavish supper. What the children did not know was that the old woman was in fact a witch who ate children, and the sweet house was the trap she had laid.',
      },
      {
        chinese:
          '女巫把漢賽爾關進一個鐵籠子裡，每天逼著格萊特送去大魚大肉，想把他養胖了再吃掉，還每天讓格萊特打掃房間、洗衣做飯，稍不順心就要捱罵。\n\n女巫等得不耐煩了，決定親自動手，讓格萊特去把烤爐燒熱。狡猾的格萊特假裝不知道該怎麼彎腰檢視爐火，女巫不耐煩地親自示範，格萊特瞅準時機，用力一推，把女巫推進了爐子裡，反手關上了爐門。\n\n格萊特趕緊放出哥哥，兩人在女巫的屋子裡翻出了一箱又一箱的珠寶和金幣，裝滿了口袋，一起手拉手走出森林，歷經艱辛終於找到了回家的路。\n\n父親見到失而復得的兒女，喜極而泣，這才說出繼母早已因心懷愧疚離家出走。一家人靠著從糖果屋帶回來的財寶，從此過上了富足安樂的生活。',
        pinyin: '',
        translation:
          'The witch shut Hansel in an iron cage and made Gretel bring him rich food every day, meaning to fatten him up and then eat him. Gretel was made to sweep the rooms, wash the clothes and cook, and was scolded at the slightest displeasure.\n\nGrowing impatient with waiting, the witch decided to get on with it and told Gretel to heat the oven. Cunning Gretel pretended she did not know how to lean in and check the fire, so the witch impatiently demonstrated herself. Gretel watched for her moment, gave a hard shove that sent the witch into the oven, and slammed the door behind her.\n\nGretel hurried to free her brother, and together they turned up chest after chest of jewels and gold coins in the witch\'s house. They filled their pockets, walked out of the forest hand in hand, and after a hard journey finally found the way home.\n\nTheir father wept for joy at the children he thought he had lost, and only then told them that the stepmother, consumed by guilt, had long since left. On the treasure brought back from the sweet house, the family lived in comfort and peace ever after.',
      },
    ],
  },
  {
    id: 'hsk4-idiom-bamiaozhuzhang',
    title: '拔苗助長',
    titlePinyin: 'bá miáo zhù zhǎng',
    titleEnglish: 'Pulling Up the Seedlings',
    description: 'Hurrying growth is the surest way to ruin it.',
    wordCount: 395,
    collection: 'chengyu',
    art: require('../assets/images/covers/hsk4-idiom-bamiaozhuzhang.jpg'),
    hskLevel: 4,
    difficulty: 'easy',
    pages: [
      {
        chinese:
          '宋國有一位農夫，性子十分急躁。開春時節，他辛辛苦苦在田裡種下了一片禾苗，天天盼著禾苗能快點長高，好早日迎來豐收。\n\n播種之後的頭幾天，他每天都要跑到田邊去看好幾趟。可是禾苗才剛剛發芽，長得實在太慢，一天下來幾乎看不出什麼變化。農夫心裡越來越著急，吃飯也吃不香，睡覺也睡不安穩，整天唸叨著：「這麼慢的速度，什麼時候才能長成莊稼？」\n\n他冥思苦想了好幾天，終於「想出」了一個自認為絕妙的辦法。第二天一大早，他就扛著鋤頭興沖沖地跑到田裡，彎下腰，把每一棵禾苗都稍稍往上拔高一點，一棵接著一棵，從日出忙到日落，累得滿頭大汗，腰都直不起來。',
        pinyin: '',
        translation:
          'In the state of Song there was a farmer of a very impatient temperament. When spring came he worked hard to plant a field of rice seedlings, and every day he longed for them to grow tall quickly so the harvest would come early.\n\nFor the first few days after sowing he would run out to the edge of the field several times a day. But the seedlings had only just sprouted and grew terribly slowly; over a whole day there was almost no visible change. The farmer grew more and more anxious. He could not enjoy his food or sleep soundly, and muttered all day long: "At this rate, when will they ever grow into a crop?"\n\nAfter several days of hard thinking he finally "hit upon" what he considered a brilliant idea. Early the next morning he shouldered his hoe and hurried out to the field, bent down, and pulled every single seedling up a little higher, one after another, working from sunrise to sunset until he was drenched in sweat and could barely straighten his back.',
      },
      {
        chinese:
          '天色漸暗，農夫拖著疲憊的身體回到家中，一邊喘著粗氣一邊得意地對家人說：「今天可把我累壞了！不過總算值得，我幫田裡所有的禾苗都往上長高了一大截！」\n\n他的兒子聽了覺得十分蹊蹺，心想禾苗哪有一天就能長高一大截的道理，第二天一早便急忙跑去田裡檢視究竟。\n\n到了田邊，兒子被眼前的景象驚呆了：原本綠油油的一片禾苗，此刻全都枯黃耷拉著葉子，垂頭喪氣地倒伏在地裡，一棵一棵都已經死了。原來，禾苗被人為地拔高之後，根鬚都離開了土壤，再也無法從土地裡吸收養分和水分，自然而然就枯死了。\n\n農夫這才如夢初醒，追悔莫及，可是田裡的禾苗已經無法挽回，這一年註定顆粒無收。\n\n這個故事流傳至今，成了「拔苗助長」這個成語的由來，用來告誡人們：世間萬物都有自己生長發展的規律，一味違背規律、急於求成，非但不能把事情做好，反而會把事情徹底毀掉。',
        pinyin: '',
        translation:
          'As dusk fell the farmer dragged his weary body home and, panting, announced smugly to his family: "That job has worn me out today! But it was worth it — I have helped every seedling in the field grow a good deal taller!"\n\nHis son thought this most peculiar, reasoning that no seedling grows a great deal taller in a single day, and early the next morning he hurried out to the field to see for himself.\n\nAt the field\'s edge the son was struck dumb by what he saw: the once lush green seedlings had all turned yellow, their leaves drooping, collapsed limply on the ground — every last one of them dead. Pulled up by hand, their roots had left the soil and could no longer draw nutrients or water from the earth, so of course they had withered and died.\n\nOnly then did the farmer wake as if from a dream, full of regret. But the seedlings were beyond saving, and that year\'s harvest was lost entirely.\n\nThe story has been passed down ever since as the origin of the idiom "pulling up seedlings to help them grow", a warning that everything in the world has its own laws of growth: to defy those laws and grasp at quick results does not get the job done — it destroys the thing completely.',
      },
    ],
  },
  {
    id: 'hsk4-idiom-yanerdaoling',
    title: '掩耳盜鈴',
    titlePinyin: 'yǎn ěr dào líng',
    titleEnglish: 'Plugging His Ears to Steal a Bell',
    description: 'If he cannot hear it, surely no one can.',
    wordCount: 386,
    collection: 'chengyu',
    art: require('../assets/images/covers/hsk4-idiom-yanerdaoling.jpg'),
    hskLevel: 4,
    difficulty: 'easy',
    pages: [
      {
        chinese:
          '春秋時期，晉國有一個人一心想要不勞而獲，整天惦記著怎樣才能佔些便宜。有一天，他路過一戶人家，看見院子門前掛著一口造型精美的大鐘，鐘身是純銅鑄造的，在陽光下閃閃發光，他頓時起了貪念，盤算著怎麼才能把這口鐘據為己有。\n\n到了夜裡，他趁著四下無人，偷偷溜進院子，想把鐘揹回家去。可是鐘又大又重，他費了九牛二虎之力，鐘紋絲不動，根本沒辦法完整地搬走。\n\n他左思右想，終於想出了一個辦法：既然搬不動整口鐘，那就把它敲碎，分成一塊一塊的，再分幾次搬回家去，這樣不就輕鬆多了嗎？',
        pinyin: '',
        translation:
          'In the Spring and Autumn period there was a man in the state of Jin who wanted gain without effort and spent his days scheming for an easy advantage. One day he passed a house and saw a large, beautifully made bell hanging before the courtyard gate. It was cast in solid bronze and glittered in the sunlight. Greed rose in him at once, and he began working out how to make the bell his own.\n\nThat night, when nobody was about, he slipped into the courtyard meaning to carry the bell home on his back. But the bell was huge and heavy; though he strained with all his might it did not budge an inch, and there was no way to move it whole.\n\nTurning the problem over, he at last hit on a solution: if he could not shift the whole bell, he would smash it into pieces and carry it home a few pieces at a time. Would that not be far easier?',
      },
      {
        chinese:
          '他找來一把大鐵錘，對準鐘身狠狠地砸了下去。誰知這一錘下去，鐘發出了震耳欲聾的響聲，在寂靜的夜裡傳得老遠老遠，他嚇了一大跳，趕緊抱住鐘不敢再動。\n\n他心想：這鐘聲這麼響，附近的人一定都被吵醒了，一定會有人跑出來把我抓住的。急得他抓耳撓腮，忽然靈機一動，想到一個「絕妙」的主意：只要把自己的耳朵捂起來，聽不到鐘聲，別人不就也聽不到了嗎？\n\n於是，他找來兩團布，牢牢地塞住自己的耳朵，安心地繼續揮錘砸鐘，一錘又一錘，鐘聲接連不斷地響徹整個村莊。附近的村民全被驚醒，紛紛提著燈籠循著鐘聲趕來檢視，當場就把他人贓並獲，抓了個正著。\n\n這個人一邊掙扎一邊委屈地喊道：「我明明已經捂住耳朵了，怎麼還是被發現了？」周圍的人聽了，都忍不住哈哈大笑起來。\n\n這個故事告訴我們：客觀事實不會因為一個人自己不願面對、自己欺騙自己，就發生改變。掩耳盜鈴，最終騙到的只有自己。',
        pinyin: '',
        translation:
          'He fetched a great iron hammer and brought it down hard on the bell. To his alarm, the blow set the bell ringing deafeningly, and in the silence of the night the sound carried far and wide. He jumped in fright and threw his arms around the bell, afraid to move.\n\nHe thought: the bell is so loud that everyone nearby must be awake, and somebody is bound to run out and catch me. Scratching his head in a panic, he suddenly had a flash of inspiration and a "brilliant" idea: if he covered his own ears so that he could not hear the bell, then surely nobody else would hear it either.\n\nSo he found two wads of cloth, stuffed them firmly into his ears, and calmly went on swinging the hammer, blow after blow, the bell ringing out unbroken across the whole village. The villagers were all woken, took up their lanterns and followed the sound, and caught him red-handed with the goods.\n\nStruggling, the man cried out in grievance: "I had my ears covered — how was I still found out?" Everyone around him burst out laughing.\n\nThe story tells us this: objective fact does not change simply because someone refuses to face it and deceives himself. Covering your ears to steal a bell, the only person you fool in the end is yourself.',
      },
    ],
  },
  {
    id: 'hsk4-idiom-huashetianzu',
    title: '畫蛇添足',
    titlePinyin: 'huà shé tiān zú',
    titleEnglish: 'Drawing Legs on a Snake',
    description: 'He had won the contest until he added more.',
    wordCount: 403,
    collection: 'chengyu',
    art: require('../assets/images/covers/hsk4-idiom-huashetianzu.jpg'),
    hskLevel: 4,
    difficulty: 'easy',
    pages: [
      {
        chinese:
          '楚國有一戶人家，祭祀祖先之後，按照習俗，把祭祀用的一壺好酒賞給前來幫忙的門客們。門客們人數不少，可是酒只有一壺，分給每個人都只夠沾沾嘴唇，大家你看看我，我看看你，都覺得不過癮。\n\n其中一人提議道：「我們這麼多人喝一壺酒確實不夠盡興，不如大家各自在地上畫一條蛇，誰先畫完，這壺酒就歸誰一個人喝，怎麼樣？」大家都覺得這個主意很公平，紛紛拿起樹枝，在地上比賽畫了起來。\n\n其中一個人手腳十分麻利，沒過多久就把蛇畫好了，成為第一個完成的人。他站起身，端起酒壺就要一飲而盡，可是轉頭看看旁邊的人，都還在低頭認真地畫著，一時半會兒都畫不完。',
        pinyin: '',
        translation:
          'A household in the state of Chu, having made offerings to their ancestors, followed custom and rewarded the retainers who had come to help with a pot of good sacrificial wine. There were a good many retainers but only one pot, enough for each to wet his lips and no more. They looked at one another, all feeling it was hardly satisfying.\n\nOne of them proposed: "With this many of us, one pot of wine really is not enough to enjoy. Why not each draw a snake on the ground — whoever finishes first drinks the whole pot alone. How about it?" Everyone thought this perfectly fair, picked up twigs, and set to drawing on the ground in competition.\n\nOne man was very quick-handed and finished his snake in no time, the first to be done. He stood up and raised the pot to drain it in one go — but glancing round at the others, he saw them all still bent over and drawing intently, nowhere near finished.',
      },
      {
        chinese:
          '他心裡得意起來，尋思著自己既然畫得這麼快，不如再露一手，顯擺一下自己的本事。於是他左手提著酒壺，右手重新拿起樹枝，一邊給自己的蛇添上幾隻腳，一邊洋洋得意地說：「你們看，我還能再給蛇添上腳呢，畫得還綽綽有餘！」\n\n正當他專心給蛇畫腳的時候，旁邊一個人也畫完了自己的蛇，一把從他手中奪過酒壺，說道：「蛇本來是沒有腳的，你何必要多此一舉給它添上腳呢？這已經不是蛇了！照比賽的規則，這壺酒應該歸我了才對。」說完，便毫不客氣地把這壺酒喝了個精光。\n\n那個先畫完蛇、原本已經穩穩當當贏得這壺酒的人，就因為畫蛇添足，弄巧成拙，白白地失去了本該屬於自己的獎賞，只能站在一旁，眼巴巴地看著別人把酒喝完，後悔不已。\n\n這個故事告訴我們：做事情要恰如其分，掌握好分寸，多餘的、畫蛇添足般的舉動，往往會把原本很好的事情弄糟糕，甚至弄巧成拙。',
        pinyin: '',
        translation:
          'Pleased with himself, he reasoned that since he had drawn so quickly he might as well show off a little more of his skill. So, holding the wine pot in his left hand, he took up the twig again in his right and began adding feet to his snake, saying complacently: "Look — I can even add feet to my snake, and still have time to spare!"\n\nJust as he was absorbed in drawing the feet, the man beside him finished his own snake, snatched the pot out of his hand and said: "A snake has no feet to begin with. Why go to the needless trouble of adding them? That is no longer a snake! By the rules of the contest, this wine should be mine." With that, he drank the whole pot without ceremony.\n\nThe man who had finished first, and who had the wine safely won, lost the prize that should have been his through nothing but adding feet to a snake — outsmarting himself. He could only stand by and watch, full of regret, as another drank it all.\n\nThe story tells us to do things in due measure and keep a sense of proportion: superfluous, snake-foot gestures often spoil what was going perfectly well, and can defeat the very purpose they were meant to serve.',
      },
    ],
  },
  {
    id: 'hsk4-idiom-kezhouqiujian',
    title: '刻舟求劍',
    titlePinyin: 'kè zhōu qiú jiàn',
    titleEnglish: 'Carving the Boat to Find the Sword',
    description: 'The river moves even when the mark does not.',
    wordCount: 441,
    collection: 'chengyu',
    art: require('../assets/images/covers/hsk4-idiom-kezhouqiujian.jpg'),
    hskLevel: 4,
    difficulty: 'easy',
    pages: [
      {
        chinese:
          '楚國有一個人，十分珍愛自己腰間佩戴的一把寶劍，那把劍是祖上傳下來的，劍身鋒利無比，劍鞘上還鑲嵌著精美的花紋，他走到哪裡都要隨身帶著，視若珍寶。\n\n有一次，他要乘船渡過一條寬闊的大江去辦事，便把寶劍也一併帶上了船。船行至江心的時候，江面忽然起了一陣風浪，船身搖晃得厲害，他一個不留神，腰間的寶劍竟然「撲通」一聲掉進了滔滔江水之中，轉眼便沉了下去，再也看不見蹤影。\n\n船上的其他乘客都為他感到十分惋惜，紛紛勸他趕緊想辦法，或者乾脆認了這個損失。誰知這個人卻顯得異常鎮定，一點也不著急，只見他不慌不忙地從懷裡掏出一把小刀，在船舷上寶劍墜落的那個位置，仔細地刻下了一個記號。',
        pinyin: '',
        translation:
          'There was a man of Chu who greatly treasured the sword he wore at his waist. It had been handed down from his ancestors, its blade exceedingly sharp and its scabbard inlaid with fine patterns; he carried it wherever he went and prized it like a jewel.\n\nOnce he had to cross a wide river by boat on business, and took the sword aboard with him. When the boat reached midstream a squall suddenly got up, the hull rocked violently, and in a moment of carelessness the sword at his waist fell with a splash into the rushing water, sinking at once out of sight.\n\nThe other passengers felt very sorry for him and urged him to think of something quickly, or else simply write the loss off. But the man appeared remarkably calm and not the least bit hurried. Unflustered, he drew a small knife from inside his robe and carefully carved a mark on the gunwale at the spot where the sword had gone in.',
      },
      {
        chinese:
          '刻完記號，他心滿意足地拍了拍手，得意地對身邊的人說：「這下就好辦了，我已經把寶劍掉落的位置刻下來了，等船靠岸之後，我就順著這個記號下水去找，一定能把寶劍撈上來。」周圍的人聽了他這一番話，都覺得十分荒唐，紛紛搖頭，卻又不好當面反駁，只能面面相覷。\n\n船繼續行駛了很長一段時間，終於緩緩靠岸停了下來。這個人立刻脫下外衣，興沖沖地按照船舷上刻的記號，從那個位置縱身跳入水中，四處摸索，想要把寶劍撈回來。\n\n他在水裡摸索了很久很久，除了泥沙和水草，什麼也沒有摸到，哪裡還有寶劍的蹤影。原來，船從寶劍落水的地方，早已經順著水流行駛了很遠很遠的距離，可是船舷上的記號，卻只是停留在原來那個位置上，完全沒有隨著江水的位置而改變。\n\n這個人始終不明白，為什麼明明按照記號去找了，寶劍卻怎麼也找不到，只能一臉茫然、失望地從水中爬上岸來，溼淋淋地站在船邊，成了眾人的笑柄。\n\n這個故事告訴我們：世界上的事物是不斷發展變化的，絕不能死守著一成不變、過時的老辦法去解決新的問題。',
        pinyin: '',
        translation:
          'Having cut the mark, he clapped his hands in satisfaction and said smugly to those beside him: "That settles it. I have marked the spot where the sword fell; once the boat reaches the bank I shall go into the water at this mark and I am certain to fish it out." Those who heard him thought it utterly absurd and shook their heads, but did not like to contradict him to his face, and merely exchanged glances.\n\nThe boat sailed on for a long while and at last drew slowly in to the bank. The man immediately took off his outer robe and, following the mark on the gunwale, leapt eagerly into the water at that point and groped about, hoping to recover his sword.\n\nHe felt around in the water for a very long time and found nothing but silt and weed — of the sword there was no trace. The boat had of course travelled a very great distance downstream from the place where the sword had gone in, while the mark on the gunwale had stayed exactly where it was, moving not at all with the water.\n\nThe man never did understand why, having searched according to his mark, the sword was nowhere to be found. He could only climb ashore blank-faced and disappointed, standing dripping beside the boat, a laughing stock to everyone.\n\nThe story tells us that the things of this world are constantly developing and changing, and that one must never cling to fixed, outdated methods to solve new problems.',
      },
    ],
  },
  {
    id: 'hsk4-legend-nianshou',
    title: '年獸的傳說',
    titlePinyin: 'niánshòu de chuánshuō',
    titleEnglish: 'The Legend of the Nian Beast',
    description: 'Why the new year wears red and bangs drums.',
    wordCount: 520,
    collection: 'festival-legends',
    art: require('../assets/images/covers/hsk4-legend-nianshou.jpg'),
    hskLevel: 4,
    difficulty: 'hard',
    pages: [
      {
        chinese:
          '相傳在遠古的時候，世上有一種十分兇猛的怪獸，名字叫「年」。它平日裡潛伏在深山老林或者浩瀚無邊的深海之中，一年到頭都很少露面，唯獨每年臘月三十的除夕之夜，才會從藏身之處鑽出來，闖入附近的村莊，四處作亂。\n\n「年」獸的樣貌十分猙獰，頭上長著尖利的犄角，一張血盆大口能把整頭牛都一口吞下，它專門以牲畜和人類為食，所到之處，房屋被毀，莊稼被踐踏，雞犬不寧，村民們幾乎年年都要遭受一次浩劫，苦不堪言。\n\n村民們發現「年」獸總是在除夕夜準時出現，於是每到這一天，家家戶戶便扶老攜幼，早早收拾好細軟，一起逃往深山裡躲避，把家門緊閉，只盼著能躲過這一場災禍，平平安安捱到天亮。',
        pinyin: '',
        translation:
          'It is said that in ancient times there was a ferocious monster called Nian. It lay hidden in the deep mountains and old forests, or in the boundless depths of the sea, and rarely showed itself all year round — except on the night of New Year\'s Eve, the thirtieth of the last lunar month, when it would emerge from its hiding place, burst into the nearby villages and run riot.\n\nNian was hideous to look at, with sharp horns on its head and a mouth wide enough to swallow a whole ox in one gulp. It fed on livestock and on people, and wherever it went houses were destroyed, crops trampled and no creature left in peace. The villagers suffered this calamity almost every year, and their misery was beyond words.\n\nThe villagers noticed that Nian always appeared punctually on New Year\'s Eve, so on that day every household would gather up their valuables early, help the old and lead the young, and flee together into the mountains to hide. They shut their doors fast and hoped only to escape the disaster and last safely until dawn.',
      },
      {
        chinese:
          '有一年除夕，正當村民們準備像往常一樣逃往山中避難的時候，村口忽然來了一位衣衫襤褸、白髮蒼蒼的乞討老人。他手拄柺杖，氣度不凡，對著驚慌逃難的村民們說：「今晚我就住在村子裡，我有辦法把年獸趕走。」村民們你看看我，我看看你，都覺得老人這是在痴人說夢，誰也不相信，紛紛勸他趕緊一起逃命，可老人卻執意不肯離開，笑著搖了搖頭。\n\n大家沒有辦法，只好丟下老人，各自逃往山中去了。到了半夜時分，「年」獸果然如期而至，氣勢洶洶地闖入村莊，正準備大肆破壞，忽然發現村裡一戶人家的大門上貼滿了鮮紅的紙張，屋子裡燈火通明、燭光搖曳，院子當中還燃著一堆噼裡啪啦作響的篝火。\n\n「年」獸從來沒有見過這樣的陣仗，被這滿目的紅色和刺眼的火光晃得心神不寧，又被噼啪的爆裂聲響嚇得魂飛魄散，還沒等靠近，就倉皇地調轉身子，狼狽地逃回了深山老林，再也不敢露面。',
        pinyin: '',
        translation:
          'One New Year\'s Eve, just as the villagers were preparing to flee to the mountains as usual, an old beggar in ragged clothes and with snow-white hair appeared at the village entrance. Leaning on a stick, he had a bearing that was far from ordinary, and he said to the panicking villagers: "I shall stay in the village tonight. I have a way to drive the Nian beast off." The villagers looked at one another and thought the old man was dreaming; nobody believed him, and they urged him to flee with them. But he firmly refused to leave, smiling and shaking his head.\n\nThere was nothing to be done, so they left the old man behind and fled to the mountains. At midnight Nian arrived as expected, storming into the village and about to wreak havoc — when it noticed that the gate of one house was covered in bright red paper, that the rooms inside blazed with lamplight and flickering candles, and that in the courtyard a bonfire crackled and popped.\n\nNian had never seen such a display. Unsettled by all that red and by the dazzling firelight, and terrified out of its wits by the crackling reports, it turned tail before it even came close and fled in disarray back to the deep mountains, never daring to show itself again.',
      },
      {
        chinese:
          '第二天，逃難的村民們陸續返回村莊，驚訝地發現村莊竟毫髮無損，這才恍然大悟，原來那位其貌不揚的老人，教給大家的正是驅趕年獸的秘訣：貼紅紙、點燈火、放爆竹。\n\n從此以後，每逢除夕，家家戶戶都會貼上紅色的春聯，掛起紅燈籠，燃放噼裡啪啦的鞭炮，守夜到天明，這便是「過年」這一習俗代代相傳的由來。',
        pinyin: '',
        translation:
          'The next day the villagers returned one after another and were amazed to find the village entirely unharmed. Only then did it dawn on them that the unremarkable-looking old man had taught them the very secret of driving Nian away: paste up red paper, light lamps, set off firecrackers.\n\nFrom then on, every New Year\'s Eve each household pastes up red spring couplets, hangs red lanterns, sets off crackling firecrackers and keeps watch until dawn — and this is the origin of the custom of "passing the year", handed down from generation to generation.',
      },
    ],
  },
  {
    id: 'hsk4-legend-menshen',
    title: '門神的傳說',
    titlePinyin: 'ménshén de chuánshuō',
    titleEnglish: 'The Legend of the Door Gods',
    description: 'Two generals who guard an emperor\'s sleep.',
    wordCount: 430,
    collection: 'festival-legends',
    art: require('../assets/images/covers/hsk4-legend-menshen.jpg'),
    hskLevel: 4,
    difficulty: 'hard',
    pages: [
      {
        chinese:
          '相傳唐朝初年，唐太宗李世民在一次征戰之中，親手斬殺了不少敵軍將士。此後不久，李世民便時常在深夜裡被噩夢纏身，夢中總有戰死的冤魂前來索命，鬼哭狼嚎之聲不絕於耳，驚得他渾身冷汗，夜夜都無法安然入睡，身體也因此日漸虛弱憔悴。\n\n朝中大臣得知此事後都十分憂心，唐朝開國大將秦瓊和尉遲恭得知皇帝夜裡受到驚擾，便主動向皇帝請命，願意手持兵器，身披盔甲，整夜侍立在寢宮門外為皇帝守夜護駕。\n\n當天夜裡，兩位大將威風凜凜地分立在宮門兩側，一夜未眠，嚴陣以待。說來也奇怪，那一夜唐太宗竟然一夜安睡，再也沒有夢到過惡鬼騷擾，精神狀態也漸漸好轉起來。',
        pinyin: '',
        translation:
          'It is said that in the early years of the Tang dynasty, Emperor Taizong, Li Shimin, killed a good many enemy soldiers with his own hand in the course of a campaign. Not long afterwards he began to be plagued by nightmares deep in the night, in which the wronged spirits of the war dead came to demand his life, their wailing never ceasing in his ears. He would wake in a cold sweat, unable to sleep peacefully night after night, and his health grew steadily weaker.\n\nThe ministers of the court were greatly worried. Qin Qiong and Yuchi Gong, founding generals of the Tang, learned that the emperor was being troubled at night and volunteered to stand guard: bearing their weapons and clad in armour, they would attend outside the door of his bedchamber all night long to protect him.\n\nThat night the two generals stood in awe-inspiring array on either side of the palace door, keeping watch without sleeping. Strangely enough, the emperor slept soundly the whole night through, dreamt no more of malevolent spirits, and his spirits gradually improved.',
      },
      {
        chinese:
          '然而，兩位大將畢竟都是朝廷倚重的股肱之臣，日理萬機，不可能夜夜都親自守在宮門之外，長此以往，恐怕身體也吃不消。唐太宗左思右想，便想出了一個兩全其美的辦法：他命宮廷畫師，把秦瓊和尉遲恭兩位大將頂盔貫甲、威嚴肅穆的模樣，栩栩如生地畫了下來，分別張貼在寢宮大門的左右兩側。\n\n說也奇怪，從那以後，只要門上貼著兩位大將的畫像，惡鬼便再也不敢靠近半步，唐太宗從此睡得安穩踏實，再也沒有受到過噩夢的侵擾。\n\n這件事情很快在民間流傳開來，百姓們聽聞此事，也紛紛效仿宮廷的做法，請畫師繪製秦瓊、尉遲恭二位將軍手持兵器、怒目圓睜的畫像，張貼在自家大門的兩側，用來驅邪避兇，祈求家宅平安，久而久之，兩位將軍便被尊稱為「門神」。\n\n每逢新春佳節來臨之際，家家戶戶都會鄭重地更換一副嶄新的門神畫像，象徵著辭舊迎新、驅邪納福，這一習俗歷經千百年，一直流傳至今，成為春節期間中國民間十分重要的傳統習俗之一。',
        pinyin: '',
        translation:
          'The two generals were, however, pillars of the court with a thousand duties a day, and could not possibly stand guard outside the palace door every night; kept up indefinitely, their health would not have borne it. After much thought the emperor arrived at a solution that served both ends: he ordered the court painters to render Qin Qiong and Yuchi Gong to the life, helmeted and armoured, stern and majestic, and had the pictures pasted on the left and right of his bedchamber door.\n\nStrange to say, from then on, so long as the two generals\' portraits hung on the door the evil spirits dared not come a step closer, and the emperor slept soundly and was never troubled by nightmares again.\n\nThe story soon spread among the people, who copied the court\'s practice, commissioning painters to depict the two generals bearing weapons with eyes glaring, and pasting the pictures on either side of their own gates to ward off evil and pray for peace in the home. In time the two generals came to be honoured as the "Door Gods".\n\nWhenever the New Year festival comes round, every household solemnly puts up a fresh pair of Door God pictures, symbolising the sending out of the old and the welcoming in of the new, warding off evil and drawing in blessings. After a thousand years and more the custom survives, one of the most important folk traditions of the Spring Festival in China.',
      },
    ],
  },
  {
    id: 'hsk4-legend-yasuiqian',
    title: '壓歲錢的由來',
    titlePinyin: 'yāsuìqián de yóulái',
    titleEnglish: 'The Origin of Lucky Money',
    description: 'Eight coins in red paper keep a demon away.',
    wordCount: 516,
    collection: 'festival-legends',
    art: require('../assets/images/covers/hsk4-legend-yasuiqian.jpg'),
    hskLevel: 4,
    difficulty: 'hard',
    pages: [
      {
        chinese:
          '相傳在很久很久以前，世上有一種個頭很小的妖怪，名叫「祟」。這個小妖怪渾身漆黑，手掌雪白，平日裡深居簡出，唯獨在每年大年三十的夜裡，才會偷偷地跑出來作祟害人。\n\n每逢除夕深夜，趁著家家戶戶的孩子熟睡之際，「祟」便會悄悄地潛入屋內，伸出雪白的手掌，輕輕撫摸熟睡孩子的額頭。被「祟」摸過額頭的孩子，第二天醒來便會渾身發燙、高燒不退，還會被嚇得整日哭鬧、說胡話，即便請來郎中醫治，也難以見效，往往要折騰好些日子才能痊癒，因此當地的老百姓一到除夕夜就人心惶惶，家家戶戶都要點著燈，不敢讓孩子睡去。',
        pinyin: '',
        translation:
          'It is said that a very long time ago there was a small demon in the world called Sui. This little creature was jet black all over with snow-white palms. It kept out of sight most of the time, and only on the night of the thirtieth of the last lunar month would it creep out to work its mischief on people.\n\nOn New Year\'s Eve, while the children of every household lay fast asleep, Sui would steal into the house, reach out its snow-white palm and gently stroke a sleeping child\'s forehead. A child whose forehead Sui had touched would wake the next day burning hot with a fever that would not break, and would cry and rave in fright all day long. Even a physician could do little, and it often took many days to recover. So the local people were seized with dread as New Year\'s Eve approached, and every household kept the lamps burning, not daring to let the children sleep.',
      },
      {
        chinese:
          '嘉興府有一對姓管的夫妻，老來得子，對這個孩子疼愛有加，視若掌上明珠。有一年除夕夜，為了不讓孩子早早入睡遭「祟」的毒手，夫妻二人想出一個法子，拿出八枚銅錢，用一張紅紙仔仔細細地包裹起來，逗著孩子一起玩耍嬉鬧，一枚一枚地拆開又包上，一直陪著孩子玩到孩子迷迷糊糊睡著，這才把紅紙包著的銅錢，悄悄放在了孩子的枕頭邊上。\n\n夫妻倆雖然睏意襲來，卻也不敢大意，只是和衣靠在床邊，迷迷糊糊地打著盹。到了後半夜，一陣陰風忽然從門縫裡鑽了進來，燭光被吹得搖曳不定，「祟」果然如期而至，正伸長了雪白的手掌，要去摸孩子的額頭。\n\n說時遲那時快，就在「祟」的手掌即將碰到孩子額頭的一瞬間，孩子枕頭邊上的紅紙包裹忽然爆發出一道耀眼奪目的金光，那道光亮得刺眼，「祟」從未見過這樣的陣仗，嚇得渾身一顫，尖叫一聲，倉皇逃竄，從此再也不敢靠近這戶人家半步。',
        pinyin: '',
        translation:
          'In Jiaxing prefecture there was a couple surnamed Guan who had a son late in life and doted on him as the pearl of their palm. One New Year\'s Eve, to keep the boy from falling asleep early and suffering at Sui\'s hands, the two hit upon a plan: they took out eight copper coins, wrapped them carefully in a sheet of red paper, and played and joked with the child, unwrapping and rewrapping the coins one by one, keeping him amused until at last he drifted off. Then they quietly laid the red-wrapped coins beside his pillow.\n\nDrowsy as they were, the couple did not dare relax; they leaned against the bed fully dressed and dozed fitfully. In the small hours a chill draught came suddenly through the crack of the door, the candle flame guttered, and Sui arrived on cue, stretching out its snow-white palm towards the child\'s forehead.\n\nQuick as thought, in the instant before the palm touched the boy, the red paper packet by his pillow burst into a dazzling golden light — so bright it stung the eyes. Sui had never met such a thing, shuddered all over, gave a shriek and fled in panic, never daring to come near that house again.',
      },
      {
        chinese:
          '這件奇事很快便在鄉里間傳開了，大家這才恍然大悟，原來那八枚被紅紙包裹的銅錢，正是嚇退祟怪的法寶。此後，家家戶戶每逢除夕，都學著用紅紙包裹銅錢，放在孩子的枕邊或者衣兜裡，用來鎮壓祟怪，保佑孩子平平安安地長大。\n\n因為「祟」與「歲」二字讀音相通，這種專門用來壓制「祟」的錢，漸漸地就被人們稱為「壓歲錢」，寓意著壓住邪祟、歲歲平安，這一習俗一直流傳至今，成為春節期間長輩們表達對晚輩疼愛和祝福的方式。',
        pinyin: '',
        translation:
          'Word of this marvel spread quickly through the district, and everyone realised that the eight copper coins wrapped in red paper were the very charm that had frightened the demon off. From then on, every household learned to wrap coins in red paper each New Year\'s Eve and place them by a child\'s pillow or in a pocket, to suppress the demon and keep the child safe as it grew.\n\nBecause the words "Sui" (demon) and "sui" (year) sound alike, money used to press down the demon came to be called yasuiqian — "money that presses down the year" — carrying the sense of suppressing evil and of peace year after year. The custom survives to this day as the way elders express their affection and blessing for the young at the Spring Festival.',
      },
    ],
  },
  {
    id: 'hsk4-legend-yuanxiao',
    title: '元宵的傳說',
    titlePinyin: 'yuánxiāo de chuánshuō',
    titleEnglish: 'The Legend of the Lantern Festival',
    description: 'A homesick maid and a city full of lanterns.',
    wordCount: 559,
    collection: 'festival-legends',
    art: require('../assets/images/covers/hsk4-legend-yuanxiao.jpg'),
    hskLevel: 4,
    difficulty: 'hard',
    pages: [
      {
        chinese:
          '相傳漢武帝當政的時候，宮中有一位聰明伶俐、足智多謀的大臣，名叫東方朔，他生性詼諧幽默，深得漢武帝的信任和喜愛，時常伴在皇帝左右出謀劃策。\n\n有一年冬天，天寒地凍，大雪紛飛，東方朔像往常一樣進宮，路過御花園的時候，忽然瞧見一名年輕的宮女正淚流滿面地站在一口枯井旁邊，看樣子似乎是想要投井輕生。東方朔見狀大吃一驚，趕忙上前一把攔住了她，仔細詢問緣由。\n\n這名宮女名叫「元宵」，她自從入宮以後，便再也沒有機會與家中的父母、妹妹相見，常年思念家人，鬱鬱寡歡，眼看著又是一年新春將至，家人團聚的日子裡自己卻孤身一人被困在深宮之中，思念之情實在難以承受，才心生輕生的念頭。東方朔聽完元宵的遭遇，心中十分同情，暗暗下定決心，一定要想辦法幫助這個可憐的姑娘和家人團聚。',
        pinyin: '',
        translation:
          'It is said that in the reign of Emperor Wu of Han there was a clever and resourceful minister at court named Dongfang Shuo. Witty and humorous by nature, he enjoyed the emperor\'s deep trust and affection and was often at his side offering counsel.\n\nOne bitterly cold winter, with heavy snow falling, Dongfang Shuo entered the palace as usual. Passing the imperial garden, he suddenly saw a young palace maid standing beside a dry well with tears streaming down her face, apparently about to throw herself in. Shocked, he hurried over, stopped her, and asked carefully what was wrong.\n\nThe maid was called Yuanxiao. Since entering the palace she had had no chance to see her parents and younger sister again; she had pined for her family for years and was sunk in melancholy. With another New Year approaching — a time for families to be together — she was trapped alone deep in the palace, and the longing had become more than she could bear, which was why she had thought of ending her life. Hearing her story, Dongfang Shuo was moved to pity and resolved privately to find some way of reuniting the poor girl with her family.',
      },
      {
        chinese:
          '東方朔離開皇宮後，喬裝打扮成一位測字算命的先生，在長安城的街市上擺攤設點。不出幾日，「正月十六，火焚帝闕」的謠言便在長安城中不脛而走，說是天上的火神君將會派遣手下的赤衣神女降臨人間，於正月十五夜裡火燒長安城，百姓們人心惶惶，紛紛進宮求見皇帝，請求想辦法禳災避禍。\n\n漢武帝也被這個傳言驚動，連忙召東方朔進宮商議對策。東方朔故作神秘地獻策道：「聽聞火神君最愛吃湯圓，陛下不妨傳令京城家家戶戶在正月十五這一天都做湯圓，虔誠供奉火神；同時，讓全城的百姓在這一夜掛滿彩燈，燃放煙火，製造出滿城大火燃燒的假象，這樣一來，天上的火神君俯瞰人間，還以為長安城已經是一片火海，自然也就不會再降下災禍了。」',
        pinyin: '',
        translation:
          'Leaving the palace, Dongfang Shuo disguised himself as a fortune teller who read characters and set up a stall in the markets of Chang\'an. Within days a rumour was running through the city that "on the sixteenth of the first month, fire will burn the imperial palace" — that the God of Fire would send down his red-robed handmaiden to set Chang\'an alight on the night of the fifteenth. The people were thrown into panic and went to the palace begging the emperor to find some way to avert the disaster.\n\nAlarmed by the rumour, Emperor Wu summoned Dongfang Shuo to discuss what should be done. With an air of mystery, Dongfang Shuo offered his plan: "I hear the God of Fire loves nothing better than tangyuan. Your Majesty might order every household in the capital to make tangyuan on the fifteenth and offer them devoutly to the god. At the same time, have the whole city hang out coloured lanterns and set off fireworks that night, so as to give the impression of a city ablaze. Then when the God of Fire looks down from heaven he will think Chang\'an is already a sea of flame, and will naturally send down no disaster."',
      },
      {
        chinese:
          '漢武帝聽後，覺得這個辦法十分周全，當即傳下旨意，命長安城中家家戶戶在正月十五這一夜掛燈籠、放煙火、煮湯圓，熱熱鬧鬧地慶祝一番。到了那一天，宮女元宵也獲准提著一盞寫有自己名字的花燈出宮巡遊，趁著滿城燈火通明、人潮湧動的機會，終於與日思夜想的父母、妹妹重逢團聚，一家人喜極而泣。\n\n從這一年開始，每逢正月十五，長安城內外都會張燈結綵、煮食湯圓，「元宵節」由此得名，這一習俗歷經千百年流傳至今，寄託著人們對家人團圓、生活美滿的美好祝願。',
        pinyin: '',
        translation:
          'The emperor thought the plan thoroughly sound and at once issued an edict: on the night of the fifteenth every household in Chang\'an was to hang lanterns, let off fireworks and cook tangyuan, and celebrate in high spirits. On the day itself the palace maid Yuanxiao was permitted to carry a lantern bearing her own name out of the palace in the procession, and amid the blazing lights and surging crowds she was at last reunited with the parents and sister she had longed for, the family weeping for joy.\n\nFrom that year on, every fifteenth of the first month Chang\'an and the country around it hung out lanterns and cooked tangyuan, and the Lantern Festival — Yuanxiao Jie — took its name. A thousand years and more later the custom endures, carrying people\'s wishes for family reunion and a life of contentment.',
      },
    ],
  },
  // ---------------------------------------------------------------------------
  // HSK 5
  // ---------------------------------------------------------------------------
  {
    id: 'hsk5-tale-baixue',
    title: '白雪公主',
    titlePinyin: 'Báixuě gōngzhǔ',
    titleEnglish: 'Snow White',
    description: 'A mirror, an apple, and seven small friends.',
    wordCount: 602,
    collection: 'folk-tales',
    hskLevel: 5,
    difficulty: 'hard',
    pages: [
      {
        chinese:
          '從前有一位美麗善良的王后，在一個大雪紛飛的冬日，望著窗外飄落的雪花，不小心被針扎破了手指，鮮血滴落在潔白的雪地上，她心中默默許願：希望能擁有一個皮膚像雪一樣白皙、嘴唇像鮮血一樣紅潤、頭髮像烏木一樣烏黑的女兒。不久，她的願望成真，生下了一個女兒，取名「白雪公主」，可惜王后不久後就因病去世了。\n\n國王后來續娶了一位新王后，這位王后容貌絕美，卻心腸歹毒，異常嫉妒，她擁有一面會說話的魔鏡，時常對著鏡子問道：「魔鏡魔鏡，告訴我，誰是這世界上最美麗的女人？」魔鏡總是恭敬地回答：「尊敬的王后，您就是世界上最美麗的女人。」王后聽了心滿意足。\n\n然而隨著白雪公主漸漸長大，出落得越發標緻動人，有一天，王后再次詢問魔鏡，魔鏡卻如實回答道：「王后雖然美麗，但白雪公主比您美麗一萬倍。」王后聽後又驚又怒，妒火中燒，當即命令一名獵人把白雪公主帶到森林深處殺掉，還要求獵人帶回她的心臟作為證明。',
        pinyin: '',
        translation:
          'Once there was a beautiful, kind-hearted queen. On a winter\'s day of heavy snow, watching the flakes fall outside the window, she pricked her finger with her needle, and the blood dropped onto the pure white snow. She made a silent wish: that she might have a daughter with skin as white as snow, lips as red as blood, and hair as black as ebony. Before long her wish came true and she bore a daughter, whom she named Snow White — but sadly the queen fell ill and died not long after.\n\nThe king later took a new queen. This one was exceedingly beautiful but cruel of heart and extraordinarily jealous. She owned a magic mirror that could speak, and would often ask it: "Mirror, mirror, tell me — who is the fairest woman in all the world?" And the mirror always answered respectfully: "Honoured queen, you are the fairest in all the world." At which the queen was well satisfied.\n\nBut as Snow White grew up she became lovelier still, and one day when the queen questioned the mirror it answered truthfully: "The queen is beautiful, but Snow White is ten thousand times more beautiful than you." Shocked and furious, burning with jealousy, the queen at once ordered a huntsman to take Snow White deep into the forest and kill her, and to bring back her heart as proof.',
      },
      {
        chinese:
          '獵人帶著白雪公主走進森林，看著天真無邪的公主苦苦哀求，實在不忍心下手，便偷偷放走了她，讓她一個人躲進森林深處，自己則殺了一頭野豬，取出心臟回去交差，矇騙了王后。\n\n白雪公主孤身一人在森林裡跌跌撞撞地走了許久，又累又餓，終於發現了一座矮小精緻的小屋子，屋裡住著七個身材矮小、心地善良的矮人。他們同情白雪公主的遭遇，收留她住了下來，每天矮人們外出挖礦，公主則留在家中操持家務，日子過得平靜而溫馨。\n\n王后從魔鏡口中得知白雪公主竟然還活著，且住在七個矮人家中，怒不可遏，一連三次喬裝打扮成賣貨的老婦人，前去加害公主：第一次用漂亮的絲帶勒暈了她，被矮人們及時發現解救；第二次用毒梳子插入她的頭髮，同樣被矮人們發現解救；第三次，狠毒的王后用一顆鮮紅欲滴、外表毫無破綻的毒蘋果，騙白雪公主咬了一口。公主剛一咬下，便當場倒地，陷入了看似死亡的沉睡之中，無論矮人們怎樣呼喚都無法喚醒她。',
        pinyin: '',
        translation:
          'The huntsman led Snow White into the forest, but seeing the innocent princess plead so piteously he could not bring himself to do it. He secretly let her go, telling her to hide deep in the woods, then killed a wild boar and took its heart back to report, deceiving the queen.\n\nAlone, Snow White stumbled through the forest for a long time, tired and hungry, until at last she came upon a small, neat little house. In it lived seven kind-hearted dwarfs of small stature. They pitied her plight and took her in; each day the dwarfs went out to the mines while the princess kept house, and life was quiet and warm.\n\nWhen the mirror told the queen that Snow White was still alive and living with the seven dwarfs, she flew into a rage. Three times she disguised herself as an old pedlar woman to do the princess harm. The first time she strangled her senseless with a pretty ribbon, and the dwarfs found and revived her in time. The second time she thrust a poisoned comb into her hair, and again the dwarfs discovered and saved her. The third time the wicked queen tricked Snow White into biting a poisoned apple, red and luscious and flawless to look at. The moment she bit it the princess fell to the ground and sank into a sleep that seemed like death, and however the dwarfs called to her she could not be woken.',
      },
      {
        chinese:
          '悲痛欲絕的矮人們不忍將公主埋葬，特意打造了一口透明的水晶棺材，把她安放在森林中一處僻靜的高地上，日夜守護。恰好一位鄰國的王子經過此地，被棺材中容顏依舊、宛如沉睡的白雪公主深深打動，請求矮人們將棺材帶回自己的王國。就在搬運的過程中，不慎震動，卡在白雪公主喉嚨裡的那塊毒蘋果被震了出來，公主悠悠轉醒。\n\n王子欣喜若狂，向白雪公主表明心意，兩人很快墜入愛河，決定完婚。惡毒的王后受邀參加婚禮，得知新娘正是自己一心想要除掉的白雪公主時，又驚又怕，最終受到了應有的懲罰。白雪公主與王子從此幸福美滿地生活在一起。',
        pinyin: '',
        translation:
          'Heartbroken, the dwarfs could not bear to bury her. They made a coffin of clear crystal, laid her in it on a quiet rise in the forest, and kept watch over her day and night. It happened that a prince from a neighbouring kingdom passed that way and was deeply moved by Snow White lying there, her face unchanged as though merely asleep. He begged the dwarfs to let him take the coffin back to his own kingdom. As it was being carried, a jolt shook loose the piece of poisoned apple lodged in Snow White\'s throat, and the princess slowly woke.\n\nThe prince was overjoyed and declared his feelings to her. The two soon fell in love and resolved to marry. The wicked queen, invited to the wedding, was shocked and terrified to learn that the bride was the very Snow White she had been so determined to destroy, and in the end received the punishment she deserved. Snow White and the prince lived happily together ever after.',
      },
    ],
  },
  {
    id: 'hsk5-idiom-hujiahuwei',
    title: '狐假虎威',
    titlePinyin: 'hú jiǎ hǔ wēi',
    titleEnglish: 'The Fox Borrows the Tiger\'s Might',
    description: 'The beasts were never afraid of the fox.',
    wordCount: 526,
    collection: 'chengyu',
    art: require('../assets/images/covers/hsk5-idiom-hujiahuwei.jpg'),
    hskLevel: 5,
    difficulty: 'easy',
    pages: [
      {
        chinese:
          '戰國時期，楚國的深山老林裡住著一隻兇猛無比的老虎，它是森林中當之無愧的百獸之王，其他動物遠遠望見它的身影，無不嚇得四散奔逃，唯恐避之不及。\n\n有一天，老虎在山林間四處巡邏覓食，恰巧撞見一隻狐狸獨自在林間閒逛。老虎大喜過望，覺得今天運氣不錯，猛地縱身一躍，眼疾手快地撲了上去，將狐狸死死地按在了爪下，張開血盆大口，就要將它一口吞掉。\n\n狐狸眼見自己命懸一線，心裡又驚又怕，可是它天生狡猾，腦筋轉得飛快，急中生智，故作鎮定地對老虎說道：「且慢！你難道不知道，天帝早已經下令，派我來做百獸之王，掌管森林中的一切生靈嗎？如果你膽敢吃掉我，那就是公然違抗天帝的旨意，到時候降下天罰，你可擔待不起！」',
        pinyin: '',
        translation:
          'In the Warring States period, a tiger of matchless ferocity lived in the deep mountain forests of Chu. He was, beyond dispute, king of the beasts, and the other animals scattered in terror at the mere sight of him in the distance, unable to get away fast enough.\n\nOne day, while the tiger was on patrol through the woods in search of food, he happened upon a fox strolling alone among the trees. Delighted at his luck, the tiger sprang, pinned the fox fast beneath his paw, and opened his great jaws to swallow it whole.\n\nSeeing its life hanging by a thread, the fox was frightened — but it was cunning by nature and its mind worked fast. Feigning composure, it said to the tiger: "Wait! Do you not know that the Lord of Heaven long ago decreed that I should be king of the beasts and govern every living creature in this forest? If you dare eat me, you defy the will of Heaven itself — and when the punishment comes down, you will not be able to bear it."',
      },
      {
        chinese:
          '老虎聽了這一番話，心裡將信將疑，狐狸見老虎面露遲疑之色，便趁熱打鐵，繼續說道：「你要是不相信我說的話，那也簡單，不如你就跟在我身後，我們一起在森林裡走上一圈，你自己親眼看看，那些百獸見了我，是不是個個都嚇得望風而逃，就知道我說的是真是假了。」\n\n老虎雖然心中仍有幾分疑慮，但轉念一想，不妨依言一試，看看究竟是真是假，於是便答應了狐狸的提議。就這樣，狐狸大搖大擺、趾高氣昂地走在前面，那模樣神氣極了，老虎則不緊不慢地跟在狐狸身後，兩人一前一後走進了茂密的森林。\n\n森林裡的野獸們，無論是覓食的鹿群，還是嬉戲的野兔，抑或是林間的猴子，遠遠望見狐狸身後跟著一隻如此兇猛龐大的老虎，一個個都被嚇得魂飛魄散，紛紛丟下手中的食物，撒腿就往四面八方逃竄，生怕躲避不及，轉眼間，林間已經空無一獸。',
        pinyin: '',
        translation:
          'The tiger half believed and half doubted. Seeing hesitation in his face, the fox struck while the iron was hot: "If you do not believe me, that is easily settled. Follow behind me and we shall walk a circuit of the forest together. See with your own eyes whether the beasts do not flee at the sight of me — then you will know whether I speak the truth."\n\nStill somewhat doubtful, the tiger reflected that there was no harm in putting it to the test, and agreed. So the fox swaggered ahead, head high and looking exceedingly grand, while the tiger followed unhurriedly behind, and the two went one after the other into the thick of the forest.\n\nThe wild animals there — the grazing deer, the hares at play, the monkeys in the branches — saw from afar a fox with an enormous, ferocious tiger at its back, and were frightened out of their wits. They dropped what they were eating and bolted in every direction, terrified of not getting away in time, until in a moment there was not an animal to be seen.',
      },
      {
        chinese:
          '老虎站在原地，親眼目睹了這一幕，心中十分震驚，竟真的信以為真，以為百獸當真是被狐狸的威嚴所震懾，才嚇得四處逃竄，殊不知那些動物真正害怕、拼命躲避的物件，其實自始至終都是自己，與狐狸半點關係都沒有。老虎懵然不知真相，從此以後對狐狸也生出了幾分敬畏之心，再也不敢輕易招惹它。\n\n這個故事流傳至今，用來諷刺那些自己本身並沒有什麼真才實學，卻依仗、藉助別人的權勢和地位，到處虛張聲勢、招搖撞騙、狐假虎威的人。',
        pinyin: '',
        translation:
          'Standing there and watching it happen, the tiger was astonished, and genuinely came to believe it: the beasts really had fled in terror of the fox\'s authority. He never grasped that the thing they truly feared and were desperate to escape was, from first to last, himself — and had nothing whatever to do with the fox. Ignorant of the truth, the tiger from then on regarded the fox with a certain awe and never lightly provoked it again.\n\nThe story has been handed down ever since to mock those who have no real ability of their own but rely on borrowing the power and position of others to bluster and swindle their way about — "the fox borrowing the tiger\'s might".',
      },
    ],
  },
  {
    id: 'hsk5-idiom-yubangxiangzheng',
    title: '鷸蚌相爭',
    titlePinyin: 'yù bàng xiāng zhēng',
    titleEnglish: 'The Snipe and the Clam',
    description: 'While two of them fight, a third eats well.',
    wordCount: 628,
    collection: 'chengyu',
    art: require('../assets/images/covers/hsk5-idiom-yubangxiangzheng.jpg'),
    hskLevel: 5,
    difficulty: 'hard',
    pages: [
      {
        chinese:
          '戰國時期，趙國打算出兵討伐鄰近的燕國，這個訊息傳到了正在燕國遊說的謀士蘇代耳中。蘇代深知一旦趙燕兩國交戰，勢必兩敗俱傷，白白便宜了對兩國虎視眈眈的強大秦國，於是他星夜兼程趕往趙國，求見趙惠文王，想要勸阻這場即將爆發的戰爭。\n\n蘇代拜見趙王之後，沒有直接開口勸諫，而是不緊不慢地給趙王講起了一個故事：在河灘邊上，有一隻河蚌正張開自己堅硬的貝殼，愜意地躺在沙灘上曬著溫暖的太陽，享受著難得的悠閒時光。恰巧這時，一隻名叫鷸的水鳥從空中飛過，眼尖地瞧見了這隻張著殼的河蚌，覺得這是一頓唾手可得的美餐，便俯衝下來，伸出又長又尖的嘴巴，徑直啄向河蚌鮮嫩的肉。\n\n河蚌反應也是極快，感覺到疼痛，猛然合攏自己堅硬的雙殼，說時遲那時快，正好將鷸鳥的長嘴巴死死地夾在了中間，無論鷸鳥怎樣用力掙扎，都無法將嘴巴從蚌殼中抽出。',
        pinyin: '',
        translation:
          'In the Warring States period, the state of Zhao planned to send troops against its neighbour Yan. Word of this reached Su Dai, a strategist then arguing his case in Yan. Su Dai knew that if Zhao and Yan went to war both would be crippled, to the free advantage of the powerful state of Qin, which eyed them both hungrily. So he travelled day and night to Zhao and sought an audience with King Huiwen, meaning to head off the coming war.\n\nBrought before the king, Su Dai did not remonstrate directly but instead told him, unhurriedly, a story. On a river bank a clam lay with its hard shell open, basking pleasantly in the warm sun and enjoying a rare idle hour. Just then a water bird called a snipe flew overhead, spotted the open clam with its sharp eye, judged it an easy meal, and swooped down, stretching out its long pointed beak to peck straight at the tender flesh.\n\nThe clam reacted just as fast: feeling the pain it snapped its two hard shells shut, catching the snipe\'s long beak fast between them, and however the bird struggled it could not pull free.',
      },
      {
        chinese:
          '鷸鳥被夾得又痛又急，惡狠狠地威脅河蚌道：「你若是今天不肯放開我，明天不肯放開我，天上的太陽曬得這麼毒辣，用不了兩天，你就會被活活曬成蚌幹，看你到時候能撐多久！」河蚌絲毫沒有示弱的意思，也毫不客氣地反唇相譏：「你若是今天出不去，明天出不去，被我這樣死死地夾住嘴巴，連一滴水都喝不到，用不了兩天，你自己也會被活活餓死、憋死！」\n\n鷸鳥和河蚌就這樣你一言我一語，誰也不肯先鬆口退讓，就這樣僵持在河灘上，氣氛劍拔弩張，誰也奈何不了誰，眼看著時間一點一點過去，雙方都消耗得筋疲力盡。\n\n正在這時，恰好有一位打魚歸來的漁翁經過河灘，遠遠瞧見沙灘上這奇特的一幕，忍不住又驚又喜，快步走上前去，眼疾手快，一伸手就把仍舊死死糾纏在一起的鷸鳥和河蚌一同捉住，不費吹灰之力，一併收入了自己的魚簍之中，喜滋滋地滿載而歸。',
        pinyin: '',
        translation:
          'Pinched and desperate, the snipe threatened the clam savagely: "If you will not let go today, and will not let go tomorrow, with the sun beating down as fiercely as this, in less than two days you will be baked into a dried clam. We shall see how long you hold out then!" The clam gave not an inch and retorted just as sharply: "And if you cannot get out today, and cannot get out tomorrow, with your beak clamped fast like this and not a drop of water to drink, in less than two days you will starve and suffocate yourself!"\n\nSo the snipe and the clam traded words, neither willing to give way first, locked together on the bank with the air bristling between them and neither able to do anything about the other, while the time slipped by and both wore themselves to exhaustion.\n\nJust then an old fisherman on his way home passed along the bank, saw this curious sight from a distance, and could hardly believe his luck. He stepped up smartly, reached out and caught snipe and clam together, still gripped fast to one another, and dropped them both into his creel without the slightest effort, going home well pleased with a full load.',
      },
      {
        chinese:
          '蘇代講完這個故事，語重心長地對趙惠文王說道：「如今趙國若是執意出兵攻打燕國，兩國勢必長期交戰、相持不下，屆時國力耗損、百姓疲敝，此情此景，與那鷸蚌相爭又有什麼分別呢？臣擔心，西邊虎視眈眈的秦國，恐怕正等著坐收漁翁之利啊！」趙惠文王聽完蘇代這一番譬喻，恍然大悟，當即打消了攻打燕國的念頭。\n\n這個故事告訴我們：在雙方爭執不下、互不相讓、兩敗俱傷的時候，往往會讓隔岸觀火的第三方輕而易舉地獲得最大的利益。',
        pinyin: '',
        translation:
          'Having finished the story, Su Dai said earnestly to King Huiwen: "If Zhao now insists on attacking Yan, the two states will surely be locked in a long war of attrition. Their strength will be drained and their people worn out — and how would that differ from the snipe and the clam? I fear that Qin, watching hungrily from the west, is waiting precisely to take the fisherman\'s profit." Hearing the parable, the king saw the point at once and abandoned his plan to attack Yan.\n\nThe story tells us that when two sides are deadlocked, neither yielding and both losing, it is usually the third party watching from the far bank who walks off with the greatest gain.',
      },
    ],
  },
  {
    id: 'hsk5-idiom-yegonghaolong',
    title: '葉公好龍',
    titlePinyin: 'Yè Gōng hào lóng',
    titleEnglish: 'Lord Ye Loves Dragons',
    description: 'He adored dragons until one came to visit.',
    wordCount: 616,
    collection: 'chengyu',
    art: require('../assets/images/covers/hsk5-idiom-yegonghaolong.jpg'),
    hskLevel: 5,
    difficulty: 'easy',
    pages: [
      {
        chinese:
          '春秋時期，楚國有一位名叫沈諸梁的貴族官員，因為受封於葉地，因此人們都尊稱他為「葉公」。這位葉公平日裡酷愛龍，可以說到了如痴如醉、無以復加的地步，逢人便要提起自己對龍的仰慕之情，滔滔不絕，津津樂道。\n\n葉公家中的裝飾，幾乎處處都與龍有關：房樑上精心雕刻著盤旋騰飛的巨龍圖案，廊柱上描繪著張牙舞爪、氣勢磅礴的龍形花紋，就連日常起居所用的衣服、被褥、酒杯、器皿之上，也都繡滿或者刻畫著形態各異、栩栩如生的龍紋圖樣，整座宅院儼然成了一座名副其實的「龍宮」。\n\n葉公每每向來訪的賓客展示自己收藏和裝飾的這些龍紋器物時，總是眉飛色舞、如數家珍，反覆誇耀自己對龍是多麼地情有獨鍾、痴迷不悔，彷彿自己就是這世間獨一無二、最懂得欣賞和敬愛真龍的知音。漸漸地，葉公喜愛真龍的名聲，就這樣在楚國境內傳揚開來，人盡皆知。',
        pinyin: '',
        translation:
          'In the Spring and Autumn period there was a noble official of Chu named Shen Zhuliang. Because he had been enfeoffed with the district of Ye, people honoured him with the title Lord Ye. This Lord Ye adored dragons — to a degree that can only be called infatuation — and would tell anyone he met, at inexhaustible length and with great relish, how much he admired them.\n\nAlmost every furnishing in Lord Ye\'s house had to do with dragons: the beams were carved with great dragons coiling and soaring, the pillars painted with dragon patterns baring their claws in magnificent style, and even the clothes, bedding, wine cups and vessels of daily use were embroidered or engraved with lifelike dragons in every posture. The whole residence had become, in effect, a dragon palace.\n\nWhenever Lord Ye showed visitors his collection and his dragon-figured furnishings he was animated and eloquent, cataloguing each piece and boasting again and again of his singular, unshakeable devotion to dragons — as though he alone in all the world truly understood and revered them. In time his reputation as a lover of real dragons spread throughout Chu and became common knowledge.',
      },
      {
        chinese:
          '這件事情不知怎的，竟然傳到了天上真龍的耳朵裡。天上的真龍聽聞人間竟然有這樣一位如此摯愛自己、日夜思慕的知己，心中十分感動，暗自思忖：人間竟有如此懂得欣賞自己的人，實在難得，不如親自下凡走一趟，見一見這位一心傾慕自己的葉公，也算是不辜負他這一片痴心。\n\n於是，在一個烏雲密佈、雷電交加的日子裡，天上的真龍騰雲駕霧，徑直飛落到葉公的宅院上空，探出矯健的身軀，將龍頭從窗戶探進了葉公的屋內，長長的龍尾巴則垂落在廳堂之中，鱗光閃閃，威嚴無比。\n\n葉公正在廳堂裡悠閒地品茶，忽然抬頭瞥見這條龐然大物般的真龍探首而入，頓時嚇得魂飛魄散，臉色瞬間變得慘白如紙，手中的茶杯「哐當」一聲跌落在地，摔得粉碎。他哪裡還顧得上什麼仰慕、痴迷，驚慌失措地轉身就逃，連滾帶爬地跑出了家門，一路狂奔，甚至來不及回頭看上一眼。\n\n原來，葉公平日裡所醉心和喜愛的，不過是那些經過精雕細琢、毫無生命和威脅的假龍、死龍罷了，一旦真正有生命、有氣勢的活龍出現在眼前，他非但沒有半分欣喜和親近，反而被嚇得屁滾尿流、抱頭鼠竄，可見他所謂的「好龍」，不過是有名無實、經不起考驗的一種虛榮和做作罷了。\n\n這個故事流傳至今，用來諷刺那些嘴上說得天花亂墜、口口聲聲標榜自己喜愛或者擁護某樣事物，實際上卻是葉公好龍、名不副實，一旦事到臨頭，真正面對時卻退避三舍、經不起真正考驗的人。',
        pinyin: '',
        translation:
          'Somehow word of this reached the ears of a real dragon in heaven. Hearing that there was in the mortal world a devotee who loved and longed for him day and night, the dragon was much moved and reflected: it is a rare thing indeed to find a man who appreciates me so; I had better go down myself and meet this Lord Ye who admires me so wholeheartedly, and not disappoint such singleness of heart.\n\nSo on a day of black clouds and crashing thunder the dragon rode the mist down and settled over Lord Ye\'s residence. Stretching out its powerful body, it put its head in at the window of Lord Ye\'s room while its long tail trailed across the hall, scales glittering, awesome beyond words.\n\nLord Ye was in the hall taking tea at his leisure. Glancing up to see this colossal creature thrusting its head in, he was frightened out of his senses; his face went white as paper, and the teacup fell from his hand and shattered on the floor. All thought of admiration and devotion forgotten, he turned and fled in panic, scrambling out of the house and running without once looking back.\n\nWhat Lord Ye had doted on all along, it turned out, were finely carved dragons with no life and no menace in them. The moment a living dragon of real presence stood before him he showed not a trace of delight or affection but bolted in abject terror. His much-proclaimed "love of dragons" was nothing but vanity and affectation, empty of substance and unable to survive a test.\n\nThe story has been handed down to mock those who talk grandly and proclaim their love or support for something, but who are like Lord Ye and his dragons — reputation without substance — and who, when the moment actually comes, retreat and cannot stand any real test.',
      },
    ],
  },
  {
    id: 'hsk5-legend-zongzi',
    title: '粽子的傳說',
    titlePinyin: 'zòngzi de chuánshuō',
    titleEnglish: 'The Legend of the Rice Dumpling',
    description: 'Rice thrown into a river to protect a poet.',
    wordCount: 531,
    collection: 'festival-legends',
    art: require('../assets/images/covers/hsk5-legend-zongzi.jpg'),
    hskLevel: 5,
    difficulty: 'hard',
    pages: [
      {
        chinese:
          '屈原是戰國時期楚國著名的政治家和詩人，學識淵博，才華橫溢，一心一意輔佐楚懷王治理國家，主張對內變法圖強，對外聯合齊國共同抵禦強大的秦國，深受百姓的愛戴和擁護。\n\n然而，屈原剛正不阿的性格和銳意革新的主張，觸犯了朝中不少貴族大臣的既得利益，這些奸佞小人便時常在楚懷王面前搬弄是非，惡意中傷屈原，日子一久，楚懷王也漸漸對屈原心生猜忌，先是將他疏遠，後來更是將他一貶再貶，流放到偏遠的沅江、湘江一帶。\n\n屈原雖然身處逆境、報國無門，卻始終心繫著楚國的安危存亡，在流放期間寫下了《離騷》《九歌》等許多流傳千古的不朽詩篇，字裡行間無不傾訴著他對楚國深沉的憂慮和眷戀。',
        pinyin: '',
        translation:
          'Qu Yuan was a celebrated statesman and poet of Chu during the Warring States period — learned, brilliantly gifted, and wholly devoted to assisting King Huai in governing the state. He argued for reform and self-strengthening at home and for alliance with Qi abroad to resist the might of Qin, and was deeply loved and supported by the common people.\n\nBut his upright, uncompromising character and his zeal for reform cut across the vested interests of many nobles at court. These treacherous men constantly stirred up trouble before King Huai and maligned Qu Yuan, until in time the king grew suspicious of him — first keeping him at a distance, then demoting him again and again and finally banishing him to the remote regions of the Yuan and Xiang rivers.\n\nThough cast down and with no way to serve his country, Qu Yuan\'s heart remained with Chu\'s safety and survival. During his exile he wrote Li Sao, the Nine Songs and many other immortal poems, every line of which pours out his deep anxiety and attachment for his homeland.',
      },
      {
        chinese:
          '公元前278年，秦國大將白起率軍攻破了楚國的都城郢都，楚國國破家亡的訊息傳來，屈原悲痛欲絕，深感自己空有一腔報國之志，卻始終無法施展抱負、挽救國家於危難之中，萬念俱灰之下，他於五月初五這一天，懷抱著一塊沉重的石頭，縱身跳入了滾滾的汨羅江中，以身殉國。\n\n當地的百姓得知這位深受愛戴的詩人投江自盡的訊息後，無不悲痛萬分，紛紛自發划著船隻，爭先恐後地趕到江面上，四處打撈屈原的遺體，希望能夠找回他的遺骸，妥善安葬。人們划著船隻在江面上來來回回搜尋了許久，卻始終未能尋得屈原的遺體，這便是後來端午節賽龍舟習俗的最初由來。\n\n百姓們擔心江中的魚蝦蟹類會啃食屈原的軀體，便紛紛拿來家中的糯米，用新鮮的竹葉將糯米仔仔細細地包裹起來，捆紮結實，投入江水之中，希望魚蝦吃飽了糯米糰子，就不會再去傷害屈原的遺體了。還有些老年人則往江裡倒入雄黃酒，據說是為了迷暈蛟龍水獸，使其不敢靠近傷害屈原。\n\n從那以後，每年五月初五這一天，當地百姓都會自發地包粽子、投江祭奠，久而久之，這一習俗漸漸從沅江、湘江流域傳遍中國大江南北，成為端午節固定的傳統習俗，包粽子、賽龍舟，用以紀念這位心繫家國、憂國憂民的偉大愛國詩人屈原，這一傳統歷經兩千多年，一直延續至今。',
        pinyin: '',
        translation:
          'In 278 BC the Qin general Bai Qi took Ying, the Chu capital. When news came that the state had fallen, Qu Yuan was overcome with grief, feeling that for all his devotion he had never been able to realise his ambitions or save his country in its hour of danger. In utter despair, on the fifth day of the fifth month he clasped a heavy stone to his breast and threw himself into the rolling Miluo River, dying for his country.\n\nWhen the local people heard that the beloved poet had drowned himself, they were stricken with grief. Of their own accord they rowed out onto the river, racing one another to search everywhere for his body in the hope of recovering it and giving it proper burial. They rowed back and forth for a long time and never found him — and this was the beginning of the dragon boat races of the Duanwu festival.\n\nFearing that the fish, prawns and crabs of the river would gnaw at his body, people brought glutinous rice from their homes, wrapped it carefully in fresh bamboo leaves, bound it tight and threw it into the water, hoping that the creatures would fill themselves on the rice parcels and leave Qu Yuan alone. Some of the older people poured realgar wine into the river as well, said to stupefy the water dragons and beasts so they would not dare approach him.\n\nFrom then on, every fifth day of the fifth month the local people wrapped zongzi and cast them into the river in memorial. In time the custom spread from the Yuan and Xiang valleys across the length and breadth of China and became fixed tradition at the Duanwu festival — wrapping zongzi and racing dragon boats in memory of Qu Yuan, the great patriotic poet whose heart was with his country and its people. Two thousand years and more later, the tradition continues.',
      },
    ],
  },
  {
    id: 'hsk5-legend-yuebing',
    title: '月餅的傳說',
    titlePinyin: 'yuèbǐng de chuánshuō',
    titleEnglish: 'The Legend of the Mooncake',
    description: 'A secret message baked into a festival cake.',
    wordCount: 535,
    collection: 'festival-legends',
    art: require('../assets/images/covers/hsk5-legend-yuebing.jpg'),
    hskLevel: 5,
    difficulty: 'hard',
    pages: [
      {
        chinese:
          '元朝末年，蒙古統治者對漢族百姓實行殘酷的高壓統治，橫徵暴斂，民不聊生，各地百姓怨聲載道，反抗的情緒也在民間悄然醞釀，只等待一個合適的時機揭竿而起。\n\n當時，朱元璋正在暗中聯絡各路反抗元朝統治的起義軍首領，謀劃著共同起兵、一舉推翻元朝的殘暴統治。然而，元朝官府在各地設立了嚴密的關卡，對百姓的日常往來盤查得十分嚴格，起義軍首領們想要傳遞訊息、約定統一起兵的具體日期，實在是困難重重，稍有不慎，就會走漏風聲，招致殺身之禍。\n\n朱元璋帳下的謀士劉伯溫冥思苦想，終於想出了一個絕妙的計策：他命人制作了大批圓形的餅子，將寫有「八月十五夜，家家齊動手，共誅韃子」字樣的紙條，巧妙地藏進餅子內部的夾層之中，再透過做生意的商販，以互相饋贈節日禮品的名義，將這些餅子源源不斷地分散傳遞到各地起義軍和百姓的手中。',
        pinyin: '',
        translation:
          'In the last years of the Yuan dynasty the Mongol rulers held the Han people under harsh and oppressive rule, taxing them ruthlessly until they could barely live. Resentment was universal, and the spirit of revolt quietly gathered among the people, waiting only for the right moment to rise.\n\nAt that time Zhu Yuanzhang was secretly making contact with the leaders of the various rebel forces, planning a joint rising to overthrow the Yuan at a stroke. But the Yuan authorities had set up tight checkpoints everywhere and searched ordinary travellers rigorously, so passing messages and agreeing a common date for the rising was extremely difficult; the slightest carelessness would let word out and bring death.\n\nZhu Yuanzhang\'s strategist Liu Bowen thought long and hard and at last hit on an ingenious plan. He had a great quantity of round cakes made, with slips of paper reading "On the night of the fifteenth of the eighth month, let every household act as one and kill the Tartars" cunningly hidden in a layer inside them. Then, through travelling merchants and under the guise of exchanging festival gifts, the cakes were passed steadily out to rebels and common people across the country.',
      },
      {
        chinese:
          '各地的百姓和起義軍首領收到餅子後，小心翼翼地將餅子掰開，發現了裡面暗藏的紙條，這才明白了朱元璋的良苦用心，紛紛心領神會，暗自做好了起兵的準備，將起義的日期和訊息不動聲色地傳遞給了更多志同道合之人，整個過程做得天衣無縫，沒有引起元朝官府絲毫的懷疑和察覺。\n\n到了當年八月十五這一天夜裡，各路義軍按照約定好的時間，同時在各地舉事，一時間烽煙四起，起義的烈火迅速在中原大地蔓延開來，一舉推翻了元朝在中原地區搖搖欲墜的殘暴統治，為明朝的建立奠定了堅實的基礎。\n\n朱元璋登基稱帝、建立明朝之後，回想起當年憑藉餅子暗中傳遞起義訊息、一舉成功的往事，感慨萬千，便將這種立下大功的圓餅定為節日必備的食品，每逢中秋佳節，都要將餅子作為珍貴的賞賜，分發給朝中功臣，與民同樂，共慶勝利。\n\n由於這種圓餅象徵著闔家團圓、舉國歡慶，恰逢每年農曆八月十五中秋佳節，圓月高懸，正是家人團聚賞月的好時節，人們便將這種圓餅正式命名為「月餅」，從此中秋節吃月餅、賞圓月的習俗便流傳了下來，寓意著家人團圓美滿、生活幸福圓滿，一直延續至今，成為中國人心中最重要的傳統節日習俗之一。',
        pinyin: '',
        translation:
          'When the people and the rebel leaders received the cakes and carefully broke them open, they found the hidden slips and understood the care behind Zhu Yuanzhang\'s design. Taking the point without a word, they quietly made ready to rise and passed the date and the message on to still more of like mind. The whole operation was seamless, and roused not the least suspicion in the Yuan authorities.\n\nOn the night of the fifteenth of the eighth month that year, the rebel forces rose everywhere at the agreed hour. Beacon fires sprang up on every side, the flames of revolt spread rapidly across the Central Plain, and the tottering Yuan rule there was overthrown at a stroke, laying a firm foundation for the founding of the Ming.\n\nAfter Zhu Yuanzhang took the throne and established the Ming, he recalled with strong feeling how the cakes had carried the message and brought success, and made these meritorious round cakes an essential food of the festival. At every Mid-Autumn Festival he would distribute them as precious rewards to the meritorious officials of his court, sharing the celebration with the people.\n\nBecause the round cake symbolised the reunion of the whole family and the rejoicing of the whole country, and because the fifteenth of the eighth lunar month is the Mid-Autumn Festival, when the full moon hangs high and families gather to admire it, people formally named the cake the "mooncake". From then on the custom of eating mooncakes and admiring the full moon at Mid-Autumn was handed down, carrying the wish for family reunion and a full and happy life — one of the most important traditional festival customs in Chinese hearts to this day.',
      },
    ],
  },
  {
    id: 'hsk5-legend-zaowangye',
    title: '灶王爺的傳說',
    titlePinyin: 'Zàowángyé de chuánshuō',
    titleEnglish: 'The Legend of the Kitchen God',
    description: 'Honey on his lips before he reports to heaven.',
    wordCount: 569,
    collection: 'festival-legends',
    art: require('../assets/images/covers/hsk5-legend-zaowangye.jpg'),
    hskLevel: 5,
    difficulty: 'hard',
    pages: [
      {
        chinese:
          '在中國民間的傳統信仰中，幾乎家家戶戶的廚房裡，都會供奉著一位神通廣大的神靈，人們尊稱他為「灶王爺」，又稱「灶君」或者「司命菩薩」。傳說灶王爺是玉皇大帝派駐在每一戶人家廚房裡的監察使者，專門負責暗中觀察和記錄這一家人一年到頭的言行舉止、善惡功過，事無鉅細，一一記在心中。\n\n每年臘月二十三或者二十四，也就是民間俗稱的「小年」這一天，灶王爺都要暫時離開自己所駐守的這戶人家，返回天庭，向玉皇大帝當面彙報這一整年當中，這戶人家究竟做了哪些善事、又做了哪些惡事。玉皇大帝會根據灶王爺的詳細彙報，來決定這戶人家來年究竟是會迎來風調雨順、福星高照的好運，還是會遭遇災禍橫生、諸事不順的厄運。',
        pinyin: '',
        translation:
          'In Chinese folk belief, almost every household kitchen holds an offering to a powerful deity honoured as the Kitchen God — also called Zaojun, or the Bodhisattva of Destiny. He is said to be an inspector posted by the Jade Emperor in each family\'s kitchen, charged with quietly observing and recording everything the household says and does through the year, its good deeds and its bad, keeping every detail in mind.\n\nOn the twenty-third or twenty-fourth of the twelfth lunar month — the day popularly known as the Little New Year — the Kitchen God temporarily leaves the household he watches over and returns to heaven to report to the Jade Emperor in person on exactly what good and what evil the family has done over the year. On the strength of that detailed report the Jade Emperor decides whether the household will enjoy favourable weather and good fortune in the coming year, or meet with disaster and misfortune at every turn.',
      },
      {
        chinese:
          '百姓們深知灶王爺這一趟「述職」事關自家來年的禍福吉凶，個個都提心吊膽，生怕灶王爺在玉帝面前添油加醋地告狀，說出自家平日裡不小心犯下的過錯或者難以啟齒的家醜。於是，每年到了灶王爺昇天述職的這一天，家家戶戶都要舉行隆重的「送灶」儀式，恭恭敬敬地擺上供桌，供上又香又甜、黏糊糊的麥芽糖、糖瓜等甜食。\n\n按照民間的說法，這些又甜又黏的糖果，一方面是想用香甜的滋味討好灶王爺，讓他吃了嘴巴甜甜的，只顧著唸叨這家人的好處；另一方面，也有人詼諧地解釋，說這黏糊糊的糖瓜是故意用來粘住灶王爺的嘴巴，讓他上了天庭以後張不開嘴，說不出這家人平日裡做過的那些糊塗事和壞事來。\n\n有些地方的百姓，還會在灶王爺神像的嘴唇四周，仔仔細細地抹上一層薄薄的糖漿，一邊虔誠地叩拜，一邊口中唸唸有詞地祈禱道：「上天言好事，下界保平安」，盼望著灶王爺這一趟上天述職，能夠多多美言幾句，保佑全家老小在新的一年裡平平安安、順順利利。',
        pinyin: '',
        translation:
          'People knew very well that this report bore on their fortunes for the whole coming year, and every family was on edge, dreading that the Kitchen God might embellish his account before the Jade Emperor and mention faults carelessly committed or family shames hard to speak of. So on the day of his ascent each household held a solemn "seeing off the stove" ceremony, respectfully setting out an offering table with sweet, sticky maltose and sugar melons.\n\nBy popular account these sweet and sticky confections served two purposes. On the one hand they were meant to please the Kitchen God with their sweetness, so that with a sweet mouth he would speak only of the family\'s merits. On the other — as some explain with a wink — the sticky sugar melon was deliberately intended to gum his mouth shut, so that once in heaven he could not open it to relate the foolish or wicked things the family had done.\n\nIn some places people would even smear a thin layer of syrup carefully around the lips of the Kitchen God\'s image, and while bowing devoutly would murmur the prayer: "In heaven speak of good things; below, keep us in peace" — hoping he would put in many a good word on this trip and keep the whole household, young and old, safe and prosperous in the new year.',
      },
      {
        chinese:
          '送走灶王爺之後，一直要等到大年三十除夕夜這一天，家家戶戶又會重新張貼、供奉起嶄新的灶王爺神像，舉行隆重的「接灶」儀式，恭恭敬敬地把灶王爺重新迎接回自家的廚房，請他繼續留任，日夜守護、監督一家人的飲食起居和一言一行。\n\n這一整套「送灶」「接灶」的完整習俗，歷經千百年的傳承，至今仍然在中國不少地方的鄉村和家庭中保留著，寄託著老百姓渴望家宅平安、五穀豐登、諸事順遂的樸素美好願望。',
        pinyin: '',
        translation:
          'Having seen the Kitchen God off, families waited until New Year\'s Eve itself to put up and make offerings to a brand-new image of him, holding a solemn "welcoming the stove" ceremony to receive him respectfully back into the kitchen and ask him to stay on, guarding and overseeing the household\'s meals, daily life and every word and deed.\n\nThis complete cycle of seeing off and welcoming back has been handed down for a thousand years and more and is still kept in many villages and homes in China, carrying the plain and hopeful wishes of ordinary people for a peaceful household, abundant harvests and smooth going in all things.',
      },
    ],
  },
  {
    id: 'hsk5-legend-shousui',
    title: '守歲的由來',
    titlePinyin: 'shǒusuì de yóulái',
    titleEnglish: 'The Origin of the New Year Vigil',
    description: 'Why families sit awake together until midnight.',
    wordCount: 459,
    collection: 'festival-legends',
    art: require('../assets/images/covers/hsk5-legend-shousui.jpg'),
    hskLevel: 5,
    difficulty: 'easy',
    pages: [
      {
        chinese:
          '守歲的習俗，最早可以追溯到與兇猛的年獸相關的古老傳說。相傳「年」這種怪獸只有在每年臘月三十的除夕深夜才會出沒人間，一旦平安捱過這個夜晚，等到天光大亮，「年」獸自然就會退去，不敢再出來興風作浪、禍害百姓。正因如此，古時候的人們每逢除夕降臨，都不敢貿然閤眼睡去，唯恐「年」獸會趁著夜色，趁人不備，突然襲擊自己的家門。\n\n在那個時候，每到除夕夜晚，一大家子男女老少便會不約而同地聚攏在一起，圍坐在灶火或者油燈旁邊，屋子裡外都要點上通明的燈火，徹夜不熄，一家人有說有笑，互相陪伴，講述著過去一年當中發生的種種趣事，也互相叮囑、提醒著，要打起精神，千萬不能睡著，就這樣打著精神、強撐著睡意，一直警惕地守候到天邊泛起魚肚白，才敢稍稍鬆一口氣，安心睡去。',
        pinyin: '',
        translation:
          'The custom of staying up on New Year\'s Eve can be traced back to the old legend of the ferocious Nian beast. The monster called Nian was said to appear among people only in the depths of New Year\'s Eve, on the thirtieth of the last lunar month; once that night had been safely got through and daylight came, Nian would withdraw of its own accord and not dare come out to make trouble again. For this reason people in ancient times did not dare shut their eyes when New Year\'s Eve came round, for fear that Nian would use the cover of darkness to attack their homes while they were off guard.\n\nIn those days, on New Year\'s Eve the whole household — men and women, old and young — would gather together as one, sitting round the stove fire or the oil lamp, with bright lights burning inside and out and never allowed to go out all night. The family talked and laughed and kept one another company, telling of the amusing things that had happened over the past year, and urging and reminding one another to stay alert and on no account fall asleep. So they held out against their drowsiness, keeping watch until the sky paled at the horizon, and only then dared breathe a little easier and go to sleep in peace.',
      },
      {
        chinese:
          '隨著時間的推移，人們漸漸不再像從前那樣懼怕子虛烏有的年獸，可是這種一家人齊聚一堂、共同守夜到天明的習俗，卻並沒有因此而被廢棄遺忘，反而在漫長的歷史長河當中，被賦予了更加深厚而美好的文化內涵，漸漸演變成了一種寄託親情、祈福納祥的重要方式。\n\n在民間的傳統觀念裡，晚輩們陪伴著家中的長輩通宵守歲，被認為是能夠為父母長輩增添壽數、祈求他們健康長壽的一種孝心表現，因此這一習俗又被稱為「辭歲」；而年長的長輩們守歲，則往往懷有珍惜光陰、感慨歲月流逝的心境，藉著除夕守歲這個特別的時刻，回顧即將逝去的一年，也滿懷期待地迎接嶄新一年的到來。\n\n如今，雖然人們早已不再相信兇猛年獸的傳說，可是每逢除夕之夜，一家人圍坐在一起，熱熱鬧鬧地吃著豐盛的年夜飯，一邊觀看春節聯歡晚會的精彩節目，一邊有說有笑地聊天守候，等待著新年鐘聲敲響的那一刻，全家人互道祝福、辭舊迎新，這樣的傳統習俗依然完完整整地保留了下來，成為中國人心目中，除夕佳節裡最溫馨、最不可或缺的一部分。',
        pinyin: '',
        translation:
          'As time went on people gradually stopped fearing the imaginary Nian as they once had — yet the custom of the family gathering together and keeping watch until dawn was not abandoned or forgotten. Instead, over the long course of history it was given a deeper and finer cultural meaning, and grew into an important way of expressing family feeling and praying for blessings.\n\nIn traditional folk thinking, for the young to keep watch through the night beside their elders was held to add years to the parents\' lives and to be an expression of filial devotion praying for their health and longevity — which is why the custom is also called "seeing out the year". For the elders, keeping watch was often coloured by a sense of treasuring time and reflecting on its passing, using this special moment of New Year\'s Eve to look back on the year now ending and to look forward with anticipation to the one about to begin.\n\nToday, although nobody believes any longer in the ferocious Nian, on every New Year\'s Eve the family still sits down together to a lavish reunion dinner, watches the Spring Festival gala, chats and laughs and keeps watch for the moment the New Year bell sounds, when everyone exchanges good wishes and sees the old year out and the new one in. The tradition has been preserved intact, and remains for Chinese people the warmest and most indispensable part of the New Year\'s Eve festival.',
      },
    ],
  },
  {
    id: 'hsk5-legend-chunlian',
    title: '桃符與春聯的由來',
    titlePinyin: 'táofú yǔ chūnlián de yóulái',
    titleEnglish: 'From Peach Charms to Spring Couplets',
    description: 'How red paper replaced peachwood at the door.',
    wordCount: 605,
    collection: 'festival-legends',
    hskLevel: 5,
    difficulty: 'hard',
    pages: [
      {
        chinese:
          '相傳在東海之上，有一座名叫度朔山的仙山，山上生長著一株枝繁葉茂、綿延盤曲長達三千里的巨大桃樹。桃樹的東北方向，有一道由樹枝天然彎曲而成的門戶，被稱為「鬼門」，是天下所有的鬼怪出入必經的通道。桃樹下面，居住著兩位神通廣大的神仙，一位名叫神荼，另一位名叫鬱壘，他們二人肩負著看守鬼門、稽查往來鬼怪的重要職責。\n\n每當天底下的惡鬼在人間胡作非為、為禍百姓的訊息傳到二位神仙耳中，神荼和鬱壘便會立刻現身，將這些興風作浪的惡鬼一一捉拿歸案。他們會用堅韌的蘆葦繩索，把捉到的惡鬼牢牢捆綁起來，隨後將其送去餵食一旁鎮守的老虎，使其再也無法在人間興風作浪、危害生靈。',
        pinyin: '',
        translation:
          'It is said that out on the Eastern Sea stands an immortal mountain called Dushuo, on which grows an enormous peach tree, luxuriantly branched and winding for three thousand li. To the north-east of the tree is a gateway formed naturally by the curve of its branches, known as the Ghost Gate — the passage through which every ghost and demon in the world must come and go. Beneath the tree live two deities of great power, one named Shen Tu and the other Yu Lei, whose duty it is to guard the Ghost Gate and inspect the spirits passing through.\n\nWhenever word reached them that malevolent ghosts were running riot among the living and bringing harm to the people, Shen Tu and Yu Lei would appear at once and arrest every troublemaker. They bound the captured ghosts fast with tough reed ropes and then fed them to the tiger standing guard nearby, so that they could never again stir up trouble or endanger living creatures.',
      },
      {
        chinese:
          '這個古老的傳說漸漸在民間流傳開來，百姓們對神荼、鬱壘二位神仙鎮壓惡鬼的威嚴深信不疑，紛紛想方設法藉助他們的神力來庇佑自家宅院的平安。於是，人們便就地取材，用桃木精心雕刻成神荼、鬱壘二位神仙手持兵器、威風凜凜的模樣，恭恭敬敬地懸掛在自家大門的兩側；一些沒有條件精雕細琢的普通百姓，則簡單地在兩塊桃木板上，分別寫下「神荼」「鬱壘」二位神仙的名諱，同樣懸掛於門戶兩旁，這種桃木製成的門飾，被稱為「桃符」，寓意著驅邪避兇、鎮宅安宅。\n\n時光飛逝，轉眼到了五代十國時期，後蜀國的末代君主孟昶別出心裁，在除夕這一天，命人在桃符木板上，題寫下「新年納餘慶，嘉節號長春」這樣兩句寓意吉祥、對仗工整的詩句，用來代替原本單純書寫神荼、鬱壘名諱的桃符，這被後世公認為中國歷史上有明確記載的第一副真正意義上的春聯。',
        pinyin: '',
        translation:
          'This ancient legend spread among the people, who believed implicitly in the two deities\' power to suppress evil spirits and looked for ways to borrow it to keep their own homes safe. Using what was at hand, they carved figures of Shen Tu and Yu Lei from peachwood, weapons in hand and awe-inspiring in bearing, and hung them respectfully on either side of the gate. Ordinary people without the means for fine carving simply wrote the two gods\' names on a pair of peachwood boards and hung those beside the door instead. These peachwood door ornaments were called taofu, and were meant to drive off evil and keep the household secure.\n\nTime passed, and by the Five Dynasties period Meng Chang, last ruler of Later Shu, had an original idea: on New Year\'s Eve he had two auspicious, neatly parallel lines of verse inscribed on the peachwood boards — "The new year receives abundant blessings; the fine festival is named Everlasting Spring" — in place of the plain names of the two gods. Later ages recognise this as the first true spring couplet clearly recorded in Chinese history.',
      },
      {
        chinese:
          '這一別開生面的創舉很快受到了世人的爭相效仿，人們逐漸意識到，與其只是單純地書寫神仙的名字來震懾鬼怪，倒不如藉著桃符這塊小小的門飾，題寫一些辭舊迎新、祈福納祥、寓意美好的吉慶詩句，如此一來，既能沿襲驅邪避兇的傳統寓意，又能表達對新一年的殷切期盼和美好祝福，可謂一舉兩得。\n\n到了明清時期，造價相對昂貴、書寫不便的桃木板，逐漸被物美價廉、書寫方便的紅紙所取代，因為紅色本身在傳統文化裡也帶有喜慶吉祥、驅邪避兇的寓意，與桃木的功用不謀而合，「春聯」這一稱呼也由此正式確定下來，並伴隨著家家戶戶張貼對聯、辭舊迎新的習俗，一直流傳至今，成為中國人歡度春節不可或缺的重要傳統之一。',
        pinyin: '',
        translation:
          'This novel departure was quickly and eagerly imitated. People came to see that rather than merely writing the gods\' names to frighten off spirits, it was better to use the small door ornament to inscribe auspicious verses about sending out the old and welcoming the new, praying for blessings and good fortune. That way the traditional sense of warding off evil was preserved while earnest hopes and good wishes for the coming year could also be expressed — two ends served at once.\n\nBy the Ming and Qing dynasties the relatively costly and awkward peachwood boards were gradually replaced by red paper, which was cheap, attractive and easy to write on — and red itself already carried associations of celebration, good fortune and the warding off of evil, coinciding neatly with the function of peachwood. The name "spring couplet" was formally settled at this point, and along with the custom of every household pasting up couplets to see out the old year and welcome the new it has come down to the present as one of the indispensable traditions of the Chinese Spring Festival.',
      },
    ],
  },
  // ---------------------------------------------------------------------------
  // HSK 6 — classical myths, the longest and most literary of the set.
  // ---------------------------------------------------------------------------
  {
    id: 'hsk6-myth-jingweitianhai',
    title: '精衛填海',
    titlePinyin: 'Jīngwèi tián hǎi',
    titleEnglish: 'Jingwei Fills the Sea',
    description: 'A small bird carries stones against the ocean.',
    wordCount: 594,
    collection: 'classical-myths',
    art: require('../assets/images/covers/hsk6-myth-jingweitianhai.jpg'),
    hskLevel: 6,
    difficulty: 'hard',
    pages: [
      {
        chinese:
          '上古時期，天下共主炎帝有一個備受疼愛的小女兒，名叫女娃，生得聰慧靈秀，性情天真活潑，深得炎帝的喜愛和呵護，是炎帝膝下的掌上明珠。\n\n女娃自幼便對浩瀚無邊的大海充滿了濃厚的好奇心和嚮往之情，時常纏著身邊的侍從，講述關於東海的種種奇聞異事，一心盼望著有朝一日，能夠親眼見識一下那片傳說中廣闊無垠、波濤洶湧的大海。\n\n有一天，女娃趁著炎帝忙於處理部族事務，無暇顧及自己，便瞞著家人，獨自一人悄悄地駕著一葉小舟，興致勃勃地向著東海的方向劃去，一心想要親身領略大海的壯闊景象，圓自己多年以來的心願。',
        pinyin: '',
        translation:
          'In high antiquity the Yan Emperor, sovereign of all under heaven, had a dearly loved youngest daughter named Nüwa. She was clever and graceful, artless and lively by nature, deeply cherished and protected by her father, the pearl of his palm.\n\nFrom childhood Nüwa was filled with intense curiosity and longing for the boundless sea. She would pester the attendants around her to tell her strange tales of the Eastern Sea, hoping with all her heart that one day she might see with her own eyes that vast and surging ocean of legend.\n\nOne day, while the Yan Emperor was busy with the affairs of the tribe and had no time to attend to her, Nüwa slipped away without telling her family, took a small boat alone and rowed eagerly towards the Eastern Sea, determined to experience its magnificence for herself and fulfil the wish of years.',
      },
      {
        chinese:
          '誰知女娃剛剛劃到東海之上，海面上忽然狂風大作，烏雲密佈，原本還算平靜的海面，轉瞬之間便掀起了滔天巨浪，一浪高過一浪，兇猛地朝著女娃乘坐的這葉小舟拍打而來。女娃畢竟只是一個不諳世事的年幼女孩，哪裡經歷過這樣驚濤駭浪的場面，小舟在巨浪的衝擊之下瞬間傾覆，年幼的女娃就這樣不幸地被無情的海浪捲入了深不見底的海水之中，還沒有來得及呼救，便溺水身亡，年紀輕輕就永遠離開了這個世界，再也沒能回到父親炎帝的身邊。\n\n女娃雖然身死，可是她心中那份對生命戛然而止的不甘和怨恨卻始終縈繞不散，久久無法釋懷，她的精魂並沒有就此消散，而是化作了一隻花腦袋、白色的鳥喙、紅色的腳爪，外形十分小巧玲瓏的鳥兒。這隻鳥兒的叫聲淒厲婉轉，聽起來彷彿是在一聲一聲地呼喚著自己的名字「精衛、精衛」，因此人們便把這隻由女娃精魂所化的鳥兒，稱為「精衛鳥」。',
        pinyin: '',
        translation:
          'But no sooner had she rowed out onto the Eastern Sea than a gale sprang up and black clouds gathered. The water, calm enough until then, threw up towering waves in an instant, each higher than the last, beating fiercely against her little boat. Nüwa was after all only a young girl who knew nothing of the world and had never faced such seas; the boat capsized under the force of the waves, and the child was swept by the pitiless water into fathomless depths. Before she could even cry for help she drowned — leaving the world for ever while still so young, never to return to her father\'s side.\n\nThough her body died, the unwillingness and resentment in her heart at a life cut short did not disperse. Her spirit did not scatter but turned into a bird — a small, delicate creature with a mottled head, a white beak and red claws. Its cry was piercing and plaintive, and sounded as though it were calling its own name over and over: "Jingwei, Jingwei". So people called the bird her spirit had become the Jingwei bird.',
      },
      {
        chinese:
          '精衛因為始終無法忘卻大海奪去自己年輕生命的深仇大恨，從此便發下了一個近乎不可能實現的宏願：她要想盡辦法，將這片吞噬了自己生命的浩瀚東海徹底填平，絕不能再讓大海繼續無情地奪走其他無辜生靈的性命。從那時起，精衛鳥便日復一日、年復一年，不辭辛勞地飛往遙遠的西山，用她那小小的鳥喙，一次又一次地銜來一根根細小的樹枝，一顆顆堅硬的石子，義無反顧地飛越千山萬水，將這些樹枝和石子，一趟又一趟地投入波濤洶湧的東海之中。\n\n任憑東海的波濤如何浩瀚無邊、煙波浩渺，任憑自己的力量是多麼的渺小和微不足道，精衛始終沒有因此而氣餒退縮，也從未有過絲毫放棄的念頭，就這樣日復一日、堅持不懈地銜木填海，成為了中國古代神話傳說當中，堅韌不拔、百折不撓精神的一座不朽豐碑。',
        pinyin: '',
        translation:
          'Unable ever to forget the bitter wrong the sea had done in taking her young life, Jingwei made a vow that was all but impossible to fulfil: she would find a way to fill in the vast Eastern Sea that had swallowed her, so that it could never again carry off the lives of other innocent creatures. From that time on, day after day and year after year, the Jingwei bird flew tirelessly to the distant western mountains, and with her tiny beak carried back, one at a time, slender twigs and hard pebbles, crossing a thousand mountains and rivers without hesitation to drop them, trip after trip, into the surging Eastern Sea.\n\nHowever boundless the sea, however vast its misty expanse, and however small and insignificant her own strength, Jingwei never grew disheartened or drew back, and never for a moment thought of giving up. Carrying wood to fill the sea, day after day and without relenting, she became an enduring monument in Chinese myth to perseverance and to a spirit that will not be broken.',
      },
    ],
  },
  {
    id: 'hsk6-myth-houyisheri',
    title: '后羿射日',
    titlePinyin: 'Hòu Yì shè rì',
    titleEnglish: 'Hou Yi Shoots the Suns',
    description: 'Ten suns scorch the earth, and nine must fall.',
    wordCount: 582,
    collection: 'classical-myths',
    art: require('../assets/images/covers/hsk6-myth-houyisheri.jpg'),
    hskLevel: 6,
    difficulty: 'hard',
    pages: [
      {
        chinese:
          '上古時期，天帝帝俊與太陽女神羲和結為夫妻，二人共同孕育了十個太陽，這十個金烏化身的太陽兄弟，平日裡都棲息在東方海外一棵名叫「扶桑」的參天神樹之上，按照天規，兄弟十人每天輪流值守，依次駕著太陽車升上天空，為大地送去光明和溫暖，因此人間自古以來都只有一個太陽照耀，晝夜交替，四季分明，風調雨順。\n\n然而，天長日久，這十個年幼貪玩的太陽兄弟漸漸厭倦了這般按部就班、輪流當值的枯燥生活，終於在某一天，十兄弟一時興起，不顧天規的約束，竟然一同駕車騰空而起，同時出現在了天空之上。十個火球一般熾熱的太陽同時高懸於天，釋放出的滾滾熱浪瞬間籠罩了整個大地，江河湖泊被生生炙烤乾涸，土地龜裂得如同龜殼一般，莊稼作物在酷烈的暴曬下枯萎焦黑，山林之中更是燃起了熊熊大火，人間頓時變成了一片赤地千里、生靈塗炭的人間煉獄，百姓們叫苦連天，痛苦不堪，眼看著就要走投無路。',
        pinyin: '',
        translation:
          'In high antiquity the heavenly emperor Dijun married Xihe, goddess of the sun, and together they brought forth ten suns. These ten brothers, incarnations of the golden crow, roosted in a towering sacred tree called Fusang beyond the eastern sea. By the law of heaven the ten took turns, each in his day driving the sun chariot up into the sky to bring light and warmth to the earth. So from ancient times only one sun ever shone on the world, day alternated with night, the four seasons were distinct and the weather favourable.\n\nBut as the years went by the ten young and playful brothers grew bored with this orderly, monotonous rota, and one day, on a whim and heedless of the law of heaven, all ten drove their chariots up together and appeared in the sky at once. Ten suns blazing like fireballs hung high together, and the rolling waves of heat they gave off engulfed the whole earth in a moment. Rivers and lakes were scorched dry, the ground cracked like a tortoise shell, crops withered and blackened under the merciless glare, and great fires broke out in the mountain forests. The world became a scorched wasteland and a living hell, with the people crying out in a misery beyond bearing and no way out in sight.',
      },
      {
        chinese:
          '天帝帝俊得知人間遭此浩劫，也深感憂慮不安，於是派遣了本領高強、擅長射箭的天神后羿下凡人間，希望他能夠想辦法懲戒教訓這十個不知天高地厚的太陽兄弟，恢復人間往日的安寧與秩序。后羿領命來到人間，眼見大地已經被烈日炙烤得滿目瘡痍、民不聊生，心中又是震驚又是憤怒，當即下定決心，一定要為受苦受難的百姓們討回一個公道。\n\n后羿登上巍峨的高山之巔，從背後取下神弓，抽出利箭，運足力氣，對準天空中肆虐橫行的太陽，接連不斷地拉弓射箭。只見他每射出一箭，天空中便應聲墜落下來一個金烏太陽，如同燒紅的火球一般，拖著長長的火焰尾跡墜落大地。后羿一口氣射落了整整九個太陽，眼看著他還要拉弓射向最後一個太陽，幸而人間的天子及時出面阻攔勸說，后羿這才罷手，特意留下了一個太陽，讓它按照原有的規律，繼續按時升起降落，為大地帶來不可或缺的光明和溫暖，而不再帶來毀滅性的災難。',
        pinyin: '',
        translation:
          'When Dijun learned of the catastrophe on earth he too was deeply troubled, and sent down the god Houyi, a man of great powers and a master archer, in the hope that he could chastise and teach a lesson to the ten presumptuous brothers and restore peace and order below. Arriving on earth and seeing the land scorched to ruin and the people unable to live, Houyi was both shocked and enraged, and resolved at once to win justice for the suffering multitude.\n\nHouyi climbed to the summit of a towering mountain, took the divine bow from his back, drew out his sharp arrows, and with all his strength loosed shot after shot at the suns raging overhead. With every arrow a golden crow sun fell from the sky, plunging to earth like a red-hot fireball trailing a long tail of flame. Houyi brought down nine suns in a single spell of shooting, and was about to draw on the last when the sovereign of the human world intervened in time to stop and dissuade him. Houyi then held his hand and deliberately left one sun, so that it might rise and set on its old schedule and bring the earth the light and warmth it could not do without, without bringing ruin with it.',
      },
      {
        chinese:
          '自此以後，天空恢復了往日風調雨順的正常秩序，乾涸的江河重新恢復了奔湧的流水，龜裂的大地也漸漸恢復了生機，枯死的莊稼重新抽出了嫩綠的新芽，飽受苦難的黎民百姓終於擺脫了滅頂之災，重新過上了安居樂業的太平日子。后羿也因為這次拯救蒼生、造福萬民的壯舉，被人間世世代代的百姓們奉為頂天立地的蓋世英雄，他射日的傳奇事蹟，也在中華大地上代代相傳，經久不衰。',
        pinyin: '',
        translation:
          'From then on the sky returned to its old order of favourable weather. The dried-up rivers ran full again, the cracked earth slowly came back to life, withered crops put out tender green shoots, and the long-suffering people escaped the disaster that had threatened to overwhelm them and returned to lives of peace and settled work. For this feat of saving the world and benefiting the multitude, Houyi was honoured by generation after generation as a hero of towering stature, and the legend of his shooting down the suns has been handed down across China ever since, undimmed by time.',
      },
    ],
  },
  {
    id: 'hsk6-myth-changebenyue',
    title: '嫦娥奔月',
    titlePinyin: 'Cháng\'é bēn yuè',
    titleEnglish: 'Chang\'e Flies to the Moon',
    description: 'The beautiful legend of Chang\'e and the moon.',
    wordCount: 624,
    collection: 'classical-myths',
    art: require('../assets/images/covers/hsk6-myth-changebenyue.jpg'),
    hskLevel: 6,
    difficulty: 'hard',
    pages: [
      {
        chinese:
          '后羿憑藉高超的箭術，射落九個為禍人間的太陽，拯救了天下蒼生，立下了不世之功，因此受到了西王母娘娘的賞識和垂青。西王母特意將自己珍藏多年、據說服食之後便能即刻飛昇成仙、長生不老的仙丹妙藥，賞賜給了后羿，以此嘉獎他這番拯救人間的蓋世功勳。\n\n后羿得到這包來之不易的長生仙藥之後，心裡卻犯起了難：他深愛自己的妻子嫦娥，二人夫妻情深，恩愛有加，他實在捨不得獨自一人吞下仙藥、昇天成仙，從此與心愛的妻子陰陽兩隔、天人永別。經過反覆思量，后羿最終決定，將這包珍貴無比的仙藥暫時交給嫦娥妥善保管，兩人商議著挑選一個良辰吉日，夫妻二人一同分食這包仙藥，如此便可以一起長生不老、白頭偕老，永不分離。',
        pinyin: '',
        translation:
          'Having shot down the nine suns that were destroying the world and saved all living things, Houyi had performed a feat without parallel, and won the regard and favour of the Queen Mother of the West. She bestowed on him an elixir she had treasured for many years, said to make whoever swallowed it ascend at once as an immortal and live for ever, as a reward for this supreme service to the world.\n\nBut once he had this hard-won elixir of immortality, Houyi found himself in difficulty. He loved his wife Chang\'e deeply; the two were devoted to each other, and he could not bear to swallow the elixir alone, ascend as an immortal and be parted from her for ever across the divide between the living and the divine. After long reflection he decided to entrust the precious elixir to Chang\'e for safekeeping, and the two agreed to choose an auspicious day when husband and wife would share it — so that they might both live for ever, grow old together and never be parted.',
      },
      {
        chinese:
          '嫦娥將這包仙藥小心翼翼地珍藏在家中一個隱秘的百寶匣之中，誰知這件事情不知怎地，竟然被后羿的一名心術不正的徒弟蒙逄探知了訊息。這名徒弟平日裡就對師傅心懷嫉妒，得知仙藥的下落之後，便動起了歪心思，一心盤算著要將這包仙藥據為己有，自己偷偷服下，好獨享長生不老的殊榮。\n\n某一天，后羿恰巧率領眾徒弟外出狩獵，唯獨將蒙逄一人留在了家中。蒙逄見機會難得，便手持利劍，氣勢洶洶地闖入后羿家中，威逼嫦娥立刻交出仙藥，否則便要痛下殺手。嫦娥自知勢單力薄，根本無法與手持利劍的蒙逄正面抗衡，眼看仙藥即將落入這個心懷不軌之人的手中，情急之下，嫦娥當機立斷，轉身開啟百寶匣，抓起仙藥，義無反顧地一口全部吞了下去。',
        pinyin: '',
        translation:
          'Chang\'e hid the elixir carefully in a concealed treasure casket at home. Somehow, however, word of it reached Feng Meng, a disciple of Houyi\'s of crooked character. He had long been jealous of his master, and once he knew where the elixir was he began scheming to seize it for himself, swallow it in secret and enjoy immortality alone.\n\nOne day Houyi happened to lead his disciples out hunting, leaving Feng Meng alone at home. Seeing his chance, Feng Meng burst into the house sword in hand and menacingly demanded that Chang\'e hand the elixir over at once, or he would kill her. Knowing herself alone and weak, and quite unable to face an armed man, and seeing the elixir about to fall into the hands of one with such designs, Chang\'e made up her mind on the instant: she turned, opened the casket, snatched up the elixir and swallowed the whole of it without hesitation.',
      },
      {
        chinese:
          '仙藥下肚之後，嫦娥頓時感覺到自己的身體變得越來越輕盈，雙腳漸漸離開了地面，身不由己地緩緩飄離窗戶，一直向著高高的夜空飄去。嫦娥心中雖然萬分不捨，卻也無法抗拒仙藥的神奇力量，只能眼含熱淚，一路飄向浩瀚的星空，最終落在了距離人間最近的月宮之上，從此長居在廣寒宮中，終日與一隻搗藥的玉兔相依為伴，孤獨地遙望著自己深愛卻再也無法相見的丈夫和故土人間。\n\n后羿打獵歸來，得知妻子已經身不由己地飛昇上了月宮，心中悲痛萬分，肝腸寸斷，卻已經無力迴天，只能常常在皓月當空、月圓人圓的夜晚，擺上妻子生前最愛吃的瓜果糕點，遙遙地對著天上的明月焚香祭拜，寄託自己對妻子綿綿不絕的思念之情。這個悽美動人的傳說漸漸在民間流傳開來，中秋佳節賞月、拜月的習俗，也由此而生，代代相傳，綿延至今。',
        pinyin: '',
        translation:
          'The moment the elixir was down, Chang\'e felt her body growing lighter and lighter. Her feet left the ground, and against her will she drifted slowly out of the window and up towards the high night sky. Bitterly unwilling as she was, she could not resist the elixir\'s power, and with tears in her eyes she floated up into the vast starry heavens, coming at last to rest on the moon palace, nearest of all places to the human world. There she dwelt ever after in the Palace of Great Cold, her only companion a jade rabbit pounding medicine, gazing lonely across the distance at the husband and the homeland she loved and could never see again.\n\nReturning from the hunt and learning that his wife had ascended to the moon against her will, Houyi was overwhelmed with grief; but nothing could undo it. He could only, on nights when the bright moon hung full, set out the fruits and cakes his wife had loved best and burn incense in worship towards the distant moon, giving expression to a longing for her that never ended. This beautiful and sorrowful legend spread among the people, and from it arose the Mid-Autumn customs of admiring and worshipping the moon, handed down from generation to generation to the present day.',
      },
    ],
  },
  {
    id: 'hsk6-myth-niulangzhinv',
    title: '牛郎織女',
    titlePinyin: 'Niúláng Zhīnǚ',
    titleEnglish: 'The Cowherd and the Weaver Girl',
    description: 'Parted by a river of stars, joined once a year.',
    wordCount: 746,
    collection: 'classical-myths',
    art: require('../assets/images/covers/hsk6-myth-niulangzhinv.jpg'),
    hskLevel: 6,
    difficulty: 'hard',
    pages: [
      {
        chinese:
          '相傳很久以前，人間有一個心地善良、勤勞樸實的青年，名叫牛郎。牛郎自幼父母雙亡，一直寄住在哥哥嫂嫂家中，誰知嫂嫂為人刻薄自私，對牛郎百般虐待刁難，最終竟將牛郎狠心地趕出家門，分家的時候，也只分給了他一頭又老又瘦的老牛，任由他自生自滅。\n\n牛郎雖然身世悽苦，卻始終勤懇善良，毫無怨言地獨自搭建茅屋、開墾荒地，與那頭老牛相依為命，日子過得清貧卻也算安穩。誰知這頭看似普通的老牛，其實是天上的金牛星君觸犯天條、被貶下凡歷劫的化身，老牛見牛郎心地純良、勤勞能幹，便時常在暗中出言指點，幫助牛郎渡過了不少難關。\n\n天上有一位美麗善良、心靈手巧的仙女，名叫織女，是玉皇大帝和王母娘娘的孫女，終日在天庭為天上編織絢麗多彩的雲錦，雖然身處繁華的天庭，卻始終厭倦這種一成不變、拘謹刻板的生活，一心向往人間自由自在的煙火人情。',
        pinyin: '',
        translation:
          'Long ago, it is said, there lived in the mortal world a kind-hearted, hard-working and honest young man called the Cowherd. Orphaned as a child, he had lived with his elder brother and sister-in-law; but the sister-in-law was mean and selfish, ill-treated him in every way, and in the end had him driven out of the house. When the property was divided he was given nothing but one old, thin ox and left to fend for himself.\n\nHard as his lot was, the Cowherd remained diligent and good-natured. Without complaint he built himself a thatched hut and broke new ground, living with the old ox as his only companion — poor, but settled enough. What he did not know was that this apparently ordinary ox was in fact the incarnation of the Golden Ox Star Lord, banished from heaven to suffer among mortals for breaking its laws. Seeing the Cowherd\'s pure heart and willing hands, the ox often gave him quiet guidance and helped him through many difficulties.\n\nIn heaven there was a beautiful, kind and deft immortal maiden called the Weaver Girl, granddaughter of the Jade Emperor and the Queen Mother, who spent her days weaving brilliant cloud brocade for the heavens. For all the splendour around her, she was weary of that unchanging, stiffly formal life and longed for the free and human warmth of the mortal world.',
      },
      {
        chinese:
          '有一天，織女與其他幾位仙女相約下凡，來到人間一處清澈的河邊沐浴嬉戲，暫時享受人間難得的自由和快樂。老牛得知這一訊息，便悄悄地將此事告知了牛郎，並且鼓勵他趁機偷偷藏起織女的天衣，如此一來，織女便無法飛回天庭，二人便能就此結為夫妻。牛郎依言而行，趁織女沐浴之際，悄悄藏起了她的天衣。沐浴嬉戲結束之後，其他仙女紛紛穿上天衣飛回了天庭，唯獨織女找不到自己的衣裳，無法飛返天庭，幾番周折之下，便與前來相助、老實憨厚的牛郎相識相知，二人漸生情愫，織女感念牛郎的真心，甘願留在人間，與牛郎結為夫妻，過起了男耕女織、恩愛和睦的人間生活，婚後不久，二人還生下了一對可愛的兒女，一家人其樂融融，日子過得幸福美滿。\n\n天庭這邊，玉皇大帝和王母娘娘得知織女私自下凡、擅自婚配凡人的訊息後，勃然大怒，認為這有辱天庭威嚴，絕不能容忍，當即派遣天兵天將下凡，強行將織女捉拿押解回天庭受罰，硬生生拆散了這對恩愛夫妻。',
        pinyin: '',
        translation:
          'One day the Weaver Girl and several other immortal maidens agreed to go down to earth, coming to a clear river to bathe and play and enjoy for a while the freedom rarely to be had in heaven. Learning of this, the old ox quietly told the Cowherd and urged him to seize the chance and hide the Weaver Girl\'s celestial robe: without it she could not fly back to heaven, and the two might then be married. The Cowherd did as he was told and hid her robe while she bathed. When the bathing was over the other maidens put on their robes and flew back to heaven, but the Weaver Girl could not find her clothes and could not return. After some turns of events she came to know the honest, unassuming Cowherd who had come to her aid; feeling grew between them, and touched by his sincerity she was willing to stay in the mortal world and marry him. They lived as man ploughing and wife weaving, loving and harmonious, and not long after the wedding a son and daughter were born to them, the family together in contentment and happiness.\n\nIn heaven, however, when the Jade Emperor and the Queen Mother learned that the Weaver Girl had gone down to the mortal world without leave and married a mortal on her own authority, they flew into a rage. This was an affront to the dignity of heaven and could not be tolerated. They sent heavenly troops down at once to seize her by force and escort her back to heaven for punishment, tearing the devoted couple apart.',
      },
      {
        chinese:
          '牛郎眼見妻子被天兵天將強行帶走，心急如焚，情急之下，披上了老牛臨死前叮囑他留下的牛皮，一瞬間竟能騰雲駕霧，他挑起一副擔子，將一雙年幼的兒女分別放入籮筐兩頭，拼盡全力朝著天空追趕而去，眼看就要追上織女，與她重聚。就在這千鈞一髮之際，心狠手辣的王母娘娘拔下頭上的金簪，隨手朝著二人中間用力一劃，霎時間，一道波濤洶湧、深不見底的天河憑空出現，硬生生地將牛郎和織女永遠阻隔在了天河兩岸，任憑二人隔河相望、痛哭流涕，也始終無法跨越這道天塹，團聚在一起。\n\n牛郎織女這份忠貞不渝的深厚情誼，深深打動了人間無數的喜鵲。此後，每逢農曆七月初七這一天夜裡，天下所有的喜鵲都會不約而同地飛上天河，用自己的身軀搭建起一座橫跨天河兩岸的「鵲橋」，讓牛郎織女得以踏過鵲橋，短暫相會，傾訴一年來的相思之苦。從此，七月初七便被人們稱為「七夕節」，成為中國民間流傳最為廣泛、寄託著忠貞愛情美好祝願的傳統節日。',
        pinyin: '',
        translation:
          'Seeing his wife carried off by the heavenly troops, the Cowherd was frantic. In desperation he threw on the ox hide the old ox had told him to keep before it died, and found at once that he could ride the clouds. He took up a carrying pole, set his two small children in baskets at either end, and gave chase into the sky with all his strength, until he had almost caught up with her and they were about to be reunited. At that critical instant the ruthless Queen Mother drew the golden hairpin from her head and slashed it hard through the air between them. In a flash a surging, fathomless celestial river appeared out of nothing, separating the Cowherd and the Weaver Girl on opposite banks for ever; and though they gazed across it and wept, they could never cross that gulf to be together.\n\nThe unwavering devotion of the Cowherd and the Weaver Girl moved countless magpies on earth. From then on, every year on the seventh night of the seventh lunar month, all the magpies under heaven fly up to the celestial river as one and build with their own bodies a "magpie bridge" spanning it, so that the two may cross for a brief meeting and pour out a year\'s worth of longing. Since then the seventh of the seventh month has been called the Qixi Festival, the most widely observed of Chinese folk festivals and the one that carries the wish for faithful love.',
      },
    ],
  },
  {
    id: 'hsk6-idiom-yugongyishan',
    title: '愚公移山',
    titlePinyin: 'Yúgōng yí shān',
    titleEnglish: 'The Foolish Old Man Moves the Mountains',
    description: 'One basket of earth at a time, for generations.',
    wordCount: 791,
    collection: 'chengyu',
    art: require('../assets/images/covers/hsk6-idiom-yugongyishan.jpg'),
    hskLevel: 6,
    difficulty: 'hard',
    pages: [
      {
        chinese:
          '傳說在很久很久以前，冀州的南部、黃河的北岸，矗立著太行、王屋兩座綿延數百里、高聳入雲的巍峨大山。山腳下住著一位年紀將近九十歲的老人，人稱「愚公」。這兩座大山巍然屹立，正好擋在愚公家門的正前方，無論是出門勞作，還是外出探親訪友，一家人都不得不繞上一條極為遙遠曲折的山路，往來十分艱難不便，一年到頭都深受這兩座大山的阻礙之苦。\n\n愚公經過深思熟慮，終於下定決心，把家中的兒孫們都召集到一起，鄭重其事地商議道：「這兩座大山堵在咱們家門前，害得我們出行如此艱難，我打算帶領大家一起動手，把這兩座大山徹底剷平，鑿開一條暢通無阻的道路，直通豫州以南、漢水以北，你們看怎麼樣？」兒孫們聽了愚公這一番話，紛紛響應，齊聲贊同這個想法，唯獨愚公的妻子心存疑慮，提出了一些實際的困難，比如挖出來的土石該運往何處堆放。愚公的兒孫們經過一番商議，決定把挖出的土石運到渤海邊上去堆放。',
        pinyin: '',
        translation:
          'Long, long ago, it is said, south of Jizhou and north of the Yellow River stood two great mountains, Taihang and Wangwu, stretching hundreds of li and rising into the clouds. At their foot lived an old man of nearly ninety whom people called the Foolish Old Man. The two mountains stood squarely in front of his gate, so that whether the family went out to work or to visit relatives and friends they had to take an extremely long and winding mountain road. Coming and going was hard and inconvenient, and all year round they suffered from the obstruction.\n\nAfter careful thought the old man made up his mind. Gathering his sons and grandsons, he put the matter to them formally: "These two mountains block our gate and make travelling so difficult. I mean to lead you all in levelling them completely and cutting a clear road straight through, south to Yuzhou and north of the Han River. What do you say?" His sons and grandsons responded with one voice in agreement. Only his wife had doubts and raised some practical difficulties — where, for instance, the excavated earth and rock should be put. After discussion the family decided to carry it to the shore of the Bohai Sea.',
      },
      {
        chinese:
          '於是，愚公便率領著自己的兒孫，以及鄰居家新喪偶的寡婦尚且年幼的孩子，一同拿起簡陋的鋤頭畚箕，開始了這項在旁人看來完全是異想天開、痴人說夢的浩大工程。一家人起早貪黑，風雨無阻，日復一日、年復一年地挖山鑿石，運送土石往返於渤海之濱，往返一趟就需要花費將近一年的時間，進展十分緩慢艱辛。\n\n村裡有一位見多識廣、自詡聰明的老人，人稱「智叟」，聽聞愚公竟然想要憑藉一己之力搬走兩座大山，忍不住上門譏笑愚公道：「你都這麼一大把年紀了，連山上的一根草木都動搖不了，又怎麼可能憑藉你這殘餘的力氣，去搬動這兩座高聳入雲的大山呢？簡直是白費力氣，痴心妄想！」\n\n愚公聽完智叟的這番冷嘲熱諷，並沒有因此而動搖心志，反而語重心長、不假思索地反駁道：「你的思想實在是太頑固不化了，簡直頑固得比不上鄰家那個剛剛換牙的小孩子。要知道，即便我死了以後，我還有兒子在世；兒子死了，還有孫子接著幹；孫子又會生兒子，兒子又會生孫子，我們家的子子孫孫是沒有窮盡的，可是這兩座大山，卻不會再無限增高加大了，只要我們堅持不懈地挖下去，還怕有一天挖不平嗎？」智叟聽了這一番義正詞嚴的反駁，頓時啞口無言，再也無話可說，灰溜溜地離開了。',
        pinyin: '',
        translation:
          'So the Foolish Old Man led his sons and grandsons, together with the young child of a recently widowed neighbour, in taking up their crude hoes and baskets and beginning a vast undertaking that everyone else regarded as pure fantasy. The family rose early and worked late, in all weathers, digging at the mountains and carrying earth and rock to the shore of the Bohai day after day and year after year — a single round trip taking the best part of a year, so that progress was painfully slow.\n\nIn the village lived a worldly old man who prided himself on his cleverness, known as the Wise Old Man. Hearing that his neighbour meant to move two mountains by his own efforts, he came to jeer: "At your great age you could not shift so much as a blade of grass on those slopes. How could you possibly move two mountains that rise into the clouds with the strength you have left? It is wasted effort and wishful thinking!"\n\nThe Foolish Old Man was not shaken by the mockery, and answered earnestly and without hesitation: "Your thinking is so hidebound that you are outdone by the neighbour\'s child who has only just lost his milk teeth. Consider: when I die I shall still have sons; when my sons die there will be grandsons to carry on; grandsons will have sons and sons grandsons, and my descendants will never come to an end — while these two mountains will grow no higher. If we keep digging without giving up, need we fear that one day they will not be levelled?" At this righteous reply the Wise Old Man was struck dumb, had nothing further to say, and slunk away.',
      },
      {
        chinese:
          '愚公一家人矢志不渝、持之以恆的這番挖山壯舉，最終驚動了看守著這兩座大山的山神，山神深恐愚公這樣長年累月、鍥而不捨地挖鑿下去，兩座大山遲早有一天真的會被夷為平地，趕忙將這件事情稟報給了天帝。天帝聽聞愚公這份堅定不移、矢志不渝的誠心和毅力，也大為感動，當即派遣了大力神誇娥氏的兩個兒子下凡人間，各自背起一座大山，一座安放到了遙遠的朔方東部，另一座則安放到了雍州的南邊。從此以後，愚公家門前一馬平川、暢通無阻，再也沒有大山阻隔的煩惱了。\n\n這個流傳千古的寓言故事，深刻地闡明瞭一個樸素而深刻的道理：只要擁有堅定不移的信念和百折不撓、持之以恆的毅力，即便是看似不可能完成的艱鉅任務，最終也一定能夠想方設法地克服重重困難，取得成功。',
        pinyin: '',
        translation:
          'The family\'s unwavering and persistent labour at last came to the notice of the mountain god who guarded the two peaks. Fearing that if they went on digging year after year without relenting the mountains really would be levelled sooner or later, he hurried to report the matter to the Emperor of Heaven. Moved by the old man\'s steadfast sincerity and determination, the emperor sent down the two sons of the strong god Kua\'e, who each carried off a mountain on his back — setting one down far away in the east of Shuofang and the other south of Yongzhou. From then on the ground before the old man\'s gate was flat and open, and the mountains obstructed him no more.\n\nThis fable, handed down through the ages, makes plain a simple and profound truth: with unshakeable conviction and unflagging perseverance, even a task that appears impossible can in the end be accomplished by finding ways through one difficulty after another.',
      },
    ],
  },
  {
    id: 'hsk6-idiom-saiwengshima',
    title: '塞翁失馬',
    titlePinyin: 'sài wēng shī mǎ',
    titleEnglish: 'The Old Man Loses His Horse',
    description: 'Who is to say what counts as good fortune?',
    wordCount: 740,
    collection: 'chengyu',
    art: require('../assets/images/covers/hsk6-idiom-saiwengshima.jpg'),
    hskLevel: 6,
    difficulty: 'hard',
    pages: [
      {
        chinese:
          '在古代靠近北方邊塞的地方，居住著一位精通術數、頗有智慧的老人，附近的人們都尊稱他為「塞翁」。塞翁家中養著不少牲畜，其中有一匹格外健壯的駿馬，是他一家人賴以為生的重要財產。\n\n有一天，這匹駿馬不知何故，竟然獨自跑出了馬廄，一路狂奔，越過了邊塞的界限，一直跑到了塞外胡人所居住的地界，怎麼也追尋不回來。左鄰右舍得知這個訊息後，都紛紛登門，替塞翁感到十分惋惜，好言好語地前來安慰他這份意外的損失。誰知塞翁聽後，臉上卻並沒有顯露出絲毫沮喪懊惱的神情，反而頗為豁達地說道：「丟了一匹馬，這件事情，誰又能說得準，將來會不會因此而帶來什麼意想不到的好處呢？」鄰居們聽了塞翁這番話，雖然將信將疑，卻也不好再多說什麼，只得作罷。',
        pinyin: '',
        translation:
          'In ancient times, near the northern frontier, there lived an old man well versed in divination and possessed of considerable wisdom, whom the neighbourhood respectfully called the Old Man of the Frontier. He kept a good many animals, among them a particularly strong horse that was an important part of the family\'s livelihood.\n\nOne day, for no apparent reason, this horse ran off alone from the stable, galloped away across the frontier line and into the territory of the nomads beyond, and could not be recovered. Hearing the news, the neighbours came to call, expressing their regret and offering kind words of comfort for the unexpected loss. But the old man showed not the least sign of dejection, and said with considerable equanimity: "A horse is lost. Who can say for certain that no unlooked-for good will come of it in future?" The neighbours half believed and half doubted, but did not like to press the point and let the matter drop.',
      },
      {
        chinese:
          '事情果然出乎所有人的意料，沒過幾個月的光景，那匹早已跑得沒了蹤影的駿馬，竟然自己主動跑了回來，而且這一次，它的身後還跟隨著一匹膘肥體壯、氣宇軒昂的胡地駿馬一同歸來。左鄰右舍聽聞這個喜訊，紛紛登門向塞翁道賀，慶祝他家中不但沒有損失，反而白白多添了一匹上好的駿馬。誰知塞翁這一次依舊不動聲色，反而面露憂色地說道：「家裡憑空多了一匹好馬，這件事情，又怎麼知道日後不會因此招來什麼禍端災殃呢？」鄰居們聽了，都覺得塞翁未免過於杞人憂天，實在有些多慮了。\n\n塞翁家中平添了這匹雄壯的駿馬之後，他那正值血氣方剛的兒子對這匹烈馬格外喜愛，幾乎每天都要騎著它四處馳騁遊玩，縱情享受策馬奔騰的暢快樂趣。誰知有一天，兒子騎著這匹性烈的駿馬外出，馬兒忽然受驚狂奔，兒子躲避不及，重重地從馬背上摔落下來，當場摔斷了一條腿，落下了終身殘疾，從此再也無法像常人一樣健步如飛。左鄰右舍得知這個不幸的訊息後，又紛紛前來慰問，為塞翁兒子這份飛來橫禍而深感惋惜同情。塞翁聽後，依舊是那副處變不驚、雲淡風輕的模樣，坦然說道：「兒子摔斷了腿，固然是一件不幸的事情，可是誰又能斷定，這件事情將來不會給我們帶來什麼意想不到的好處呢？」',
        pinyin: '',
        translation:
          'Events duly confounded everyone\'s expectations. Within a few months the horse that had vanished came back of its own accord — and this time it brought with it a fine, well-fed and spirited horse from the nomad lands. Hearing the good news, the neighbours came to congratulate the old man on suffering no loss at all but gaining an excellent horse for nothing. Yet again he was unmoved, and said with a troubled look: "A good horse has appeared out of nowhere. How do we know it will not bring some disaster upon us later?" The neighbours thought he was borrowing trouble and worrying far too much.\n\nWith this splendid horse in the household, the old man\'s son, then in the full vigour of youth, took a great liking to the spirited animal and rode it out almost daily, delighting in the exhilaration of a gallop. Then one day, out riding the fiery horse, the son was thrown when it suddenly took fright and bolted; unable to save himself, he fell heavily and broke a leg, and was crippled for life, never again able to walk as briskly as other men. Hearing this misfortune the neighbours came again to console him, deeply sorry for the calamity that had struck the son. The old man, unruffled as ever, said calmly: "My son has broken his leg, which is certainly a misfortune. But who can be sure that no unlooked-for good will come of it in future?"',
      },
      {
        chinese:
          '又過了一年光景，塞外的胡人大舉興兵，氣勢洶洶地入侵邊塞地區，戰火紛飛，邊境附近所有身強力壯的青壯年男子，都被朝廷緊急徵召入伍，奔赴戰場浴血奮戰、抵禦外敵。這場慘烈的戰爭，導致邊塞一帶十戶人家中，就有八九戶人家的青壯兒郎戰死沙場、埋骨他鄉，幾乎家家戶戶都沉浸在失去親人的悲痛之中。唯獨塞翁的兒子，因為先前摔斷了腿、落下殘疾，無法上陣殺敵，得以免於這場殘酷戰爭的徵召，因此能夠繼續安然留在父親身邊，父子二人也因此得以保全性命，安然無恙地度過了這場浩劫。\n\n這個流傳千古的故事，深刻地揭示了一個樸素卻意味深長的哲理：世間的禍與福，往往相互依存、彼此轉化，很難簡單地斷定一件事情究竟是福是禍，因此遇到得失順逆的時候，都不必過分地欣喜若狂或者悲觀絕望。',
        pinyin: '',
        translation:
          'A year later the nomads beyond the frontier raised a great army and invaded the border region in force. War flared, and every able-bodied young man near the frontier was urgently conscripted and sent to the battlefield to fight the invaders. In that terrible war, eight or nine households in ten along the frontier lost their young men, killed in battle and buried in foreign soil, and almost every family was plunged into grief. Only the old man\'s son, crippled by his earlier fall and unable to take the field, was exempt from the conscription. So he stayed safely at his father\'s side, and the two of them came through the catastrophe unharmed.\n\nThis story, handed down through the ages, reveals a plain but far-reaching truth: misfortune and good fortune in this world depend on and turn into one another, and it is seldom simple to say whether a given event is a blessing or a curse. So in gain or loss, in good times or bad, there is no need for either wild elation or despair.',
      },
    ],
  },
  {
    id: 'hsk6-tale-mulan',
    title: '木蘭從軍',
    titlePinyin: 'Mùlán cóngjūn',
    titleEnglish: 'Mulan Joins the Army',
    description: 'A daughter takes her father\'s place in the war.',
    wordCount: 796,
    collection: 'folk-tales',
    hskLevel: 6,
    difficulty: 'hard',
    pages: [
      {
        chinese:
          '南北朝時期，北方邊境戰事頻繁，連年不斷，朝廷為了抵禦外敵入侵，頒佈了緊急徵兵的詔令，規定但凡在冊的每一戶人家，都必須派出一名成年男子應徵入伍，奔赴邊關，抵禦強敵。\n\n徵兵的名冊一路傳到了花家所在的村莊，花木蘭的父親花弧，雖然年輕時也曾是一名驍勇善戰的軍中將士，可如今已是年事已高、體弱多病的暮年之人，家中膝下又沒有成年的兄長可以代替父親出征，唯獨只有木蘭這個尚未出嫁的女兒。木蘭眼見父親拿著那份沉甸甸的徵兵文書，整日愁眉不展、唉聲嘆氣，心中又是焦急又是擔憂，深知父親的身體狀況根本無法承受邊關戰場那般艱苦殘酷的行軍作戰。\n\n經過好幾個晝夜輾轉反側、深思熟慮之後，木蘭終於橫下一條心，做出了一個驚人的決定：她要女扮男裝，代替年邁體衰的父親，親自奔赴戰場從軍殺敵。主意打定之後，木蘭不辭辛勞，走遍了東西南北的集市，分別購置了駿馬、馬鞍、轡頭和長長的馬鞭，又置辦了一整套完備的盔甲兵器，做好了出征前的一切準備工作。',
        pinyin: '',
        translation:
          'During the Northern and Southern dynasties, fighting on the northern frontier was frequent and went on year after year. To resist the invaders the court issued an urgent conscription edict: every registered household was required to send one adult male to enlist and go to the frontier to hold off the enemy.\n\nThe conscription rolls reached the village where the Hua family lived. Hua Mulan\'s father, Hua Hu, had in his youth been a brave and capable soldier, but was now old and in poor health, and there was no grown son in the house to go in his place — only Mulan, his unmarried daughter. Seeing her father holding that heavy conscription document, his brow furrowed and sighing all day long, Mulan was both anxious and afraid, knowing well that his health could never withstand the hardship and cruelty of campaigning on the frontier.\n\nAfter several sleepless nights of turning it over, Mulan steeled herself and made an astonishing decision: she would dress as a man and go to war in place of her aged and failing father. Her mind made up, she spared no effort, going round the markets of all four quarters to buy a horse, a saddle, a bridle and a long whip, and fitting herself out with a complete set of armour and weapons, ready for the campaign.',
      },
      {
        chinese:
          '一切準備停當之後，木蘭便女扮男裝，悄然告別了年邁的雙親，懷著複雜的心情，義無反顧地跟隨著大部隊，日夜兼程，跋涉千山萬水，奔赴遙遠荒涼的邊關戰場。在此後長達十二年的漫長歲月裡，木蘭憑藉著過人的膽識、超凡的智慧和頑強的意志，跟隨軍隊轉戰南北，歷經了大大小小數不清的慘烈戰役，屢次在戰場上出生入死、身先士卒，多次憑藉著自己出眾的謀略和勇氣，為部隊立下了赫赫戰功，深受同袍將士的敬重和信賴，卻始終小心翼翼、絲毫不露破綻地隱瞞著自己身為女子的真實身份，與同伴們同甘共苦、並肩作戰了整整十二個春秋。\n\n戰爭終於落下帷幕，木蘭跟隨得勝的大軍凱旋歸來，皇帝論功行賞，感念木蘭這些年來立下的赫赫戰功，特意召見她進宮覲見，打算授予她顯赫的高官厚祿，讓她從此享受榮華富貴。誰知木蘭在朝堂之上，卻婉言謝絕了皇帝賞賜的一切官職和財物，只是懇切地向皇帝提出了一個小小的心願：希望能夠得到一匹腳力矯健的千里馬，早日快馬加鞭，返回自己朝思暮想的故鄉，與闊別十二年之久的雙親骨肉團聚。皇帝感念木蘭的一片純孝之心，當即欣然答應了她這個樸素的請求。',
        pinyin: '',
        translation:
          'With everything ready, Mulan dressed as a man, quietly took leave of her aged parents and, with mixed feelings but without hesitation, followed the army — travelling day and night, crossing a thousand mountains and rivers to the remote and desolate frontier. Over the twelve long years that followed, with exceptional courage, outstanding intelligence and a stubborn will, she campaigned north and south with the army through countless brutal battles, again and again risking her life and leading from the front, repeatedly winning distinguished merit for her unit by her strategy and bravery, and earning the deep respect and trust of her comrades — all the while carefully concealing, without ever giving herself away, the fact that she was a woman, sharing hardship and fighting shoulder to shoulder with them for twelve full years.\n\nWhen the war at last came to an end, Mulan returned in triumph with the victorious army. Rewarding merit, and mindful of the distinguished service she had rendered over the years, the emperor summoned her to an audience, intending to grant her high office and rich emoluments so that she might enjoy honour and wealth thereafter. But in the hall Mulan politely declined every post and reward, and put to the emperor one small, earnest wish: that she might be given a swift horse, so that she could ride hard for home and be reunited with the parents she had been parted from for twelve years. Moved by her pure filial feeling, the emperor readily granted this modest request.',
      },
      {
        chinese:
          '木蘭快馬加鞭，日夜兼程地趕回了闊別已久的家鄉。年邁的雙親得知女兒終於凱旋歸來，喜極而泣，互相攙扶著出門遠遠相迎；木蘭回到自己昔日閨房中，脫去了穿了整整十二年的戰袍盔甲，換上了昔日心愛的女兒家衣裙，對鏡精心地梳妝打扮起來，恢復了往日溫婉動人的女兒模樣。曾經與她並肩浴血奮戰長達十二年之久的同袍戰友們，聞訊特意結伴前來探望昔日的戰友，眾人推開房門，赫然看見眼前這位梳著精緻髮髻、身著女子衣裙的絕色佳人，簡直不敢相信自己的眼睛，無不驚訝得目瞪口呆，這才恍然大悟，原來這十二年來一同出生入死、並肩作戰的親密戰友「花將軍」，竟然自始至終都是一位巾幗不讓鬚眉的女子。\n\n木蘭女扮男裝、代父從軍的傳奇故事，千百年來在中國民間廣為流傳、家喻戶曉，她身上所展現出的忠孝節義、智勇雙全的可貴品格，也因此成為中華民族傳統美德當中，一座熠熠生輝、永不褪色的精神豐碑。',
        pinyin: '',
        translation:
          'Riding hard by day and night, Mulan reached the home she had so long been away from. Learning that their daughter had returned in triumph at last, her aged parents wept for joy and, supporting one another, came out to meet her from far off. Back in her old chamber, Mulan took off the battle robe and armour she had worn for twelve years, put on the girl\'s clothes she had once loved, and dressed her hair carefully before the mirror, becoming again the gentle young woman she had been. Her comrades, who had fought at her side through twelve years of blood, came together to call on their old companion; and when they pushed open the door and saw before them a beauty with elaborately dressed hair and a woman\'s gown, they could scarcely believe their eyes and stood open-mouthed with astonishment. Only then did it dawn on them that "General Hua", the close comrade who had faced death beside them for twelve years, had been a woman the whole time — a woman in no way outdone by any man.\n\nThe legend of Mulan, who dressed as a man and joined the army in her father\'s place, has been widely told and universally known in China for well over a thousand years, and the loyalty, filial devotion, integrity, wisdom and courage she embodied have made her a shining and undimmed monument among the traditional virtues of the Chinese people.',
      },
    ],
  },
]

export function storyById(id: string): Story | undefined {
  return STORIES.find((s) => s.id === id)
}
