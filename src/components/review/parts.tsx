import type { ComponentType, ReactNode } from 'react'
import { View, Text, Image, Pressable, Animated } from 'react-native'
import Svg, { Ellipse } from 'react-native-svg'
import { ChevronRight, BookMarked } from 'lucide-react-native'
import { PressableScale } from '../dashboard/parts'
/* The entrance machinery is shared with the Dashboard rather than reimplemented
   — same `Animated`-not-Reanimated constraint, same hidden-tab backstop. Only
   the timings differ, and those live in `revEntrance`. */
import { useReveal } from '../dashboard/entrance'
import {
  revColors as c,
  revSpacing as s,
  revType as t,
  revCard,
  revRadius,
  revShadow,
  revShadowLifted,
  revEntrance,
} from './tokens'

/*
 * The Review hub's building blocks, built to its reference mockup.
 *
 * Press response is `PressableScale` borrowed from the Dashboard rather than
 * reimplemented: this screen is one tap off that one, and a card that dips by a
 * different amount here than it does there is the kind of difference nobody can
 * name but everybody feels.
 */

export const REVIEW_ART = {
  /**
   * The flat vector Shifu, not the Dashboard's watercolour bowing render.
   *
   * The reference draws him small and head-on beside a speech bubble, which is
   * this asset — the watercolour one is a full-length figure at 300×704 that
   * only works cropped at the hem, and cropping it into a 120pt hero leaves a
   * head and no hands.
   */
  shifu: { source: require('../../assets/images/mascot-shifu.png'), ratio: 249 / 384 },
  mountains: { source: require('../../assets/images/onboarding/pagoda-mountains.png'), ratio: 460 / 277 },
  bonsai: { source: require('../../assets/images/dashboard/bonsai.png'), ratio: 290 / 197 },
  fire: { source: require('../../assets/images/icons/fire.png') },
} as const

// --- Top bar ------------------------------------------------------------------

/** The streak, as a floating pill. Real streak data — never a fixed number. */
export function StreakPill({ streak }: { streak: number }) {
  return (
    <View
      className="flex-row items-center"
      style={{
        height: 42,
        paddingHorizontal: 15,
        borderRadius: revRadius.pill,
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.border,
        gap: 7,
        ...revShadowLifted,
      }}
    >
      {/* The app's own painted flame rather than a platform emoji, which renders
          as a different picture on every OS. */}
      <Image source={REVIEW_ART.fire.source} style={{ width: 20, height: 20 }} resizeMode="contain" />
      <Text className="font-nunito-extrabold" style={{ ...t.streak, color: c.navy }}>
        {streak}
      </Text>
    </View>
  )
}

// --- Hero ---------------------------------------------------------------------

/** How tall the illustrated strip is. */
export const HERO_HEIGHT = 132

/** Shifu's drawn height. Everything else in the row is measured off his width. */
const SHIFU_HEIGHT = 126

/** The range's width, as a fraction of the column. */
const RANGE_SHARE = 0.56

/** How far the range is allowed past the right edge. Small, deliberately: the
 *  pagoda sits at the right end once mirrored, so a generous bleed pushes the
 *  one thing worth seeing off the screen. */
const RANGE_BLEED = 20

/**
 * How much of the mirrored render the pagoda occupies, measured from its right
 * edge.
 *
 * This is the only part of the scenery the bubble must not reach. The mountains
 * behind it are a pale wash and a white bubble sitting over them reads as depth;
 * the pagoda is the one piece of drawn detail, and text across a roofline reads
 * as a mistake. Keeping the two apart is what this fraction buys, and it is
 * measured off the *pagoda* rather than off the whole range so the bubble is
 * free to use everything to its left.
 */
const PAGODA_SHARE = 0.36

