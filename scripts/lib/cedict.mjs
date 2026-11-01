/**
 * CC-CEDICT helpers shared by `buildWordBank.mjs` and `fixEntryReadings.mjs`:
 * pinyin formatting, gloss cleaning, and which row to take when CC-CEDICT lists
 * several readings of one form.
 */

import fs from 'node:fs'

const VOWELS = {
  a: 'āáǎàa',
  e: 'ēéěèe',
  i: 'īíǐìi',
  o: 'ōóǒòo',
  u: 'ūúǔùu',
  'ü': 'ǖǘǚǜü',
}

/** "xue2" -> "xué". Tone goes on a/o/e, else on the last vowel of the syllable. */
function toneMark(syllable) {
  const m = syllable.match(/^([a-zA-ZüÜ:]+)([1-5])$/)
  if (!m) return syllable.replace(/5$/, '')
  let [, body, tone] = m
  body = body.replace(/u:/g, 'ü').replace(/v/g, 'ü')
  const t = Number(tone)
  if (t === 5) return body.toLowerCase()

  const lower = body.toLowerCase()
  let target = -1
  for (const v of ['a', 'o', 'e']) {
    const i = lower.indexOf(v)
    if (i !== -1) { target = i; break }
  }
  if (target === -1) {
    for (let i = lower.length - 1; i >= 0; i--) {
      if ('iuü'.includes(lower[i])) { target = i; break }
    }
  }
  if (target === -1) return lower
  const ch = lower[target]
  return lower.slice(0, target) + VOWELS[ch][t - 1] + lower.slice(target + 1)
}

export const toPinyin = (raw) => raw.trim().split(/\s+/).map(toneMark).join(' ')

// ---------------------------------------------------------------- cedict

export const CEDICT_LINE = /^(\S+) (\S+) \[([^\]]*)\] \/(.*)\/$/

/** CEDICT glosses carry a lot of apparatus a learner doesn't want to read. */
export function cleanGloss(defs) {
  const parts = defs
    .split('/')
    .map((d) => d.trim())
    .filter(Boolean)
    // Drop cross-reference and metadata glosses that read as noise to a learner.
    .filter((d) => !/^(CL:|Taiwan pr\.|see |variant of|old variant|abbr\. for|also pr\.)/i.test(d))
    // "(bound form) Afghanistan (abbr. for 阿富汗[...])" is a sense that only
    // exists inside compounds. The parenthetical stripping below would leave it
    // as a bare "Afghanistan", and 阿 glossed as Afghanistan — which it never
    // means on its own. Both markers are required: "abbr. for" alone also tags
    // real standalone words (超市 "supermarket (abbr. for 超級市場)"). And only a
    // lone name: 僧's sole sense is "(bound form) Buddhist monk (abbr. …)", and
    // dropping that would delete a real word.
    .filter((d) => !/^\(bound form\) [A-Z][a-z]+ \(abbr\. for\b/.test(d))
    .map((d) =>
      d
        // Parentheticals first, while a note that cites a word still shows its
        // hanzi and is dropped whole: keep the ones that narrow the meaning.
        .replace(/\s*\(([^)]*)\)/g, (_, note) => keptNote(note))
        // Inline pinyin keys and 傳統|简体 pairs, e.g. 皮革的[pi2 ge2 de5]
        .replace(/\[[^\]]*\]/g, '')
        .replace(/[㐀-鿿]+\|[㐀-鿿]+/g, '')
        .replace(/["“”]/g, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+([;,.!?])/g, '$1')
        .replace(/\s*[;,]\s*$/, '')
        .trim(),
    )
    // Stripping the apparatus above can leave dangling fragments ("... or  )"),
    // so drop anything with orphaned punctuation or leftover CJK.
    .filter((d) => d && d.length <= MAX_SENSE_LENGTH && !/\(\s*\)|\([^)]*$|^[^(]*\)|[\[\]|]/.test(d) && !/[㐀-鿿]/.test(d))
    .filter((d) => /[a-z]/i.test(d.replace(/\([^)]*\)/g, '')))
    // A pronunciation note whose reading was in brackets: "colloquial pr. [an1]".
    .filter((d) => !/\bpr\.?$/.test(d))
  // Whole senses only: cutting mid-list used to leave a dangling fragment.
  const kept = []
  for (const part of parts.slice(0, MAX_SENSES)) {
    if (kept.length > 0 && [...kept, part].join('; ').length > MAX_GLOSS_LENGTH) break
    kept.push(part)
  }
  return kept.join('; ')
}

