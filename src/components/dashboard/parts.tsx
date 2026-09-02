import { createContext, useCallback, useContext, useRef, type ReactNode } from 'react'
import {
  View,
  Text,
  Pressable,
  Animated,
  Platform,
  Image,
  type StyleProp,
  type ViewStyle,
  type ImageStyle,
} from 'react-native'
import { ArrowRight } from 'lucide-react-native'
import {
  dashColors as c,
  dashSpacing as s,
  dashType as t,
  dashShadow,
  dashShadowLifted,
  dashShoulders,
  dashRadius,
  dashMotion,
} from './tokens'
import { tapHaptic } from '../../lib/haptics'

/*
 * The Dashboard's building blocks.
 *
 * Two standing rules of this codebase apply to everything animated here:
 * React Native's own `Animated` rather than Reanimated (whose update loop does
 * not drive on this project's web target), and plain styles on an
 * `Animated.View` with Tailwind classes moved to a plain `View` inside it,
 * because NativeWind drops `className` on an animated view.
 */

const USE_NATIVE_DRIVER = Platform.OS !== 'web'

// --- Press response -----------------------------------------------------------

/**
 * The pressed-ness of the nearest `PressableScale`, 0 → 1.
 *
 * Published so something *inside* a pressable card can respond to the press
 * too. The Review card is why it exists: the whole card is the button, but the
 * thing that looks like a button is the pill inside it, and a pill that stays
 * rigid while the card dips underneath it reads as a picture of a button rather
 * than a button.
 *
 * This is the alternative to the obvious fix. Making the pill its own Pressable
 * would double-fire on the web target — the synthetic event bubbles from the
 * inner handler to the outer one and pushes the route twice — and would shrink
 * the target from a 158pt card to a 48pt pill.
 */
const PressProgress = createContext<Animated.Value | null>(null)

/** Null outside a pressable card, so callers must have a resting fallback. */
export function usePressProgress(): Animated.Value | null {
  return useContext(PressProgress)
}

/**
 * How a nested pressable tells the card around it "this press was mine".
 *
 * A card that is one big target *and* holds its own smaller ones — the word card,
 * with See all, Not now and Add this word inside it — used to be impossible here,
 * because on the web target a press on an inner control bubbles out to the card's
 * handler as well and both fire: the word is added *and* the route is pushed.
 * That is the reason the rule used to be "a card is either one pressable or
 * several, never both".
 *
 * The claim is what lifts that. An inner press marks its ancestors before the
 * event has finished bubbling, so by the time the card's own handler runs it
 * knows to stand down.
 *
 * Provided only by a `PressableScale` that actually has an `onPress`; the noop
 * covers everything rendered outside one, which is most of the app.
 */
const PressClaim = createContext<(() => void) | null>(null)

const NO_CLAIM = () => {}

/**
 * Call this at the top of any hand-rolled press handler nested inside a
 * pressable card — `CardLink` is the one that is not a `PressableScale` and so
 * does not get it for free.
 */
export function usePressClaim(): () => void {
  return useContext(PressClaim) ?? NO_CLAIM
}

/**
 * The screen's one press behaviour: a small dip under the finger and a spring
 * back out. Used by every card and button, so a tap feels the same wherever it
 * lands rather than each surface inventing its own response.
 *
 * Rendered as a plain `View` when there is no `onPress` — a card that does
 * nothing should not report itself to the accessibility tree as a button.
 */
