/*
 * The subscription screen's design system.
 *
 * Like `dashboard/tokens.ts`, `challenges/tokens.ts`, `onboarding/tokens.ts`
 * and `writingGuide/tokens.ts`, **this file is the only place a colour literal
 * belongs** on this screen. It is built almost entirely from absolutely
 * positioned watercolour and inline style objects rather than Tailwind classes,
 * which is precisely how a screen ends up carrying five nearly-identical greens.
 *
 * It belongs to the ivory-and-jade family — the Dashboard, Settings and Review
 * are the same room — but it does not spread `dashColors` the way
 * `settings/tokens.ts` does. The reference paints this screen a degree warmer
 * (#FDF8F0 against the Dashboard's #FCFAF5) and its jade is the muted, inky
 * green of the watercolour rather than the Dashboard's brighter leaf green,
 * because here the green *is* the product: it carries the price cards, the
 * button and every tick. Those two decisions are the palette.
 *
 * Light-only, and deliberately so, for the reason every other screen in this
 * family is: the design rests on warm paper under watercolour, and a dark
 * repaint would be a different design rather than a recolour.
 */

export const subColors = {
  /** Warm cream paper. Never pure white as a page. */
  page: '#FDF8F0',
  /** Card fill: warm near-white, a shade off the page rather than white. */
  card: '#FFFDFC',
  /** The one border on the screen. Warm, so it reads as paper rather than rule. */
  border: '#E8E0D3',

  /** Headline and any type that has to be read first. */
  ink: '#14203A',
  /** Body copy — benefits, plan titles, bubble. */
  body: '#2C3444',
  muted: '#777A78',
  mutedLight: '#9A9B98',

  /** The product green. Buttons, ticks, prices, selected borders. */
  jade: '#4F866B',
  /** Under the button's face, and any jade that has to sit on jade. */
  jadeDark: '#376B56',
  /** The button's face — a hair lighter than `jade`, so the shoulder shows. */
  jadeFace: '#568C70',
  /** A filled jade surface at rest: the benefit icon discs and tick circles. */
  jadeDisc: '#4B8467',
  /** Selected plan tint, and the "Save 25%" pill. */
  jadeSoft: '#E9F1E8',
  /** The faintest jade there is — the selected card's ground. */
  jadeFaint: '#F3F7F1',

  /** Petals. The reference's sakura is desaturated, closer to clay than candy. */
  sakura: '#E6A7A9',

  /** White on jade. Named so a tick and a button label cannot drift apart. */
  onJade: '#FFFFFF',
} as const

/** The 4/8 rhythm, plus the two margins the layout is measured against. */
export const subSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  /** Horizontal content margin. Type, cards and buttons align to it; art does not. */
  screen: 21,
  /** Between the two plan cards. */
  planGap: 11,
} as const

/**
 * Type scale. Sizes and line heights only — the weight comes from the font
 * *family*, because React Native cannot synthesise one and `fontWeight` alone
 * does nothing at all for these faces.
 */
