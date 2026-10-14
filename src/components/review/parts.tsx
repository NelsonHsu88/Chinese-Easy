import type { ComponentType, ReactNode } from 'react'
import { View, Text, Image, Pressable, Animated } from 'react-native'
import { ArrowRight, BookOpen, ChartNoAxesColumnIncreasing, ChevronRight } from 'lucide-react-native'
import { PressableScale, LiftedFace } from '../dashboard/parts'
/* The entrance machinery is shared with the Dashboard rather than reimplemented
   — same `Animated`-not-Reanimated constraint, same hidden-tab backstop. Only
   the timings differ, and those live in `revEntrance`. */
import { useReveal } from '../dashboard/entrance'
import { revArt, FIRE_RATIO } from './art'
import {
  revColors as c,
  revSpacing as s,
  revType as t,
  revCard,
  revButton,
  revShoulders,
  revHero,
  revRadius,
  revShadow,
  revEntrance,
  REV_CONTENT_MAX,
  REV_FOOT_RATIO,
} from './tokens'
import { ShadowReveal, ShadowSurface } from '../shadowReveal'

/*
 * The Review hub's building blocks, built to the Beta 2.1 reference.
 *
 * Press response is `PressableScale` borrowed from the Dashboard rather than
 * reimplemented: this screen is one tap off that one, and a card that dips by a
 * different amount here than it does there is the kind of difference nobody can
 * name but everybody feels.
 */

// --- Top bar ------------------------------------------------------------------

/** The streak, as a floating pill. Real streak data — never a fixed number. */
export function StreakPill({ streak }: { streak: number }) {
  return (
    <ShadowSurface shadow={revShadow}
      accessible
      accessibilityLabel={`${streak} day streak`}
      style={[{ flexDirection: 'row', alignItems: 'center' }, {
        height: 38,
        paddingHorizontal: s.lg,
        borderRadius: revRadius.pill,
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.border,
        gap: s.sm,
      }]}
    >
      <Image source={revArt.fire} style={{ width: 20 * FIRE_RATIO, height: 20 }} resizeMode="contain" />
      <Text className="font-nunito-extrabold" style={{ ...t.streak, color: c.navy }}>
        {streak}
      </Text>
      <Text className="font-nunito-semibold" style={{ ...t.streak, color: c.slate, marginLeft: -2 }}>
        Streak
      </Text>
    </ShadowSurface>
  )
}

// --- Hero ---------------------------------------------------------------------

/**
 * Title, subtitle, Shifu's line — and the painting behind them.
 *
 * Not a card: the painting is laid straight onto the page, keyed into real
 * alpha so there is no rectangle to see. It is absolutely positioned against
 * the hero's *bottom* right, bleeding off the screen edge, so its bottom always
 * meets the stats panel that follows — the panel cuts Shifu at the robe, which
 * is the composition the reference draws. Everything textual is ordinary flow,
 * so a wrapped subtitle or a longer line from Shifu grows the hero rather than
 * colliding with anything.
 *
 * The bubble's width is derived from where the painting starts rather than
 * fixed: a width that clears Shifu's sleeve on a 430pt column sits across it on
 * a 360pt one.
 */
