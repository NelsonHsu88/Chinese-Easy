import type { ImageSourcePropType } from 'react-native'

/*
 * Each story's own cover, from `scripts/processReadingCornerArt.mjs` (the Book
 * Cover paintings, 540×720). A story missing here wears the general 讀 cover.
 * Static requires, so Metro bundles exactly these files.
 */
export const STORY_COVERS: Record<string, ImageSourcePropType> = {
  'hsk1-easy-my-family': require('../../assets/images/library/covers/hsk1-easy-my-family.jpg'),
  'hsk2-easy-shopping': require('../../assets/images/library/covers/hsk2-easy-shopping.jpg'),
  'hsk2-hard-birthday': require('../../assets/images/library/covers/hsk2-hard-birthday.jpg'),
  'hsk2-tale-caochong': require('../../assets/images/library/covers/hsk2-tale-caochong.jpg'),
  'hsk2-tale-jinfa': require('../../assets/images/library/covers/hsk2-tale-jinfa.jpg'),
  'hsk2-tale-langlaile': require('../../assets/images/library/covers/hsk2-tale-langlaile.jpg'),
  'hsk2-tale-shouzhu': require('../../assets/images/library/covers/hsk2-tale-shouzhu.jpg'),
  'hsk3-easy-weather': require('../../assets/images/library/covers/hsk3-easy-weather.jpg'),
  'hsk3-hard-first-trip': require('../../assets/images/library/covers/hsk3-hard-first-trip.jpg'),
  'hsk4-easy-workday': require('../../assets/images/library/covers/hsk4-easy-workday.jpg'),
  'hsk4-hard-misunderstanding': require('../../assets/images/library/covers/hsk4-hard-misunderstanding.jpg'),
  'hsk4-idiom-bamiaozhuzhang': require('../../assets/images/library/covers/hsk4-idiom-bamiaozhuzhang.jpg'),
  'hsk4-idiom-huashetianzu': require('../../assets/images/library/covers/hsk4-idiom-huashetianzu.jpg'),
  'hsk4-idiom-yanerdaoling': require('../../assets/images/library/covers/hsk4-idiom-yanerdaoling.jpg'),
  'hsk4-tale-jack-modou': require('../../assets/images/library/covers/hsk4-tale-jack-modou.jpg'),
  'hsk4-tale-tangguowu': require('../../assets/images/library/covers/hsk4-tale-tangguowu.jpg'),
  'hsk5-easy-festival': require('../../assets/images/library/covers/hsk5-easy-festival.jpg'),
  'hsk5-hard-old-friends': require('../../assets/images/library/covers/hsk5-hard-old-friends.jpg'),
  'hsk5-idiom-hujiahuwei': require('../../assets/images/library/covers/hsk5-idiom-hujiahuwei.jpg'),
  'hsk5-idiom-yegonghaolong': require('../../assets/images/library/covers/hsk5-idiom-yegonghaolong.jpg'),
  'hsk5-idiom-yubangxiangzheng': require('../../assets/images/library/covers/hsk5-idiom-yubangxiangzheng.jpg'),
  'hsk5-legend-chunlian': require('../../assets/images/library/covers/hsk5-legend-chunlian.jpg'),
  'hsk5-legend-shousui': require('../../assets/images/library/covers/hsk5-legend-shousui.jpg'),
  'hsk5-legend-yuebing': require('../../assets/images/library/covers/hsk5-legend-yuebing.jpg'),
  'hsk5-legend-zaowangye': require('../../assets/images/library/covers/hsk5-legend-zaowangye.jpg'),
  'hsk5-legend-zongzi': require('../../assets/images/library/covers/hsk5-legend-zongzi.jpg'),
  'hsk5-tale-baixue': require('../../assets/images/library/covers/hsk5-tale-baixue.jpg'),
  'hsk6-easy-city-changes': require('../../assets/images/library/covers/hsk6-easy-city-changes.jpg'),
  'hsk6-hard-lifes-choices': require('../../assets/images/library/covers/hsk6-hard-lifes-choices.jpg'),
  'hsk6-idiom-saiwengshima': require('../../assets/images/library/covers/hsk6-idiom-saiwengshima.jpg'),
  'hsk6-idiom-yugongyishan': require('../../assets/images/library/covers/hsk6-idiom-yugongyishan.jpg'),
  'hsk6-myth-changebenyue': require('../../assets/images/library/covers/hsk6-myth-changebenyue.jpg'),
  'hsk6-myth-houyisheri': require('../../assets/images/library/covers/hsk6-myth-houyisheri.jpg'),
  'hsk6-myth-jingweitianhai': require('../../assets/images/library/covers/hsk6-myth-jingweitianhai.jpg'),
  'hsk6-myth-niulangzhinv': require('../../assets/images/library/covers/hsk6-myth-niulangzhinv.jpg'),
  'hsk6-tale-mulan': require('../../assets/images/library/covers/hsk6-tale-mulan.jpg'),
}
