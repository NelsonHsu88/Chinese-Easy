/*
 * The shape of Chinese Basics content. Data only — what a step *does* lives in
 * `components/basics/steps/`, the rules about answers and progress in
 * `lib/basics.ts` and `lib/basicsEngine.ts`.
 *
 * ── Script ──────────────────────────────────────────────────────────────────
 * A plain string of hanzi is drawn as written, so it must be the same in both
 * scripts (人, 你好). Anything that differs is a `{ t, s }` pair. English text
 * can embed a pair as `{{學|学}}` (traditional first); see `basicsText`.
 *
 * ── Readings ────────────────────────────────────────────────────────────────
 * A reading is pinyin with tone marks, one syllable per space, and is drawn as
 * zhuyin for a zhuyin learner. An unmarked syllable is a neutral tone. Inside
 * any English text a reading is written `[[nǐ hǎo]]`, so a zhuyin learner never
 * meets pinyin in prose (`localize` in `lib/basics.ts`; the tests enforce it).
 *
 * ── Notation ────────────────────────────────────────────────────────────────
 * Pinyin and zhuyin are taught as two systems, not one relabelled. Any text can
 * be a `Phon` pair, any step can be limited to one system with `only`, and a
 * lesson that teaches symbols (`notation: true`) keeps separate progress per
 * system — see `lessonKey`.
 *
 * ── Audio ───────────────────────────────────────────────────────────────────
 * The app has no recorded Mandarin yet. Everything audible is spoken by the
 * device's Mandarin voice from **hanzi** — a whole syllable or word, never a
 * bare letter or symbol, which no Mandarin voice says reliably. A step that
 * shows a sound on its own plays it inside real syllables instead.
 */

export type Zh = string | { t: string; s: string }

export type Phonetic = 'pinyin' | 'zhuyin'
/** Text that differs between the two notation tracks. */
export type Phon<T = string> = T | { pinyin: T; zhuyin: T }

export type BasicsGroupId = 'pronunciation' | 'characters' | 'writing' | 'sentences'

/** 1–4 for the four tones, 5 for the neutral tone. */
export type Tone = 1 | 2 | 3 | 4 | 5

export interface ZhItem {
  zh: Zh
  /** Space-separated pinyin, one syllable per token. */
  pinyin?: string
  gloss?: string
}

/** A sound unit, written in both systems. Never spoken on its own. */
export interface SoundSymbol {
  pinyin: string
  zhuyin: string
}

export interface ChoiceOption {
  /** Plain English. */
  label?: Phon
  /** A reading, converted to zhuyin for a zhuyin learner. */
  pinyin?: string
  /** A sound symbol, drawn in the learner's system. */
  symbol?: SoundSymbol
  zh?: Zh
  /** A tone, drawn as its contour with its name. */
  tone?: Tone
  /** Feedback when this wrong option is picked — what it actually is. */
  why?: Phon
}