export function ReviewHero({
  message,
  column,
  run,
}: {
  message: string
  /** Width of the page column, margins included. */
  column: number
  /** Ticks on focus; restarts the entrance. */
  run: number
}) {
  const artWidth = revHero.artWidth * (column / REV_CONTENT_MAX)
  const artHeight = artWidth / revHero.artRatio

  /* In the padded column's coordinates: the art's right edge is the screen's. */
  const artLeft = column - s.screen - artWidth
  const bubbleLeft = s.sm
  const bubbleMax = Math.min(revHero.bubbleMax, artLeft + revHero.bubbleOverlap - bubbleLeft)

  const art = useReveal({
    from: 'right',
    at: revEntrance.at,
    duration: revEntrance.for,
    run,
    distance: revEntrance.slideX,
  })
  const text = useReveal({
    from: 'bottom',
    at: revEntrance.at,
    duration: revEntrance.for,
    run,
    distance: revEntrance.slideY,
  })

  return (
    <View>
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', right: -s.screen, bottom: 0 }, art]}
      >
        <Image source={revArt.hero} style={{ width: artWidth, height: artHeight }} resizeMode="contain" />
      </Animated.View>

      {/* The bubble inside is a raised card: its shadow settles in behind it
          (`ShadowReveal`) rather than arriving first, and the subtree fades as
          one layer on Android. */}
      <Animated.View style={text} needsOffscreenAlphaCompositing>
        <ShadowReveal at={revEntrance.at} duration={revEntrance.for} run={run}>
        <Text
          className="font-lora-bold"
          accessibilityRole="header"
          style={{ ...t.title, color: c.navy, marginTop: s.xs }}
        >
          Review
        </Text>
        <Text className="font-lora" style={{ ...t.subtitle, color: c.slate, marginTop: s.xs }}>
          Strengthen what you’ve learned.{'\n'}Make it stick.
        </Text>

        <View
          style={{
            marginLeft: bubbleLeft,
            marginTop: s.lg,
            marginBottom: s.lg,
            maxWidth: bubbleMax,
            alignSelf: 'flex-start',
          }}
        >
          <SpeechBubble message={message} />
        </View>
        </ShadowReveal>
      </Animated.View>
    </View>
  )
}

/**
 * Shifu's line. Soft and editorial rather than a chat bubble: a warm fill, a
 * drawn hairline, a shadow you have to look for, and a small tail pointing
 * right at him.
 */
function SpeechBubble({ message }: { message: string }) {
  return (
    <View>
      <ShadowSurface shadow={revShadow}
        style={{
          backgroundColor: c.card,
          borderRadius: revRadius.medium,
          borderWidth: 1,
          borderColor: c.border,
          paddingHorizontal: s.xl,
          paddingVertical: s.md + 2,
        }}
      >
        <Text className="font-lora" style={{ ...t.bubble, color: c.navy }}>
          {message}
        </Text>
      </ShadowSurface>

      {/*
        The tail: a rotated square carrying the bubble's fill, with the border
        drawn on only the two edges that form the point. Drawn after the body so
        it covers the body's border where the two meet, which is what makes it
        read as one outline rather than a triangle stuck to a box.
      */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          right: -6,
          top: 26,
          width: 12,
          height: 12,
          backgroundColor: c.card,
          borderTopWidth: 1,
          borderRightWidth: 1,
          borderColor: c.border,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  )
}

// --- Stats --------------------------------------------------------------------

/**
 * The three headline numbers, in one panel with hairline dividers.
 *
 * One panel rather than three tiles: these are three readings of the same
 * deck. The dividers are inset top and bottom so they read as separators rather
 * than as a table's rules.
 */
export function StatsPanel({ children }: { children: ReactNode[] }) {
  return (
    <ShadowSurface shadow={revShadow}
      style={[{ flexDirection: 'row' }, {
        backgroundColor: c.card,
        borderRadius: revRadius.large,
        borderWidth: 1,
        borderColor: c.border,
        paddingVertical: s.md + 2,
      }]}
    >
      {children.map((column, i) => (
        <View key={i} className="flex-1 flex-row">
          {i > 0 && <View style={{ width: 1, marginVertical: s.xs, backgroundColor: c.border }} />}
          <View className="flex-1">{column}</View>
        </View>
      ))}
    </ShadowSurface>
  )
}

/** The three stat icons, each drawn the way the reference draws it. */
export function DueIcon() {
  return (
    <View
      className="items-center justify-center"
      style={{ width: 24, height: 24, borderRadius: revRadius.small - 4, backgroundColor: c.mint }}
    >
      <BookOpen size={14} color={c.jadeDark} strokeWidth={2} />
    </View>
  )
}

export function StreakIcon() {
  return <Image source={revArt.fire} style={{ width: 22 * FIRE_RATIO, height: 22 }} resizeMode="contain" />
}

export function WeakIcon() {
  return <ChartNoAxesColumnIncreasing size={20} color={c.steel} strokeWidth={3} />
}

/**
 * One column of the stats panel: icon beside a serif number and its label.
 * The reference's line of small print under each label ("Words to review")
 * was dropped — it only restated the label, and cost the panel a line.
 *
 * `onPress` is optional and only "Due today" has one — it opens the list of
 * due words, which the screen has always done and there is no reason to lose
 * because the reference does not draw a chevron on it.
 */
export function Stat({
  value,
  label,
  icon,
  onPress,
}: {
  value: number
  label: string
  icon: ReactNode
  onPress?: () => void
}) {
  const body = (
    <View className="flex-row items-center" style={{ paddingLeft: s.sm + 2, paddingRight: s.xs, gap: 6 }}>
      {icon}
      {/* `flex: 1`, not `flexShrink`: a shrinkable text column is measured at its
          min-content width on web, which broke "Due today" over two lines. */}
      <View style={{ flex: 1 }}>
        <Text className="font-lora-bold" style={{ ...t.statValue, color: c.navy }}>
          {value}
        </Text>
        {/* Regular weight, and one line: a two-line "Due today" is what made
            the panel tall. */}
        <Text className="font-sans" numberOfLines={1} style={{ ...t.statLabel, color: c.navy }}>
          {label}
        </Text>
      </View>
    </View>
  )

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={`${value} ${label}`}>
        {body}
      </View>
    )
  }

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
 * One drill: a painted scene on the left, a serif title and description, a
 * quiet due pill and a slim chevron.
 *
 * The whole card is the target. The chevron is therefore a plain View, not a
 * Pressable: nesting one pressable inside another double-fires on the web
 * target, where the synthetic event bubbles from the inner handler to the outer
 * one and opens the session twice.
 *
 * Two views rather than one, because iOS clips a shadow along with everything
 * else under `overflow: hidden`: the outer carries the shadow and the border,
 * the inner clips the painting to the rounded corners.
 */
