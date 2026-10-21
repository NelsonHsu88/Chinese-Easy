/*
 * The Dashboard design system.
 *
 * Like `onboarding/tokens.ts`, `challenges/tokens.ts` and
 * `writingGuide/tokens.ts`, **this file is the only place a colour literal
 * belongs**. The Dashboard is built from tinted card surfaces and absolutely
 * positioned watercolour rather than from Tailwind classes, so hex values
 * scattered through the JSX is exactly how a screen ends up with four
 * near-identical greens and three creams that no longer match each other.
 *
 * Light-only, and deliberately so: the design rests on warm cream paper under
 * watercolour illustration. A dark repaint would be a different design rather
 * than a recolour — the same call the reading screens, the writing guide and
 * onboarding already made.
 */

export const dashColors = {
  /** The page. White by request; it was a warm ivory (#FCFAF5). */
  background: '#FFFFFF',

  navy: '#14203A',
  textSecondary: '#5D6878',
  textMuted: '#919CAA',

  /** Card fill: warm near-white, a shade off the page rather than white. */
  card: '#FFFDFC',
  border: '#E8E5DE',

  green: '#49B35C',
  greenDark: '#318A43',
  greenSoft: '#EEF8EF',

  coral: '#F36D61',
  coralDark: '#DF554A',
  coralSoft: '#FDEBE7',

  lavender: '#8060DE',
  lavenderSoft: '#F2EEFC',

  gold: '#F2BE4B',
  goldSoft: '#FFF4D4',

  /** Unfilled weekday rings and any empty progress track. */
  neutralTrack: '#E9ECE8',

  /**
   * The ring on a day that has not happened yet. Deliberately in the green
   * family rather than the neutral one — it is an opportunity, not a gap.
   */
  greenRing: '#C8E6CE',
} as const

/**
 * Per-card surface tints.
 *
 * Each card is a fill plus a border a step darker than it, rather than a fill
 * plus a shadow — that border is what separates a pale coral card from a pale
 * cream page without the whole screen looking like it is floating.
 */
export const dashSurfaces = {
  review: { fill: '#FCEAE6', border: '#F7D8D1' },
  word: { fill: dashColors.card, border: dashColors.border },
  challenges: { fill: '#F3EFFC', border: '#E4DBF8' },
  /** The inset stats panel inside the challenges card. */
  challengeStats: { fill: '#FAF8FE', border: '#E8E1FA' },
  week: { fill: '#F4F8F2', border: '#DFE9DC' },
} as const

/**
 * Button shoulders — the *side* of a two-part button, seen along its bottom
 * edge, and the colour it lands on when pressed.
 *
 * Each is one step down from the face it sits under, which is the whole trick:
 * too close and the shoulder reads as a stray outline that missed its edge, too
 * far and the button looks broken rather than raised. They live here rather than
 * being derived in code because "a shade darker" is a judgement about this
 * palette, not an arithmetic operation on a hex value.
 */
export const dashShoulders = {
  coral: dashColors.coralDark,
  green: dashColors.greenDark,
  /** Under the "Added ✓" face, which is already `greenDark` and needs its own. */
  greenDeep: '#25703A',
  /** Under the outlined quiet button — warm neutral, a step below `border`. */
  quiet: '#D9D3C7',
} as const

/** The 4/8 scale, plus the one deliberate exception the layout calls for. */
export const dashSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  /** Horizontal content margin. Text and cards align to this; art does not. */
  screen: 20,
  /** Vertical gap between two cards. */
  cardGap: 13,
} as const

/**
 * Type scale. Sizes and line heights only — weight comes from the font
 * *family*, because React Native cannot synthesise one and `fontWeight` alone
 * does nothing. Pair each entry with the family named in its comment.
 */