/**
 * Shifu, his line, and the range behind them.
 *
 * Deliberately about a third the height of the Dashboard's hero. This screen is
 * somewhere a learner arrives already knowing what they came to do, so the
 * scenery is here to keep the room warm, not to be looked at — the three drill
 * cards are what the eye should land on.
 *
 * **The three overlap on purpose, but not anywhere.** The bubble is allowed to
 * sit over the mountains — a white card over a pale wash reads as depth, and
 * holding it clear of the whole range left a band of dead space across the top
 * of the screen. What it may not reach is the pagoda, the one piece of drawn
 * detail in the scene.
 *
 * So the bubble's width is derived from where the *pagoda* starts rather than
 * guessed at. A fixed width that clears it on a 390pt screen sits across it on a
 * 360pt one, which is exactly how the bubble covered the roofline before.
 */
export function ReviewHero({
  message,
  width,
  run,
}: {
  message: string
  width: number
  /** Ticks on focus; restarts the entrance. */
  run: number
}) {
  const shifuWidth = SHIFU_HEIGHT * REVIEW_ART.shifu.ratio

  const rangeWidth = width * RANGE_SHARE
  /* Where the roofline begins, in the hero's own coordinates. */
  const pagodaLeft = width + RANGE_BLEED - rangeWidth * PAGODA_SHARE

  const bubbleLeft = shifuWidth + 6
  const bubbleMax = Math.max(150, pagodaLeft - bubbleLeft - 8)

  const beat = { at: revEntrance.at, duration: revEntrance.for, run }

  /*
   * The range carries its own `scaleX: -1` through the reveal rather than in a
   * static style: an animated `transform` replaces the whole array instead of
   * merging into it, so a mirror left behind in `style` is simply discarded and
   * the pagoda lands back on the wrong side.
   */
  const range = useReveal({
    ...beat,
    from: 'right',
    distance: revEntrance.slideX,
    toOpacity: 0.55,
    extraTransform: [{ scaleX: -1 }],
  })

  const shifu = useReveal({ ...beat, from: 'bottom', distance: revEntrance.slideY })
  const bubble = useReveal({ ...beat, from: 'bottom', distance: revEntrance.slideY })

  return (
    <View style={{ height: HERO_HEIGHT }}>
      {/*
        Mirrored, which puts the pagoda on the right-hand side and runs the ridge
        line back to the left — the arrangement the reference shows. `scaleX: -1`
        on the existing render rather than a second copy of a 200kB PNG.
      */}
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', right: -RANGE_BLEED, top: 4 }, range]}
      >
        <Image
          source={REVIEW_ART.mountains.source}
          style={{ width: rangeWidth, height: rangeWidth / REVIEW_ART.mountains.ratio }}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, bottom: 0 }, shifu]}>
        <Image
          source={REVIEW_ART.shifu.source}
          style={{ width: shifuWidth, height: SHIFU_HEIGHT }}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View
        style={[
          { marginLeft: bubbleLeft, marginTop: 12, maxWidth: bubbleMax, alignSelf: 'flex-start' },
          bubble,
        ]}
      >
        <SpeechBubble message={message} />
      </Animated.View>
    </View>
  )
}

/**
 * Shifu's line.
 *
 * The bubble hugs its text — `alignSelf: 'flex-start'` on the wrapper, no fixed
 * width — because a bubble stretched to fill the row is mostly empty bubble.
 *
 * The quotation mark is absolutely positioned rather than sitting above the
 * text, and that is the difference between a compact bubble and a roomy one: in
 * flow it is a whole line of pure whitespace pushing the sentence down for an
 * accent two characters wide. It is a real glyph rather than an icon, because a
 * stroked quote-mark icon at this size reads as two commas that have come loose.
 */