export function ReviewModeCard({
  title,
  description,
  art,
  count,
  width,
  onPress,
}: {
  title: string
  description: string
  art: number
  count: number
  /** The card's own width. The painting's share, and the title size, are measured off it. */
  width: number
  onPress: () => void
}) {
  const artWidth = Math.round(width * revCard.artShare)

  /*
   * The text column is what is left between the painting and the pill. The
   * title is sized to it rather than fixed: "Flashcards" at the designed 23pt
   * needs about 130pt, which a 360pt phone does not have once the painting has
   * its third. A Lora Bold letter averages a little under 0.6em, so ten letters
   * in a sixth of the column was the bound — but "Mixed Drills" is twelve, and
   * wrapped onto two lines. Sized for the longest title, so every card's title
   * shares one size and stays on one line.
   */
  const textColumn = width - artWidth - revCard.textInset - 104
  const titleSize = Math.max(17, Math.min(t.cardTitle.fontSize, textColumn / 7.2))

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.985}
      accessibilityLabel={`${title}. ${count === 0 ? 'Nothing' : count} due. ${description}`}
    >
      <ShadowSurface shadow={revShadow}
        style={{
          borderRadius: revRadius.large,
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.border,
        }}
      >
        <View
          className="flex-row items-center"
          style={{ minHeight: revCard.minHeight, borderRadius: revRadius.large - 1, overflow: 'hidden' }}
        >
          {/* A sized box with the image filling it, rather than an absolutely
              positioned Image stretched by top/bottom: react-native-web does not
              apply `cover` to the latter, and drew the scene zoomed into a corner. */}
          <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: artWidth }}>
            <Image source={art} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
          </View>

          <View
            style={{
              flex: 1,
              marginLeft: artWidth + revCard.textInset,
              paddingVertical: revCard.paddingY,
            }}
          >
            <Text
              className="font-lora-bold"
              numberOfLines={1}
              style={{ ...t.cardTitle, fontSize: titleSize, lineHeight: titleSize * 1.22, color: c.navy }}
            >
              {title}
            </Text>
            <Text className="font-nunito-semibold" style={{ ...t.cardBody, color: c.slate, marginTop: 3 }}>
              {description}
            </Text>
          </View>

          <View
            className="flex-row items-center"
            style={{ gap: s.sm, marginLeft: s.sm, paddingRight: revCard.paddingRight }}
          >
            <DuePill count={count} />
            <ChevronRight size={20} color={c.navy} strokeWidth={1.8} />
          </View>
        </View>
      </ShadowSurface>
    </PressableScale>
  )
}