/*
 * How much of an entry a learner sees. The cap was three senses and 90
 * characters, which cut meanings a learner needs: 酒店 lost "(Taiwan) hostess
 * club", the reason it isn't what you call a hotel in Taipei. Cards still show
 * one chosen sense (`shortGloss`); this is what the word page lists.
 */
const MAX_SENSES = 6
const MAX_SENSE_LENGTH = 80
const MAX_GLOSS_LENGTH = 200

/*
 * A parenthetical that narrows a meaning is part of it: 喝酒 is "to drink
 * (alcohol)", not "to drink", which is just 喝. Every note used to be stripped.
 * Dropped now are only the labels that don't change what the word means, notes
 * written in Chinese or pinyin, and long grammar explanations.
 */
const DROPPED_NOTES = new Set([
  'idiom', 'bound form', 'name', 'loanword', 'bird species of china', 'proverb', 'saying',
  'fig.', 'lit.', 'lit. and fig.', 'attributive', 'neologism', 'brand', 'person',
])

/** CC-CEDICT's own abbreviations inside notes, spelled out. */
const NOTE_WORDS = {
  'Tw': 'Taiwan', 'PRC': 'mainland China', 'HK': 'Hong Kong', 'coll.': 'colloquial',
  'derog.': 'derogatory', 'onom.': 'onomatopoeia', 'arch.': 'archaic', 'TCM': 'Chinese medicine',
  'math.': 'mathematics', 'esp.': 'especially', 'sb': 'someone', 'sth': 'something',
  'abbr.': 'abbreviation', 'old': 'old use',
}

function keptNote(note) {
  const text = note.trim()
  if (!text || /[㐀-鿿\[\]|]/.test(text) || /\d/.test(text)) return ''
  if (DROPPED_NOTES.has(text.toLowerCase())) return ''
  if (/^(abbr|see |also |variant|used |CL:|classifier|pr\.)/i.test(text) || /\bpr\.$/.test(text)) return ''
  if (text.split(/\s+/).length > 4) return ''
  // A plural ending, "remain(s)": not a note at all.
  if (/^[a-z]{1,2}$/.test(text)) return ''
  const spelled = text
    .split(/(\s+|,\s*)/)
    .map((w) => NOTE_WORDS[w] ?? w)
    .join('')
  return ` (${spelled}) `
}

/** Tone marks to numbers, ü as v: "lǜ" and "lu:4" both become "lv4". For comparing readings. */
export function readingKey(reading) {
  const tones = { '\u0304': '1', '\u0301': '2', '\u030c': '3', '\u0300': '4' }
  return reading
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((syllable) => {
      let tone = ''
      const plain = syllable
        .replace(/u:/g, 'v')
        .normalize('NFD')
        .replace(/u\u0308/g, 'v')
        .replace(/[\u0300-\u036f]/g, (mark) => {
          if (tones[mark]) tone = tones[mark]
          return ''
        })
      const numbered = plain.match(/^([a-z]+)([1-5])$/)
      if (numbered) return numbered[2] === '5' ? numbered[1] : numbered[1] + numbered[2]
      return plain + tone
    })
    .join(' ')
}