export const subType = {
  /** Nunito ExtraBold. "Learn ad-free" / "You're ad-free". */
  headline: { fontSize: 40, lineHeight: 47, letterSpacing: -0.8 },
  /** Nunito SemiBold. A benefit row, and the ticked benefits of the active state. */
  benefit: { fontSize: 15.5, lineHeight: 21 },
  /** Nunito Bold. "Monthly" / "Yearly". */
  planTitle: { fontSize: 19, lineHeight: 25 },
  /** Nunito SemiBold — the price itself. The currency mark rides smaller. */
  price: { fontSize: 40, lineHeight: 46, letterSpacing: -1 },
  /** Nunito SemiBold, the currency symbol sitting at the price's cap height. */
  priceMark: { fontSize: 22, lineHeight: 28 },
  /** Nunito SemiBold. "/ month". */
  priceUnit: { fontSize: 13.5, lineHeight: 18 },
  /** Nunito Bold, inside the savings pill. */
  savings: { fontSize: 12.5, lineHeight: 17 },
  /** Nunito ExtraBold, on the primary button. */
  button: { fontSize: 17.5, lineHeight: 23 },
  /** Nunito SemiBold — the renewal line and the restore link. */
  fine: { fontSize: 11.5, lineHeight: 16 },
  /** Nunito SemiBold, the restore link. A hair larger than the fine print. */
  link: { fontSize: 13, lineHeight: 18 },
  /** Nunito SemiBold — what Shifu says. */
  bubble: { fontSize: 15, lineHeight: 21 },
  /** Nunito Bold. "Annual plan active". */
  statusTitle: { fontSize: 18.5, lineHeight: 24 },
  /** Nunito SemiBold, the renewal date under it, in jade. */
  statusDate: { fontSize: 16, lineHeight: 22 },
  /** Nunito SemiBold, the cancellation note under that. */
  statusNote: { fontSize: 13.5, lineHeight: 19 },
} as const

export const subRadius = {
  card: 19,
  plan: 19,
  bubble: 19,
  /** The savings pill and any other capsule that is not a button. */
  pill: 11,
} as const

/**
 * Shadows, kept to a whisper.
 *
 * Cards separate from the page with a warm border first; this only stops them
 * lying completely flat. Tinted with the ink rather than black — a black shadow
 * over cream reads as grey dirt under the card. `elevation` is carried on every
 * one of them because a Tailwind `shadow-*` class sets none, and Android draws
 * shadows from that alone.
 */
export const subShadow = {
  shadowColor: subColors.ink,
  shadowOffset: { width: 0, height: 3 },
  shadowRadius: 10,
  shadowOpacity: 0.05,
  elevation: 2,
} as const

/** The speech bubble alone, which has to lift clear of the artwork behind it. */
export const subShadowBubble = {
  shadowColor: subColors.ink,
  shadowOffset: { width: 0, height: 3 },
  shadowRadius: 12,
  shadowOpacity: 0.07,
  elevation: 3,
} as const

/**
 * The hero's share of the screen.
 *
 * A range rather than a number, and this is the screen's whole responsive
 * strategy: the artwork is the one region allowed to change size, so a tall
 * phone spends its extra height on scenery while the type, the plan cards and
 * the button stay exactly the size they were drawn. Below the minimum the page
 * scrolls instead of compressing further.
 */
export const subHero = {
  min: 224,
  /**
   * The ceiling is the reference's own proportion: there, the headline's cap
   * height begins about 41% of the way down the screen, so the scene is a
   * little over a third of the page and never more.
   */
  max: 350,
  /**
   * The height everything *below* the hero occupies, per state, at its minimum
   * gaps — **measured from the running app rather than added up from the style
   * rules**, the same call `lib/pagination.ts` and the writing guide both make.
   * The hero is then given whatever is left over, which is what makes the page
   * fill the screen exactly instead of ending in a band of bare cream.
   *
   * A layout change below the hero has to be re-measured here. The cost of
   * being wrong is small and visible in one direction (a gap at the foot) and
   * small and visible in the other (the page scrolls a little), which is why
   * this is allowed to be a measured constant rather than an `onLayout` — and
   * `onLayout` does not fire for every view under react-native-web anyway, so a
   * hero waiting to be told its height would draw no artwork at all.
   */
  contentBelow: { purchase: 559, active: 472 },
  /** Shifu's height as a share of the hero. He is the tallest thing in it. */
  shifuShare: 0.72,
  /** And on the subscribed screen, where he stands a little larger. */
  shifuShareActive: 0.78,
} as const

export const subMotion = {
  /** Plan selection — border and tint crossfade. */
  select: 180,
  /** The fade from purchase state to active state after a confirmed purchase. */
  stateChange: 280,
} as const

/** The design viewport. Wider screens centre the column rather than stretch it. */
export const SUB_CONTENT_MAX = 430
