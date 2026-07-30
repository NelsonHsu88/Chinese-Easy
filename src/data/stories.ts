import type { Story } from '../types'

/** Hand-authored reading library, 2 stories per HSK level (an easy 1-pager and a harder 2-pager), progressively more complex by level. */
export const STORIES: Story[] = [
  {
    id: 'hsk1-easy-my-family',
    title: '我的家',
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
]

export function storyById(id: string): Story | undefined {
  return STORIES.find((s) => s.id === id)
}
