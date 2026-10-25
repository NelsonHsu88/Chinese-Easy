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
        // Inline pinyin keys and 傳統|简体 pairs, e.g. 皮革的[pi2 ge2 de5]
        .replace(/\[[^\]]*\]/g, '')
        .replace(/[㐀-鿿]+\|[㐀-鿿]+/g, '')
        // Long parenthetical grammar notes
        .replace(/\([^)]*\)/g, '')
        .replace(/["“”]/g, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/\s*[;,]\s*$/, '')
        .trim(),
    )
    // Stripping the apparatus above can leave dangling fragments ("... or  )"),
    // so drop anything with orphaned punctuation or leftover CJK.
    .filter((d) => d && d.length <= 60 && !/[()\[\]|]/.test(d) && !/[㐀-鿿]/.test(d))
    .filter((d) => /[a-z]/i.test(d))
  const gloss = parts.slice(0, 3).join('; ')
  return gloss.length > 90 ? gloss.slice(0, 90).replace(/[;,]\s*\S*$/, '') : gloss
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

/**
 * Which of CC-CEDICT's rows for one form to use.
 *
 * CC-CEDICT lists a form's readings in no useful order, and taking the first
 * row gave 看 kān "to look after", 跑 páo "to paw", 打 dá "dozen" and 追 duī
 * "to sculpt" — sentences then showed the everyday sense beside a rare one.
 * Proper nouns lose to common words (水 is "water", not "surname Shui"); for a
 * single character, the row on its common reading (Unihan `kMandarin`, from
 * `characterPinyin.json`) wins; otherwise the first row stands.
 *
 * @param rows     `{ pinyin, defs }` in file order (raw CC-CEDICT pinyin)
 * @param common   the character's common reading, tone-marked, or undefined
 */
export function chooseRow(form, rows, common) {
  const usable = rows.filter((row) => !isProperRow(row.pinyin, row.defs))
  const pool = usable.length > 0 ? usable : rows
  if ([...form].length === 1 && common && !KEEP_FIRST_ROW.has(form)) {
    const key = readingKey(common)
    const onCommon = pool.find((row) => readingKey(row.pinyin) === key && cleanGloss(row.defs))
    if (onCommon) return onCommon
  }
  return pool[0]
}

/** Character → common reading, from the committed `characterPinyin.json`. */
export function loadCommonReadings(file) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))
  const chars = [...data.chars]
  const readings = data.pinyin.split(' ')
  return new Map(chars.map((c, i) => [c, readings[i]]))
}