function SpeechBubble({ message }: { message: string }) {
  return (
    <View>
      <View
        style={{
          backgroundColor: c.card,
          borderRadius: revRadius.bubble,
          paddingLeft: 16,
          paddingRight: 14,
          paddingTop: 11,
          paddingBottom: 13,
          ...revShadow,
        }}
      >
        <Text
          className="font-nunito-extrabold"
          pointerEvents="none"
          style={{ position: 'absolute', left: 7, top: 3, fontSize: 17, color: c.coral }}
        >
          &#8220;
        </Text>
        <Text className="font-nunito-extrabold" style={{ ...t.bubble, color: c.navy }}>
          {message}
        </Text>
      </View>

      {/*
        The tail, pointing at Shifu. A rotated square rather than a triangle, so
        it inherits the bubble's own fill and reads as part of the same shape; it
        sits slightly inside the left edge to hide the seam.
      */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: -5,
          top: 27,
          width: 14,
          height: 14,
          backgroundColor: c.card,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  )
}

// --- Stats --------------------------------------------------------------------

/**
 * The three headline numbers, in one card with hairline dividers.
 *
 * One card rather than three tiles: these are three readings of the same deck,
 * and splitting them into separate surfaces would say they were three unrelated
 * facts. The dividers are inset top and bottom so they read as separators rather
 * than as a table's rules.
 */
/**
 * A quiet row that opens the deck for reading rather than for drilling.
 *
 * Deliberately not a `DrillCard`: the three below it all *start* something, and
 * a fourth tile the same size and shape would read as a fourth drill. This is
 * one line, on the card surface rather than a tinted one, with a chevron — the
 * shape the rest of the app uses for "go and look at a list".
 */
export function DeckPeekCard({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.985}
      accessibilityLabel={`My Words, ${count} ${count === 1 ? 'word' : 'words'} in your deck`}
    >
      <View
        className="flex-row items-center"
        style={{
          backgroundColor: c.card,
          borderRadius: revRadius.card,
          borderWidth: 1,
          borderColor: c.border,
          paddingHorizontal: revCard.padding,
          paddingVertical: s.md,
          gap: s.md,
          ...revShadow,
        }}
      >
        <View
          className="items-center justify-center rounded-full"
          style={{ width: 38, height: 38, backgroundColor: c.greenSoft }}
        >
          <BookMarked size={19} color={c.greenDark} strokeWidth={2.2} />
        </View>

        <View style={{ flex: 1 }}>
          <Text className="font-nunito-extrabold" style={{ ...t.cardTitle, color: c.navy }}>
            My Words
          </Text>
          <Text className="font-nunito-semibold" style={{ ...t.cardBody, color: c.textSecondary }}>
            {count === 0 ? 'Nothing in your deck yet' : `Look through all ${count}`}
          </Text>
        </View>

        <ChevronRight size={20} color={c.textMuted} strokeWidth={2.4} />
      </View>
    </PressableScale>
  )
}

export function StatsCard({ children }: { children: ReactNode[] }) {
  return (
    <View
      className="flex-row"
      style={{
        backgroundColor: c.card,
        borderRadius: revRadius.card,
        borderWidth: 1,
        borderColor: c.border,
        paddingVertical: s.lg,
        ...revShadow,
      }}
    >
      {children.map((column, i) => (
        <View key={i} className="flex-1 flex-row">
          {i > 0 && (
            <View style={{ width: 1, marginVertical: 2, backgroundColor: c.border }} />
          )}
          <View className="flex-1">{column}</View>
        </View>
      ))}
    </View>
  )
}

/**
 * One column of the stats card.
 *
 * `onPress` is optional and only the first column has one — "Words due" opens
 * the list of them, which is behaviour the old screen had and there is no reason
 * to lose just because the reference does not draw a chevron on it.
 */