/** Rows CC-CEDICT marks as names, or surnames — never the reading to teach. */
export const isProperRow = (pinyin, defs) => /^[A-Z]/.test(pinyin) || /^surname\b/i.test(defs)

/*
 * Single characters whose Unihan `kMandarin` reading is not the one to teach on
 * its own: 教 is jiào ("religion") in Unihan, but the word a learner meets is
 * jiāo, "to teach"; 長 is zhǎng "chief" rather than cháng "long"; 切 qiè
 * "definitely" rather than qiē "to cut". Others here would get a row that is
 * only a cross-reference. Checked by hand against the full list of changes
 * `fixEntryReadings.mjs --dry` printed.
 */
const KEEP_FIRST_ROW = new Set([...'教長长倒切縫缝勒泊剝剥削匙嘸呒伽坻台'])

/*
 * Words CC-CEDICT lists with and without a neutral tone, where the neutral-tone
 * row is the everyday word and the first row a rare, literal one: 告訴 gàosu
 * "to tell" (not gàosù "to press charges"), 東西 dōngxi "thing" (not "east and
 * west"), 生意 shēngyi "business" (not "life force"). Hand-checked, because the
 * rule fails as often as it works: 老公's neutral row is "eunuch", 不是's
 * "fault", 女人's "wife". Simplified forms, as `chooseRow` is keyed.
 */
const NEUTRAL_ROW = new Set([
  '告诉', '东西', '地方', '多少', '故事', '妻子', '小子', '人家', '生意', '好处',
  '把手', '便宜', '说法', '本事', '下场', '大夫', '买卖', '口音', '大爷', '上头',
  '得罪', '结实', '差事', '大方', '地道', '单子', '媳妇', '公道', '琢磨', '烟火',
  '裁缝', '工夫', '出息', '行头', '分量', '照应', '虾子', '世故',
])

/*
 * Simplified forms where the traditional form traditional text uses most is not
 * the one to teach: 系 xì "department" would become 係 "to be" (counted from
 * 關係), 脏 would become 臟 "organ" rather than 髒 "dirty" (a near tie). 于 is
 * 於 "in; at", not the archaic 于 "to go".
 */
const KEEP_TRADITIONAL = new Map([
  ['系', '系'], ['脏', '髒'], ['于', '於'],
  // The everyday word, not a rare same-form row (see scripts/fixTraditionalForms.mjs).
  ['听', '聽'], ['离', '離'], ['圣', '聖'], ['台', '臺'], ['杠', '槓'], ['腊', '臘'],
  ['几', '幾'], ['叶', '葉'], ['价', '價'], ['腌', '醃'], ['岭', '嶺'], ['眯', '瞇'],
])

/** Rows that only point at another entry. */
const POINTER_ROW = /^(old |archaic |)variant of\b|^used in\b|^see\b|^erhua variant\b/i

const syllables = (reading) => readingKey(reading).split(' ')

/**
 * Which of CC-CEDICT's rows for one form to use.
 *
 * CC-CEDICT lists a form's rows in no useful order, and taking the first gave
 * 看 kān "to look after", 跑 páo "to paw", 結果 jiēguǒ "to bear fruit", 东西
 * "east and west", and 几 "small table" for the jǐ of 幾個. In order:
 *
 * 1. Proper nouns and surnames lose to common words (水 "water", not "surname
 *    Shui"); rows that only point elsewhere ("variant of", "used in") lose to
 *    rows with a meaning.
 * 2. A single character keeps the rows on its common reading (Unihan
 *    `kMandarin`, from `characterPinyin.json`) unless listed in KEEP_FIRST_ROW.
 *    A word in NEUTRAL_ROW keeps its neutral-tone rows. Any other word keeps
 *    the rows whose every syllable is its character's common reading (a
 *    neutral tone matches any): 結果 jiéguǒ, 重點 zhòngdiǎn, 教授 jiàoshòu.
 * 3. Several traditional forms left (几 / 幾, 云 / 雲, 后 / 後): the one
 *    traditional text uses most (`ctx.tradUse`, from loadTraditionalUse).
 *
 * @param rows    `{ trad, pinyin, defs }` in file order (raw CC-CEDICT pinyin)
 * @param common  a single character's common reading, tone-marked, or undefined
 * @param ctx     `{ readingOf(ch), tradUse(trad) }`, both optional
 */