export const dashType = {
  /** Nunito ExtraBold. The two-line "Good / Morning," greeting. */
  greeting: { fontSize: 38, lineHeight: 41, letterSpacing: -0.5 },
  /** Kalam Bold — the learner's name, over the marker stroke. */
  handwritten: { fontSize: 33, lineHeight: 44 },
  /** Nunito ExtraBold. A card's own title. */
  cardTitle: { fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  /** Nunito ExtraBold, for the slightly smaller titles with an icon beside them. */
  cardTitleSm: { fontSize: 17, lineHeight: 22, letterSpacing: -0.1 },
  /** Nunito SemiBold. The supporting line under a card title. */
  cardBody: { fontSize: 14, lineHeight: 20 },
  /** Nunito SemiBold — the speech bubble's message. */
  bubble: { fontSize: 15, lineHeight: 22 },
  /** Nunito ExtraBold, inside the REVIEW tag. */
  tag: { fontSize: 10.5, letterSpacing: 0.6 },
  /** Nunito ExtraBold, on a primary button. */
  button: { fontSize: 15.5 },
  /** Nunito Bold — "See all" / "View all". */
  link: { fontSize: 13.5 },
  /**
   * Noto Serif TC. The dictionary word itself.
   *
   * The line height is generous for the size on purpose — CJK glyphs fill their
   * em box far more completely than Latin ones, so a ratio that leaves Nunito
   * comfortable clips the top of a character like 謝.
   */
  hanzi: { fontSize: 38, lineHeight: 53 },
  /** Nunito SemiBold, the reading under it. */
  pinyin: { fontSize: 14, lineHeight: 19 },
  /** Nunito Bold, the gloss under that. */
  gloss: { fontSize: 14.5, lineHeight: 20 },
  /** Nunito ExtraBold, the big number in a stat. */
  statValue: { fontSize: 21, lineHeight: 26 },
  /** Nunito SemiBold, the label under it. */
  statLabel: { fontSize: 11.5, lineHeight: 15 },
  /** Nunito Bold, the M/T/W letters. */
  weekday: { fontSize: 12, lineHeight: 16 },
  /**
   * Nunito SemiBold, the numbers up the chart's y axis.
   *
   * Deliberately the smallest type on the screen. An axis is read only when the
   * shape of the line raises a question; at any larger size it competes with
   * the line it exists to annotate.
   */
  axisTick: { fontSize: 10, lineHeight: 13 },
} as const

/**
 * The only shadow on the screen, and it is a hint rather than elevation.
 *
 * Cards separate themselves from the page with a tint and a 1px border; this
 * just stops them lying completely flat. Tinted navy rather than black —
 * a black shadow over cream reads as grey dirt under the card.
 */
export const dashShadow = {
  shadowColor: dashColors.navy,
  shadowOffset: { width: 0, height: 3 },
  shadowRadius: 10,
  shadowOpacity: 0.05,
  elevation: 2,
} as const

/**
 * The geometry the "This Week" card's day strip and its chart both lay out
 * against — declared once here because they have to agree.
 *
 * The strip and the chart are two readings of the same seven days, so a peak
 * must sit directly under the day that produced it. They used to be laid out
 * independently (the strip on fixed 25pt columns, the chart on the card's full
 * width) which put Wednesday's dot 35pt from Wednesday's data point.
 *
 * Both now fill `gutter … width - bonsaiReserve` with seven equal columns, so
 * the alignment holds at any screen width rather than at one.
 */
export const dashWeek = {
  /**
   * Left gutter holding the chart's word-count numbers. The day strip is inset
   * by it too, or the columns would no longer line up with the plot.
   */
  gutter: 22,
  /**
   * Right inset that keeps the seven columns clear of the bonsai.
   *
   * The tree is 96 wide at `right: -6`, and the card contributes 1pt of border
   * plus 18pt of padding — so it reaches 71pt into the content box, and this is
   * that plus a 6pt breath. Change either and this has to move with it.
   */
  bonsaiReserve: 77,
  /**
   * Largest a day dot is allowed to get. Below about a 380pt screen the column
   * is narrower than this and the dot shrinks with it rather than colliding
   * with its neighbour.
   */
  dotMax: 25,
} as const

/** Slightly lifted — the streak pill and the primary buttons only. */
export const dashShadowLifted = {
  shadowColor: dashColors.navy,
  shadowOffset: { width: 0, height: 4 },
  shadowRadius: 12,
  shadowOpacity: 0.08,
  elevation: 3,
} as const

export const dashRadius = {
  card: 20,
  inner: 14,
  pill: 24,
  tag: 12,
} as const

/**
 * Card heights, so the vertical rhythm lives in one place rather than being
 * re-derived from padding at four different call sites.
 *
 * These are *minimums*, not fixed heights: a long gloss or a three-line
 * message must be allowed to push its card taller rather than being clipped,
 * which is what would happen on a large accessibility text size.
 */
export const dashHeights = {
  /*
   * Trimmed from 320 after measuring the first viewport on a 390x844 screen.
   * The reference is rendered on a taller phone than a real iPhone, so matching
   * its proportions exactly pushed the bottom of the word card just past the
   * fold — and the whole point of that card is the two buttons underneath it.
   */
  hero: 306,
  review: 158,
  word: 226,
  challenges: 168,
  /** Header, the seven-day strip, and the words-per-day chart with its axes. */
  week: 226,
} as const

/** Motion. Restrained — a press response and nothing that loops. */
export const dashMotion = {
  /** Press dip, and the spring back out. */
  press: 110,
  pressScale: 0.975,
} as const

/**
 * The Dashboard's entrance, as a score.
 *
 * The screen assembles itself in the order a person would draw it: the scene
 * first, then who is being spoken to, then what there is to do, then Shifu, then
 * what he says. Every `at` is milliseconds from the start of the run, so the
 * whole choreography can be read — and retimed — in one place rather than being
 * scattered across six components as magic delays.
 *
 * Two overlaps are deliberate rather than incidental, and both will look wrong
 * if the numbers are changed independently:
 *
 * - **Shifu starts before the cards have finished.** He rises out of the same
 *   edge they are still arriving from, so he reads as coming up out of them
 *   rather than as a seventh separate thing appearing afterwards. `shifu.at`
 *   must stay below `cards.at + stagger × 3 + cards.for`.
 * - **The bubble arrives as Shifu settles**, not after he has stopped, because
 *   somebody speaking begins before they are quite still.
 *
 * Distances are short on purpose. This is a scene settling into place, not six
 * elements flying in from off-screen; past about 40pt the movement stops reading
 * as arrival and starts reading as a transition between two different screens.
 */
export const dashEntrance = {
  /** Horizontal travel for the scenery and the greeting. */
  slideX: 26,
  /** Vertical travel for the cards and the bubble. */
  slideY: 30,
  /** Shifu's rise. Longer than the cards' — he comes from further down. */
  shifuRise: 46,

  /** Sakura and the pagoda range, together, in from the right. */
  scenery: { at: 0, for: 560 },
  /** The greeting and the learner's name, in from the left. */
  greeting: { at: 170, for: 460 },
  /** The action cards, up from the bottom, one after another. */
  cards: { at: 360, for: 440, stagger: 60 },
  /** Shifu, up out of the cards. */
  shifu: { at: 600, for: 540 },
  /** The speech bubble. */
  bubble: { at: 1120, for: 300 },
  /** His line, typed on. `perChar` is a speaking pace, not a machine's. */
  typing: { at: 1380, perChar: 16 },

  /**
   * How long the scene takes to disassemble on the way out.
   *
   * The entrance replays on every focus, which only works if the screen is left
   * *displaced*: parked settled, the next visit paints one frame of the finished
   * Dashboard before the entrance yanks it back to the start, which reads as the
   * screen loading twice. This is what parks it.
   *
   * Animated rather than snapped because leaving is not always instant — a
   * pushed screen slides over this one, and for the length of that slide the
   * Dashboard is still on screen underneath. Quick, and on an accelerating
   * curve: the scene is being left, so it need not be followed out.
   */
  leave: 180,

  /**
   * Extra ms before a backstop force-settles an animation at its final value.
   *
   * Without the native driver these run on requestAnimationFrame, which a
   * browser stops dead for a background tab — so opening the app in one and
   * coming back later would otherwise find the whole scene parked off-screen at
   * opacity 0 with a half-typed sentence, permanently. Same defence, and the
   * same reason, as the claim animation in `Challenges.tsx`.
   */
  backstop: 140,
} as const

/** The design viewport. Wider screens centre the column rather than stretch it. */
export const DASH_CONTENT_MAX = 430

// --- Home (the SS1012 redesign) -------------------------------------------------

/*
 * The redesigned Home screen ("SS1012 Home Page Redesign UI 2") sets everything
 * in Lora on the same white page, so it keeps its own palette here rather than
 * bending the Nunito-era values above. Accents are sampled from the reference.
 */
export const homeColors = {
  ink: dashColors.navy,
  /** Blue-grey serif body: "Keep your streak alive!", the pinyin, the bubble. */
  subtle: '#5E6C8A',
  /** Small labels: weekday letters, the date range, chart counts. #8A94A8 was ~3:1 on the cards; this is ~4.7:1. */
  muted: '#687290',

  coral: '#E96B59',
  coralShoulder: '#C9533F',
  /** The Review heading's icon disc. */
  tagFill: '#FDDFD8',
  tagInk: '#B5291D',

  green: '#5BAD69',
  greenShoulder: '#41904F',
  /** "Added ✓", a step deeper than the face it replaces. */
  greenDeep: '#3E8E4C',
  greenDeepShoulder: '#2D7139',
  /** Green type on white: See all, View stats, the week's message. */
  greenInk: '#3D8B4B',
  greenSoft: '#EAF4EA',
  greenLine: '#B9DCC0',
  /** A day ring that has not been filled. */
  greenRing: '#AFD3B7',
  /** The strip's connecting line. */
  greenTrack: '#D7EBDA',

  /** "View all" on the challenges card. */
  crimson: '#BE2F25',
  crimsonLine: '#F1C3BC',

  /** The "Earn reward" pill on the gift. */
  goldPill: '#FEE2AE',
  goldPillLine: '#F2C77E',
  /** The raised "Earn reward" button's shoulder, a step under its face. */
  goldPillShoulder: '#E9B65C',
  /** The soft wash under the learner's name on Home. */
  nameWash: '#F8DE96',
  goldPillInk: '#A2381C',

  /** Step rings on the challenge path, and the brush stroke joining them. */
  stepRing: '#C6CDDA',
  stepTrack: '#CDD0D6',
  checkRing: '#9AA5BB',

  /** "Not now" — the quiet outlined button beside Add this word. */
  quietLine: '#DCDDD9',
  quietShoulder: '#E4E3DF',

  bubbleBorder: '#E6E8EE',
  white: '#FFFFFF',

  /*
   * The refined Home: fewer, quieter colours. (Its buttons are back on the
   * lighter `coral` and `green` above, by request.) `jade` is for icons and
   * small type on pale fills.
   */
  jade: '#4A7F5C',
  /** Completed challenge steps and the week's active days. */
  sage: '#6F9B78',
  sageSoft: '#E9F1EA',
  /** Secondary buttons and the streak pill. */
  ivory: '#FAF9F6',
  hairline: '#E5E4DC',
  /** A neutral step ring, an idle day, the challenge track. */
  idle: '#D9D7CF',
  track: '#E8E7E1',
  /** The reward row. */
  gold: '#C49A49',
  goldInk: '#8F6C2A',
  goldWash: '#FBF3DF',
} as const

/**
 * The card fills, sampled from the reference. The watercolour in
 * `assets/images/home/` was keyed against exactly these by
 * `scripts/processHomeArt.mjs` — change one and re-run that script, or the
 * painting sits on its card with a halo.
 */
export const homeSurfaces = {
  /* `wash`: the deeper end of each card's SS1017 gradient (`PlayWash`). */
  review: { fill: '#FDEEE9', wash: '#FBDCD3', border: '#F8D3CC' },
  word: { fill: '#FEFEFE', border: '#E2E1DE' },
  challenges: { fill: '#FEF9EE', wash: '#FCEFD2', border: '#F0D8B6' },
  week: { fill: '#F6FAF4', border: '#E0EAE1' },
} as const

/**
 * Type, all Lora except the name (Kalam) and the hanzi. Sized from the
 * reference at a 390pt column, then nudged up where it fell under 12pt — the
 * mockup's smallest labels would be too small to read on a phone.
 */
export const homeType = {
  /** Lora Bold. */
  greeting: { fontSize: 23, lineHeight: 29, letterSpacing: -0.3 },
  /** Lora Bold, over the marker stroke (SS1017). A step down from 46, so the name doesn't shout over the greeting. */
  name: { fontSize: 36, lineHeight: 42, letterSpacing: -0.6 },
  /** Lora — "Great to see you!" under the name. */
  welcome: { fontSize: 15.5, lineHeight: 21 },
  /** Lora. */
  bubble: { fontSize: 14.5, lineHeight: 20 },
  /** Lora, uppercase. */
  tag: { fontSize: 11, letterSpacing: 0.8 },
  /** Lora Bold — "2 words due". */
  due: { fontSize: 22, lineHeight: 27, letterSpacing: -0.2 },
  /** Lora Bold — a full-width card's title. */
  title: { fontSize: 18, lineHeight: 23, letterSpacing: -0.1 },
  /** Lora — the line under a title. */
  body: { fontSize: 13.5, lineHeight: 18 },
  /** Lora Bold — button labels. */
  button: { fontSize: 15.5 },
  /** Lora — pill links. */
  link: { fontSize: 13 },
  pinyin: { fontSize: 16, lineHeight: 21 },
  gloss: { fontSize: 15, lineHeight: 20 },
  /** Lora — challenge step labels, and the weekday letters. */
  label: { fontSize: 12, lineHeight: 16 },
} as const

export const homeLayout = {
  /** Side margin. The reference's cards sit 17pt in at 390. */
  screen: 16,
  /** Between two cards, across and down, and under the greeting. */
  gap: 16,
  /** Inside every card. */
  cardPad: 14,
  /** Every Home button: 44pt is the touch-target floor. */
  buttonHeight: 44,
  /** Inside the greeting and bubble, past the card edge, as in the reference. */
  heroInset: 8,
} as const

/** The reference's own width, which every art offset below is measured in. */
export const HOME_REF_WIDTH = 863

// --- Playful tints (the SS1017 redesign) -----------------------------------------

/*
 * The SS1017 references ("Learn and Chinese Basic", "New words flashcard and
 * Review", "Dictionary and Pronunciation", "Profile") stop every card being the
 * same cream: each destination wears its own pale watercolour wash, and its
 * chevron, chip, progress bar and number badge pick up the same hue a step or
 * two deeper. One family, five hues, shared by every redesigned screen so a
 * "blossom" card on Review is the same pink as one on Learn.
 *
 * Per hue:
 * - `fill`    the card wash at its text end.
 * - `wash`    the deeper wash at its painted end (cards run `wash` → `fill`,
 *             left to right — `PlayWash` in dashboard/playWash.tsx).
 * - `border`  its hairline, one step down — what separates a pale card from the
 *             white page without a heavy shadow.
 * - `soft`    the chevron disc, chip and track fill sitting *on* the wash.
 * - `ink`     icons, chevrons and bar fills (graphic contrast ≥ 3:1 on `soft`).
 * - `text`    words drawn in the hue — chips, counts, links (≥ 4.5:1 on `soft`).
 * - `badge`   the solid numbered disc on a section header (white text on it).
 *
 * Card art that sits on these is the `assets/images/tinted/` set, keyed by
 * `scripts/processTintedArt.mjs` so its paper takes the wash rather than
 * showing as a cream box. Light-only, like the rest of the family.
 */
export const playTints = {
  jade: { fill: '#EFF8EE', wash: '#DDEFD7', border: '#CFE6CA', soft: '#D6EDD0', ink: '#358A49', text: '#2A6F3B', badge: '#4A9A5B' },
  blossom: { fill: '#FDF1F0', wash: '#FBE0DC', border: '#F3D2CE', soft: '#F9D8D4', ink: '#C9474A', text: '#A3323A', badge: '#D65A5C' },
  sky: { fill: '#EDF5FD', wash: '#DCEAFB', border: '#CFE0F5', soft: '#D5E5F9', ink: '#3E78CF', text: '#2A5A9E', badge: '#4F8BE0' },
  honey: { fill: '#FDF6E6', wash: '#FAEACB', border: '#EEDDB4', soft: '#F7E5BE', ink: '#A6731A', text: '#855C10', badge: '#C08A2A' },
  lilac: { fill: '#F5F1FC', wash: '#E9E0FA', border: '#DDD2F4', soft: '#E3D8F8', ink: '#7457D2', text: '#563AAD', badge: '#8C6EE0' },
} as const

export type PlayHue = keyof typeof playTints
export type PlayTint = (typeof playTints)[PlayHue]

/** The order hues are dealt out when a list has no meaning to colour by. */
export const PLAY_HUE_ORDER: readonly PlayHue[] = ['jade', 'blossom', 'sky', 'honey', 'lilac']

/** A hue for the n-th item of a list, cycling through `PLAY_HUE_ORDER`. */
export function playHueAt(index: number): PlayHue {
  return PLAY_HUE_ORDER[((index % PLAY_HUE_ORDER.length) + PLAY_HUE_ORDER.length) % PLAY_HUE_ORDER.length]
}

/** Shifu's handwritten speech bubble on the "New App Design" heroes (`refScene.tsx`). */
export const refBubble = {
  fill: '#FDF9F1',
  border: '#EEE4D2',
  ink: '#3A3A48',
} as const

/** The new references' neutral card: warm paper with a hairline (Dictionary tiles, Word to Discover). */
export const refSurface = {
  cream: '#FDFBF4',
  creamBorder: '#EDE7D8',
} as const