export function Stat({
  value,
  label,
  icon: Icon,
  iconColor,
  iconFill,
  onPress,
}: {
  value: number
  label: string
  icon: ComponentType<{ color: string; size: number; strokeWidth: number; fill?: string }>
  iconColor: string
  /** Painted interior. The flame and the warning triangle are solid, the calendar is not. */
  iconFill?: string
  onPress?: () => void
}) {
  const body = (
    <View className="items-center">
      <Text className="font-nunito-extrabold" style={{ ...t.statValue, color: c.navy }}>
        {value}
      </Text>
      <Text
        className="font-nunito-semibold"
        style={{ ...t.statLabel, color: c.textSecondary, marginTop: 1 }}
      >
        {label}
      </Text>
      <View style={{ marginTop: 7 }}>
        <Icon color={iconColor} size={18} strokeWidth={2.2} fill={iconFill ?? 'transparent'} />
      </View>
    </View>
  )

  if (!onPress) return body

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${value} ${label}. Browse them.`}
      className="active:opacity-60"
    >
      {body}
    </Pressable>
  )
}

// --- Drill cards --------------------------------------------------------------

/**
 * One drill: circle, tag, title, two lines, a count, and a chevron button.
 *
 * The whole card is the target — one 126pt card rather than a 40pt chevron to
 * aim at. The chevron is therefore a plain View, not a Pressable: nesting one
 * pressable inside another double-fires on the web target, where the synthetic
 * event bubbles from the inner handler to the outer one and opens the session
 * twice.
 */
export function DrillCard({
  tag,
  title,
  description,
  count,
  fill,
  ink,
  badge,
  onPress,
  minHeight = revCard.minHeight,
}: {
  tag: string
  title: string
  description: string
  /**
   * The due count, already formatted. A string rather than a number because
   * zero is drawn as a dash: a bold `0` reads as a broken counter, where a dash
   * reads as "nothing here", which is the truth and is not a failure.
   */
  count: string
  fill: string
  ink: string
  badge: ReactNode
  onPress: () => void
  /**
   * Overrides the designed height on a viewport with room to spare — see
   * `vspace` in `lib/verticalSpace.ts`. Still a *minimum*: a long description at
   * large accessibility text sizes may push the card past it either way.
   */
  minHeight?: number
}) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      accessibilityLabel={`${title}. ${count === '—' ? 'None' : count} due. ${description}`}
    >
      <View
        className="flex-row items-center"
        style={{
          minHeight,
          borderRadius: revCard.radius,
          backgroundColor: fill,
          paddingHorizontal: revCard.padding,
          paddingVertical: s.lg,
        }}
      >
        {badge}

        <View style={{ flex: 1, marginLeft: revCard.circleGap, marginRight: s.md }}>
          <View
            className="self-start"
            style={{
              height: 20,
              paddingHorizontal: 9,
              borderRadius: 10,
              justifyContent: 'center',
              /* A white pill on a tinted card. A *paler tint* of the card's own
                 colour, which is what the spec asks for, is invisible against
                 the card it sits on. */
              backgroundColor: c.card,
            }}
          >
            <Text className="font-nunito-extrabold" style={{ ...t.tag, color: ink }}>
              {tag.toUpperCase()}
            </Text>
          </View>

          <Text
            className="font-nunito-extrabold"
            style={{ ...t.cardTitle, color: c.navy, marginTop: 5 }}
          >
            {title}
          </Text>
          {/*
            Held to two lines. The reference wraps every description at two, and
            a third would push one card taller than its neighbours — which is the
            fastest way to lose the shared alignment the three of them depend on.
          */}
          <Text
            className="font-nunito-semibold"
            numberOfLines={2}
            style={{ ...t.cardBody, color: c.textSecondary, marginTop: 3 }}
          >
            {description}
          </Text>
        </View>

        <View className="items-center" style={{ marginRight: s.md }}>
          <Text className="font-nunito-extrabold" style={{ ...t.count, color: ink }}>
            {count}
          </Text>
          <Text className="font-nunito-semibold" style={{ ...t.countUnit, color: c.textSecondary }}>
            due
          </Text>
        </View>

        <View
          className="items-center justify-center rounded-full"
          style={{
            width: revCard.chevron,
            height: revCard.chevron,
            backgroundColor: '#FFFFFF',
            ...revShadowLifted,
          }}
        >
          <ChevronRight size={20} color={c.textSecondary} strokeWidth={2.4} />
        </View>
      </View>
    </PressableScale>
  )
}

/**
 * The painted disc at a drill card's left edge.
 *
 * The artwork brings its own circle — see `revArt` — so there is no tint and no
 * `borderRadius` here: drawing a coloured circle behind it would only show as a
 * rim of not-quite-the-same colour wherever the two disagreed by a pixel.
 *
 * Square by construction (`processReviewIcons.mjs` centres each disc on a square
 * canvas), so one dimension is all this has to choose. React Native does not
 * size an `Image` from its intrinsic dimensions the way a browser does — a width
 * with no height lays out at zero and the icon silently vanishes — so both are
 * set from `revCard.circle`.
 */
export function DrillBadge({ source }: { source: number }) {
  return (
    <Image
      source={source}
      style={{ width: revCard.circle, height: revCard.circle }}
      resizeMode="contain"
    />
  )
}

// --- Calls to action ----------------------------------------------------------

/**
 * The two buttons at the foot.
 *
 * `tone` is the whole difference: filled green for the session a learner came
 * here to start, outlined for the five-minute version. Both are full width and
 * share the cards' bounds, so the column has one left and one right edge from
 * the title down.
 */
export function CtaButton({
  label,
  icon: Icon,
  onPress,
  tone,
}: {
  label: string
  icon: ComponentType<{ color: string; size: number; strokeWidth: number }>
  onPress: () => void
  tone: 'primary' | 'quiet'
}) {
  const primary = tone === 'primary'
  const ink = primary ? '#FFFFFF' : c.greenDark

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      /* The haptic is fired by the caller, which knows whether this is the main
         session (a heavier feel) or the quick one. */
      haptic={false}
      accessibilityLabel={label}
    >
      <View
        className="flex-row items-center justify-center"
        style={{
          height: primary ? 56 : 54,
          borderRadius: revRadius.pill,
          gap: 10,
          backgroundColor: primary ? c.green : c.card,
          borderWidth: primary ? 0 : 1.5,
          borderColor: c.green,
          ...(primary ? revShadowLifted : null),
        }}
      >
        <Icon color={ink} size={primary ? 22 : 20} strokeWidth={2.3} />
        <Text
          className="font-nunito-extrabold"
          style={{ ...(primary ? t.cta : t.ctaQuiet), color: ink }}
        >
          {label}
        </Text>
      </View>
    </PressableScale>
  )
}

// --- Decoration ---------------------------------------------------------------

/**
 * The bonsai and the fallen petals at the foot of the screen.
 *
 * Painted *before* the buttons so they sit on top of it where the canopy
 * overlaps. Decoration must never be the thing that makes a label hard to read,
 * and the alternative — insetting the buttons to make room — would break the
 * one left-and-right edge every other element on the screen shares.
 */
export function FootDecor({ width, run }: { width: number; run: number }) {
  const bonsaiWidth = Math.min(126, width * 0.36)
  const reveal = useReveal({
    from: 'bottom',
    at: revEntrance.at,
    duration: revEntrance.for,
    run,
    distance: revEntrance.slideY,
  })

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0 }, reveal]}
    >
      <View style={{ position: 'absolute', right: -22, bottom: -26 }}>
        <Image
          source={REVIEW_ART.bonsai.source}
          style={{ width: bonsaiWidth, height: bonsaiWidth / REVIEW_ART.bonsai.ratio }}
          resizeMode="contain"
        />
      </View>

      {/*
        Petals, drawn rather than shipped as an asset — five ellipses at five
        angles is a smaller thing than a PNG, and they need to be tuned against
        the buttons rather than against a canvas.
      */}
      <Svg
        width={width}
        height={60}
        style={{ position: 'absolute', left: 0, bottom: 0 }}
        pointerEvents="none"
      >
        {[
          { x: 26, y: 44, r: -24 },
          { x: 74, y: 22, r: 38 },
          { x: 128, y: 50, r: 12 },
          { x: 176, y: 30, r: -46 },
          { x: 214, y: 47, r: 24 },
        ].map((petal) => (
          <Ellipse
            key={petal.x}
            cx={petal.x}
            cy={petal.y}
            rx={6}
            ry={3.4}
            fill={c.petal}
            opacity={0.55}
            transform={`rotate(${petal.r} ${petal.x} ${petal.y})`}
          />
        ))}
      </Svg>
    </Animated.View>
  )
}