export function chooseRow(form, rows, common, ctx = {}) {
  const usable = rows.filter((row) => !isProperRow(row.pinyin, row.defs))
  let pool = usable.length > 0 ? usable : rows
  const meaningful = pool.filter((row) => cleanGloss(row.defs) && !POINTER_ROW.test(row.defs))
  if (meaningful.length > 0) pool = meaningful

  const chars = [...form]
  if (chars.length === 1) {
    if (common && !KEEP_FIRST_ROW.has(form)) {
      const key = readingKey(common)
      const onCommon = pool.filter((row) => readingKey(row.pinyin) === key)
      if (onCommon.length > 0) pool = onCommon
    }
  } else if (NEUTRAL_ROW.has(form)) {
    const neutral = pool.filter((row) => /5(\s|$)/.test(row.pinyin))
    if (neutral.length > 0) pool = neutral
  } else if (ctx.readingOf && new Set(pool.map((row) => readingKey(row.pinyin))).size > 1) {
    const wanted = chars.map((ch) => ctx.readingOf(ch))
    const onCommon = pool.filter((row) => {
      const got = syllables(row.pinyin)
      return (
        got.length === chars.length &&
        got.every((syl, i) => !/\d$/.test(syl) || (wanted[i] !== undefined && syl === readingKey(wanted[i])))
      )
    })
    if (onCommon.length > 0) pool = onCommon
  }

  const trads = [...new Set(pool.map((row) => row.trad).filter(Boolean))]
  if (trads.length > 1 && !KEEP_FIRST_ROW.has(form)) {
    const keep = KEEP_TRADITIONAL.get(form)
    let best = trads[0]
    if (keep && trads.includes(keep)) best = keep
    else if (ctx.tradUse) best = trads.reduce((a, b) => (ctx.tradUse(b) > ctx.tradUse(a) ? b : a))
    pool = pool.filter((row) => row.trad === best)
  }
  return pool[0]
}

/**
 * How much traditional text uses a traditional form: the summed frequency of
 * the frequency list's entries that contain it and are plainly traditional
 * (they hold a character no simplified form uses). The list mixes scripts, so
 * a bare count would credit 几 with every simplified 几个.
 */
export function loadTraditionalUse(cedictFile, freqFile) {
  const lines = fs.readFileSync(cedictFile, 'utf8').split('\n')
  const simpChars = new Set()
  const tradForms = []
  for (const line of lines) {
    const m = line.trim().match(CEDICT_LINE)
    if (!m) continue
    tradForms.push(m[1])
    for (const ch of m[2]) simpChars.add(ch)
  }
  const tradOnly = new Set()
  for (const trad of tradForms) for (const ch of trad) if (!simpChars.has(ch)) tradOnly.add(ch)
  const texts = []
  for (const line of fs.readFileSync(freqFile, 'utf8').split('\n')) {
    const [text, count] = line.trim().split(/\s+/)
    if (text && [...text].some((ch) => tradOnly.has(ch))) texts.push([text, Number(count) || 0])
  }
  const cache = new Map()
  return (trad) => {
    if (!cache.has(trad)) cache.set(trad, texts.reduce((sum, [text, n]) => sum + (text.includes(trad) ? n : 0), 0))
    return cache.get(trad)
  }
}

/** Character → common reading, from the committed `characterPinyin.json`. */
export function loadCommonReadings(file) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))
  const chars = [...data.chars]
  const readings = data.pinyin.split(' ')
  return new Map(chars.map((c, i) => [c, readings[i]]))
}