export function PressableScale({
  onPress,
  children,
  style,
  wrapperStyle,
  accessibilityLabel,
  haptic = true,
  scaleTo = dashMotion.pressScale,
}: {
  onPress?: () => void
  children: ReactNode
  style?: StyleProp<ViewStyle>
  /**
   * Layout for the animated wrapper — `flex`, `width`, anything that decides
   * how much room this occupies in its parent.
   *
   * It has to go here rather than on `style`, and the button row is what proves
   * it: `flex: 1` on the inner Pressable does nothing when the `Animated.View`
   * around it is still sized to its own content, so two buttons that should
   * split a row both collapse to their label width and overlap. The wrapper is
   * the flex child; the Pressable is just its contents.
   */
  wrapperStyle?: StyleProp<ViewStyle>
  accessibilityLabel?: string
  haptic?: boolean
  scaleTo?: number
}) {
  const press = useRef(new Animated.Value(0)).current
  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, scaleTo] })

  /* Whether something nested inside this one has already taken the press. */
  const takenByInner = useRef(false)
  const claimOuter = usePressClaim()

  const claimFromInner = useCallback(() => {
    takenByInner.current = true
    /*
     * Cleared on the next tick rather than after the press, and the asymmetry
     * between the platforms is exactly why. On web the event bubbles
     * synchronously, so this card's own handler runs *before* any timer and
     * sees the flag; on native the outer handler never fires at all, so nothing
     * would ever clear it and the next press on the card body would be eaten.
     */
    setTimeout(() => {
      takenByInner.current = false
    }, 0)
    /* Keep going up: a claim is against every ancestor, not just the nearest. */
    claimOuter()
  }, [claimOuter])

  if (!onPress) return <View style={[wrapperStyle, style]}>{children}</View>

  const down = () =>
    Animated.timing(press, {
      toValue: 1,
      duration: dashMotion.press,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start()

  const up = () =>
    Animated.spring(press, {
      toValue: 0,
      damping: 14,
      stiffness: 320,
      mass: 0.6,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start()

  return (
    <Animated.View style={[{ transform: [{ scale }] }, wrapperStyle]}>
      <Pressable
        onPress={() => {
          /* An inner control already answered this press — see `PressClaim`. */
          if (takenByInner.current) return
          claimOuter()
          if (haptic) tapHaptic()
          onPress()
        }}
        onPressIn={down}
        onPressOut={up}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={style}
      >
        <PressClaim.Provider value={claimFromInner}>
          <PressProgress.Provider value={press}>{children}</PressProgress.Provider>
        </PressClaim.Provider>
      </Pressable>
    </Animated.View>
  )
}

// --- Card shell ---------------------------------------------------------------

/**
 * The surface every Dashboard card is built on.
 *
 * `overflow: hidden` is load-bearing rather than defensive: each card carries a
 * watercolour illustration positioned past its own edge, and the rounded
 * corner is what turns that overhang into art bleeding off the card instead of
 * a rectangle of painting sitting on top of one.
 */
export function DashboardCard({
  fill,
  border,
  minHeight,
  onPress,
  accessibilityLabel,
  children,
  style,
}: {
  fill: string
  border: string
  minHeight?: number
  onPress?: () => void
  accessibilityLabel?: string
  children: ReactNode
  style?: StyleProp<ViewStyle>
}) {
  return (
    <PressableScale onPress={onPress} accessibilityLabel={accessibilityLabel}>
      <View
        style={[
          {
            backgroundColor: fill,
            borderColor: border,
            borderWidth: 1,
            borderRadius: dashRadius.card,
            minHeight,
            overflow: 'hidden',
            ...dashShadow,
          },
          style,
        ]}
      >
        {children}
      </View>
    </PressableScale>
  )
}

/**
 * A card's watercolour illustration.
 *
 * Absolutely positioned and `pointerEvents="none"` throughout: decoration must
 * cost no layout height (or it pushes the card's own content sideways to make
 * room for a painting) and must never swallow a tap meant for the button it
 * overlaps. The prop goes on a wrapping `View` because `Image` does not accept
 * it.
 */
export function CardArt({
  source,
  width,
  ratio,
  style,
  opacity = 1,
  animatedStyle,
}: {
  source: number
  width: number
  /** Source aspect ratio (w/h), so a width is all any caller has to choose. */
  ratio: number
  style: StyleProp<ViewStyle>
  opacity?: number
  /**
   * An entrance from `useReveal`, applied to this absolutely positioned wrapper
   * rather than to a wrapper around it.
   *
   * It has to go on this view specifically: in React Native an absolutely
   * positioned child is placed against its direct parent, so wrapping `CardArt`
   * in an animated `View` would re-anchor the artwork to that zero-sized wrapper
   * instead of to the hero, and every piece of scenery would pile up in one
   * corner.
   *
   * It is applied last, so its `transform` and `opacity` win. Anything in
   * `style` that must survive — the `scaleX: -1` on the mirrored pieces — has to
   * be composed into the reveal's own transform, not left here.
   */
  animatedStyle?: Animated.WithAnimatedObject<ViewStyle>
}) {
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', opacity }, style, animatedStyle]}>
      {/*
        Height is derived rather than left to the image. React Native does not
        size an `Image` from its intrinsic dimensions the way a browser does —
        a width with no height simply lays out at zero and the artwork vanishes.
      */}
      <Image source={source} style={{ width, height: width / ratio } as ImageStyle} resizeMode="contain" />
    </Animated.View>
  )
}

// --- Type ---------------------------------------------------------------------

/** A card's own title. */
export function CardTitle({ children, small = false }: { children: ReactNode; small?: boolean }) {
  return (
    <Text
      className="font-nunito-extrabold"
      style={{ ...(small ? t.cardTitleSm : t.cardTitle), color: c.navy }}
    >
      {children}
    </Text>
  )
}

/** The supporting line under a card title. */
export function CardBody({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Text className="font-nunito-semibold" style={[{ ...t.cardBody, color: c.textSecondary }, style as never]}>
      {children}
    </Text>
  )
}

/**
 * The small uppercase label above a card title ("REVIEW").
 *
 * Kept deliberately small. It is a category marker, not a heading — at any
 * larger size it starts competing with the title directly beneath it.
 */
export function CardTag({ label, fill, color }: { label: string; fill: string; color: string }) {
  return (
    <View
      className="self-start items-center justify-center"
      style={{ height: 23, paddingHorizontal: 9, borderRadius: dashRadius.tag, backgroundColor: fill }}
    >
      <Text className="font-nunito-extrabold" style={{ ...t.tag, color }}>
        {label.toUpperCase()}
      </Text>
    </View>
  )
}

/** The quiet "See all" / "View all" action in a card's top-right corner. */
export function CardLink({
  label,
  onPress,
  color = c.greenDark,
  outlined = false,
  borderColor,
}: {
  label: string
  onPress: () => void
  color?: string
  outlined?: boolean
  borderColor?: string
}) {
  /* Not a `PressableScale`, so it does not get this for free: without it, a tap
     on "See all" inside a pressable card fires the card's handler too on web. */
  const claim = usePressClaim()

  return (
    <Pressable
      onPress={() => {
        claim()
        tapHaptic()
        onPress()
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      className="items-center justify-center active:opacity-60"
      style={
        outlined
          ? {
              /*
               * Deliberately small. This pill shares the card's top-right corner
               * with the mountain illustration, and at 32pt its lower edge met
               * the ridge line — a bordered control resting on a painting reads
               * as a mistake in both directions.
               */
              height: 27,
              paddingHorizontal: 11,
              borderRadius: 13.5,
              borderWidth: 1.3,
              borderColor: borderColor ?? color,
              backgroundColor: c.card,
            }
          : undefined
      }
    >
      <Text className="font-nunito-bold" style={{ ...t.link, fontSize: outlined ? 12.5 : t.link.fontSize, color }}>
        {label}
      </Text>
    </Pressable>
  )
}

/** A round tinted glyph holder, left of a card title. */
export function CardIconBadge({ tint, children, size = 32 }: { tint: string; children: ReactNode; size?: number }) {
  return (
    <View
      className="items-center justify-center rounded-full"
      style={{ width: size, height: size, backgroundColor: tint }}
    >
      {children}
    </View>
  )
}

// --- Buttons ------------------------------------------------------------------

/**
 * How far a button stands off the surface it rests on, and therefore how far it
 * travels when pressed.
 *
 * Four points is the whole illusion. Less and the shoulder reads as a stray
 * outline that missed its edge; more and the button looks broken rather than
 * raised, and the travel becomes a lurch.
 */
export const DASH_LIFT = 4

/**
 * A button drawn as a physical object rather than a shadowed pill.
 *
 * Two layers, not one: a solid shoulder in a shade darker, with the face
 * standing `DASH_LIFT` above it, so what shows along the bottom edge is the
 * *side* of the button rather than a shadow pretending to be one. That is what
 * makes it read as pressable at a glance — a soft drop shadow says "this
 * floats", a visible edge says "this can go down".
 *
 * Pressing sinks the face by exactly `DASH_LIFT`, landing it flush on its
 * shoulder and hiding the side completely. The travel and the shoulder height
 * are the same number on purpose: any mismatch leaves a sliver of dark showing
 * under a button that is supposed to be fully depressed.
 *
 * It reads the press from `usePressProgress` rather than owning a Pressable, so
 * it works both ways round — as the face of a button that is its own target
 * (the word card's pair) and as the pill inside a card that is the target (Start
 * Review, where the whole 158pt card is the button and nesting a second
 * Pressable would double-fire on the web target).
 */
export function LiftedFace({
  height,
  fill,
  shoulder,
  border,
  shadow = true,
  style,
  children,
}: {
  height: number
  fill: string
  shoulder: string
  /** Outlined faces only — the quiet button keeps its hairline. */
  border?: string
  /** The shoulder carries it, not the face. Off for the quiet button. */
  shadow?: boolean
  style?: StyleProp<ViewStyle>
  children: ReactNode
}) {
  /*
   * Outside a pressable card there is no press to follow, so this stands in and
   * simply never moves. A hook cannot be called conditionally, hence the
   * fallback being created either way.
   */
  const resting = useRef(new Animated.Value(0)).current
  const press = usePressProgress() ?? resting

  const sink = press.interpolate({ inputRange: [0, 1], outputRange: [0, DASH_LIFT] })

  return (
    <View style={[{ height: height + DASH_LIFT }, style]}>
      {/*
        The shoulder carries the ambient shadow rather than the face doing it, so
        the two layers cast one shadow between them instead of the face drawing a
        second edge across the side it is standing on.
      */}
      <View
        style={{
          position: 'absolute',
          top: DASH_LIFT,
          left: 0,
          right: 0,
          height,
          borderRadius: height / 2,
          backgroundColor: shoulder,
          ...(shadow ? dashShadowLifted : null),
        }}
      />

      {/* Plain styles on the animated view; the Tailwind classes sit inside. */}
      <Animated.View
        style={{
          height,
          borderRadius: height / 2,
          backgroundColor: fill,
          ...(border ? { borderWidth: 1.5, borderColor: border } : null),
          transform: [{ translateY: sink }],
        }}
      >
        <View className="h-full flex-row items-center justify-center" style={{ gap: s.sm }}>
          {children}
        </View>
      </Animated.View>
    </View>
  )
}

/**
 * A filled pill call to action.
 *
 * `width` is optional because the two places these appear want different
 * things: the Start Review button is sized to its own label and sits at the
 * left of its card, while the word card's pair share the row equally.
 */
export function DashButton({
  label,
  onPress,
  fill,
  shoulder,
  width,
  flex,
  arrow = false,
  height = 48,
  accessibilityLabel,
}: {
  label: string
  onPress: () => void
  fill: string
  /** The side of the button. See `dashShoulders` — one step down from `fill`. */
  shoulder: string
  width?: number
  /** Flex weight when sharing a row. The two halves are not equal — see NewWordCard. */
  flex?: number
  arrow?: boolean
  height?: number
  accessibilityLabel?: string
}) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? label}
      wrapperStyle={{ width, flex }}
    >
      <LiftedFace height={height} fill={fill} shoulder={shoulder}>
        <Text className="font-nunito-extrabold text-white" style={{ fontSize: t.button.fontSize }}>
          {label}
        </Text>
        {arrow && <ArrowRight size={18} color="#ffffff" strokeWidth={2.6} />}
      </LiftedFace>
    </PressableScale>
  )
}

/**
 * The quieter half of a pair — outlined rather than filled.
 *
 * Same two-part construction as its loud neighbour, and it has to be: standing
 * one of a pair on a shoulder while the other lies flat makes them read as two
 * unrelated controls that happen to share a row. Its shoulder carries no shadow,
 * though — an outlined button that also floats stops being the quiet one.
 */
export function DashButtonQuiet({
  label,
  onPress,
  height = 48,
  flex = 1,
}: {
  label: string
  onPress: () => void
  height?: number
  flex?: number
}) {
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label} wrapperStyle={{ flex }}>
      <LiftedFace
        height={height}
        fill={c.card}
        shoulder={dashShoulders.quiet}
        border={c.border}
        shadow={false}
      >
        <Text className="font-nunito-bold" style={{ fontSize: 14.5, color: c.textSecondary }}>
          {label}
        </Text>
      </LiftedFace>
    </PressableScale>
  )
}

// --- Header -------------------------------------------------------------------

/**
 * The floating streak pill in the top-right.
 *
 * The flame is the app's own painted icon rather than a platform emoji: an
 * emoji renders as a different picture on every OS, and this one is the only
 * spot of hot colour in the header.
 */
export function StreakPill({ streak, icon, onPress }: { streak: number; icon: number; onPress?: () => void }) {
  return (
    <PressableScale onPress={onPress} accessibilityLabel={`${streak} day streak`} scaleTo={0.96}>
      <View
        className="flex-row items-center"
        style={{
          height: 43,
          paddingHorizontal: 15,
          borderRadius: 22,
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.border,
          gap: 7,
          ...dashShadowLifted,
        }}
      >
        <Image source={icon} style={{ width: 21, height: 21 }} resizeMode="contain" />
        <Text className="font-nunito-extrabold" style={{ fontSize: 17, color: c.navy }}>
          {streak}
        </Text>
        <Text className="font-nunito-semibold" style={{ fontSize: 14.5, color: c.textSecondary }}>
          Streak
        </Text>
      </View>
    </PressableScale>
  )
}