/**
 * "12 due", as a quiet mint pill that should never compete with the title.
 * Zero reads "None" on a neutral tint — a bold 0 reads as a broken counter,
 * where "None" is the truth and is not a failure.
 */
function DuePill({ count }: { count: number }) {
  const empty = count === 0
  return (
    <View
      className="items-center justify-center"
      style={{
        height: 28,
        minWidth: 58,
        paddingHorizontal: s.md,
        borderRadius: revRadius.pill,
        backgroundColor: empty ? c.neutralTrack : c.mint,
      }}
    >
      <Text className="font-nunito-extrabold" style={{ ...t.pill, color: empty ? c.slate : c.jadeDark }}>
        {empty ? 'None' : `${count} due`}
      </Text>
    </View>
  )
}

// --- Calls to action ----------------------------------------------------------

/**
 * The buttons at the foot — Start Review Session, Quick 5-min Review and My
 * Words — one component so the three are visibly one family.
 *
 * Raised the way the Dashboard's buttons are: `LiftedFace` stands the face on a
 * darker shoulder and sinks it flush on press, following `PressableScale`'s
 * press through `usePressProgress`. The same object as Start Review on the
 * Dashboard, one tap away, rather than a second idea of a 3D button.
 *
 * `primary` is the filled jade face with a trailing arrow; `quiet` the outlined
 * one with a leading icon and a chevron at the right edge. Both carry the Lora
 * Bold label the reference gives them.
 */
export function ReviewButton({
  label,
  icon: Icon,
  tone,
  onPress,
  accessibilityLabel,
}: {
  label: string
  icon?: ComponentType<{ color: string; size: number; strokeWidth: number }>
  tone: 'primary' | 'quiet'
  onPress: () => void
  accessibilityLabel?: string
}) {
  const primary = tone === 'primary'
  const ink = primary ? '#FFFFFF' : c.navy

  return (
    <PressableScale
      onPress={onPress}
      /* The sink onto the shoulder is the press response; a scale on top of it
         reads as the button being pushed twice. */
      scaleTo={1}
      /* The haptic is fired by the caller, which knows whether this is the main
         session (a heavier feel) or something lighter. */
      haptic={false}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <LiftedFace
        height={primary ? revButton.primaryHeight : revButton.quietHeight}
        fill={primary ? c.jade : c.card}
        shoulder={primary ? revShoulders.primary : revShoulders.quiet}
        border={primary ? undefined : c.outline}
        shadow={primary}
      >
        <View className="flex-row items-center" style={{ gap: s.md, paddingHorizontal: 40 }}>
          {Icon && <Icon color={c.slate} size={21} strokeWidth={2} />}
          <Text className="font-lora-bold" numberOfLines={1} style={{ ...t.cta, color: ink }}>
            {label}
          </Text>
        </View>

        <View pointerEvents="none" style={{ position: 'absolute', right: s.xl }}>
          {primary ? (
            <ArrowRight size={24} color={ink} strokeWidth={2} />
          ) : (
            <ChevronRight size={20} color={c.slate} strokeWidth={2} />
          )}
        </View>
      </LiftedFace>
    </PressableScale>
  )
}

// --- Decoration ---------------------------------------------------------------

/**
 * The misty range and trees at the foot of the page, bleeding off both sides
 * and the bottom.
 *
 * The painting has a soft hole where the reference's buttons were
 * (`processReviewArt.mjs`), so it shows in the corners and under the last
 * button rather than as a picture behind the labels. Painted before the
 * buttons, so they sit on top of it where the two overlap.
 */
export function FootArt({ column, bleed, run }: { column: number; bleed: number; run: number }) {
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
      style={[{ position: 'absolute', left: -s.screen, bottom: -bleed }, reveal]}
    >
      <Image
        source={revArt.foot}
        style={{ width: column, height: column / REV_FOOT_RATIO }}
        resizeMode="contain"
      />
    </Animated.View>
  )
}