export type BasicsStep = { only?: Phonetic } & (
  | {
      kind: 'explain'
      title: Phon
      body: Phon
      items?: ZhItem[]
      /** Draw both reading systems under each item, whatever the setting. */
      bothReadings?: boolean
      /** Draw each item as traditional → simplified. */
      bothScripts?: boolean
      /** A "Learn more" disclosure, closed by default. */
      more?: Phon
    }
  | { kind: 'listen'; title: Phon; body: Phon; items: ZhItem[]; bothReadings?: boolean }
  | {
      /** One sound, taught on its own screen and heard inside real syllables. */
      kind: 'sound'
      symbol: SoundSymbol
      /** Where the tongue and lips go. */
      how: Phon
      /** Syllables that carry the sound — the first is the main example. */
      examples: ZhItem[]
      /** A sound often confused with this one, heard side by side. */
      contrast?: { symbol: SoundSymbol; example: ZhItem; note: Phon }
    }
  | {
      /** A syllable taken apart: tap each part. */
      kind: 'syllable-parts'
      title: Phon
      body: Phon
      whole: ZhItem
      /** Initial (may be absent), final, tone. */
      initial?: { symbol: SoundSymbol; note: Phon }
      final: { symbol: SoundSymbol; note: Phon; audio?: ZhItem }
      tone: Tone
    }
  | {
      /** The tones, each with its contour and an example. */
      kind: 'tones'
      title: Phon
      body: Phon
      items: { tone: Tone; item: ZhItem; note: string }[]
    }
  | {
      kind: 'choice'
      prompt: Phon
      /** Shown above the options. */
      zh?: ZhItem
      /** Spoken when the step opens — a listening check. */
      audio?: Zh
      options: ChoiceOption[]
      answer: number
      explain: Phon
    }
  | {
      /** Pick an initial, a final and a tone; hear the syllable if it exists. */
      kind: 'syllable-builder'
      title: Phon
      body: Phon
      /** Pinyin initials offered (keys of `INITIAL_SYMBOLS`). */
      initials: string[]
      /** Pinyin finals offered (keys of `FINAL_SYMBOLS`). */
      finals: string[]
      /** Syllables the learner must build before continuing, e.g. `mā`. */
      targets: string[]
    }
  | {
      /** A character in its square, its parts tappable. */
      kind: 'character-explorer'
      title: Phon
      body: Phon
      character: ZhItem
      layout: CharacterLayout
      parts: CharacterPart[]
    }
  | {
      kind: 'stroke'
      title: Phon
      body: Phon
      character: Zh
      /**
       * `watch` plays the animation; the rest are quizzes with less help each
       * time: `guided` flashes the next stroke first, `outline` shows only the
       * faint character, `free` shows nothing but the grid.
       */
      guidance: 'watch' | 'guided' | 'outline' | 'free'
    }
  | {
      /** Free practice: the learner picks which character to write. */
      kind: 'stroke-picker'
      title: Phon
      body: Phon
      characters: ZhItem[]
    }
  | {
      /** Tap words into order. */
      kind: 'sentence-builder'
      prompt: Phon
      /** The sentence, word by word, in order. */
      words: ZhItem[]
      /** The order the tiles are offered in — indexes into `words`. Never already solved. */
      shuffled: number[]
      /** Closing punctuation, drawn after the last tile (。 or ？). */
      end: string
      /** English meaning, shown as the target. */
      meaning: string
      explain: Phon
    }
  | {
      /** A short exchange, each line playable. */
      kind: 'dialogue'
      title: Phon
      body: Phon
      lines: { speaker: 'A' | 'B'; item: ZhItem }[]
    }
  | { kind: 'recap'; points: Phon[] }
)

export type CharacterLayout = 'single' | 'left-right' | 'top-bottom' | 'enclosure'

export interface CharacterPart {
  zh: Zh
  /** What the part contributes. */
  role: 'meaning' | 'sound' | 'shape'
  /** Its own meaning or sound. */
  gloss: string
  /** Where it sits: `a` is left/top/outside, `b` right/bottom/inside. */
  slot: 'a' | 'b' | 'whole'
  note: Phon
  /** Other characters with this part. */
  related?: ZhItem[]
}

export interface BasicsLesson {
  id: string
  group: BasicsGroupId
  /** Section heading within the group's list ("Getting started"). */
  module?: string
  title: Phon
  subtitle: Phon
  minutes: number
  /**
   * What the learner can do afterwards — shown on the finish card. Either a
   * list of lines (each may be a `Phon`), or one list per notation track.
   */
  objectives: Phon[] | { pinyin: string[]; zhuyin: string[] }
  /** Teaches symbols, so its progress is kept per notation system. */
  notation?: boolean
  steps: BasicsStep[]
}

export interface BasicsGroup {
  id: BasicsGroupId
  title: string
  description: string
  /** The group screen's intro line, a little longer than the tile's. */
  intro: string
}
