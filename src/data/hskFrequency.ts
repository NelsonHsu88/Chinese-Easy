import type { VocabWord, WordCategory } from '../types'
import importedWordsJson from './importedWords.json'
import { lookupWordById } from './lookupWords'

// A hand-curated starter set with verified example sentences. Word-level
// pinyin is syllable-spaced (one token per character) so it can be converted
// to zhuyin syllable-by-syllable; example-sentence pinyin is left as natural
// word-spaced prose and is always shown in pinyin.
const curatedWords: VocabWord[] = [
  // HSK 1
  w('hsk1-01', '你好', '你好', 'nǐ hǎo', 'hello', 1, 'daily', '你好，很高兴认识你。', '你好，很高興認識你。', 'Nǐ hǎo, hěn gāoxìng rènshi nǐ.', 'Hello, nice to meet you.'),
  w('hsk1-02', '谢谢', '謝謝', 'xiè xie', 'thank you', 1, 'daily', '谢谢你的帮助。', '謝謝你的幫助。', 'Xièxie nǐ de bāngzhù.', 'Thank you for your help.'),
  w('hsk1-03', '再见', '再見', 'zài jiàn', 'goodbye', 1, 'daily', '明天见，再见！', '明天見，再見！', 'Míngtiān jiàn, zàijiàn!', 'See you tomorrow, bye!'),
  w('hsk1-04', '爱', '愛', 'ài', 'to love', 1, 'people', '我爱我的家人。', '我愛我的家人。', 'Wǒ ài wǒ de jiārén.', 'I love my family.'),
  w('hsk1-05', '吃', '吃', 'chī', 'to eat', 1, 'food', '我们去吃饭吧。', '我們去吃飯吧。', 'Wǒmen qù chīfàn ba.', "Let's go eat."),
  w('hsk1-06', '喝', '喝', 'hē', 'to drink', 1, 'food', '你想喝什么？', '你想喝什麼？', 'Nǐ xiǎng hē shénme?', 'What would you like to drink?'),
  w('hsk1-07', '大', '大', 'dà', 'big', 1, 'daily', '这只狗很大。', '這隻狗很大。', 'Zhè zhī gǒu hěn dà.', 'This dog is big.'),
  w('hsk1-08', '水', '水', 'shuǐ', 'water', 1, 'daily', '请给我一杯水。', '請給我一杯水。', 'Qǐng gěi wǒ yì bēi shuǐ.', 'Please give me a glass of water.'),
  w('hsk1-09', '家', '家', 'jiā', 'home; family', 1, 'people', '我要回家了。', '我要回家了。', 'Wǒ yào huí jiā le.', "I'm heading home."),
  w('hsk1-10', '朋友', '朋友', 'péng you', 'friend', 1, 'people', '他是我的好朋友。', '他是我的好朋友。', 'Tā shì wǒ de hǎo péngyou.', 'He is my good friend.'),

  // HSK 2
  w('hsk2-01', '高兴', '高興', 'gāo xìng', 'happy', 2, 'daily', '认识你我很高兴。', '認識你我很高興。', 'Rènshi nǐ wǒ hěn gāoxìng.', "I'm happy to meet you."),
  w('hsk2-02', '认识', '認識', 'rèn shi', 'to know; recognize', 2, 'daily', '我们已经认识十年了。', '我們已經認識十年了。', 'Wǒmen yǐjīng rènshi shí nián le.', "We've known each other ten years."),
  w('hsk2-03', '工作', '工作', 'gōng zuò', 'work; job', 2, 'work', '她的工作很忙。', '她的工作很忙。', 'Tā de gōngzuò hěn máng.', 'Her job is very busy.'),
  w('hsk2-04', '时间', '時間', 'shí jiān', 'time', 2, 'daily', '我们没有时间了。', '我們沒有時間了。', 'Wǒmen méiyǒu shíjiān le.', "We don't have time left."),
  w('hsk2-05', '学校', '學校', 'xué xiào', 'school', 2, 'work', '这所学校很有名。', '這所學校很有名。', 'Zhè suǒ xuéxiào hěn yǒumíng.', 'This school is well known.'),
  w('hsk2-06', '快乐', '快樂', 'kuài lè', 'happy; joyful', 2, 'daily', '祝你生日快乐！', '祝你生日快樂！', 'Zhù nǐ shēngrì kuàilè!', 'Happy birthday!'),
  w('hsk2-07', '觉得', '覺得', 'jué de', 'to feel; think', 2, 'daily', '我觉得这个主意不错。', '我覺得這個主意不錯。', 'Wǒ juéde zhège zhǔyi búcuò.', 'I think this idea is pretty good.'),
  w('hsk2-08', '喜欢', '喜歡', 'xǐ huan', 'to like', 2, 'daily', '我很喜欢这首歌。', '我很喜歡這首歌。', 'Wǒ hěn xǐhuan zhè shǒu gē.', 'I really like this song.'),

  // HSK 3
  w('hsk3-01', '经验', '經驗', 'jīng yàn', 'experience', 3, 'daily', '他很有教学经验。', '他很有教學經驗。', 'Tā hěn yǒu jiàoxué jīngyàn.', 'He has a lot of teaching experience.'),
  w('hsk3-02', '环境', '環境', 'huán jìng', 'environment', 3, 'daily', '我们要保护环境。', '我們要保護環境。', 'Wǒmen yào bǎohù huánjìng.', 'We need to protect the environment.'),
  w('hsk3-03', '突然', '突然', 'tū rán', 'suddenly', 3, 'daily', '天气突然变冷了。', '天氣突然變冷了。', 'Tiānqì tūrán biàn lěng le.', 'The weather suddenly turned cold.'),
  w('hsk3-04', '检查', '檢查', 'jiǎn chá', 'to check; inspect', 3, 'daily', '医生给他做了检查。', '醫生給他做了檢查。', 'Yīshēng gěi tā zuò le jiǎnchá.', 'The doctor gave him a checkup.'),
  w('hsk3-05', '提高', '提高', 'tí gāo', 'to improve; raise', 3, 'daily', '他想提高自己的水平。', '他想提高自己的水平。', 'Tā xiǎng tígāo zìjǐ de shuǐpíng.', 'He wants to improve his own level.'),
  w('hsk3-06', '计划', '計劃', 'jì huà', 'plan', 3, 'daily', '我们的旅行计划变了。', '我們的旅行計劃變了。', 'Wǒmen de lǚxíng jìhuà biàn le.', 'Our travel plan has changed.'),
  w('hsk3-07', '关系', '關係', 'guān xì', 'relationship', 3, 'people', '他们的关系很好。', '他們的關係很好。', 'Tāmen de guānxì hěn hǎo.', 'Their relationship is good.'),
  w('hsk3-08', '决定', '決定', 'jué dìng', 'to decide; decision', 3, 'daily', '我决定接受这份工作。', '我決定接受這份工作。', 'Wǒ juédìng jiēshòu zhè fèn gōngzuò.', 'I decided to accept this job.'),

  // HSK 4
  w('hsk4-01', '表示', '表示', 'biǎo shì', 'to express; indicate', 4, 'daily', '他点头表示同意。', '他點頭表示同意。', 'Tā diǎntóu biǎoshì tóngyì.', 'He nodded to indicate agreement.'),
  w('hsk4-02', '适合', '適合', 'shì hé', 'suitable; to suit', 4, 'daily', '这份工作很适合你。', '這份工作很適合你。', 'Zhè fèn gōngzuò hěn shìhé nǐ.', 'This job suits you well.'),
  w('hsk4-03', '阻止', '阻止', 'zǔ zhǐ', 'to prevent; stop', 4, 'daily', '没人能阻止他。', '沒人能阻止他。', 'Méi rén néng zǔzhǐ tā.', 'No one can stop him.'),
  w('hsk4-04', '承认', '承認', 'chéng rèn', 'to admit; acknowledge', 4, 'daily', '他承认自己错了。', '他承認自己錯了。', 'Tā chéngrèn zìjǐ cuò le.', 'He admitted he was wrong.'),
  w('hsk4-05', '竞争', '競爭', 'jìng zhēng', 'competition', 4, 'daily', '市场竞争越来越激烈。', '市場競爭越來越激烈。', 'Shìchǎng jìngzhēng yuèláiyuè jīliè.', 'Market competition is getting fiercer.'),
  w('hsk4-06', '精神', '精神', 'jīng shén', 'spirit; energy', 4, 'science', '他今天精神很好。', '他今天精神很好。', 'Tā jīntiān jīngshén hěn hǎo.', "He's in great spirits today."),
  w('hsk4-07', '建议', '建議', 'jiàn yì', 'suggestion; to suggest', 4, 'daily', '医生给了我一些建议。', '醫生給了我一些建議。', 'Yīshēng gěi le wǒ yìxiē jiànyì.', 'The doctor gave me some suggestions.'),
  w('hsk4-08', '压力', '壓力', 'yā lì', 'pressure; stress', 4, 'daily', '最近工作压力很大。', '最近工作壓力很大。', 'Zuìjìn gōngzuò yālì hěn dà.', 'Work pressure has been high lately.'),

  // HSK 5
  w('hsk5-01', '妥协', '妥協', 'tuǒ xié', 'compromise', 5, 'daily', '双方最终达成妥协。', '雙方最終達成妥協。', 'Shuāngfāng zuìzhōng dáchéng tuǒxié.', 'Both sides eventually reached a compromise.'),
  w('hsk5-02', '谨慎', '謹慎', 'jǐn shèn', 'cautious; prudent', 5, 'daily', '做决定要谨慎一些。', '做決定要謹慎一些。', 'Zuò juédìng yào jǐnshèn yìxiē.', 'Be more cautious when making decisions.'),
  w('hsk5-03', '局限', '局限', 'jú xiàn', 'limitation; to limit', 5, 'daily', '这个方法有一定局限。', '這個方法有一定局限。', 'Zhège fāngfǎ yǒu yídìng júxiàn.', 'This method has certain limitations.'),
  w('hsk5-04', '频繁', '頻繁', 'pín fán', 'frequent', 5, 'daily', '他最近出差很频繁。', '他最近出差很頻繁。', 'Tā zuìjìn chūchāi hěn pínfán.', "He's been traveling for work frequently."),
  w('hsk5-05', '潜力', '潛力', 'qián lì', 'potential', 5, 'daily', '这个市场很有潜力。', '這個市場很有潛力。', 'Zhège shìchǎng hěn yǒu qiánlì.', 'This market has a lot of potential.'),
  w('hsk5-06', '遗憾', '遺憾', 'yí hàn', 'regret; pity', 5, 'daily', '没能参加真是遗憾。', '沒能參加真是遺憾。', 'Méi néng cānjiā zhēnshi yíhàn.', "It's a pity I couldn't attend."),
  w('hsk5-07', '反思', '反思', 'fǎn sī', 'to reflect on', 5, 'daily', '我们应该反思这次失败。', '我們應該反思這次失敗。', 'Wǒmen yīnggāi fǎnsī zhè cì shībài.', 'We should reflect on this failure.'),
  w('hsk5-08', '权衡', '權衡', 'quán héng', 'to weigh; balance', 5, 'daily', '要权衡利弊再决定。', '要權衡利弊再決定。', 'Yào quánhéng lìbì zài juédìng.', 'Weigh the pros and cons before deciding.'),

  // HSK 6
  w('hsk6-01', '悖论', '悖論', 'bèi lùn', 'paradox', 6, 'daily', '这是一个有趣的悖论。', '這是一個有趣的悖論。', 'Zhè shì yí gè yǒuqù de bèilùn.', 'This is an interesting paradox.'),
  w('hsk6-02', '巅峰', '巔峰', 'diān fēng', 'peak; pinnacle', 6, 'daily', '他正处于事业的巅峰。', '他正處於事業的巔峰。', 'Tā zhèng chǔyú shìyè de diānfēng.', 'He is at the peak of his career.'),
  w('hsk6-03', '韧性', '韌性', 'rèn xìng', 'resilience; toughness', 6, 'daily', '这种材料很有韧性。', '這種材料很有韌性。', 'Zhè zhǒng cáiliào hěn yǒu rènxìng.', 'This material is very resilient.'),
  w('hsk6-04', '蕴含', '蘊含', 'yùn hán', 'to contain; imply', 6, 'daily', '这句话蕴含深意。', '這句話蘊含深意。', 'Zhè jù huà yùnhán shēnyì.', 'This sentence implies deep meaning.'),
  w('hsk6-05', '甄别', '甄別', 'zhēn bié', 'to discern; screen', 6, 'daily', '要学会甄别真假信息。', '要學會甄別真假信息。', 'Yào xuéhuì zhēnbié zhēnjiǎ xìnxī.', 'One must learn to discern true from false information.'),
  w('hsk6-06', '涣散', '渙散', 'huàn sàn', 'slack; lax', 6, 'daily', '队伍纪律有些涣散。', '隊伍紀律有些渙散。', 'Duìwu jìlǜ yǒuxiē huànsàn.', "The team's discipline has become somewhat lax."),
  w('hsk6-07', '磅礴', '磅礴', 'péng bó', 'majestic; vast', 6, 'daily', '山势磅礴，气势雄伟。', '山勢磅礴，氣勢雄偉。', 'Shānshì péngbó, qìshì xióngwěi.', 'The mountains are majestic and grand.'),
  w('hsk6-08', '缜密', '縝密', 'zhěn mì', 'meticulous; careful', 6, 'daily', '他的计划非常缜密。', '他的計劃非常縝密。', 'Tā de jìhuà fēicháng zhěnmì.', 'His plan is extremely meticulous.'),
]

function w(
  id: string,
  simplified: string,
  traditional: string,
  pinyin: string,
  definition: string,
  hskLevel: number,
  category: WordCategory,
  exS: string,
  exT: string,
  exPinyin: string,
  exTranslation: string,
): VocabWord {
  return {
    id,
    simplified,
    traditional,
    pinyin,
    definition,
    hskLevel,
    category,
    example: {
      simplified: exS,
      traditional: exT,
      pinyin: exPinyin,
      translation: exTranslation,
    },
  }
}

// Bulk-imported from the MIT-licensed complete-hsk-vocabulary dataset
// (CC-CEDICT-derived): simplified/traditional/pinyin/definition/level/category
// are real dictionary data (category assigned by a keyword heuristic over the
// English gloss), but these don't have a verified example sentence, so
// `example` is simply omitted rather than inventing one.
const importedWords = importedWordsJson as VocabWord[]

// The two lists overlap on ~40 common words. Curated entries win: their example
// sentences are hand-verified and carry pinyin, which the corpus-sourced ones
// don't. Without this the dictionary shows the same word twice.
const curatedForms = new Set(curatedWords.map((word) => word.simplified))

export const hskFrequency: VocabWord[] = [
  ...curatedWords,
  ...importedWords.filter((word) => !curatedForms.has(word.simplified)),
]

const wordIndex = new Map(hskFrequency.map((word) => [word.id, word]))

/**
 * Falls through to the tier-2 lookup tail for `lk-` ids.
 *
 * A rare word found by search can be added to the deck like any other, and its
 * card then references an id that is not in `hskFrequency`. Without this fallback
 * AppContext's hydrate — which drops cards whose word no longer resolves — would
 * delete it on the next launch, so the word would appear to be added and then
 * quietly disappear overnight.
 */
export function wordById(id: string): VocabWord | undefined {
  return wordIndex.get(id) ?? lookupWordById(id)
}
